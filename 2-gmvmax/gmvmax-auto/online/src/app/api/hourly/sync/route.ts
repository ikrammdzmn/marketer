import { NextResponse } from "next/server";
import { getHourlyScorecard, getHourlyView, syncHourly } from "@/lib/hourly";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// POST /api/hourly/sync {shopNumber, date} — dashboard Sync now.
// Live TikTok pull for one day, Telegram suppressed (silent), then returns
// the fresh single-day view + range scorecard for that date.
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const shopNumber = String(body.shopNumber ?? "1");
  const date = String(body.date ?? "");
  if (shopNumber !== "1") {
    return NextResponse.json({ error: "hourly sync is shop-1-only for now" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const synced = await syncHourly(shopNumber, date, { silent: true });
    const view = await getHourlyView(shopNumber, date);
    let scorecard: unknown[] = [];
    try {
      scorecard = await getHourlyScorecard(shopNumber, date, date);
    } catch (e) {
      console.error("[hourly-sync] scorecard failed", e instanceof Error ? e.message : "failed");
    }
    return NextResponse.json({
      kind: "hourly",
      ...view,
      startDate: date,
      endDate: date,
      scorecard,
      synced: { slot: synced.slot, stored: synced.stored, pulledAt: synced.pulledAt },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly sync failed";
    console.error("[hourly-sync]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
