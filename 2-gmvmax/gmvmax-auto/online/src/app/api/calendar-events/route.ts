import { NextResponse } from "next/server";
import { getRangeEvents, getUpcomingEvents } from "@/lib/calendar";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/calendar-events — team's shared calendar, next 7 days by default.
// Optional ?from=&to= ISO range (max 100d) for the /calendar month view.
// {events:[...]} or {needsConnect} or {error}.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    if (fromRaw || toRaw) {
      const fromMs = Date.parse(fromRaw ?? "");
      const toMs = Date.parse(toRaw ?? "");
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs || toMs - fromMs > 100 * 86400000) {
        return NextResponse.json({ error: "invalid range (ISO from/to, max 100 days)" }, { status: 400 });
      }
      return NextResponse.json(await getRangeEvents(fromMs, toMs));
    }
    return NextResponse.json(await getUpcomingEvents());
  } catch (e) {
    const message = e instanceof Error ? e.message : "calendar failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
