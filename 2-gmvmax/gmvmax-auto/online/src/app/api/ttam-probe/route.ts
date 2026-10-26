import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { SHOPS } from "@/lib/shops";
import { requireModule } from "@/lib/authz";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// Candidate BASIC metrics to verify per grain. One wrong name fails the
// whole call, so: try the full set first, then singles only for failing grains.
// Split into groups — `?group=1/2/3` keeps each run under the 60s Hobby cap.
const BASE = [
  "spend", "cpc", "cpm",
  "impressions", "clicks", "ctr", "reach", "frequency",
  "conversion", "cost_per_conversion", "conversion_rate",
  "result", "cost_per_result", "result_rate",
  "video_play_actions", "video_watched_2s", "video_watched_6s", "average_video_play",
  "likes", "comments", "shares", "follows", "profile_visits",
  "live_views", "live_product_clicks", "live_effective_views", "live_unique_views",
];
// Group 1: Brand Consideration (17 Oct 2026 user request)
const GROUP1 = [
  "new_consideration_size", "cost_per_consideration", "new_consideration_rate",
  "assisted_new_customer", "assisted_new_customer_rate", "cost_per_assisted_new_customer",
  "engaged_view", "engaged_view_rate", "paid_engaged_view", "paid_engagement_engaged_view",
];
// Group 2: Reach (17 Oct 2026 user request)
const GROUP2 = [
  "cost_per_1000_reached",
  "video_views_p25", "video_views_p50", "video_views_p75", "video_views_p100",
  "average_video_play_per_user",
  "engagements", "engagement_rate",
  "interactive_add_on_impressions", "interactive_add_on_destination_clicks",
  "skips", "video_skips", "ad_skips",
];
// Group 3: Full Funnel On Shop (17 Oct 2026 user request — expect FAIL on BASIC)
const GROUP3 = [
  "onsite_shopping", "total_onsite_shopping_value", "cost_per_onsite_shopping",
  "onsite_shopping_roas", "onsite_shopping_rate", "value_per_onsite_shopping",
  "onsite_initiate_checkout_count",
  "product_page_view_rate", "add_to_cart_rate", "new_shop_visitors",
  "assisted_new_shop_visitors", "assisted_cost_per_product_page_view",
  "assisted_purchases", "assisted_gross_revenue", "assisted_roas",
];
// Group 4: Shop funnel true names (17 Oct 2026 — onsite_* prefix, not display names)
const GROUP4 = [
  "onsite_total_product_details_page_view", "onsite_cost_per_product_details_page_view",
  "onsite_product_details_page_view_rate", "onsite_value_per_product_details_page_view",
  "onsite_total_product_details_page_view_value",
  "onsite_total_add_to_cart", "onsite_cost_per_add_to_cart",
  "onsite_add_to_cart_rate", "onsite_value_per_add_to_cart",
  "onsite_total_add_to_cart_value",
  "onsite_on_web_detail", "total_onsite_on_web_detail_value",
];
const GROUPS: Record<string, string[]> = {
  base: BASE,
  "1": GROUP1,
  "2": GROUP2,
  "3": GROUP3,
  "4": GROUP4,
  all: [...BASE, ...GROUP1, ...GROUP2, ...GROUP3],
};

const GRAINS = [
  { data_level: "AUCTION_CAMPAIGN", id_dim: "campaign_id" },
  { data_level: "AUCTION_ADGROUP", id_dim: "adgroup_id" },
  { data_level: "AUCTION_AD", id_dim: "ad_id" },
] as const;

async function tryMetrics(
  accessToken: string,
  advertiserId: string,
  data_level: string,
  id_dim: string,
  date: string,
  metrics: string[]
): Promise<{ code: number; message?: string; rows: number }> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level,
    dimensions: JSON.stringify(["stat_time_day", id_dim]),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page: "1",
    page_size: "10",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  return { code: body.code ?? -1, message: body.message ?? "", rows: body.data?.list?.length ?? 0 };
}

// GET /api/ttam-probe?shopNumber=1&group=1 — verifies which BASIC metrics each grain
// accepts. Tiny 1-day window, page_size 10. No secrets in the output.
// group: base | 1 | 2 | 3 | 4 | all (default all). Use 1/2/3/4 to stay under 60s cap.
export async function GET(request: Request) {
  const access = await requireModule("gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const group = searchParams.get("group") ?? "all";
  const list = GROUPS[group];
  if (!list) throw new Error(`invalid group: ${group} (use base|1|2|3|4|all)`);
  const date =
    searchParams.get("date") ??
    (() => {
      const d = new Date(Date.now() - 86400000);
      return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    })();
  try {
    const shop = SHOPS[shopNumber];
    if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
    const out: Record<string, any> = { shop: shop.name, date, group, count: list.length, grains: {} };
    for (const g of GRAINS) {
      const full = await tryMetrics(creds.access_token, shop.advertiserId, g.data_level, g.id_dim, date, [...list]);
      await new Promise((r) => setTimeout(r, 300));
      if (full.code === 0) {
        out.grains[g.data_level] = { full_set: "OK", rows: full.rows, per_metric: Object.fromEntries(list.map((m) => [m, "OK"])) };
        continue;
      }
      // Bisect: singles only for the failing grain.
      const per_metric: Record<string, string> = {};
      for (const m of list) {
        const one = await tryMetrics(creds.access_token, shop.advertiserId, g.data_level, g.id_dim, date, [m]);
        per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code} ${one.message ?? ""}`.slice(0, 120);
        await new Promise((r) => setTimeout(r, 200));
      }
      out.grains[g.data_level] = { full_set: `FAIL code=${full.code} ${(full.message ?? "").slice(0, 120)}`, per_metric };
    }
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam-probe failed";
    console.error("[ttam-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
