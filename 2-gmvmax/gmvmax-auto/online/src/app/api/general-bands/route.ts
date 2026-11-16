import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";
import { GENERAL_BANDS_DEFAULT, sanitizeRoiBands } from "@/lib/ttam-scores";

// GET /api/general-bands → active ROI bands (shared read: any ROI-showing
// module). Pre-039 DBs (missing table) fall back to hardcoded defaults so
// pages never render blank — the `fallback` flag tells the UI.
export async function GET(request: Request) {
  const access = await requireModule("gmv-max", "creative", "live-roi", "presets");
  if (!access.ok) return access.response;
  try {
    const r = await query(`SELECT tick_at, green_at, yellow_at, red_at, updated_at, updated_by FROM core.general_bands WHERE key = 'roi'`);
    if (!r.rows.length) return NextResponse.json({ bands: GENERAL_BANDS_DEFAULT, fallback: true });
    const b = sanitizeRoiBands(r.rows[0]);
    if (!b) return NextResponse.json({ bands: GENERAL_BANDS_DEFAULT, fallback: true });
    return NextResponse.json({ bands: b, fallback: false, updated_at: r.rows[0].updated_at, updated_by: r.rows[0].updated_by ?? "" });
  } catch {
    return NextResponse.json({ bands: GENERAL_BANDS_DEFAULT, fallback: true });
  }
}

// POST /api/general-bands {tick_at,green_at,yellow_at,red_at} — presets editors
// only (allowlist) + PRESET_WRITE_KEY bearer (same defense-in-depth as TTAM
// presets). Strictly ordered cutoffs, else 400. Single active row upsert.
export async function POST(request: Request) {
  const access = await requireModule("presets");
  if (!access.ok) return access.response;
  try {
    const writeKey = (process.env.PRESET_WRITE_KEY ?? "").trim();
    if (!writeKey) return NextResponse.json({ error: "writes disabled (no key)" }, { status: 503 });
    if (request.headers.get("authorization") !== `Bearer ${writeKey}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const b = sanitizeRoiBands(body);
    if (!b) return NextResponse.json({ error: "need tick_at > green_at > yellow_at > red_at > 0" }, { status: 400 });
    const who = access.email ?? "";
    const r = await query(
      `INSERT INTO core.general_bands (key, tick_at, green_at, yellow_at, red_at, updated_at, updated_by)
       VALUES ('roi', $1, $2, $3, $4, NOW(), $5)
       ON CONFLICT (key) DO UPDATE SET tick_at = EXCLUDED.tick_at, green_at = EXCLUDED.green_at,
         yellow_at = EXCLUDED.yellow_at, red_at = EXCLUDED.red_at, updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING tick_at, green_at, yellow_at, red_at, updated_at, updated_by`,
      [b.tick_at, b.green_at, b.yellow_at, b.red_at, who]
    ).catch(() => null);
    if (!r) return NextResponse.json({ error: "run migration 039_general_bands.sql (dev + prod) first" }, { status: 503 });
    return NextResponse.json({ ok: true, bands: sanitizeRoiBands(r.rows[0]) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "general-bands failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
