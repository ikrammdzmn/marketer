import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { SHOPS } from "@/lib/shops";
import { requireAllowlistedUser } from "@/lib/authz";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// Candidate BASIC metrics to verify per grain. One wrong name fails the
// whole call, so: try the full set first, then singles only for failing grains.
const CANDIDATES = [
  "spend", "cpc", "cpm",
  "impressions", "clicks", "ctr", "reach", "frequency",
  "conversion", "cost_per_conversion", "conversion_rate",
  "result", "cost_per_result", "result_rate",
  "video_play_actions", "video_watched_2s", "video_watched_6s", "average_video_play",
  "likes", "comments", "shares", "follows", "profile_visits",
  "live_views", "live_product_clicks", "live_effective_views", "live_unique_views",
];

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

// GET /api/ttam-probe?shopNumber=1 — verifies which BASIC metrics each grain
// accepts. Tiny 1-day window, page_size 10. No secrets in the output.
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
    if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
    const out: Record<string, any> = { shop: shop.name, date, grains: {} };
    for (const g of GRAINS) {
      const full = await tryMetrics(creds.access_token, shop.advertiserId, g.data_level, g.id_dim, date, [...CANDIDATES]);
      await new Promise((r) => setTimeout(r, 500));
      if (full.code === 0) {
        out.grains[g.data_level] = { full_set: "OK", rows: full.rows, per_metric: Object.fromEntries(CANDIDATES.map((m) => [m, "OK"])) };
        continue;
      }
      // Bisect: singles only for the failing grain.
      const per_metric: Record<string, string> = {};
      for (const m of CANDIDATES) {
        const one = await tryMetrics(creds.access_token, shop.advertiserId, g.data_level, g.id_dim, date, [m]);
        per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code} ${one.message ?? ""}`.slice(0, 120);
        await new Promise((r) => setTimeout(r, 300));
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
