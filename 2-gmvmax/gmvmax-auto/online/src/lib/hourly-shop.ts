import { query } from "./db";
import { SHOPS } from "./shops";
import { fetchShopRawDayOrders } from "./shop-orders";

export interface ShopHour {
  hour: string;
  shopGmv: number;
  shopOrders: number;
  adSpend: number;
  trueRoas: number | null;
  missing: boolean;
}

function mytHourOf(tsSec: number): number | null {
  if (!Number.isFinite(tsSec) || tsSec <= 0) return null;
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", hour12: false,
  }).formatToParts(new Date(tsSec * 1000)).forEach((x) => { p[x.type] = x.value; });
  const h = Number(p.hour);
  if (!Number.isFinite(h)) return null;
  return h % 24;
}

function orderTs(o: any): number | null {
  const raw = o.create_time ?? o.createTime ?? o.order_create_time ?? null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

export function orderGmv(o: any): number {
  let t = 0;
  for (const item of o.line_items ?? []) {
    t += parseFloat(item.sale_price ?? 0) + parseFloat(item.platform_discount ?? 0);
  }
  return t;
}

function klToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

function klNowHour(): number {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", hour12: false })
    .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return Number(p.hour ?? 0) % 24;
}

// Day-pull orders/search once, bucket by MYT create hour. Same numerator as
// the daily aggregate (line_items sale_price + platform_discount,
// CANCELLED/REFUNDED excluded). Tie-check: bucketed + unparseable == day
// total from the same pull, so any drift is reported, never hidden.
export async function refreshShopHourly(shopNumber: string, date: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (shopNumber !== "1") throw new Error("hourly shop is shop-1-only for now");
  const raw = await fetchShopRawDayOrders(date);
  if (!raw) throw new Error("shop side unconfigured (SHOP_APP_KEY/SECRET or shop token/cipher missing)");
  const gmv = new Array(24).fill(0);
  const orders = new Array(24).fill(0);
  let unparseable = 0;
  let unparseableGmv = 0;
  let dayTotal = 0;
  for (const o of raw.orders) {
    const st = String(o.status ?? "").toUpperCase();
    if (st === "CANCELLED" || st === "REFUNDED") continue;
    const t = orderGmv(o);
    dayTotal += t;
    const ts = orderTs(o);
    const h = ts === null ? null : mytHourOf(ts);
    if (h === null) {
      unparseable++;
      unparseableGmv += t;
      continue;
    }
    gmv[h] += t;
    orders[h] += 1;
  }
  const bucketed = gmv.reduce((s: number, v: number) => s + v, 0);
  const diff = Math.abs(bucketed + unparseableGmv - dayTotal);
  try {
    for (let h = 0; h < 24; h++) {
      await query(
        `INSERT INTO gmv.shop_hourly_orders
           (shop_number, shop_name, date, hour, shop_gmv, shop_orders, unparseable_orders, updated_at)
         VALUES ($1,$2,$3::date,$4,$5,$6,$7,now())
         ON CONFLICT (shop_number, date, hour) DO UPDATE SET
           shop_name = EXCLUDED.shop_name, shop_gmv = EXCLUDED.shop_gmv,
           shop_orders = EXCLUDED.shop_orders,
           unparseable_orders = EXCLUDED.unparseable_orders, updated_at = now()`,
        [1, shop.name, date, h, gmv[h], orders[h], h === 0 ? unparseable : 0]
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/does not exist|relation/i.test(msg)) {
      throw new Error("015 columns/table missing (run 015_shop_hourly_orders.sql on this branch)");
    }
    throw e;
  }
  return {
    shop: shop.name, date,
    dayTotal, bucketed, unparseable, unparseableGmv,
    tied: diff <= 0.05, diff, pages: raw.pages,
  };
}

export async function getHourlyShopView(shopNumber: string, date: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  let cached: Array<{ hour: number; shop_gmv: number; shop_orders: number; updated_at: unknown }> = [];
  try {
    const cr = await query(
      `SELECT hour, shop_gmv::float AS shop_gmv, shop_orders, updated_at
       FROM gmv.shop_hourly_orders WHERE shop_number = $1 AND date = $2::date`,
      [parseInt(shopNumber, 10), date]
    );
    cached = cr.rows;
  } catch {
    cached = [];
  }
  const cmap = new Map<number, { g: number; o: number; u: unknown }>();
  for (const r of cached) cmap.set(Number(r.hour), { g: Number(r.shop_gmv ?? 0), o: Number(r.shop_orders ?? 0), u: r.updated_at });
  // Ads spend side comes from the campaign hourly cache (fail-open 0).
  const smap = new Map<number, number>();
  try {
    const sr = await query(
      `SELECT SUBSTRING(hour_slot, 12, 2)::int AS hh, SUM(cost)::float AS c
       FROM gmv.hourly_campaign_metrics
       WHERE shop_id = $1 AND hour_slot LIKE $2
       GROUP BY 1`,
      [shop.shopId, `${date}%`]
    );
    for (const r of sr.rows) smap.set(Number(r.hh), Number(r.c ?? 0));
  } catch {
    // spend stays 0
  }
  const isToday = date === klToday();
  const nowH = klNowHour();
  const hours: ShopHour[] = [];
  for (let h = 0; h < 24; h++) {
    const missing = isToday && h > nowH;
    const g = cmap.get(h)?.g ?? 0;
    const s = smap.get(h) ?? 0;
    hours.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      shopGmv: missing ? 0 : g,
      shopOrders: missing ? 0 : (cmap.get(h)?.o ?? 0),
      adSpend: missing ? 0 : s,
      trueRoas: !missing && s > 0 ? g / s : null,
      missing,
    });
  }
  return {
    shopName: shop.name, date,
    hours,
    cachedHours: cmap.size,
    updatedAt: [...cmap.values()][0]?.u ?? null,
  };
}
