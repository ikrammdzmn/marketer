import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";
import {
  fetchOrganicDay, fetchOrganicImp, nextDay, resolveAccountClasses,
  sellerClassOf, shop1Guard, upsertOrganicDay, upsertVideoMeta,
} from "@/lib/seller-creative";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isoDayCount(a: string, b: string): number {
  const ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(a || "");
  const mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b || "");
  if (!ma || !mb) return 0;
  return Math.round((Date.UTC(+mb[1], +mb[2] - 1, +mb[3]) - Date.UTC(+ma[1], +ma[2] - 1, +ma[3])) / 86400000) + 1;
}

// POST /api/seller-creative/sync { shopNumber, startDate, endDate, withImp }
// ≤7d per call (Hobby 60s). Per-day fail-open. withImp pulls product
// imp/clicks for qualifying video-days (views ≥10k or sales), capped
// per run; the rest stay NULL for the next run to backfill.
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
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? startDate);
  const withImp = body.withImp !== false;
  const n = isoDayCount(startDate, endDate);
  if (n <= 0 || n > 7)
    return NextResponse.json({ error: "range must be 1–7 days (split larger ranges client-side)" }, { status: 400 });
  let videos = 0, days = 0, impFilled = 0;
  const errs: string[] = [];
  let latestAvailable: string | null = null;
  for (let i = 0; i < n; i++) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
    const d = new Date(Date.UTC(+m![1], +m![2] - 1, +m![3]) + i * 86400000).toISOString().slice(0, 10);
    try {
      const { rows, latestAvailable: la } = await fetchOrganicDay(d, nextDay(d));
      if (la) latestAvailable = la;
      // B-taxonomy enrichment AFTER the TikTok pull (never gates it):
      // resolve /accounts classes for this day's usernames, fail-open.
      const resolved = await resolveAccountClasses(rows.map((r) => r.username).filter(Boolean) as string[]);
      const impById = new Map<string, { imp: number | null; clicks: number | null }>();
      if (withImp) {
        // Slow leg first (fail-open per video), capped so the 60s budget
        // holds (~3s/call). The rest stay NULL for later runs to backfill.
        const cands = rows
          .filter((r) => r.views >= 10000 || (r.gmv ?? 0) > 0)
          .sort((a, b) => b.views - a.views)
          .slice(0, 15);
        for (const r of cands) {
          try {
            impById.set(r.video_id, await fetchOrganicImp(r.video_id, d, nextDay(d)));
            impFilled++;
          } catch {
            /* stays NULL, next run backfills */
          }
        }
      }
      videos += await upsertOrganicDay(d, rows, impById);
      // Meta rows carry the listing metadata (username/caption/post_time/
      // duration/hashtags/products) — account_class derives from username.
      await upsertVideoMeta(rows.map((r) => ({
        video_id: r.video_id,
        username: r.username ?? null,
        caption: r.caption ?? null,
        duration_s: r.duration_s ?? null,
        hashtags: r.hashtags ?? null,
        products: r.products ?? null,
        posted_api: r.posted_api ?? null,
        account_class: sellerClassOf(r.username, resolved),
      })));
      days++;
    } catch (e) {
      errs.push(`${d}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  let dbCount: number | null = null;
  try {
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM creative.video_day_organic WHERE date >= $1 AND date <= $2`,
      [startDate, endDate]
    );
    dbCount = r.rows[0]?.c ?? null;
  } catch {
    /* pre-038 DB */
  }
  if (days === 0) {
    const missing = errs.some((e) => /does not exist/i.test(e));
    return NextResponse.json(
      { error: missing ? "run migration 038_creative_organic.sql (dev + prod) first" : errs.join("; ").slice(0, 300) || "all days failed" },
      { status: missing ? 503 : 502 }
    );
  }
  return NextResponse.json({
    days, videos, impFilled, latestAvailable, dbCount,
    partial: errs.length > 0,
    errors: errs.slice(0, 5),
  });
}
