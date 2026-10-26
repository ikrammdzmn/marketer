import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import {
  bucketShopLiveHours,
  fetchShopLivePerformance,
  summarizeShopLive,
} from "@/lib/shop-live";

// GET /api/shop-live/overview?shopNumber=1&liveId=...&currency=LOCAL
// Shop 1 only. Full pagination (≤15 pages × 100 one-minute intervals),
// overall + derived summary + MYT-hour buckets. Read-only, no DB writes
// (cache migration follows once the probe confirms the shape).
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
    const { overall, intervals, pages, totalCount } = await fetchShopLivePerformance(
      shopNumber, liveId, currency
    );
    return NextResponse.json({
      liveId,
      currency,
      overall,
      summary: summarizeShopLive(overall, intervals),
      hourly: bucketShopLiveHours(intervals),
      intervals: intervals.length,
      pages,
      totalCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-live overview failed";
    console.error("[shop-live/overview]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
