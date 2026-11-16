import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";
import { fetchOrganicImp, nextDay, shop1Guard } from "@/lib/seller-creative";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/seller-creative/imp { shopNumber, date, limit }
// Fills product imp/clicks for video-days missing them (imp IS NULL),
// biggest views first. Small batches only (each call ~3s) so the 60s
// budget holds — the page loops until `remaining` hits 0.
export async function POST(request: Request) {
  const access = await requireModule("seller-creative");
  if (!access.ok) return access.response;
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "need JSON body" }, { status: 400 });
  }
  const shopNumber = String(body.shopNumber ?? "1");
  const g = shop1Guard(shopNumber);
  if (g) return NextResponse.json({ error: g }, { status: 400 });
  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "need date YYYY-MM-DD" }, { status: 400 });
  const limit = Math.min(Math.max(Number(body.limit ?? 5) || 5, 1), 8);
  try {
    const r = await query(
      `SELECT video_id FROM creative.video_day_organic
       WHERE date = $1 AND imp IS NULL
         AND (views >= 10000 OR COALESCE(gmv, 0) > 0)
       ORDER BY views DESC LIMIT $2`,
      [date, limit]
    );
    let filled = 0, empty = 0;
    const errs: string[] = [];
    for (const row of r.rows) {
      try {
        const c = await fetchOrganicImp(row.video_id, date, nextDay(date));
        await query(
          `UPDATE creative.video_day_organic
           SET imp = COALESCE($2, imp), clicks = COALESCE($3, clicks), synced_at = NOW()
           WHERE video_id = $1 AND date = $4`,
          [row.video_id, c.imp, c.clicks, date]
        );
        if (c.imp === null && c.clicks === null) empty++;
        else filled++;
      } catch (e) {
        errs.push(`${row.video_id}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    const rem = await query(
      `SELECT COUNT(*)::int AS c FROM creative.video_day_organic
       WHERE date = $1 AND imp IS NULL
         AND (views >= 10000 OR COALESCE(gmv, 0) > 0)`,
      [date]
    );
    return NextResponse.json({ date, filled, empty, remaining: rem.rows[0]?.c ?? 0, errors: errs.slice(0, 3) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "imp fill failed";
    const missing = /relation .* does not exist/i.test(msg);
    return NextResponse.json(
      { error: missing ? "run migration 038_creative_organic.sql (dev + prod) first" : msg },
      { status: missing ? 503 : 500 }
    );
  }
}
