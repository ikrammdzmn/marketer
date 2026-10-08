import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getShopROAS } from "@/lib/gmv";
import { fetchShopDayOrders } from "@/lib/shop-orders";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

const MAX_DAYS = 31;

function datesBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const d = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  if (isNaN(d.getTime()) || isNaN(end.getTime()) || d > end) return out;
  while (d <= end && out.length < MAX_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setTime(d.getTime() + 86400000);
  }
  return out;
}

// POST /api/shop-gmv/refresh {shopNumber, startDate, endDate}
// On-demand cache rewrite for the Shop GMV multi-day chart (014 columns).
// Same heavy per-day loop as nightly-sync, capped at 31 days; fail-open per
// day (a failed day keeps its old cache row and is reported, not thrown).
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const shopNumber = String(body.shopNumber ?? "1");
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");
  if (shopNumber !== "1") {
    return NextResponse.json({ error: "shop-order refresh is shop-1-only for now" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  const days = datesBetween(startDate, endDate);
  if (!days.length) return NextResponse.json({ error: "empty or inverted range" }, { status: 400 });
  if (days.length >= MAX_DAYS && endDate > days[days.length - 1]) {
    return NextResponse.json({ error: `range capped at ${MAX_DAYS} days/run` }, { status: 400 });
  }
  const refreshed: string[] = [];
  const failed: Array<{ date: string; error: string }> = [];
  for (const day of days) {
    try {
      const r = await getShopROAS(shopNumber, day, day);
      let sg = 0, so = 0, scg = 0, scc = 0;
      try {
        const o = await fetchShopDayOrders(day);
        if (o) { sg = o.gmv; so = o.orderCount; scg = o.cancelledGMV; scc = o.cancelledCount; }
      } catch (e) {
        console.error("[shop-gmv-refresh] shop orders failed, ads row kept", day, e instanceof Error ? e.message : "failed");
      }
      const params = [
        parseInt(shopNumber, 10), r.shopName, day, r.gmv,
        r.liveGMVMaxCost, r.productGMVMaxCost, r.manualCampaignSpend,
        r.totalAdsSpend, r.totalCostWithTaxes, r.roas, r.actualRoas, r.orderCount,
        sg, so, scg, scc,
      ];
      try {
        await query(
          `INSERT INTO gmv.daily_shop_metrics
             (shop_number, shop_name, date, gmv, live_cost, product_cost, manual_spend,
              spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax,
              order_count, updated_at,
              shop_order_gmv, shop_order_count, shop_cancelled_gmv, shop_cancelled_count)
           VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13,$14,$15,$16)
           ON CONFLICT (shop_number, date) DO UPDATE SET
             shop_name = EXCLUDED.shop_name, gmv = EXCLUDED.gmv,
             live_cost = EXCLUDED.live_cost, product_cost = EXCLUDED.product_cost,
             manual_spend = EXCLUDED.manual_spend,
             spend_before_tax = EXCLUDED.spend_before_tax,
             spend_after_tax = EXCLUDED.spend_after_tax,
             roas_before_tax = EXCLUDED.roas_before_tax,
             roas_after_tax = EXCLUDED.roas_after_tax,
             order_count = EXCLUDED.order_count, updated_at = now(),
             shop_order_gmv = EXCLUDED.shop_order_gmv,
             shop_order_count = EXCLUDED.shop_order_count,
             shop_cancelled_gmv = EXCLUDED.shop_cancelled_gmv,
             shop_cancelled_count = EXCLUDED.shop_cancelled_count`,
          params
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!/shop_order|shop_cancelled/i.test(msg)) throw e;
        console.error("[shop-gmv-refresh] 014 columns missing, ads-only row kept (run 014 migration)");
        await query(
          `INSERT INTO gmv.daily_shop_metrics
             (shop_number, shop_name, date, gmv, live_cost, product_cost, manual_spend,
              spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax,
              order_count, updated_at)
           VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
           ON CONFLICT (shop_number, date) DO UPDATE SET
             shop_name = EXCLUDED.shop_name, gmv = EXCLUDED.gmv,
             live_cost = EXCLUDED.live_cost, product_cost = EXCLUDED.product_cost,
             manual_spend = EXCLUDED.manual_spend,
             spend_before_tax = EXCLUDED.spend_before_tax,
             spend_after_tax = EXCLUDED.spend_after_tax,
             roas_before_tax = EXCLUDED.roas_before_tax,
             roas_after_tax = EXCLUDED.roas_after_tax,
             order_count = EXCLUDED.order_count, updated_at = now()`,
          params.slice(0, 12)
        );
      }
      refreshed.push(day);
      await new Promise((r2) => setTimeout(r2, 400));
    } catch (e) {
      failed.push({ date: day, error: e instanceof Error ? e.message : "refresh failed" });
    }
  }
  return NextResponse.json({ ok: failed.length === 0, refreshed, failed });
}
