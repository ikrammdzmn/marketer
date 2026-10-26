import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { fetchShopLivePerformance } from "@/lib/shop-live";

// GET /api/shop-live/probe?shopNumber=1&liveId=...&currency=LOCAL
// Probe-first (skill rule): first page only, returns raw overall keys,
// one raw interval, and the coverage map for the requested metric list.
// Read-only, no DB writes.
export async function GET(request: Request) {
  const access = await requireModule("shop-live");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const liveId = (searchParams.get("liveId") ?? "").trim();
  const currency = (searchParams.get("currency") ?? "LOCAL").toUpperCase();
  if (!liveId) {
    return NextResponse.json(
      { error: "need liveId (digits from the Seller Center live URL)" },
      { status: 400 }
    );
  }
  try {
    const { overall, intervals, pages } = await fetchShopLivePerformance(
      shopNumber, liveId, currency, 1
    );
    const first = intervals[0] ?? {};
    const coverage = {
      impressions: first?.traffic?.impressions !== undefined,
      ctr: first?.traffic?.ctr !== undefined,
      ctor_sku: first?.conversion?.click_to_order_rate?.sku_order_ctor !== undefined,
      ctor_main: first?.conversion?.click_to_order_rate?.main_order_ctor !== undefined,
      sku_orders: first?.sales?.sku_orders !== undefined,
      aov_avg_price: first?.conversion?.avg_price?.amount !== undefined,
      tap_through_rate: "proxy: product_clicks / views (no exact field)",
      avg_viewing_duration: "missing: no watch-time field in payload",
      ads_cost: "missing: ads-side (Marketing API report/get)",
      gmv_max_roi: "missing: ads-side (Marketing API report/get)",
      gmv_max_active: "missing: derived from campaign status + room live_status",
    };
    return NextResponse.json({
      overall,
      intervalKeys: {
        sales: Object.keys(first?.sales ?? {}),
        traffic: Object.keys(first?.traffic ?? {}),
        interactions: Object.keys(first?.interactions ?? {}),
        conversion: Object.keys(first?.conversion ?? {}),
      },
      firstInterval: first,
      intervalsOnFirstPage: intervals.length,
      pages,
      coverage,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-live probe failed";
    console.error("[shop-live/probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
