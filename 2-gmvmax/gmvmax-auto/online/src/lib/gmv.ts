import { query } from "./db";
import { getAdsCredentials } from "./ads-credentials";
import { SHOPS } from "./shops";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

export const PROMOTION_TYPES = ["PRODUCT_GMV_MAX", "LIVE_GMV_MAX"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

// Account rule (relaxed Oct 2026): first [] ANYWHERE is the account
// ("ot1 [Dr Samhan Official1] ..." -> "Dr Samhan Official1").
// No [] at all -> account "Other". Display name keeps the full raw title.
export function parseCampaignName(raw: string): { account: string; name: string } {
  const m = /\[([^\[\]]+)\]/.exec(raw ?? "");
  if (m) return { account: m[1].trim() || "Other", name: (raw ?? "").trim() };
  return { account: "Other", name: (raw ?? "").trim() };
}

// Delivery display map (owner-verified 04 Oct: Ads Manager shows Active /
// Not delivering / Asset not available; API speaks CAMPAIGN_STATUS_* enums).
// Unknown enums pass through prettified so new codes still show.
export function formatDelivery(raw: string | null): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    CAMPAIGN_STATUS_ENABLE: "Active",
    CAMPAIGN_STATUS_DISABLE: "Disabled",
    CAMPAIGN_STATUS_TTS_TT_ASSET_UNAVAILABLE: "Asset unavailable",
    CAMPAIGN_STATUS_PRODUCT_USED_BY_PRODUCT_GMV_MAX: "Product in use",
    CAMPAIGN_STATUS_IDENTITY_USED_BY_GMV_MAX_AD: "Identity in use",
    CAMPAIGN_STATUS_IDENTITY_USED_BY_LIVE_GMV_MAX: "Identity in use (live)",
    CAMPAIGN_STATUS_LIVE_GMV_MAX_AUTHORIZATION_CANCEL: "Auth revoked",
  };
  if (map[raw]) return map[raw];
  const pretty = raw.replace(/^CAMPAIGN_STATUS_/, "").toLowerCase().replace(/_/g, " ");
  return pretty.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseBudgetAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// Only daily-style budgets can be compared to a one-day spend total. Lifetime
// and unlimited budgets keep their amount/mode but deliberately have no %.
export function budgetUsagePercent(
  spend: number,
  budget: number | null,
  budgetMode: string | null,
  oneDay: boolean
): number | null {
  if (!oneDay || !budget || budget <= 0 || !Number.isFinite(spend)) return null;
  const mode = String(budgetMode ?? "").toUpperCase();
  if (mode !== "BUDGET_MODE_DAY" && mode !== "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" && mode !== "MIXED_DAILY") return null;
  return (spend / budget) * 100;
}

export async function fetchGmvMaxBudgetInfo(
  accessToken: string,
  advertiserId: string,
  campaignId: string
): Promise<{ budget: number; budgetMode: string }> {
  const params = new URLSearchParams({ advertiser_id: advertiserId, campaign_id: campaignId });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/campaign/gmv_max/info/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(`gmv_max/info code=${body.code}: ${String(body.message ?? "").slice(0, 100)}`);
  }
  const budget = parseBudgetAmount(body.data?.budget ?? body.data?.daily_budget ?? body.data?.total_budget);
  if (budget === null) throw new Error("TikTok returned no positive budget value");
  return {
    budget,
    // GMV Max's info budget is the daily budget used by current pacing.
    budgetMode: String(body.data?.budget_mode ?? "BUDGET_MODE_DAY").toUpperCase(),
  };
}
export interface CampaignInfo {
  id: string;
  name: string;
  account: string;
  promotionType: PromotionType;
  status: string | null;
  budget: number | null;
  delivery: string | null;
  rawKeys: string[];
}

// ---- TTAM live metrics (preset-aligned) ----

// Raw API metrics fetched per TTAM row. sfv has no exact API equivalent —
// callers pass video_watched_6s as sfv and MUST surface sfvProxy so the UI
// can label hook-family scores as proxy (spec: plain 6s double-counts).
export const TTAM_METRICS = [
  "spend", "impressions", "clicks", "reach",
  "video_watched_6s", "average_video_play",
  "likes", "comments", "shares", "follows", "profile_visits",
  "live_views", "live_effective_views",
];

export interface TtamRaw {
  spend: number; imp: number; clicks: number; reach: number;
  sfv: number; prof: number; likes: number; sh: number; com: number; fol: number;
  awt: number; live: number; live10: number | null;
}

// Score one row with the scorer's v3 formulas (app.js scoring block).
// live10 null → LQS null. sfvProxy marks hook-family scores as proxy.
export function scoreTtamRow(r: TtamRaw, sfvProxy: boolean): {
  scores: Record<string, number | null>; sfvProxy: boolean;
} {
  const HR = r.imp ? r.sfv / r.imp : 0;
  const PVR = r.imp ? r.prof / r.imp : 0;
  const EDSraw = r.likes ? (r.sh + r.com + r.fol) / r.likes : 0;
  const ACS = r.sfv ? r.spend / r.sfv : 999;
  const ok = ACS !== 0 && ACS !== 999;
  const scores: Record<string, number | null> = {
    ERRI: r.imp ? (r.live / r.imp) * 100 : 0,
    HPS: HR * 100,
    ACS,
    CES: ok ? (10000 * HR * PVR * EDSraw) / ACS : 0,
    EDS: EDSraw * 100,
    VVES: ok ? ((HR * r.awt) / ACS) : 0,
    RVS: ok ? r.awt / ACS : 0,
    HRQ: r.reach ? (r.sfv / r.reach) * 100 : 0,
    RES: r.reach && r.spend ? ((r.sfv / r.reach) * 10) / (r.spend / r.reach) : 0,
    LQS: r.spend && r.live10 !== null ? (r.live10 / r.spend) * 100 : null,
    BCE: ok ? (1000 * HR * PVR) / ACS : 0,
  };
  for (const k of Object.keys(scores)) {
    if (scores[k] !== null && !Number.isFinite(scores[k] as number)) scores[k] = null;
  }
  return { scores, sfvProxy };
}

// Status normalization: TikTok uses several vocabularies — map to ON/OFF,
// anything else passes through raw so the UI shows truth, not a guess.
export function normalizeStatus(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).toUpperCase();
  if (["ENABLE", "ACTIVE", "ON", "DELIVERY_OK", "STATUS_ENABLE", "CAMPAIGN_STATUS_ENABLE"].includes(s)) return "ON";
  if (["DISABLE", "PAUSED", "OFF", "DELETE", "DELETED", "STATUS_DISABLE", "CAMPAIGN_STATUS_DISABLE"].includes(s)) return "OFF";
  return String(v);
}

async function getCampaigns(
  accessToken: string,
  advertiserId: string,
  promotionType: PromotionType
): Promise<Map<string, CampaignInfo>> {
  const out = new Map<string, CampaignInfo>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
      page: String(page),
      page_size: "100",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/campaign/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`campaign/get code=${body.code}: ${body.message ?? ""}`);
    for (const c of body.data?.list ?? []) {
      const parsed = parseCampaignName(c.campaign_name ?? "");
      const keys = Object.keys(c ?? {});
      const rawStatus =
        c.status ?? c.campaign_status ?? c.operation_status ??
        c.delivery_status ?? c.secondary_status ?? null;
      const rawBudget =
        c.budget ?? c.daily_budget ?? c.total_budget ?? c.budget_amount ??
        c.day_budget ?? null;
      const nBudget = rawBudget === null || rawBudget === undefined || rawBudget === ""
        ? null
        : Number(rawBudget);
      const rawDelivery = c.secondary_status ?? c.delivery_status ?? null;
      const delivery = formatDelivery(
        rawDelivery === null || rawDelivery === undefined || String(rawDelivery).trim() === ""
          ? null
          : String(rawDelivery).trim()
      );
      out.set(c.campaign_id, {
        id: c.campaign_id,
        name: parsed.name || c.campaign_name || c.campaign_id,
        account: parsed.account,
        promotionType,
        status: normalizeStatus(rawStatus),
        budget: nBudget !== null && Number.isFinite(nBudget) && nBudget > 0 ? nBudget : null,
        delivery,
        rawKeys: keys,
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return out;
}

export async function syncShopCampaigns(shopNumber: string) {  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  if (!shop.hasGMVCampaigns) return { shop: shop.name, synced: 0, skipped: true as const };

  const all = new Map<string, CampaignInfo>();
  for (const t of PROMOTION_TYPES) {
    for (const [id, c] of await getCampaigns(creds.access_token, shop.advertiserId, t)) {
      all.set(id, c);
    }
  }
  // Parent rows first: core.shops -> gmv.gmv_shops -> gmv.gmv_campaigns.
  await query(
    `INSERT INTO core.shops (shop_id) VALUES ($1) ON CONFLICT (shop_id) DO NOTHING`,
    [shop.shopId]
  );
  await query(
    `INSERT INTO gmv.gmv_shops (shop_id, display_name) VALUES ($1, $2)
     ON CONFLICT (shop_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
    [shop.shopId, shop.name]
  );
  for (const c of all.values()) {
    await query(
      `INSERT INTO gmv.gmv_campaigns
         (campaign_id, shop_id, kind, name, account, promotion_type, advertiser_id, status, budget, delivery, raw, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now())
       ON CONFLICT (campaign_id) DO UPDATE SET
         shop_id = EXCLUDED.shop_id, kind = EXCLUDED.kind, name = EXCLUDED.name,
         account = EXCLUDED.account, promotion_type = EXCLUDED.promotion_type,
         advertiser_id = EXCLUDED.advertiser_id, status = EXCLUDED.status,
         budget = EXCLUDED.budget, delivery = EXCLUDED.delivery,
         raw = EXCLUDED.raw, updated_at = now()`,
      [
        c.id,
        shop.shopId,
        c.promotionType === "LIVE_GMV_MAX" ? "LIVE" : "PRODUCT",
        c.name,
        c.account,
        c.promotionType,
        shop.advertiserId,
        c.status,
        c.budget,
        c.delivery,
        JSON.stringify({ keys: c.rawKeys }),
      ]
    );
  }
  const accounts = [...new Set([...all.values()].map((c) => c.account))].sort();
  const unbracketed = [...all.values()].filter((c) => c.account === "Other").length;
  const sample = [...all.values()][0];
  const statusValues = [...new Set([...all.values()].map((c) => c.status ?? "(null)"))];
  const deliveryValues = [...new Set([...all.values()].map((c) => c.delivery ?? "(null)"))];
  return { shop: shop.name, synced: all.size, skipped: false as const, accounts, unbracketed, sample_keys: sample?.rawKeys ?? [], status_values: statusValues, delivery_values: deliveryValues };
}

export interface ReportRow {
  campaignId: string;
  cost: number;
  gmv: number;
  orders: number;
}

async function fetchGMVMaxReport(
  accessToken: string,
  advertiserId: string,
  shopId: string,
  promotionType: PromotionType,
  startDate: string,
  endDate: string
): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      store_ids: JSON.stringify([shopId]),
      gmv_max_promotion_type: promotionType,
      dimensions: JSON.stringify(["stat_time_day", "campaign_id"]),
      metrics: JSON.stringify(["cost", "orders", "gross_revenue", "roi", "cost_per_order", "net_cost"]),
      start_date: startDate,
      end_date: endDate,
      page: String(page),
      page_size: "1000",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`report/get code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      rows.push({
        campaignId: item.dimensions?.campaign_id,
        cost: parseFloat(item.metrics?.cost ?? 0),
        gmv: parseFloat(item.metrics?.gross_revenue ?? 0),
        orders: parseInt(item.metrics?.orders ?? 0, 10),
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return rows;
}

const FEE_RATE = 0.25; // net lock (plan.md §2): net = gross * (1 - fee)
const MAX_ACTIVE_GMV_BUDGET_LOOKUPS = 15;

export async function getShopReport(
  shopNumber: string,
  promotionType: PromotionType,
  startDate: string,
  endDate: string,
  includeBudgetInfo = false
) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  // Campaign map from Neon (M3 sync), scoped to the requested type —
  // the report API can return mixed types, so filter by promotion_type here.
  // Delivery column exists after 011 migration — tolerate pre-migration DBs.
  let cmap;
  try {
    cmap = await query(
      `SELECT campaign_id, name, account, status, delivery, budget FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
      [shop.shopId, promotionType]
    );
  } catch {
    try {
      cmap = await query(
        `SELECT campaign_id, name, account, status, budget FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
        [shop.shopId, promotionType]
      );
    } catch {
      cmap = await query(
        `SELECT campaign_id, name, account, status FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
        [shop.shopId, promotionType]
      );
    }
  }
  const info = new Map<string, {
    name: string; account: string; status: string | null; delivery: string | null;
    budget: number | null; budgetMode: string | null;
  }>();
  for (const r of cmap.rows) info.set(r.campaign_id, {
    name: r.name, account: r.account ?? "Other", status: r.status ?? null,
    delivery: r.delivery ?? null, budget: parseBudgetAmount(r.budget),
    budgetMode: r.budget === null || r.budget === undefined ? null : "BUDGET_MODE_DAY",
  });

  const rows = await fetchGMVMaxReport(
    creds.access_token, shop.advertiserId, shop.shopId, promotionType, startDate, endDate
  );
  // API can return mixed types: keep only campaigns of the synced map for this shop.
  const filtered = rows.filter((r) => info.has(r.campaignId));

  let totalCost = 0, totalGMV = 0, totalOrders = 0;
  const byAccount = new Map<string, { cost: number; gmv: number; orders: number; campaigns: number }>();
  const byCampaign = new Map<string, { cost: number; gmv: number; orders: number }>();
  for (const r of filtered) {
    totalCost += r.cost; totalGMV += r.gmv; totalOrders += r.orders;
    const meta = info.get(r.campaignId) ?? { name: r.campaignId, account: "Other", status: null, delivery: null };
    const a = byAccount.get(meta.account) ?? { cost: 0, gmv: 0, orders: 0, campaigns: 0 };
    a.cost += r.cost; a.gmv += r.gmv; a.orders += r.orders; a.campaigns += 1;
    byAccount.set(meta.account, a);
    const c = byCampaign.get(r.campaignId) ?? { cost: 0, gmv: 0, orders: 0 };
    c.cost += r.cost; c.gmv += r.gmv; c.orders += r.orders;
    byCampaign.set(r.campaignId, c);
  }

  // GMV Max campaign/get has no budget for this account. Read the budget only
  // for ON campaigns present in this report, at most 15 per dashboard fetch;
  // successful values are cached so repeated fetches progressively fill rows.
  if (includeBudgetInfo) {
    const needBudget = [...byCampaign.entries()]
      .filter(([campaignId]) => {
        const meta = info.get(campaignId);
        return meta?.status === "ON" && meta.budget === null;
      })
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, MAX_ACTIVE_GMV_BUDGET_LOOKUPS);
    for (let i = 0; i < needBudget.length; i++) {
      const [campaignId] = needBudget[i];
      try {
        const fresh = await fetchGmvMaxBudgetInfo(creds.access_token, shop.advertiserId, campaignId);
        const meta = info.get(campaignId);
        if (meta) {
          meta.budget = fresh.budget;
          meta.budgetMode = fresh.budgetMode;
        }
        await query(
          `UPDATE gmv.gmv_campaigns SET budget = $1, updated_at = now() WHERE campaign_id = $2`,
          [fresh.budget, campaignId]
        );
      } catch {
        // Read-only budget enrichment is fail-open; report metrics still render.
      }
      if (i + 1 < needBudget.length) await new Promise((r) => setTimeout(r, 350));
    }
  }
  const net = totalGMV * (1 - FEE_RATE);
  const accounts = [...byAccount.entries()].map(([name, d]) => ({
    name, ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0,
  })).sort((a, b) => b.gmv - a.gmv);
  const campaigns = [...byCampaign.entries()].map(([campaignId, d]) => {
    const meta = info.get(campaignId) ?? { name: campaignId, account: "Other", status: null, delivery: null, budget: null, budgetMode: null };
    return {
      campaignId, campaignName: meta.name, accountName: meta.account,
      status: meta.status, delivery: meta.delivery,
      budget: meta.status === "ON" ? meta.budget : null,
      budgetMode: meta.budgetMode,
      budgetSource: meta.status === "ON" && meta.budget !== null ? "campaign" : null,
      budgetUsagePct: budgetUsagePercent(d.cost, meta.status === "ON" ? meta.budget : null, meta.budgetMode, startDate === endDate),
      ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0,
    };
  }).sort((a, b) => a.accountName.localeCompare(b.accountName) || b.gmv - a.gmv);
  const budgetRefreshRemaining = campaigns.filter((c) => c.status === "ON" && c.budget === null).length;
  return {
    shopName: shop.name, promotionType,
    gmv: totalGMV, cost: totalCost, roi: totalCost > 0 ? totalGMV / totalCost : 0,
    net, net_roi: totalCost > 0 ? net / totalCost : 0,
    orderCount: totalOrders, campaignCount: filtered.length,
    currency: "MYR", dateRange: { start: startDate, end: endDate },
    accounts, campaigns, budgetRefreshRemaining,
  };
}

// Live sessions drill (single campaign only): room_id x stat_time_day.
// The report API accepts one campaign_id in filtering here; multi-ID fails.
// Livestream status comes from a second livestream-level call (probe-verified
// 07 Oct: dimensions ["room_id"], single-campaign filter, metrics
// live_status/live_launched_time/live_duration). Status is current TikTok
// state, not historical — launched_time is UTC, converted to MYT for display.
// Fail-open: rows render without status if the lookup fails.
function liveLaunchedMyt(raw: unknown): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(raw ?? ""));
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  const myt = new Date(utc + 8 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${myt.getUTCFullYear()}-${p(myt.getUTCMonth() + 1)}-${p(myt.getUTCDate())} ${p(myt.getUTCHours())}:${p(myt.getUTCMinutes())} MYT`;
}

export async function getCampaignSessions(
  shopNumber: string,
  campaignId: string,
  startDate: string,
  endDate: string
) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  const params = new URLSearchParams({
    advertiser_id: shop.advertiserId,
    store_ids: JSON.stringify([shop.shopId]),
    gmv_max_promotion_type: "LIVE_GMV_MAX",
    dimensions: JSON.stringify(["room_id", "stat_time_day"]),
    filtering: JSON.stringify({ campaign_ids: [campaignId] }),
    metrics: JSON.stringify(["cost", "orders", "gross_revenue", "roi"]),
    start_date: startDate,
    end_date: endDate,
    page_size: "1000",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
    { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  if (body.code !== 0) throw new Error(`sessions report code=${body.code}: ${body.message ?? ""}`);
  const sessions = (body.data?.list ?? []).map((item: any) => ({
    roomId: item.dimensions?.room_id ?? "",
    day: item.dimensions?.stat_time_day ?? "",
    cost: parseFloat(item.metrics?.cost ?? 0),
    gmv: parseFloat(item.metrics?.gross_revenue ?? 0),
    orders: parseInt(item.metrics?.orders ?? 0, 10),
    roi: parseFloat(item.metrics?.roi ?? 0),
    liveStatus: null as string | null,
    liveLaunchedMyt: null as string | null,
    liveDuration: null as string | null,
  }));
  try {
    const sparams = new URLSearchParams({
      advertiser_id: shop.advertiserId,
      store_ids: JSON.stringify([shop.shopId]),
      gmv_max_promotion_type: "LIVE_GMV_MAX",
      dimensions: JSON.stringify(["room_id"]),
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      metrics: JSON.stringify(["live_status", "live_launched_time", "live_duration"]),
      start_date: endDate,
      end_date: endDate,
      page: "1",
      page_size: "100",
    });
    const sres = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${sparams.toString()}`,
      { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
    );
    const sbody = await sres.json();
    if (sbody.code === 0) {
      const byRoom = new Map<string, { status: string; launched: string | null; duration: string | null }>();
      for (const item of sbody.data?.list ?? []) {
        const room = String(item.dimensions?.room_id ?? "");
        if (!room) continue;
        byRoom.set(room, {
          status: String(item.metrics?.live_status ?? ""),
          launched: liveLaunchedMyt(item.metrics?.live_launched_time),
          duration: String(item.metrics?.live_duration ?? "") || null,
        });
      }
      for (const s of sessions) {
        const meta = byRoom.get(s.roomId);
        if (meta) {
          s.liveStatus = meta.status || null;
          s.liveLaunchedMyt = meta.launched;
          s.liveDuration = meta.duration;
        }
      }
    }
  } catch {
    // Status enrichment is fail-open; spend rows still render.
  }
  const totalCost = sessions.reduce((s: number, x: any) => s + x.cost, 0);
  const totalGMV = sessions.reduce((s: number, x: any) => s + x.gmv, 0);
  return { shopName: shop.name, campaignId, sessions, totalCost, totalGMV };
}

// All GMV Max campaign IDs for an advertiser (both types) — exclusion set for TTAM.
export async function getGMVMaxIds(accessToken: string, advertiserId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const t of PROMOTION_TYPES) {
    for (const [id] of await getCampaigns(accessToken, advertiserId, t)) ids.add(id);
  }
  return ids;
}

// Classic (manual/TTAM) campaigns for an advertiser: campaign/get returns
// classic rows only (zero GMV rows — verified). Fail-open: on any error the
// caller still shows spend rows with id-only names.
export async function getManualCampaigns(
  accessToken: string,
  advertiserId: string
): Promise<Map<string, {
  name: string; status: string | null; budget: number | null;
  budgetMode: string | null; budgetOptimizeOn: boolean;
}>> {
  const out = new Map<string, {
    name: string; status: string | null; budget: number | null;
    budgetMode: string | null; budgetOptimizeOn: boolean;
  }>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      page: String(page),
      page_size: "100",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/campaign/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`campaign/get code=${body.code}: ${body.message ?? ""}`);
    for (const c of body.data?.list ?? []) {
      const id = c.campaign_id ?? c.id;
      if (!id) continue;
      out.set(String(id), {
        name: c.campaign_name ?? c.name ?? String(id),
        status: normalizeStatus(
          c.operation_status ?? c.status ?? c.campaign_status ?? c.delivery_status ?? null
        ),
        budget: parseBudgetAmount(c.budget),
        budgetMode: c.budget_mode ? String(c.budget_mode).toUpperCase() : null,
        budgetOptimizeOn: c.budget_optimize_on === true || c.budget_optimize_on === "true",
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return out;
}

type AdgroupBudgetSummary = {
  budget: number | null;
  budgetMode: string | null;
};

async function getManualAdgroupBudgetSummaries(
  accessToken: string,
  advertiserId: string,
  campaignIds: string[]
): Promise<Map<string, AdgroupBudgetSummary>> {
  const grouped = new Map<string, { budget: number | null; mode: string | null }[]>();
  const ids = [...new Set(campaignIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const params = new URLSearchParams({
        advertiser_id: advertiserId,
        filtering: JSON.stringify({ campaign_ids: batch }),
        page: String(page),
        page_size: "100",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/adgroup/get/?${params.toString()}`,
        { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      if (body.code !== 0) throw new Error(`adgroup/get budget code=${body.code}: ${body.message ?? ""}`);
      for (const row of body.data?.list ?? []) {
        const campaignId = String(row.campaign_id ?? "");
        if (!campaignId || !batch.includes(campaignId)) continue;
        const values = grouped.get(campaignId) ?? [];
        values.push({
          budget: parseBudgetAmount(row.budget),
          mode: row.budget_mode ? String(row.budget_mode).toUpperCase() : null,
        });
        grouped.set(campaignId, values);
      }
      const total = body.data?.page_info?.total_page ?? 1;
      if (page >= total) hasMore = false;
      else {
        page++;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (i + 50 < ids.length) await new Promise((r) => setTimeout(r, 300));
  }

  const out = new Map<string, AdgroupBudgetSummary>();
  for (const [campaignId, rows] of grouped) {
    const modes = new Set(rows.map((r) => r.mode));
    const allDaily = rows.length > 0 && rows.every((r) => r.budget !== null && (
      r.mode === "BUDGET_MODE_DAY" || r.mode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET"
    ));
    const allLifetime = rows.length > 0 && rows.every((r) => r.budget !== null && r.mode === "BUDGET_MODE_TOTAL");
    if (allDaily || allLifetime) {
      out.set(campaignId, {
        budget: rows.reduce((sum, r) => sum + (r.budget ?? 0), 0),
        budgetMode: allLifetime
          ? "BUDGET_MODE_TOTAL"
          : modes.size === 1 ? rows[0].mode : "MIXED_DAILY",
      });
    } else {
      // Do not invent a single limit when child groups mix capped and uncapped
      // or daily and lifetime modes.
      out.set(campaignId, { budget: null, budgetMode: modes.size === 1 ? rows[0].mode : "MIXED" });
    }
  }
  return out;
}

// True manual (TTAM) spend: integrated report minus GMV Max campaigns.
// Serialized + delayed: Ads API rate-limits parallel report calls.
export async function fetchManualSpend(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<{ spend: number; campaignCount: number; rows: { campaign_id: string; spend: number }[] }> {
  const gmvIds = await getGMVMaxIds(accessToken, advertiserId);
  // Per-campaign raw sums. Extended metric set first, spend-only fallback.
  const sums = new Map<string, Record<string, number>>();
  const add = (cid: string, metrics: any) => {
    let row = sums.get(cid);
    if (!row) {
      row = {};
      for (const m of TTAM_METRICS) row[m] = 0;
      sums.set(cid, row);
    }
    for (const m of TTAM_METRICS) {
      const v = parseFloat(metrics?.[m] ?? 0);
      if (Number.isFinite(v)) row[m] += v;
    }
  };
  const pull = async (metrics: string[]) => {
    let spend = 0;
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const params = new URLSearchParams({
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        dimensions: JSON.stringify(["stat_time_day", "campaign_id"]),
        metrics: JSON.stringify(metrics),
        start_date: startDate,
        end_date: endDate,
        page: String(page),
        page_size: "1000",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
        { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      if (body.code !== 0) throw new Error(`integrated/get code=${body.code}: ${body.message ?? ""}`);
      for (const item of body.data?.list ?? []) {
        const cid = item.dimensions?.campaign_id;
        if (cid && !gmvIds.has(cid)) {
          add(cid, item.metrics ?? {});
          const s = parseFloat(item.metrics?.spend ?? 0);
          if (Number.isFinite(s)) spend += s;
        }
      }
      const total = body.data?.page_info?.total_page ?? 1;
      if (page >= total) hasMore = false;
      else {
        page++;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return spend;
  };
  let spend: number;
  let full = true;
  try {
    spend = await pull(TTAM_METRICS);
  } catch {
    sums.clear();
    full = false;
    spend = await pull(["spend"]);
  }
  const toRaw = (row: Record<string, number>): TtamRaw => ({
    spend: row.spend ?? 0, imp: row.impressions ?? 0, clicks: row.clicks ?? 0,
    reach: row.reach ?? 0, sfv: row.video_watched_6s ?? 0,
    prof: row.profile_visits ?? 0, likes: row.likes ?? 0, sh: row.shares ?? 0,
    com: row.comments ?? 0, fol: row.follows ?? 0,
    awt: row.average_video_play ?? 0, live: row.live_views ?? 0,
    // live10 presumed = live_effective_views (accepted at all grains, exact
    // 10s meaning unverified — UI labels LQS as proxy until xlsx cross-check).
    live10: row.live_effective_views ?? null,
  });
  const rows = [...sums.entries()]
    .map(([campaign_id, row]) => {
      const raw = toRaw(row);
      const { scores } = scoreTtamRow(raw, true);
      return { campaign_id, spend: raw.spend, metrics: full ? row : null, scores: full ? scores : null, sfvProxy: full };
    })
    .sort((a, b) => b.spend - a.spend);
  return { spend, campaignCount: sums.size, rows };
}

// Active TTAM preset (bands + guardrails + notes). Fail-open: null →
// callers fall back to hardcoded theory.
export async function getActiveTtamPreset(): Promise<{
  preset_key: string; label: string; metrics: any[]; guardrails: any; notes: string;
} | null> {
  try {
    const r = await query(
      `SELECT preset_key, label, metrics, guardrails, notes FROM ttam.presets WHERE active = true ORDER BY updated_at DESC LIMIT 1`
    );
    if (!r.rows.length) return null;
    const p = r.rows[0];
    return {
      preset_key: p.preset_key, label: p.label,
      metrics: Array.isArray(p.metrics) ? p.metrics : [],
      guardrails: p.guardrails ?? {}, notes: p.notes ?? "",
    };
  } catch {
    return null;
  }
}

export async function getShopROAS(
  shopNumber: string,
  startDate: string,
  endDate: string,
  includeCampaignBudgets = false
) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  // NOTE: numerator is attributed GMV Max revenue (Shop-order GMV needs shop
  // tokens in credentials.refresh_tiktokshops_token — future step).
  const live = shop.hasGMVCampaigns
    ? await getShopReport(shopNumber, "LIVE_GMV_MAX", startDate, endDate)
    : null;
  const product = shop.hasGMVCampaigns
    ? await getShopReport(shopNumber, "PRODUCT_GMV_MAX", startDate, endDate)
    : null;
  const manual = await fetchManualSpend(creds.access_token, shop.advertiserId, startDate, endDate);
  const preset = await getActiveTtamPreset();  // Campaign names + status (fail-open: spend rows show id-only on lookup error).
  let manualCampaigns: {
    campaign_id: string; name: string; status: string | null; spend: number;
    budget: number | null; budgetMode: string | null; budgetSource: string | null;
    budgetUsagePct: number | null;
  }[] = [];
  try {
    const info = await getManualCampaigns(creds.access_token, shop.advertiserId);
    const groupBudgetIds = includeCampaignBudgets
      ? manual.rows.filter((r) => {
        const campaign = info.get(String(r.campaign_id));
        return !campaign?.budget || campaign.budgetMode === "BUDGET_MODE_INFINITE";
      }).map((r) => String(r.campaign_id))
      : [];
    let groupBudgets = new Map<string, AdgroupBudgetSummary>();
    if (groupBudgetIds.length > 0) {
      try {
        groupBudgets = await getManualAdgroupBudgetSummaries(
          creds.access_token, shop.advertiserId, groupBudgetIds
        );
      } catch (e) {
        console.error("[ttam-budget] adgroup budget lookup failed", e instanceof Error ? e.message : "failed");
      }
    }
    manualCampaigns = manual.rows.map((r) => {
      const campaignId = String(r.campaign_id);
      const campaign = info.get(campaignId);
      const groups = groupBudgets.get(campaignId);
      const useCampaignBudget = !!campaign?.budget && campaign.budgetMode !== "BUDGET_MODE_INFINITE";
      const budget = includeCampaignBudgets
        ? useCampaignBudget ? campaign?.budget ?? null : groups?.budget ?? null
        : null;
      const budgetMode = includeCampaignBudgets
        ? useCampaignBudget ? campaign?.budgetMode ?? null : groups?.budgetMode ?? campaign?.budgetMode ?? null
        : null;
      return {
        ...r,
        campaign_id: campaignId,
        name: campaign?.name ?? campaignId,
        status: campaign?.status ?? null,
        budget,
        budgetMode,
        budgetSource: includeCampaignBudgets
          ? useCampaignBudget ? "campaign" : groups ? "adgroups" : null
          : null,
        budgetUsagePct: includeCampaignBudgets
          ? budgetUsagePercent(r.spend, budget, budgetMode, startDate === endDate)
          : null,
      };
    });
  } catch {
    manualCampaigns = manual.rows.map((r) => ({
      ...r, name: r.campaign_id, status: null, budget: null,
      budgetMode: null, budgetSource: null, budgetUsagePct: null,
    }));
  }
  const gmv = (live?.gmv ?? 0) + (product?.gmv ?? 0);
  const gmvMaxCost = (live?.cost ?? 0) + (product?.cost ?? 0);
  const totalAdsSpend = gmvMaxCost + manual.spend;
  const sst = totalAdsSpend * 0.08;
  const wht = totalAdsSpend * 0.08;
  const totalCostWithTaxes = totalAdsSpend + sst + wht;
  // Locked manual parity (03 Oct, shop 1, Seller Center vs ads-attributed):
  // 24–27 Sep shop GMV 143,941.26 / 1,016 orders vs ads 169,805.12.
  // Display-only reference until the Shop API token route is unblocked.
  const shopTruthRef = {
    start: "2026-09-24",
    end: "2026-09-27",
    shopGMV: 143941.26,
    shopOrders: 1016,
    adsGMV: 169805.12,
    ratio: 169805.12 / 143941.26,
  };
  return {
    shopName: shop.name,
    gmv,
    liveGMVMaxCost: live?.cost ?? 0,
    productGMVMaxCost: product?.cost ?? 0,
    gmvMaxCost,
    manualCampaignSpend: manual.spend,
    manualCampaignCount: manual.campaignCount,
    manualCampaigns,
    preset,
    orderCount: (live?.orderCount ?? 0) + (product?.orderCount ?? 0),
    totalAdsSpend,
    sst, wht, totalCostWithTaxes,
    roas: totalAdsSpend > 0 ? gmv / totalAdsSpend : 0,
    actualRoas: totalCostWithTaxes > 0 ? gmv / totalCostWithTaxes : 0,
    shopTruthRef,
    currency: "MYR", dateRange: { start: startDate, end: endDate },
  };
}
