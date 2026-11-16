import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/seller-creative/overview?startDate=&endDate=&accountClass=&sort=&limit=
// DB read over creative.video_day_organic joined to video_meta (+ GMV-Max
// join for the "Dalam GMV Max" column — same video ID both sides, never summed).
// accountClass: all|internal|top_affiliate|affiliate|inactive (B-taxonomy,
// DB-sourced from creative.accounts; unregistered → affiliate).
// Phase 1: category breakdown, selling count, per-row status + order/1k,
// GMV-Max join, 60+40 split (60 by GMV + 40 by views, deduped).
type Row = {
  video_id: string;
  username: string | null;
  caption: string | null;
  account_class: string | null;
  posted_api: string | null;
  posted_from_id: string | null;
  views: string | number;
  gmv: string | number;
  orders: string | number;
  imp: string | number | null;
  clicks: string | number | null;
  days: number;
  gmvmax_gmv: string | number | null;
  gmvmax_orders: string | number | null;
};

function statusOf(r: Row, minOrders: number, avgSellerGmv: number): string {
  const orders = Number(r.orders ?? 0);
  const gmv = Number(r.gmv ?? 0);
  if (orders <= 0 && gmv <= 0) return "Tiada jualan";
  if (orders < minOrders) return "Sampel kecil";
  if (gmv >= avgSellerGmv && avgSellerGmv > 0) return "Winner";
  return "Baik";
}

export async function GET(request: Request) {
  const access = await requireModule("seller-creative");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? startDate;
  const accountClass = (searchParams.get("accountClass") ?? "all").toLowerCase();
  const sort = (searchParams.get("sort") ?? "gmv").toLowerCase();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 100) || 100, 1), 500);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    return NextResponse.json({ error: "need startDate/endDate YYYY-MM-DD" }, { status: 400 });
  const nDays = Math.max(
    1,
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1
  );
  // Doc 04 order threshold scaled by period: 10 orders for >=30d.
  const minOrders = Math.max(1, Math.ceil(10 * Math.min(1, nDays / 30)));
  const orderExpr =
    sort === "views" ? "SUM(o.views) DESC" :
    sort === "orders" ? "SUM(COALESCE(o.sku_orders,0)) DESC" : "SUM(COALESCE(o.gmv,0)) DESC";
  const cls = ["internal", "top_affiliate", "affiliate", "inactive"].includes(accountClass) ? accountClass : "all";
  const clsFilter = cls === "all" ? "" : "AND COALESCE(m.account_class,'affiliate') = $4";
  // daily_rows.date is TEXT YYYY-MM-DD, organic date is DATE — cast each
  // use explicitly (B143: shared $1 across DATE/TEXT contexts errors
  // "operator does not exist: date >= text").
  const gmvJoin = `LEFT JOIN (
    SELECT item_id, SUM(gmv) AS gmvmax_gmv, SUM(orders) AS gmvmax_orders,
           SUM(COALESCE(cost,0)) AS gmvmax_cost
    FROM creative.daily_rows
    WHERE date >= $1::text AND date <= $2::text
    GROUP BY item_id
  ) g ON g.item_id = o.video_id`;
  const baseSelect = `SELECT o.video_id,
              MAX(m.username) AS username,
              MAX(m.caption) AS caption,
              MAX(m.account_class) AS account_class,
              MAX(m.posted_api) AS posted_api,
              MAX(m.posted_from_id) AS posted_from_id,
              MAX(m.cover_url) AS cover_url,
              SUM(o.views)::bigint AS views,
              SUM(COALESCE(o.gmv,0)) AS gmv,
              SUM(COALESCE(o.sku_orders,0))::bigint AS orders,
              SUM(o.imp)::bigint AS imp,
              SUM(o.clicks)::bigint AS clicks,
              COUNT(*)::int AS days,
              MAX(g.gmvmax_gmv) AS gmvmax_gmv,
              MAX(g.gmvmax_orders) AS gmvmax_orders
       FROM creative.video_day_organic o
       LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
       ${gmvJoin}
       WHERE o.date >= $1::date AND o.date <= $2::date ${clsFilter}
       GROUP BY o.video_id`;
  try {
    let rows: Row[];
    let split: { sellers: number; discovery: number } | null = null;
    if (sort === "gmv" && limit >= 100) {
      // 60+40: top 60 sellers by GMV, then top 40 by views not already shown.
      const nSell = 60;
      const nDisc = Math.min(40, limit - nSell);
      const sellQ = `${baseSelect} ORDER BY SUM(COALESCE(o.gmv,0)) DESC LIMIT $3`;
      const sellR = await query(
        sellQ,
        cls === "all" ? [startDate, endDate, nSell] : [startDate, endDate, nSell, cls]
      );
      const seen = new Set(sellR.rows.map((r: Row) => String(r.video_id)));
      const discQ = `${baseSelect} ORDER BY SUM(o.views) DESC LIMIT $${cls === "all" ? 3 : 4}`;
      // Over-fetch discovery then dedupe in JS (NOT IN with 60 ids is noisy).
      const discR = await query(
        discQ,
        cls === "all" ? [startDate, endDate, nSell + nDisc + 20] : [startDate, endDate, nSell + nDisc + 20, cls]
      );
      const disc = discR.rows
        .filter((r: Row) => !seen.has(String(r.video_id)))
        .slice(0, nDisc);
      rows = [...sellR.rows, ...discR.rows.length > 0 ? disc : []];
      split = { sellers: sellR.rows.length, discovery: disc.length };
    } else {
      const r = await query(
        `${baseSelect} ORDER BY ${orderExpr} LIMIT $3`,
        cls === "all" ? [startDate, endDate, limit] : [startDate, endDate, limit, cls]
      );
      rows = r.rows;
    }
    // Status needs the seller-mean GMV over THIS result set.
    const sellerGmvs = rows.map((r) => Number(r.gmv ?? 0)).filter((v) => v > 0);
    const avgSellerGmv = sellerGmvs.length
      ? sellerGmvs.reduce((a, b) => a + b, 0) / sellerGmvs.length
      : 0;
    // Profit leg (docs/04: untung = GMV×0.35 − kos ads, breakeven ROI 2.86).
    // GMV = organic seller GMV (this tab), cost = GMV Max spend on the same
    // video. Zero-cost videos keep full-margin untung; ROI undefined → null.
    const MARGIN = 0.35;
    const out = rows.map((r) => {
      const views = Number(r.views ?? 0);
      const orders = Number(r.orders ?? 0);
      const gmv = Number(r.gmv ?? 0);
      const cost = Number((r as any).gmvmax_cost ?? 0);
      return {
        ...r,
        in_gmvmax: r.gmvmax_gmv !== null && Number(r.gmvmax_gmv ?? 0) > 0,
        order_per_1k: views > 0 ? (orders / views) * 1000 : 0,
        untung: gmv * MARGIN - cost,
        roi: cost > 0 ? gmv / cost : null,
        status: statusOf(r, minOrders, avgSellerGmv),
      };
    });
    const t = await query(
      `SELECT COUNT(DISTINCT o.video_id)::int AS videos,
              SUM(o.views)::bigint AS views,
              SUM(COALESCE(o.gmv,0)) AS gmv,
              SUM(COALESCE(o.sku_orders,0))::int AS orders,
              COUNT(DISTINCT CASE WHEN COALESCE(o.gmv,0) > 0 THEN o.video_id END)::int AS selling
       FROM creative.video_day_organic o
       LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
       WHERE o.date >= $1 AND o.date <= $2
       ${cls === "all" ? "" : "AND COALESCE(m.account_class,'affiliate') = $3"}`,
      cls === "all" ? [startDate, endDate] : [startDate, endDate, cls]
    );
    const b = await query(
      `SELECT COALESCE(m.account_class,'affiliate') AS cls,
              COUNT(DISTINCT o.video_id)::int AS videos,
              SUM(o.views)::bigint AS views,
              SUM(COALESCE(o.gmv,0)) AS gmv,
              SUM(COALESCE(o.sku_orders,0))::int AS orders,
              COUNT(DISTINCT CASE WHEN COALESCE(o.gmv,0) > 0 THEN o.video_id END)::int AS selling
       FROM creative.video_day_organic o
       LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
       WHERE o.date >= $1 AND o.date <= $2
       GROUP BY 1`,
      [startDate, endDate]
    );
    // Top account per class by views (usernames fill in once metadata lands).
    const topAcc: Record<string, { username: string | null; views: number; gmv: number }> = {};
    for (const c of ["internal", "top_affiliate", "affiliate", "inactive"]) {
      try {
        const tr = await query(
          `SELECT m.username AS username, SUM(o.views)::bigint AS views,
                  SUM(COALESCE(o.gmv,0)) AS gmv
           FROM creative.video_day_organic o
           LEFT JOIN creative.video_meta m ON m.video_id = o.video_id
           WHERE o.date >= $1 AND o.date <= $2
             AND COALESCE(m.account_class,'affiliate') = $3
             AND m.username IS NOT NULL
           GROUP BY m.username
           ORDER BY SUM(o.views) DESC
           LIMIT 1`,
          [startDate, endDate, c]
        );
        if (tr.rows[0]) topAcc[c] = tr.rows[0];
      } catch {
        /* pre-038 or no names yet — breakdown still renders without tops */
      }
    }
    return NextResponse.json({
      rows: out,
      totals: t.rows[0] ?? null,
      breakdown: b.rows,
      topAccounts: topAcc,
      accountClass: cls,
      sort,
      split,
      rule: {
        minOrders,
        nDays,
        note: `Winner = ≥${minOrders} orders & GMV ≥ seller-mean; Baik = ≥${minOrders} orders below mean; Sampel kecil = below ${minOrders} orders; Tiada jualan = 0 orders & RM0`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "overview failed";
    const missing = /relation .* does not exist/i.test(msg);
    return NextResponse.json(
      { error: missing ? "run migration 038_creative_organic.sql (dev + prod) first" : msg },
      { status: missing ? 503 : 500 }
    );
  }
}
