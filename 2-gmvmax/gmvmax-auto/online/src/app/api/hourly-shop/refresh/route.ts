import { NextResponse } from "next/server";
import { getHourlyShopView, refreshShopHourly } from "@/lib/hourly-shop";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

const MAX_DAYS = 31;

function datesBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const d = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  if (isNaN(d.getTime()) || isNaN(end.getTime()) || d > end) return out;
  while (d <= end && out.length < MAX_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setTime(d.getTime() + 86400000);
  }
  return out;
}

// POST /api/hourly-shop/refresh {shopNumber, date} or {shopNumber, startDate, endDate}
// Loops the range (cap 31 days, per-day fail-open): day-pull orders/search,
// bucket by MYT hour into the 015 cache. Returns the end-date view +
// range scorecard + per-day results.
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const shopNumber = String(body.shopNumber ?? "1");
  const rawStart = String(body.startDate ?? body.date ?? "");
  const rawEnd = String(body.endDate ?? body.date ?? "");
  if (shopNumber !== "1") {
    return NextResponse.json({ error: "hourly shop is shop-1-only for now" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawStart) || !/^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
    return NextResponse.json({ error: "need date or startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  const days = datesBetween(rawStart, rawEnd);
  if (!days.length) return NextResponse.json({ error: "empty or inverted range" }, { status: 400 });
  if (days.length >= MAX_DAYS && rawEnd > days[days.length - 1]) {
    return NextResponse.json({ error: `range capped at ${MAX_DAYS} days/run` }, { status: 400 });
  }
  const refreshed: string[] = [];
  const untied: Array<{ date: string; diff: number; unparseable: number }> = [];
  const failed: Array<{ date: string; error: string }> = [];
  for (const day of days) {
    try {
      const one = await refreshShopHourly(shopNumber, day);
      refreshed.push(day);
      if (!one.tied) untied.push({ date: day, diff: one.diff, unparseable: one.unparseable });
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      failed.push({ date: day, error: e instanceof Error ? e.message : "refresh failed" });
    }
  }
  const end = days[days.length - 1];
  const view = await getHourlyShopView(shopNumber, end, days[0], end);
  return NextResponse.json({ ...view, rangeRefresh: { refreshed, untied, failed } });
}
