import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getShopROAS } from "@/lib/gmv";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// KL yesterday (timezone-safe): KL date string -> UTC midnight -> minus 1 day.
function klYesterday(): string {
  const todayKL = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [y, m, d] = todayKL.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
}

function subDaysKL(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().split("T")[0];
}

async function syncOne(shopNumber: string, date: string) {
  const r = await getShopROAS(shopNumber, date, date);
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
    [
      parseInt(shopNumber, 10), r.shopName, date, r.gmv,
      r.liveGMVMaxCost, r.productGMVMaxCost, r.manualCampaignSpend,
      r.totalAdsSpend, r.totalCostWithTaxes, r.roas, r.actualRoas, r.orderCount,
    ]
  );
  return { shop: r.shopName, gmv: r.gmv, spend: r.totalAdsSpend };
}

// GET /api/cron/nightly-sync?date=YYYY-MM-DD&shopNumber=1
// Vercel cron sends Authorization: Bearer <CRON_SECRET> automatically.
export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || klYesterday();
  const only = searchParams.get("shopNumber");
  const shops = only ? [only] : Object.keys(SHOPS);
  const results: Record<string, unknown> = {};
  try {
    for (const s of shops) {
      results[`shop_${s}_${date}`] = await syncOne(s, date);
      await new Promise((r) => setTimeout(r, 500));
    }
    // Guard-heal: past 2 days, missing rows only.
    const todayKL = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    for (const g of [subDaysKL(todayKL, 1), subDaysKL(todayKL, 2)]) {
      if (g === date) continue;
      for (const s of shops) {
        const ex = await query(
          `SELECT 1 FROM gmv.daily_shop_metrics WHERE shop_number = $1 AND date = $2::date`,
          [parseInt(s, 10), g]
        );
        if (ex.rows.length === 0) {
          results[`heal_shop_${s}_${g}`] = await syncOne(s, g);
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
    return NextResponse.json({ ok: true, date, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    console.error("[nightly-sync]", message);
    return NextResponse.json({ ok: false, error: message, results }, { status: 500 });
  }
}
