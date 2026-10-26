import { query } from "./db";
import { getAdsCredentials } from "./ads-credentials";
import { SHOPS } from "./shops";
import {
  budgetUsagePercent, parseBudgetAmount, normalizeStatus,
  type PromotionType,
} from "./gmv";

const FEE_RATE = 0.25; // net lock: net = gross * (1 - fee)

// DB-backed GMV Max report (Stage 6): aggregates the hourly cache instead of
// pulling TikTok. Same response shape as getShopReport in gmv.ts so the
// dashboard renders identically — but NO live enrichment (budgets, TT
// identities come from the Neon cache as-is) and NO TikTok calls at all.
// Use for default paint; the Fetch button keeps hitting the live endpoint.
export async function getHourlyReport(
  shopNumber: string,
  promotionType: PromotionType,
  startDate: string,
  endDate: string,
  accountSource: "bracket" | "api" = "bracket"
) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (shopNumber !== "1") throw new Error("hourly report is shop-1-only");
  // Credentials checked for parity with the live path (same ads account).
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  // Campaign map from Neon, scoped to type. Tolerant selects: full
  // (028+029) first, minimal fallback for pre-migration DBs.
  let cmap;
  try {
    cmap = await query(
      `SELECT campaign_id, name, account, status, delivery, budget, account_api, account_user, identity_id, identity_bc, enrich_tried_at, enrich_fail FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
      [shop.shopId, promotionType]
    );
  } catch {
    cmap = await query(
      `SELECT campaign_id, name, account, status FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
      [shop.shopId, promotionType]
    );
  }
  const toMs = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const ms = new Date(String(v)).getTime();
    return Number.isFinite(ms) ? ms : null;
  };
  const info = new Map<string, {
    name: string; account: string; status: string | null; delivery: string | null;
    budget: number | null; budgetMode: string | null;
    accountApi: string | null; accountUser: string | null; identityId: string | null; identityBc: string | null;
    enrichTriedAt: number | null; enrichFail: string | null;
  }>();
  for (const r of cmap.rows) info.set(r.campaign_id, {
    name: r.name, account: r.account ?? "Other",
    status: r.status ? normalizeStatus(r.status) : null,
    delivery: r.delivery ?? null, budget: parseBudgetAmount(r.budget),
    budgetMode: r.budget === null || r.budget === undefined ? null : "BUDGET_MODE_DAY",
    accountApi: typeof r.account_api === "string" && r.account_api.trim() ? r.account_api.trim() : null,
    accountUser: typeof r.account_user === "string" && r.account_user.trim() ? r.account_user.trim() : null,
    identityId: typeof r.identity_id === "string" && r.identity_id.trim() ? r.identity_id.trim() : null,
    identityBc: typeof r.identity_bc === "string" && r.identity_bc.trim() ? r.identity_bc.trim() : null,
    enrichTriedAt: toMs(r.enrich_tried_at),
    enrichFail: typeof r.enrich_fail === "string" && r.enrich_fail ? r.enrich_fail : null,
  });
  const groupOf = (m: { account: string; accountApi: string | null }) =>
    accountSource === "api" && promotionType === "LIVE_GMV_MAX" && m.accountApi ? m.accountApi : m.account;

  // Hourly cache sums over the range. Slots are MYT "YYYY-MM-DD HH:00:00"
  // text, so lexicographic bounds work. Rewrite-on-revise upstream means
  // restated intraday figures arrive corrected on the next cron tick.
  const rows = await query(
    `SELECT campaign_id, SUM(cost)::float AS cost, SUM(gmv)::float AS gmv,
            SUM(orders)::int AS orders, MAX(pulled_at) AS pulled
     FROM gmv.hourly_campaign_metrics
     WHERE shop_id = $1 AND promotion_type = $2
       AND hour_slot >= $3 AND hour_slot < (($4::date + 1)::text)
     GROUP BY 1`,
    [shop.shopId, promotionType, `${startDate} 00:00:00`, endDate]
  );
  let pulledAt: string | null = null;
  let totalCost = 0, totalGMV = 0, totalOrders = 0;
  const byAccount = new Map<string, { cost: number; gmv: number; orders: number; campaigns: number }>();
  const byCampaign = new Map<string, { cost: number; gmv: number; orders: number }>();
  for (const r of rows.rows) {
    if (r.pulled && (!pulledAt || String(r.pulled) > pulledAt)) pulledAt = String(r.pulled);
    const cost = Number(r.cost ?? 0), gmv = Number(r.gmv ?? 0), orders = Number(r.orders ?? 0);
    totalCost += cost; totalGMV += gmv; totalOrders += orders;
    const meta = info.get(r.campaign_id) ?? { name: r.campaign_id, account: "Other", accountApi: null };
    const key = groupOf(meta);
    const a = byAccount.get(key) ?? { cost: 0, gmv: 0, orders: 0, campaigns: 0 };
    a.cost += cost; a.gmv += gmv; a.orders += orders; a.campaigns += 1;
    byAccount.set(key, a);
    const c = byCampaign.get(r.campaign_id) ?? { cost: 0, gmv: 0, orders: 0 };
    c.cost += cost; c.gmv += gmv; c.orders += orders;
    byCampaign.set(r.campaign_id, c);
  }

  const ENRICH_BACKOFF_MS = 7 * 24 * 3600 * 1000;
  const nowMs = Date.now();
  const isFresh = (id: string): boolean => {
    const t = info.get(id)?.enrichTriedAt ?? null;
    return t === null || nowMs - t > ENRICH_BACKOFF_MS;
  };
  const missingAccountActionable = (id: string): boolean => {
    const m = info.get(id);
    return promotionType === "LIVE_GMV_MAX" && !!m && !m.accountApi && m.enrichFail !== "bracket_only";
  };
  const accountFillRemaining = [...byCampaign.keys()].filter(missingAccountActionable).length;
  const accountDeferredRemaining = [...byCampaign.keys()].filter((id) => missingAccountActionable(id) && !isFresh(id)).length;
  const budgetDeferredRemaining = [...byCampaign.keys()].filter((id) => {
    const m = info.get(id);
    return !!m && m.status === "ON" && m.budget === null && !isFresh(id);
  }).length;
  const countBracketOnly = (): number => {
    if (promotionType !== "LIVE_GMV_MAX") return 0;
    let n = 0;
    for (const id of byCampaign.keys()) {
      const m = info.get(id);
      if (m && !m.accountApi && m.enrichFail === "bracket_only") n++;
    }
    return n;
  };

  const net = totalGMV * (1 - FEE_RATE);
  const accounts = [...byAccount.entries()].map(([name, d]) => ({
    name, ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0,
  })).sort((a, b) => b.gmv - a.gmv);
  const campaigns = [...byCampaign.entries()].map(([campaignId, d]) => {
    const meta = info.get(campaignId) ?? { name: campaignId, account: "Other", accountApi: null, accountUser: null, status: null, delivery: null, budget: null, budgetMode: null };
    return {
      campaignId, campaignName: meta.name, accountName: groupOf(meta),
      accountBracket: meta.account, accountApi: meta.accountApi, accountUser: meta.accountUser,
      status: meta.status, delivery: meta.delivery,
      budget: meta.status === "ON" ? meta.budget : null,
      budgetMode: meta.budgetMode,
      budgetSource: meta.status === "ON" && meta.budget !== null ? "campaign" : null,
      budgetUsagePct: budgetUsagePercent(d.cost, meta.status === "ON" ? meta.budget : null, meta.budgetMode, startDate === endDate),
      ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0,
    };
  }).sort((a, b) => a.accountName.localeCompare(b.accountName) || b.gmv - a.gmv);
  const budgetRefreshRemaining = campaigns.filter((c) => c.status === "ON" && c.budget === null).length;

  const todayKL = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  return {
    shopName: shop.name, promotionType,
    gmv: totalGMV, cost: totalCost, roi: totalCost > 0 ? totalGMV / totalCost : 0,
    net, net_roi: totalCost > 0 ? net / totalCost : 0,
    orderCount: totalOrders, campaignCount: byCampaign.size,
    currency: "MYR", dateRange: { start: startDate, end: endDate },
    accounts, campaigns, budgetRefreshRemaining, budgetDeferredRemaining,
    accountFillRemaining, accountDeferredRemaining, accountBracketOnly: countBracketOnly(), accountSource,
    cached: true, partial: endDate >= todayKL, pulledAt,
  };
}
