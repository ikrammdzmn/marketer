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

export interface CampaignInfo {
  id: string;
  name: string;
  account: string;
  promotionType: PromotionType;
  status: string | null;
  rawKeys: string[];
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
      out.set(c.campaign_id, {
        id: c.campaign_id,
        name: parsed.name || c.campaign_name || c.campaign_id,
        account: parsed.account,
        promotionType,
        status: normalizeStatus(rawStatus),
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
         (campaign_id, shop_id, kind, name, account, promotion_type, advertiser_id, status, raw, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
       ON CONFLICT (campaign_id) DO UPDATE SET
         shop_id = EXCLUDED.shop_id, kind = EXCLUDED.kind, name = EXCLUDED.name,
         account = EXCLUDED.account, promotion_type = EXCLUDED.promotion_type,
         advertiser_id = EXCLUDED.advertiser_id, status = EXCLUDED.status,
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
        JSON.stringify({ keys: c.rawKeys }),
      ]
    );
  }
  const accounts = [...new Set([...all.values()].map((c) => c.account))].sort();
  const unbracketed = [...all.values()].filter((c) => c.account === "Other").length;
  const sample = [...all.values()][0];
  const statusValues = [...new Set([...all.values()].map((c) => c.status ?? "(null)"))];
  return { shop: shop.name, synced: all.size, skipped: false as const, accounts, unbracketed, sample_keys: sample?.rawKeys ?? [], status_values: statusValues };
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

export async function getShopReport(  shopNumber: string,
  promotionType: PromotionType,
  startDate: string,
  endDate: string
) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  // Campaign map from Neon (M3 sync), scoped to the requested type —
  // the report API can return mixed types, so filter by promotion_type here.
  const cmap = await query(
    `SELECT campaign_id, name, account, status FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
    [shop.shopId, promotionType]
  );
  const info = new Map<string, { name: string; account: string; status: string | null }>();
  for (const r of cmap.rows) info.set(r.campaign_id, { name: r.name, account: r.account ?? "Other", status: r.status ?? null });

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
    const meta = info.get(r.campaignId) ?? { name: r.campaignId, account: "Other", status: null };
    const a = byAccount.get(meta.account) ?? { cost: 0, gmv: 0, orders: 0, campaigns: 0 };
    a.cost += r.cost; a.gmv += r.gmv; a.orders += r.orders; a.campaigns += 1;
    byAccount.set(meta.account, a);
    const c = byCampaign.get(r.campaignId) ?? { cost: 0, gmv: 0, orders: 0 };
    c.cost += r.cost; c.gmv += r.gmv; c.orders += r.orders;
    byCampaign.set(r.campaignId, c);
  }
  const net = totalGMV * (1 - FEE_RATE);
  const accounts = [...byAccount.entries()].map(([name, d]) => ({
    name, ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0,
  })).sort((a, b) => b.gmv - a.gmv);
  const campaigns = [...byCampaign.entries()].map(([campaignId, d]) => {
    const meta = info.get(campaignId) ?? { name: campaignId, account: "Other", status: null };
    return { campaignId, campaignName: meta.name, accountName: meta.account, status: meta.status, ...d, roi: d.cost > 0 ? d.gmv / d.cost : 0 };
  }).sort((a, b) => a.accountName.localeCompare(b.accountName) || b.gmv - a.gmv);
  return {
    shopName: shop.name, promotionType,
    gmv: totalGMV, cost: totalCost, roi: totalCost > 0 ? totalGMV / totalCost : 0,
    net, net_roi: totalCost > 0 ? net / totalCost : 0,
    orderCount: totalOrders, campaignCount: filtered.length,
    currency: "MYR", dateRange: { start: startDate, end: endDate },
    accounts, campaigns,
  };
}

// Live sessions drill (single campaign only): room_id x stat_time_day.
// The report API accepts one campaign_id in filtering here; multi-ID fails.
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
  }));
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

// True manual (TTAM) spend: integrated report minus GMV Max campaigns.
// Serialized + delayed: Ads API rate-limits parallel report calls.
export async function fetchManualSpend(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<{ spend: number; campaignCount: number }> {
  const gmvIds = await getGMVMaxIds(accessToken, advertiserId);
  let spend = 0;
  const seen = new Set<string>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: JSON.stringify(["stat_time_day", "campaign_id"]),
      metrics: JSON.stringify(["spend"]),
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
        spend += parseFloat(item.metrics?.spend ?? 0);
        seen.add(cid);
      }
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return { spend, campaignCount: seen.size };
}

export async function getShopROAS(shopNumber: string, startDate: string, endDate: string) {
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
    orderCount: (live?.orderCount ?? 0) + (product?.orderCount ?? 0),
    totalAdsSpend,
    sst, wht, totalCostWithTaxes,
    roas: totalAdsSpend > 0 ? gmv / totalAdsSpend : 0,
    actualRoas: totalCostWithTaxes > 0 ? gmv / totalCostWithTaxes : 0,
    shopTruthRef,
    currency: "MYR", dateRange: { start: startDate, end: endDate },
  };
}
