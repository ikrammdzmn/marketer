import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/all-creative?startDate=&endDate= — menu-board snapshot.
// One light call: Product (daily_rows) + Seller (video_day_organic)
// aggregates with top item each, plus Live/Product freshness stamps.
// Every read fail-open (pre-migration DBs yield nulls, never 500s).
async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export async function GET(request: Request) {
  const access = await requireModule("gmv-max", "creative", "shop-live", "seller-creative", "live-roi");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const end = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const start = searchParams.get("startDate") ?? end;

  const product = await safe(async () => {
    const t = await query(
      `SELECT COALESCE(SUM(cost),0) AS cost, COALESCE(SUM(gmv),0) AS gmv,
              COALESCE(SUM(orders),0)::int AS orders,
              COUNT(DISTINCT item_id)::int AS videos
       FROM creative.daily_rows WHERE date >= $1 AND date <= $2`,
      [start, end]
    );
    const top = await query(
      `SELECT item_id, MAX(title) AS title, SUM(gmv) AS gmv
       FROM creative.daily_rows WHERE date >= $1 AND date <= $2
       GROUP BY item_id ORDER BY SUM(gmv) DESC LIMIT 1`,
      [start, end]
    );
    return { ...(t.rows[0] ?? null), top: top.rows[0] ?? null };
  }, null);

  const seller = await safe(async () => {
    const t = await query(
      `SELECT COALESCE(SUM(views),0)::bigint AS views, COALESCE(SUM(gmv),0) AS gmv,
              COALESCE(SUM(sku_orders),0)::int AS orders,
              COUNT(DISTINCT o.video_id)::int AS videos
       FROM creative.video_day_organic o WHERE o.date >= $1::date AND o.date <= $2::date`,
      [start, end]
    );
    const top = await query(
      `SELECT o.video_id, MAX(m.caption) AS caption, SUM(COALESCE(o.gmv,0)) AS gmv
       FROM creative.video_day_organic o LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
       WHERE o.date >= $1::date AND o.date <= $2::date
       GROUP BY o.video_id ORDER BY SUM(COALESCE(o.gmv,0)) DESC LIMIT 1`,
      [start, end]
    );
    return { ...(t.rows[0] ?? null), top: top.rows[0] ?? null };
  }, null);

  const stamps = await safe(async () => {
    const r = await query(
      `SELECT promotion_type,
              MAX(pulled_at) AS pulled, MAX(hour_slot) AS slot
       FROM gmv.hourly_campaign_metrics
       WHERE promotion_type IN ('LIVE_GMV_MAX','PRODUCT_GMV_MAX')
       GROUP BY promotion_type`
    );
    const out: Record<string, { pulled: unknown; slot: unknown }> = {};
    for (const row of r.rows) out[String(row.promotion_type)] = { pulled: row.pulled, slot: row.slot };
    return out;
  }, {});

  return NextResponse.json({ ok: true, startDate: start, endDate: end, product, seller, stamps });
}
