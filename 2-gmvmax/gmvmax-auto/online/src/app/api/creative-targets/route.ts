import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/creative-targets — SOP targets {topN, minImpr, maxCpm} (null = auto).
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const r = await query("SELECT top_n, min_impr, max_cpm FROM creative.targets WHERE id = 1");
    const row = r.rows[0] ?? { top_n: 20, min_impr: null, max_cpm: null };
    return NextResponse.json({
      topN: row.top_n, minImpr: row.min_impr, maxCpm: row.max_cpm === null ? null : Number(row.max_cpm),
    });
  } catch (e) {
    return NextResponse.json({ error: "017_creative_targets.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-targets {topN, minImpr, maxCpm} — same browser write key as presets.
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want || request.headers.get("authorization") !== `Bearer ${want}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const topN = Number(body.topN);
    const minImpr = body.minImpr === null || body.minImpr === undefined || body.minImpr === "" ? null : Number(body.minImpr);
    const maxCpm = body.maxCpm === null || body.maxCpm === undefined || body.maxCpm === "" ? null : Number(body.maxCpm);
    if (!Number.isInteger(topN) || topN < 5 || topN > 50) {
      return NextResponse.json({ error: "topN must be an integer 5–50" }, { status: 400 });
    }
    if (minImpr !== null && (!Number.isInteger(minImpr) || minImpr < 0)) {
      return NextResponse.json({ error: "minImpr must be an integer >= 0 or blank" }, { status: 400 });
    }
    if (maxCpm !== null && (!Number.isFinite(maxCpm) || maxCpm < 0)) {
      return NextResponse.json({ error: "maxCpm must be a number >= 0 or blank" }, { status: 400 });
    }
    await query(
      "INSERT INTO creative.targets (id, top_n, min_impr, max_cpm) VALUES (1, $1, $2, $3) ON CONFLICT (id) DO UPDATE SET top_n = EXCLUDED.top_n, min_impr = EXCLUDED.min_impr, max_cpm = EXCLUDED.max_cpm",
      [topN, minImpr, maxCpm]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
