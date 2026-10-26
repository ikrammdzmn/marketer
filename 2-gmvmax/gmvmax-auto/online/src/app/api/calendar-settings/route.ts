import { NextResponse } from "next/server";
import { calendarHealth, loadHidden, saveHidden } from "@/lib/calendar";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/calendar-settings — exclude list + connection health.
export async function GET() {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ hidden: await loadHidden(), health: await calendarHealth() });
  } catch {
    return NextResponse.json({ error: "024_calendar_settings.sql not run yet" }, { status: 503 });
  }
}

// POST /api/calendar-settings {hidden:[...]} — same browser write key as presets.
export async function POST(request: Request) {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want || request.headers.get("authorization") !== `Bearer ${want}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const list = Array.isArray(body.hidden) ? body.hidden : [];
    if (list.length > 100) return NextResponse.json({ error: "max 100 keywords" }, { status: 400 });
    const clean: string[] = [];
    for (const h of list) {
      if (typeof h !== "string") return NextResponse.json({ error: "keywords must be strings" }, { status: 400 });
      const t = h.trim();
      if (t.length > 120) return NextResponse.json({ error: "each keyword <= 120 chars" }, { status: 400 });
      if (t) clean.push(t);
    }
    await saveHidden(clean);
    return NextResponse.json({ ok: true, count: clean.length });
  } catch {
    return NextResponse.json({ error: "024_calendar_settings.sql not run yet" }, { status: 503 });
  }
}
