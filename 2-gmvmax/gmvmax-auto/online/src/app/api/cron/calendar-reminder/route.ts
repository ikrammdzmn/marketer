import { NextResponse } from "next/server";
import { sendCalendarReminder } from "@/lib/calendar-reminder";
import { alertCronFailure } from "@/lib/cron-alert";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// GET /api/cron/calendar-reminder?date=YYYY-MM-DD&dry=1
// Morning ping: Today + Tomorrow (Google events + open task-notes) to the
// configured Telegram chat/thread. Vercel cron sends
// Authorization: Bearer <CRON_SECRET> automatically. dry=1 builds the message
// without sending (preview for the dashboard/test).
export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const dateRaw = searchParams.get("date");
  const date =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : undefined;
  const dry = searchParams.get("dry") === "1";
  try {
    if (dry) {
      const { buildCalendarReminder } = await import("@/lib/calendar-reminder");
      const b = await buildCalendarReminder(date);
      return NextResponse.json({
        ok: true,
        dry: true,
        date: b.date,
        tomorrow: b.tomorrow,
        counts: b.counts,
        calendarWarning: b.calendarWarning,
        legacy: b.legacy,
      });
    }
    const r = await sendCalendarReminder(date);
    if (!r.ok) {
      await alertCronFailure("calendar-reminder", `telegram ${r.telegram}`);
      return NextResponse.json({ ...r, error: `telegram ${r.telegram}` }, { status: 500 });
    }
    return NextResponse.json(r);
  } catch (e) {
    const message = e instanceof Error ? e.message : "reminder failed";
    console.error("[calendar-reminder]", message);
    await alertCronFailure("calendar-reminder", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
