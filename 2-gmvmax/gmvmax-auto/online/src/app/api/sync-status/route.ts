import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SHOPS } from "@/lib/shops";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Fail-open single-row read: missing tables (pre-migration DBs) yield null,
// never a 500 — the panel renders "never synced" instead.
async function maxRow(text: string, params: unknown[]) {
  try {
    const r = await query(text, params);
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

// GET /api/sync-status?shopNumber=1 — freshness panel feed (signed-in users).
// Per type: last successful sync (pulled/updated_at) + latest stored slot/date.
// Reads only; cron writers keep these stamps warm.
export async function GET(request: Request) {
  const access = await requireModule("gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const shop = SHOPS[shopNumber];
  if (!shop) return NextResponse.json({ error: "invalid shopNumber" }, { status: 400 });

  const [live, product, ttam, daily, campaigns] = await Promise.all([
    maxRow(
      `SELECT MAX(pulled_at) AS pulled, MAX(hour_slot) AS slot
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND promotion_type = 'LIVE_GMV_MAX'`,
      [shop.shopId]
    ),
    maxRow(
      `SELECT MAX(pulled_at) AS pulled, MAX(hour_slot) AS slot
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND promotion_type = 'PRODUCT_GMV_MAX'`,
      [shop.shopId]
    ),
    maxRow(
      `SELECT MAX(pulled_at) AS pulled, MAX(date::text) AS slot
       FROM gmv.ttam_hourly_campaign WHERE shop_id = $1`,
      [shop.shopId]
    ),
    maxRow(
      `SELECT MAX(updated_at) AS pulled, MAX(date::text) AS slot
       FROM gmv.daily_shop_metrics WHERE shop_number = $1::int`,
      [shopNumber]
    ),
    maxRow(
      `SELECT MAX(updated_at) AS pulled FROM gmv.gmv_campaigns WHERE shop_id = $1`,
      [shop.shopId]
    ),
  ]);

  return NextResponse.json({
    ok: true, shopNumber,
    live, product, ttam, daily, campaigns,
  });
}
