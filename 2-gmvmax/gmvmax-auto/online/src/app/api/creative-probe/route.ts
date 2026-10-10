import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { requireAllowlistedUser } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// GET /api/creative-probe?shopNumber=1[&date=YYYY-MM-DD]
// Read-only probe: which TikTok API surface can replace the xlsx
// "Creative data" export (Post ID / Creative / account / Status /
// Exploration secondary status / Cost / orders / revenue / ROI /
// impressions / clicks / 2s-100% view rates)?
// Tries two surfaces, full-set first then singles on failure:
// A. gmv_max/report/get with creative-ish dimensions (video_id? product_id?)
// B. report/integrated/get BASIC at AUCTION_AD (+ AUCTION_VIDEO attempt)
// Access is checked against the live Google email allowlist.
const GMV_KNOWN = ["cost", "orders", "gross_revenue", "roi"];
const GMV_VIDEO_GUESSES = ["video_watched_2s", "video_watched_6s"];
const GMV_STATUS_GUESSES = ["exploration_status", "creative_status"];
const GMV_DIM_VARIANTS = [["video_id"], ["product_id"], ["video_id", "stat_time_day"]];

const BASIC_CREATIVE = [
  "spend", "impressions", "clicks", "ctr", "conversion", "cost_per_conversion",
  "video_play_actions", "video_watched_2s", "video_watched_6s", "average_video_play",
  "likes", "comments", "shares",
];

// Round 2 (PRODUCT GMV Max, xlsx-column mapping): shopping + rate + quartile
// metric singles; GMV-membership + identity lookups below.
const R2A_METRICS = [
  "orders", "gross_revenue", "roi", "cost_per_order", "conversion_rate",
  "video_views_p25", "video_views_p50", "video_views_p75", "video_views_p100",
];

async function gmvTry(
  accessToken: string, shopId: string, advertiserId: string, promoType: string,
  dimensions: string[], metrics: string[], date: string
): Promise<{ code: number; message?: string; sample: unknown }> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: promoType,
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page_size: "5",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  const list = body.data?.list ?? [];
  return {
    code: body.code ?? -1,
    message: String(body.message ?? "").slice(0, 120),
    sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 800) : null,
  };
}

async function basicTry(
  accessToken: string, advertiserId: string, data_level: string,
  dimensions: string[], metrics: string[], date: string
): Promise<{ code: number; message?: string; sample: unknown }> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level,
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page: "1",
    page_size: "5",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  const list = body.data?.list ?? [];
  return {
    code: body.code ?? -1,
    message: String(body.message ?? "").slice(0, 120),
    sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 800) : null,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Round 5: PRODUCT creative-level verification (doc-grounded field names).
// Attribute metrics need a SINGLE campaign ID + ONE ID dimension.
const R5_ATTRIBUTES = ["title", "tt_account_name", "shop_content_type", "tt_account_profile_image_url"];
const R5_DELIVERY = [
  "creative_delivery_status", "orders", "gross_revenue",
  "product_impressions", "product_clicks", "product_click_rate",
  "ad_click_rate", "ad_conversion_rate",
  "ad_video_view_rate_2s", "ad_video_view_rate_6s",
  "ad_video_view_rate_p25", "ad_video_view_rate_p50",
  "ad_video_view_rate_p75", "ad_video_view_rate_p100",
];
const R5_GUESSES = ["cost", "roi", "cost_per_order"];

async function gmvCreativeTry(
  accessToken: string, shopId: string, advertiserId: string, campaignId: string,
  dimensions: string[], metrics: string[], date: string, statusFilter?: string[]
): Promise<{ code: number; message?: string; rows: number; sample: unknown }> {
  const filtering: Record<string, unknown> = { campaign_ids: [campaignId] };
  if (statusFilter) filtering.creative_delivery_statuses = statusFilter;
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: "PRODUCT_GMV_MAX",
    dimensions: JSON.stringify(dimensions),
    filtering: JSON.stringify(filtering),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page_size: "5",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  const list = body.data?.list ?? [];
  return {
    code: body.code ?? -1,
    message: String(body.message ?? "").slice(0, 120),
    rows: list.length,
    sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 1000) : null,
  };
}

async function round5Probe(accessToken: string, shopId: string, advertiserId: string, date: string) {
  const out: Record<string, any> = {};
  let campaignId = "";
  try {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ gmv_max_promotion_types: ["PRODUCT_GMV_MAX"] }),
      page: "1",
      page_size: "5",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/campaign/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    campaignId = String(body.data?.list?.[0]?.campaign_id ?? "");
    out.campaignId = campaignId || `(list code=${body.code ?? -1})`;
    if (!campaignId) return out;
  } catch (e) {
    out.error = e instanceof Error ? e.message : "campaign list failed";
    return out;
  }
  await sleep(300);
  // Round 6: creative level demands campaign_ids + item_group_ids together.
  // Step 1 — product grain lists the item_group_ids for this campaign.
  let itemGroups: string[] = [];
  try {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      store_ids: JSON.stringify([shopId]),
      gmv_max_promotion_type: "PRODUCT_GMV_MAX",
      dimensions: JSON.stringify(["item_group_id"]),
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      metrics: JSON.stringify(["orders", "gross_revenue"]),
      start_date: date,
      end_date: date,
      page_size: "50",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    for (const row of body.data?.list ?? []) {
      const g = String(row.dimensions?.item_group_id ?? row.metrics?.item_group_id ?? "");
      if (g) itemGroups.push(g);
    }
    out.product_grain = body.code === 0
      ? `OK, item_groups: ${itemGroups.slice(0, 10).join(", ")}${itemGroups.length > 10 ? ` (+${itemGroups.length - 10})` : ""}`
      : `FAIL code=${body.code} ${String(body.message ?? "").slice(0, 100)}`;
  } catch (e) {
    out.product_grain = e instanceof Error ? e.message : "product grain failed";
  }
  await sleep(300);
  if (itemGroups.length === 0) {
    out.note = "no item_group_ids — creative level untestable";
    return out;
  }
  // Step 2 — creative grain with both filters.
  async function creativeCall(dimensions: string[], metrics: string[], statusFilter?: string[]) {
    const filtering: Record<string, unknown> = { campaign_ids: [campaignId], item_group_ids: itemGroups.slice(0, 10) };
    if (statusFilter) filtering.creative_delivery_statuses = statusFilter;
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      store_ids: JSON.stringify([shopId]),
      gmv_max_promotion_type: "PRODUCT_GMV_MAX",
      dimensions: JSON.stringify(dimensions),
      filtering: JSON.stringify(filtering),
      metrics: JSON.stringify(metrics),
      start_date: date,
      end_date: date,
      page_size: "5",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    const list = body.data?.list ?? [];
    return {
      code: body.code ?? -1,
      message: String(body.message ?? "").slice(0, 120),
      rows: list.length,
      sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 1000) : null,
    };
  }
  const full = await creativeCall(["item_id"], [...R5_ATTRIBUTES, ...R5_DELIVERY, ...R5_GUESSES]);
  await sleep(400);
  if (full.code === 0) {
    out.full_set = `OK, ${full.rows} rows`;
    out.sample = full.sample;
  } else {
    out.full_set = `FAIL code=${full.code} ${full.message ?? ""}`.slice(0, 140);
    const per_metric: Record<string, string> = {};
    for (const m of [...R5_ATTRIBUTES, ...R5_DELIVERY, ...R5_GUESSES]) {
      const one = await creativeCall(["item_id"], [m]);
      per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code}`.slice(0, 60);
      await sleep(250);
    }
    out.per_metric = per_metric;
  }
  const day = await creativeCall(["item_id", "stat_time_day"], [...R5_DELIVERY, ...R5_GUESSES]);
  out.day_grain = day.code === 0 ? `OK, ${day.rows} rows` : `FAIL code=${day.code} ${day.message ?? ""}`.slice(0, 140);
  if (day.code === 0) out.day_sample = day.sample;
  await sleep(400);
  const st = await creativeCall(["item_id"], ["orders", "gross_revenue"], ["DELIVERING"]);
  out.status_filter = st.code === 0 ? `OK, ${st.rows} rows` : `FAIL code=${st.code} ${st.message ?? ""}`.slice(0, 140);
  return out;
}

// Round 2: PRODUCT GMV Max xlsx-column mapping.
// a. shopping/rate/quartile metric singles at AUCTION_AD.
// b. ad/get detail for PRODUCT GMV campaigns (identity: post/video/account/type/time?).
// c. AUCTION_AD filtered by PRODUCT GMV campaign IDs (membership + parent filter test).
async function round2Probe(accessToken: string, advertiserId: string, date: string) {
  const out: Record<string, any> = {};
  const dims = ["stat_time_day", "ad_id"];
  const metricsA: Record<string, string> = {};
  const samplesA: Record<string, unknown> = {};
  for (const m of R2A_METRICS) {
    const one = await basicTry(accessToken, advertiserId, "AUCTION_AD", dims, [m], date);
    metricsA[m] = one.code === 0 ? "OK" : `FAIL code=${one.code}`.slice(0, 60);
    if (one.code === 0) samplesA[m] = one.sample;
    await sleep(250);
  }
  out.metrics = metricsA;

  let productIds: string[] = [];
  try {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ gmv_max_promotion_types: ["PRODUCT_GMV_MAX"] }),
      page: "1",
      page_size: "100",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/campaign/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    productIds = (body.data?.list ?? []).map((c: any) => String(c.campaign_id ?? "")).filter(Boolean);
    out.product_campaigns = { count: productIds.length, code: body.code ?? -1 };
  } catch (e) {
    out.product_campaigns = { error: e instanceof Error ? e.message : "campaign list failed" };
  }
  await sleep(300);

  if (productIds.length > 0) {
    const ids = productIds.slice(0, 10);
    const single = ids.slice(0, 1);
    // integrated/get speaks `filters` (typed array), NOT the GMV `filtering`
    // object (round 2 sent `filtering` → "Not a valid list", test never ran).
    // Try candidate shapes; first code-0 wins.
    const filterShapes: { label: string; extra: Record<string, string> }[] = [
      { label: "filters-IN", extra: { filters: JSON.stringify([{ field_name: "campaign_ids", filter_type: "IN", filter_value: ids }]) } },
      { label: "filtering-single", extra: { filtering: JSON.stringify({ campaign_ids: single }) } },
    ];
    out.membership = { attempts: [] as any[] };
    for (const shape of filterShapes) {
      try {
        const params = new URLSearchParams({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_AD",
          dimensions: JSON.stringify(dims),
          metrics: JSON.stringify(["spend"]),
          start_date: date,
          end_date: date,
          page: "1",
          page_size: "5",
          ...shape.extra,
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
          { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        const list = body.data?.list ?? [];
        (out.membership.attempts as any[]).push({
          shape: shape.label,
          code: body.code ?? -1,
          message: String(body.message ?? "").slice(0, 120),
          rows: list.length,
          sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 600) : null,
        });
        if (body.code === 0) break;
      } catch (e) {
        (out.membership.attempts as any[]).push({ shape: shape.label, error: e instanceof Error ? e.message : "failed" });
      }
      await sleep(300);
    }
    await sleep(300);
    // ad/get: membership ad_ids first (identity for the 5 GMV ad rows?),
    // then single-campaign filter, then unfiltered calibration.
    const memberIds: string[] = [];
    const win = ((out.membership as any)?.attempts as any[] ?? []).find((a) => a.code === 0);
    if (win) {
      try {
        const params = new URLSearchParams({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_AD",
          dimensions: JSON.stringify(dims),
          metrics: JSON.stringify(["spend"]),
          start_date: date,
          end_date: date,
          page: "1",
          page_size: "50",
          ...(win.shape === "filters-IN"
            ? { filters: JSON.stringify([{ field_name: "campaign_ids", filter_type: "IN", filter_value: ids }]) }
            : { filtering: JSON.stringify({ campaign_ids: single }) }),
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
          { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        for (const row of body.data?.list ?? []) {
          const id = String(row.dimensions?.ad_id ?? "");
          if (id) memberIds.push(id);
        }
      } catch { /* membership list best-effort */ }
      await sleep(300);
    }
    out.ad_detail = { attempts: [] as any[], member_ad_ids: memberIds };
    const adShapes: { label: string; extra: Record<string, string> }[] = [
      ...(memberIds.length > 0
        ? [{ label: "ad_ids-filter", extra: { filtering: JSON.stringify({ ad_ids: memberIds.slice(0, 10) }) } }]
        : []),
      { label: "filtering-single", extra: { filtering: JSON.stringify({ campaign_ids: single }) } },
      { label: "unfiltered", extra: {} },
    ];
    for (const shape of adShapes) {
      try {
        const params = new URLSearchParams({
          advertiser_id: advertiserId,
          page: "1",
          page_size: "2",
          ...shape.extra,
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/ad/get/?${params.toString()}`,
          { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        const list = body.data?.list ?? [];
        const first = list.length > 0 ? list[0] : null;
        (out.ad_detail.attempts as any[]).push({
          shape: shape.label,
          code: body.code ?? -1,
          message: String(body.message ?? "").slice(0, 120),
          count: list.length,
          itemKeys: first ? Object.keys(first).slice(0, 60) : [],
          sample: first ? JSON.stringify(first).slice(0, 1200) : null,
        });
        if (body.code === 0 && list.length > 0) break;
      } catch (e) {
        (out.ad_detail.attempts as any[]).push({ shape: shape.label, error: e instanceof Error ? e.message : "failed" });
      }
      await sleep(300);
    }
  } else {
    out.membership = { skipped: "no PRODUCT campaigns listed" };
    out.ad_detail = { skipped: "no PRODUCT campaigns listed" };
  }
  return out;
}

export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    (() => {
      const d = new Date(Date.now() - 86400000);
      return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    })();
  try {
    const shop = SHOPS[shopNumber];
    if (!shop) return NextResponse.json({ error: "invalid shopNumber" }, { status: 400 });
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });

    const gmv: Record<string, any> = {};
    for (const promo of ["LIVE_GMV_MAX", "PRODUCT_GMV_MAX"]) {
      const byDim: Record<string, any> = {};
      for (const dims of GMV_DIM_VARIANTS) {
        const full = await gmvTry(creds.access_token, shop.shopId, shop.advertiserId, promo, dims, [...GMV_KNOWN], date);
        await sleep(400);
        if (full.code === 0) {
          const per_metric: Record<string, string> = {};
          for (const m of [...GMV_VIDEO_GUESSES, ...GMV_STATUS_GUESSES]) {
            const one = await gmvTry(creds.access_token, shop.shopId, shop.advertiserId, promo, dims, [m], date);
            per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code} ${one.message ?? ""}`.slice(0, 100);
            await sleep(300);
          }
          byDim[dims.join("+")] = { dims: "OK", known_metrics: "OK", sample: full.sample, guesses: per_metric };
        } else {
          byDim[dims.join("+")] = { dims: `FAIL code=${full.code} ${full.message ?? ""}`.slice(0, 120) };
        }
      }
      gmv[promo] = byDim;
    }

    const basic: Record<string, any> = {};
    const grains = [
      { data_level: "AUCTION_AD", dims: ["stat_time_day", "ad_id"] },
      { data_level: "AUCTION_VIDEO", dims: ["stat_time_day", "video_id"] },
    ];
    for (const g of grains) {
      const full = await basicTry(creds.access_token, shop.advertiserId, g.data_level, g.dims, [...BASIC_CREATIVE], date);
      await sleep(400);
      if (full.code === 0) {
        basic[g.data_level] = { full_set: "OK", sample: full.sample };
      } else {
        const per_metric: Record<string, string> = {};
        for (const m of BASIC_CREATIVE) {
          const one = await basicTry(creds.access_token, shop.advertiserId, g.data_level, g.dims, [m], date);
          per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code}`.slice(0, 60);
          await sleep(250);
        }
        basic[g.data_level] = { full_set: `FAIL code=${full.code} ${(full.message ?? "").slice(0, 100)}`, per_metric };
      }
    }

    return NextResponse.json({
      shop: shop.name, date,
      xlsx_columns: ["Post ID", "Creative", "TikTok account", "Creative type", "Status", "Exploration secondary status", "Time posted", "Cost", "SKU orders", "Gross revenue", "ROI", "impressions", "clicks", "2s/6s/25/50/75/100% rates"],
      gmv_max_report: gmv,
      integrated_basic: basic,
      round2: await round2Probe(creds.access_token, shop.advertiserId, date),
      round5: await round5Probe(creds.access_token, shop.shopId, shop.advertiserId, date),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "creative probe failed";
    console.error("[creative-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
