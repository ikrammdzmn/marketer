import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/seller-creative/evergreen
// Month-bucket Evergreen verdict over the last 3 FULL calendar months of
// organic history. Bounds come from MAX(video_day_organic.date), so buckets
// are complete and roll automatically (partial current month excluded).
// One row per video, no LIMIT — the client applies the Kuat/Evergreen rule.
function addMonths(iso: string, k: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + k);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const access = await requireModule("seller-creative");
  if (!access.ok) return access.response;
  try {
    const mx = await query(
      `SELECT MAX(date)::text AS maxd FROM creative.video_day_organic`
    );
    const maxd: string | null = mx.rows[0]?.maxd ?? null;
    if (!maxd)
      return NextResponse.json({ error: "no organic rows yet" }, { status: 404 });
    const curMon = maxd.slice(0, 7) + "-01";
    const m1s = addMonths(curMon, -3);
    const m2s = addMonths(curMon, -2);
    const m3s = addMonths(curMon, -1);
    const endEx = curMon;
    const r = await query(
      `SELECT o.video_id,
              MAX(m.username) AS username,
              MAX(m.caption) AS caption,
              MAX(m.account_class) AS account_class,
              MAX(m.posted_api) AS posted_api,
              MAX(m.posted_from_id) AS posted_from_id,
              MAX(m.cover_url) AS cover_url,
              SUM(o.views)::bigint AS views,
              SUM(COALESCE(o.gmv,0)) AS gmv,
              SUM(COALESCE(o.sku_orders,0))::bigint AS orders,
              COUNT(*)::int AS days,
              SUM(CASE WHEN o.date >= $5::date AND o.date < $6::date THEN COALESCE(o.sku_orders,0) ELSE 0 END)::int AS o1,
              SUM(CASE WHEN o.date >= $6::date AND o.date < $7::date THEN COALESCE(o.sku_orders,0) ELSE 0 END)::int AS o2,
              SUM(CASE WHEN o.date >= $7::date AND o.date < $2::date THEN COALESCE(o.sku_orders,0) ELSE 0 END)::int AS o3,
              MAX(g.gmvmax_gmv) AS gmvmax_gmv,
              MAX(g.gmvmax_cost) AS gmvmax_cost
       FROM creative.video_day_organic o
       LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
       LEFT JOIN (
         SELECT item_id, SUM(gmv) AS gmvmax_gmv, SUM(COALESCE(cost,0)) AS gmvmax_cost
         FROM creative.daily_rows WHERE date >= $3::text AND date < $4::text GROUP BY item_id
       ) g ON g.item_id = o.video_id
       WHERE o.date >= $1::date AND o.date < $2::date
       GROUP BY o.video_id`,
      [m1s, endEx, m1s, endEx, m1s, m2s, m3s]
    );
    return NextResponse.json({
      months: [m1s, m2s, m3s],
      maxDate: maxd,
      rows: r.rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "evergreen failed";
    const missing = /relation .* does not exist/i.test(msg);
    return NextResponse.json(
      { error: missing ? "run migration 038_creative_organic.sql (dev + prod) first" : msg },
      { status: missing ? 503 : 500 }
    );
  }
}
