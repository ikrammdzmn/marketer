import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getShopGMV } from "@/lib/shop-orders";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/shop-gmv?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Shop 1 only. Graceful when shop token / app keys are missing.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const live = await getShopGMV(shopNumber, startDate, endDate);
    // Daily cache series for the multi-day chart (fail-open: live cards
    // render even when the cache is empty or pre-014).
    let daily: unknown[] = [];
    try {
      const dr = await query(
        `SELECT date::text AS date, gmv::float AS ads_gmv,
                spend_before_tax::float AS spend, order_count,
                shop_order_gmv::float AS shop_gmv,
                shop_order_count, updated_at
         FROM gmv.daily_shop_metrics
         WHERE shop_number = $1 AND date BETWEEN $2::date AND $3::date
         ORDER BY date`,
        [parseInt(shopNumber, 10), startDate, endDate]
      );
      daily = dr.rows.map((r) => ({
        date: r.date,
        adsGmv: Number(r.ads_gmv ?? 0),
        spend: Number(r.spend ?? 0),
        adsOrders: Number(r.order_count ?? 0),
        adsRoas: Number(r.spend ?? 0) > 0 ? Number(r.ads_gmv ?? 0) / Number(r.spend ?? 0) : null,
        shopGmv: Number(r.shop_gmv ?? 0),
        shopOrders: Number(r.shop_order_count ?? 0),
        shopRoas: Number(r.spend ?? 0) > 0 ? Number(r.shop_gmv ?? 0) / Number(r.spend ?? 0) : null,
        updatedAt: r.updated_at ?? null,
      }));
    } catch (e) {
      console.error("[shop-gmv] daily cache read failed (run 014 migration?)", e instanceof Error ? e.message : "failed");
      try {
        const dr = await query(
          `SELECT date::text AS date, gmv::float AS ads_gmv,
                  spend_before_tax::float AS spend, order_count
           FROM gmv.daily_shop_metrics
           WHERE shop_number = $1 AND date BETWEEN $2::date AND $3::date
           ORDER BY date`,
          [parseInt(shopNumber, 10), startDate, endDate]
        );
        daily = dr.rows.map((r) => ({
          date: r.date,
          adsGmv: Number(r.ads_gmv ?? 0),
          spend: Number(r.spend ?? 0),
          adsOrders: Number(r.order_count ?? 0),
          adsRoas: Number(r.spend ?? 0) > 0 ? Number(r.ads_gmv ?? 0) / Number(r.spend ?? 0) : null,
          shopGmv: 0, shopOrders: 0, shopRoas: null, updatedAt: null,
        }));
      } catch {
        daily = [];
      }
    }
    return NextResponse.json({ ...live, daily });
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-gmv failed";
    console.error("[shop-gmv]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
