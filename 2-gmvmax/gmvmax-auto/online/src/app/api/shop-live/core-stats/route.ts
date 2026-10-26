import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { fetchLiveCoreStats } from "@/lib/shop-live";

// GET /api/shop-live/core-stats?shopNumber=1&liveRoomId=...
// Probe for the 202309 live-room detail family (core stats in one call:
// avg_watching_duration, click_through/order rates, GMV, orders, viewers).
// Decides whether affiliate rooms are readable here after the 202609
// minute endpoint denied them (28001022). Read-only, no DB writes.
export async function GET(request: Request) {
  const access = await requireModule("shop-live");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const liveRoomId = (searchParams.get("liveRoomId") ?? "").trim();
  if (!liveRoomId) {
    return NextResponse.json(
      { error: "need liveRoomId (digits, e.g. from the room picker or Seller Center URL)" },
      { status: 400 }
    );
  }
  try {
    const { stats } = await fetchLiveCoreStats(shopNumber, liveRoomId);
    const keys = Object.keys(stats ?? {});
    const coverage = {
      avg_watching_duration: stats?.avg_watching_duration !== undefined,
      click_through_rate: stats?.click_through_rate !== undefined,
      click_order_rate: stats?.click_order_rate !== undefined,
      local_gmv: stats?.local_gmv !== undefined,
      sales: stats?.sales !== undefined,
      paid_orders: stats?.paid_order_count !== undefined,
      created_orders: stats?.created_order_count !== undefined,
      buyers: stats?.buyer_count !== undefined,
      current_visitors: stats?.current_visitor_count !== undefined,
      peak_concurrent: stats?.peak_concurrent_user_count !== undefined,
      watch_pv: stats?.watch_pv !== undefined,
      product_views: stats?.product_view_count !== undefined,
      product_reach: stats?.product_reach_count !== undefined,
      comments: stats?.accumulated_comment_count !== undefined,
      new_followers: stats?.accumulated_new_follower_count !== undefined,
      shares: stats?.accumulated_sharing_count !== undefined,
      tap_through_rate: "check: exact field unlikely here (list traffic has it)",
      gmv_per_hour: "check: derive from local_gmv + duration, or list traffic",
      aov: "check: derive local_gmv / paid_order_count",
      ads_cost: "missing: ads-side (Marketing API report/get)",
      gmv_max_roi: "missing: ads-side (Marketing API report/get)",
      gmv_max_active: "missing: derived from campaign status + room live_status",
    };
    return NextResponse.json({ liveRoomId, stats, keys, coverage });
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-live core-stats failed";
    console.error("[shop-live/core-stats]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
