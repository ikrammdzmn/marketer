import { NextResponse } from "next/server";
import { getHourlyScorecard, getHourlyView } from "@/lib/hourly";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/hourly?shopNumber=1&date=YYYY-MM-DD[&startDate=&endDate=]
// Single-day rows/slots for `date` (defaults to endDate, then today) plus a
// scorecard aggregated across the selected range (defaults to `date` alone).
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    searchParams.get("endDate") ??
    searchParams.get("startDate") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const startDate = searchParams.get("startDate") ?? date;
  const endDate = searchParams.get("endDate") ?? date;
  try {
    const view = await getHourlyView(shopNumber, date);
    let scorecard: unknown[] = [];
    try {
      scorecard = await getHourlyScorecard(shopNumber, startDate, endDate);
    } catch (e) {
      console.error("[hourly] scorecard failed", e instanceof Error ? e.message : "failed");
    }
    return NextResponse.json({ ...view, startDate, endDate, scorecard });
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly failed";
    console.error("[hourly]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
