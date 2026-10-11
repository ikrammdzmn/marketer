import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/calendar";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/calendar-events — team's shared public calendar, next 7 days.
// No per-user OAuth: the feed is public. {events:[...]} or {needsConnect}.
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    return NextResponse.json(await getUpcomingEvents());
  } catch (e) {
    const message = e instanceof Error ? e.message : "calendar failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
