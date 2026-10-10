import { query } from "@/lib/db";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { SHOPS } from "@/lib/shops";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// Phase A: per-creative nightly sync for PRODUCT GMV Max.
// Chain per campaign: product grain (item_group_ids) -> creative grain
// (dims ["item_id"], dual campaign+item_group filter, single day).
// Rewrite-on-revise; per-day fail-open so kills leave partial progress.
const CREATIVE_METRICS = [
  "title", "tt_account_name", "shop_content_type",
  "creative_delivery_status", "orders", "gross_revenue", "cost", "roi", "cost_per_order",
  "product_impressions", "product_clicks", "product_click_rate",
  "ad_click_rate", "ad_conversion_rate",
  "ad_video_view_rate_2s", "ad_video_view_rate_6s",
  "ad_video_view_rate_p25", "ad_video_view_rate_p50",
  "ad_video_view_rate_p75", "ad_video_view_rate_p100",
];

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

async function gmvGet(accessToken: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${qs.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  return res.json();
}

export async function listProductCampaigns(shopNumber: string): Promise<{ ids: string[]; accessToken: string; shop: any }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  // IDs come from the Neon campaign cache (same map the report pulls filter by),
  // not campaign/get — its param requirements drift (store_ids, then dimensions).
  const r = await query(
    "SELECT campaign_id FROM gmv.gmv_campaigns WHERE advertiser_id = $1 AND promotion_type = 'PRODUCT_GMV_MAX' ORDER BY campaign_id",
    [shop.advertiserId]
  );
  const ids = r.rows.map((x: any) => String(x.campaign_id)).filter(Boolean);
  if (ids.length === 0) throw new Error("no PRODUCT campaigns cached — Fetch dashboard data once first");
  return { ids, accessToken: creds.access_token, shop };
}

export async function syncCreativeDay(
  accessToken: string, shop: any, campaignId: string, date: string
): Promise<{ rows: number; skipped: string | null }> {
  const base = {
    advertiser_id: shop.advertiserId,
    store_ids: JSON.stringify([shop.shopId]),
    gmv_max_promotion_type: "PRODUCT_GMV_MAX",
    start_date: date,
    end_date: date,
  };
  const prod = await gmvGet(accessToken, {
    ...base,
    dimensions: JSON.stringify(["item_group_id"]),
    filtering: JSON.stringify({ campaign_ids: [campaignId] }),
    metrics: JSON.stringify(["orders", "gross_revenue"]),
    page_size: "50",
  });
  if (prod.code !== 0) return { rows: 0, skipped: `product grain code=${prod.code}` };
  const groups: string[] = [];
  for (const row of prod.data?.list ?? []) {
    const g = String(row.dimensions?.item_group_id ?? "");
    if (g) groups.push(g);
  }
  if (groups.length === 0) return { rows: 0, skipped: "no item groups" };
  const creative = await gmvGet(accessToken, {
    ...base,
    dimensions: JSON.stringify(["item_id"]),
    filtering: JSON.stringify({ campaign_ids: [campaignId], item_group_ids: groups.slice(0, 20) }),
    metrics: JSON.stringify(CREATIVE_METRICS),
    page_size: "1000",
  });
  if (creative.code !== 0) return { rows: 0, skipped: `creative grain code=${creative.code}` };
  let n = 0;
  const groupTag = groups.length === 1 ? groups[0] : "";
  for (const row of creative.data?.list ?? []) {
    const d = row.dimensions ?? {};
    const m = row.metrics ?? {};
    const itemId = String(d.item_id ?? "");
    if (!itemId) continue;
    await query(
      `INSERT INTO creative.daily_rows
        (date, campaign_id, item_group_id, item_id, title, tt_account, content_type, status,
         cost, orders, gmv, roi, cpo, impressions, clicks, click_rate, conv_rate,
         v2s, v6s, vp25, vp50, vp75, vp100, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
       ON CONFLICT (date, campaign_id, item_id) DO UPDATE SET
        item_group_id=EXCLUDED.item_group_id, title=EXCLUDED.title, tt_account=EXCLUDED.tt_account,
        content_type=EXCLUDED.content_type, status=EXCLUDED.status, cost=EXCLUDED.cost,
        orders=EXCLUDED.orders, gmv=EXCLUDED.gmv, roi=EXCLUDED.roi, cpo=EXCLUDED.cpo,
        impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, click_rate=EXCLUDED.click_rate,
        conv_rate=EXCLUDED.conv_rate, v2s=EXCLUDED.v2s, v6s=EXCLUDED.v6s, vp25=EXCLUDED.vp25,
        vp50=EXCLUDED.vp50, vp75=EXCLUDED.vp75, vp100=EXCLUDED.vp100, synced_at=NOW()`,
      [
        date, campaignId, groupTag, itemId,
        String(m.title ?? ""), String(m.tt_account_name ?? ""), String(m.shop_content_type ?? ""),
        String(m.creative_delivery_status ?? ""),
        num(m.cost), Math.round(num(m.orders)), num(m.gross_revenue), num(m.roi), num(m.cost_per_order),
        Math.round(num(m.product_impressions)), Math.round(num(m.product_clicks)),
        num(m.product_click_rate), num(m.ad_conversion_rate),
        num(m.ad_video_view_rate_2s), num(m.ad_video_view_rate_6s),
        num(m.ad_video_view_rate_p25), num(m.ad_video_view_rate_p50),
        num(m.ad_video_view_rate_p75), num(m.ad_video_view_rate_p100),
      ]
    );
    n++;
  }
  return { rows: n, skipped: null };
}

export function eachDay(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const d = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (d <= end && out.length < 32) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
