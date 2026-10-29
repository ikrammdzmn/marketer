import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// POST /api/creative-meta {rows:[{item_id, posted_at}]} — manual Time-posted
// backfill (e.g. from the TikTok xlsx export, which HAS Time posted while no
// TikTok endpoint returns it: round 7 — ad/get 0 ads, video/get holds uploads
// not organic posts, file + creative/report 40001-gated).
// Same write guard as creative-sync. Fills empties only, never overwrites an
// existing posted_at. Naive datetimes assumed MYT (+08:00).
export async function POST(request: Request) {
  const access = await requireModule("creative");
  if (!access.ok) return access.response;
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want || request.headers.get("authorization") !== `Bearer ${want}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad JSON" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0 || rows.length > 2000) {
    return NextResponse.json({ error: "rows must be 1–2000" }, { status: 400 });
  }
  const seen = new Map<string, string>();
  const bad: string[] = [];
  for (const r of rows) {
    const id = String(r?.item_id ?? "").trim();
    const raw = String(r?.posted_at ?? "").trim();
    const iso = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(:\d{2})?)$/.test(raw)
      ? raw.replace(" ", "T") + "+08:00"
      : raw;
    const d = new Date(iso);
    if (!/^\d{15,25}$/.test(id) || Number.isNaN(d.getTime())) {
      if (bad.length < 5) bad.push(`${id || "?"} / ${raw || "?"}`.slice(0, 60));
      continue;
    }
    seen.set(id, d.toISOString());
  }
  if (seen.size === 0) {
    return NextResponse.json({ error: `no valid rows${bad.length ? ` (e.g. ${bad[0]})` : ""}` }, { status: 400 });
  }
  const ids = [...seen.keys()];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const vals: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((id, j) => {
      vals.push(`($${j * 3 + 1},$${j * 3 + 2}::timestamptz,$${j * 3 + 3})`);
      params.push(id, seen.get(id), "xlsx-import");
    });
    try {
      await query(
        `INSERT INTO creative.item_meta (item_id, posted_at, source) VALUES ${vals.join(",")}
         ON CONFLICT (item_id) DO UPDATE SET
           posted_at = COALESCE(creative.item_meta.posted_at, EXCLUDED.posted_at),
           source = CASE WHEN creative.item_meta.posted_at IS NULL THEN 'xlsx-import'
                         ELSE creative.item_meta.source END,
           synced_at = NOW()`,
        params
      );
    } catch {
      return NextResponse.json({ error: "035_creative_item_meta.sql not run yet" }, { status: 503 });
    }
  }
  let haveDates = seen.size;
  try {
    const h = await query(
      `SELECT COUNT(*)::int AS n FROM creative.item_meta WHERE item_id = ANY($1) AND posted_at IS NOT NULL`,
      [ids]
    );
    haveDates = Number(h.rows[0]?.n ?? seen.size);
  } catch { /* count best-effort */ }
  return NextResponse.json({ ok: true, imported: seen.size, haveDates, skippedBad: rows.length - seen.size, bad });
}
