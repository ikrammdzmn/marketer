// Shop Cost module (shop 1): spend share per stream (LIVE / Product / TTAM).
// Denominator is ads spend only (no SST/WHT). Range ≤31d, 1-day supported.
// Single range pull per stream with stat_time_day grain, then grouped per
// day (trend) and per campaign (campaign % tables). No budget writes.

import { query } from "./db";
import { getAdsCredentials } from "./ads-credentials";
import { SHOPS } from "./shops";
import { getManualCampaigns, getGMVMaxIds, parseCampaignName } from "./gmv";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";
const MAX_DAYS = 31;

export type ShopCostStream = "live" | "product" | "ttam";

export interface ShopCostCampaign {
  campaignId: string;
  name: string;
  account: string;
  spend: number;
  gmv: number | null;
  orders: number | null;
  pctOfStream: number | null;
  pctOfTotal: number | null;
}

export interface ShopCostDay {
  date: string;
  live: number;
  product: number;
  ttam: number;
  total: number;
  livePct: number | null;
  productPct: number | null;
  ttamPct: number | null;
}

function isIsoDay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
}

// TikTok day grains sometimes arrive as "YYYY-MM-DD HH:MM:SS" — the daily
// buckets only match exact ISO days, so normalize to the date portion.
// (Unparseable values fall back to "" and are excluded from day buckets
// but still counted in campaign totals.)
function normDay(raw: unknown): string {
  const d = String(raw ?? "").slice(0, 10);
  return isIsoDay(d) ? d : "";
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  for (let t = d.getTime(); t <= stop.getTime(); t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface DayCampaignRow {
  day: string;
  campaignId: string;
  cost: number;
  gmv: number;
  orders: number;
}

// GMV Max day x campaign rows for one promotion type.
async function fetchGmvDayRows(
  accessToken: string,
  advertiserId: string,
  shopId: string,
  promotionType: "LIVE_GMV_MAX" | "PRODUCT_GMV_MAX",
  startDate: string,
  endDate: string
): Promise<DayCampaignRow[]> {
  const rows: DayCampaignRow[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      store_ids: JSON.stringify([shopId]),
      gmv_max_promotion_type: promotionType,
      dimensions: JSON.stringify(["stat_time_day", "campaign_id"]),
      metrics: JSON.stringify(["cost", "orders", "gross_revenue"]),
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
    if (body.code !== 0) throw new Error(`gmv report code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      const cid = String(item.dimensions?.campaign_id ?? "");
      if (!cid || cid === "-") continue;
      rows.push({
        day: normDay(item.dimensions?.stat_time_day),
        campaignId: cid,
        cost: Number.parseFloat(item.metrics?.cost ?? 0) || 0,
        gmv: Number.parseFloat(item.metrics?.gross_revenue ?? 0) || 0,
        orders: Number.parseInt(item.metrics?.orders ?? 0, 10) || 0,
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await sleep(400);
    }
  }
  return rows;
}

// TTAM day x campaign spend rows (GMV ids excluded).
async function fetchManualDayRows(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<DayCampaignRow[]> {
  const gmvIds = await getGMVMaxIds(accessToken, advertiserId);
  const rows: DayCampaignRow[] = [];
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
    if (body.code !== 0) throw new Error(`ttam report code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      const cid = String(item.dimensions?.campaign_id ?? "");
      if (!cid || cid === "-" || gmvIds.has(cid)) continue;
      rows.push({
        day: normDay(item.dimensions?.stat_time_day),
        campaignId: cid,
        cost: Number.parseFloat(item.metrics?.spend ?? 0) || 0,
        gmv: 0,
        orders: 0,
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await sleep(400);
    }
  }
  return rows;
}

async function gmvNameMap(shopId: string): Promise<{
  names: Map<string, { name: string; account: string }>;
  promoOf: Map<string, string>;
}> {
  const names = new Map<string, { name: string; account: string }>();
  const promoOf = new Map<string, string>();
  try {
    let r;
    try {
      r = await query(
        `SELECT campaign_id, name, account, promotion_type FROM gmv.gmv_campaigns WHERE shop_id = $1`,
        [shopId]
      );
    } catch {
      r = await query(`SELECT campaign_id, name, account FROM gmv.gmv_campaigns WHERE shop_id = $1`, [shopId]);
    }
    for (const row of r.rows) {
      names.set(String(row.campaign_id), {
        name: String(row.name ?? row.campaign_id),
        account: String(row.account ?? "Other"),
      });
      if (row.promotion_type) promoOf.set(String(row.campaign_id), String(row.promotion_type));
    }
  } catch {
    // Fail-open: id-only names below, no type filter.
  }
  return { names, promoOf };
}

export async function getShopCost(shopNumber: string, startDate: string, endDate: string) {
  if (shopNumber !== "1") throw new Error("shop-cost v1 supports shop 1 only");
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (!isIsoDay(startDate) || !isIsoDay(endDate) || startDate > endDate) {
    throw new Error("need startDate <= endDate (YYYY-MM-DD)");
  }
  const days = eachDay(startDate, endDate);
  if (days.length < 1 || days.length > MAX_DAYS) throw new Error(`range must be 1–${MAX_DAYS} days`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  // Serial pulls: Ads API rate-limits parallel report calls.
  let liveRows = shop.hasGMVCampaigns
    ? await fetchGmvDayRows(creds.access_token, shop.advertiserId, shop.shopId, "LIVE_GMV_MAX", startDate, endDate)
    : [];
  await sleep(300);
  let productRows = shop.hasGMVCampaigns
    ? await fetchGmvDayRows(creds.access_token, shop.advertiserId, shop.shopId, "PRODUCT_GMV_MAX", startDate, endDate)
    : [];
  await sleep(300);
  const ttamRows = await fetchManualDayRows(creds.access_token, shop.advertiserId, startDate, endDate);

  const { names, promoOf } = await gmvNameMap(shop.shopId);
  // Mixed-type bleed (bugs 16/24): the report API can return the other type's
  // rows despite gmv_max_promotion_type. Drop only rows positively mapped to
  // the other type in Neon; unmapped ids stay with the requested stream so no
  // spend is silently lost.
  liveRows = liveRows.filter((r) => (promoOf.get(r.campaignId) ?? "LIVE_GMV_MAX") === "LIVE_GMV_MAX");
  productRows = productRows.filter((r) => (promoOf.get(r.campaignId) ?? "PRODUCT_GMV_MAX") === "PRODUCT_GMV_MAX");

  const inRange = new Set(days);
  const liveByDay = new Map<string, number>();
  const productByDay = new Map<string, number>();
  const ttamByDay = new Map<string, number>();
  for (const d of days) {
    liveByDay.set(d, 0);
    productByDay.set(d, 0);
    ttamByDay.set(d, 0);
  }
  const bump = (m: Map<string, number>, day: string, v: number) => {
    if (day && inRange.has(day)) m.set(day, (m.get(day) ?? 0) + v);
  };
  for (const r of liveRows) bump(liveByDay, r.day, r.cost);
  for (const r of productRows) bump(productByDay, r.day, r.cost);
  for (const r of ttamRows) bump(ttamByDay, r.day, r.cost);

  const dayList: ShopCostDay[] = days.map((date) => {
    const live = liveByDay.get(date) ?? 0;
    const product = productByDay.get(date) ?? 0;
    const ttam = ttamByDay.get(date) ?? 0;
    const total = live + product + ttam;
    return {
      date, live, product, ttam, total,
      livePct: total > 0 ? (live / total) * 100 : null,
      productPct: total > 0 ? (product / total) * 100 : null,
      ttamPct: total > 0 ? (ttam / total) * 100 : null,
    };
  });

  // Stream totals come from the row sums (robust to day-grain quirks);
  // the day table above is the per-day split of the same rows.
  const rowSum = (rows: DayCampaignRow[]) => rows.reduce((s, r) => s + r.cost, 0);
  const liveTotal = rowSum(liveRows);
  const productTotal = rowSum(productRows);
  const ttamTotal = rowSum(ttamRows);
  const grand = liveTotal + productTotal + ttamTotal;
  const pct = (v: number) => (grand > 0 ? (v / grand) * 100 : null);

  let ttamNames = new Map<string, { name: string }>();
  try {
    const info = await getManualCampaigns(creds.access_token, shop.advertiserId);
    ttamNames = new Map([...info.entries()].map(([id, c]) => [id, { name: c.name }]));
  } catch {
    // Fail-open: id-only TTAM names.
  }

  const build = (
    rows: DayCampaignRow[],
    streamTotal: number,
    resolve: (id: string) => { name: string; account: string }
  ): ShopCostCampaign[] => {
    const agg = new Map<string, { spend: number; gmv: number; orders: number }>();
    for (const r of rows) {
      const a = agg.get(r.campaignId) ?? { spend: 0, gmv: 0, orders: 0 };
      a.spend += r.cost;
      a.gmv += r.gmv;
      a.orders += r.orders;
      agg.set(r.campaignId, a);
    }
    return [...agg.entries()]
      .map(([campaignId, a]) => {
        const meta = resolve(campaignId);
        return {
          campaignId,
          name: meta.name,
          account: meta.account,
          spend: a.spend,
          gmv: rows === ttamRows ? null : a.gmv,
          orders: rows === ttamRows ? null : a.orders,
          pctOfStream: streamTotal > 0 ? (a.spend / streamTotal) * 100 : null,
          pctOfTotal: grand > 0 ? (a.spend / grand) * 100 : null,
        };
      })
      .sort((a, b) => b.spend - a.spend);
  };

  const gmvResolve = (id: string) => {
    const hit = names.get(id);
    if (hit) return hit;
    const parsed = parseCampaignName(id);
    return { name: id, account: parsed.account };
  };
  return {
    shopNumber,
    shopName: shop.name,
    currency: "MYR",
    dateRange: { start: startDate, end: endDate },
    totals: {
      live: liveTotal, product: productTotal, ttam: ttamTotal, total: grand,
      livePct: pct(liveTotal), productPct: pct(productTotal), ttamPct: pct(ttamTotal),
    },
    days: dayList,
    campaigns: {
      live: build(liveRows, liveTotal, gmvResolve),
      product: build(productRows, productTotal, gmvResolve),
      ttam: build(ttamRows, ttamTotal, (id) => ({
        name: ttamNames.get(id)?.name ?? id,
        account: "TTAM",
      })),
    },
  };
}
