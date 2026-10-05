import { getShopCredentials } from "./shop-credentials";
import { SHOPS } from "./shops";
import { getShopROAS } from "./gmv";

// @ts-ignore — no bundled types, same as temp-marketplace usage.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tiktokShop = require("tiktok-shop");

const SHOP_BASE = "https://open-api.tiktokglobalshop.com";
const ORDERS_ENDPOINT = "/order/202309/orders/search";
const ORDERS_VERSION = "202309";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

interface ShopOrderFetch {
  gmv: number;
  orderCount: number;
  totalOrderCount: number;
  cancelledCount: number;
  cancelledGMV: number;
  sampleKeys: string[];
  pages: number;
}

// Proven shape (temp-marketplace metrics-fetcher.ts fetchShopGMV):
// POST /order/202309/orders/search, query carries access_token/app_key/
// shop_cipher/shop_id/version + sign/timestamp, header x-tts-access-token,
// body { create_time_ge, create_time_lt }. Numerator = line_items
// (sale_price + platform_discount), CANCELLED/REFUNDED excluded.
async function fetchShopOrders(
  appKey: string,
  appSecret: string,
  accessToken: string,
  shopCipher: string,
  startDate: string,
  endDate: string
): Promise<ShopOrderFetch> {
  const from = Math.floor(new Date(`${startDate}T00:00:00+08:00`).getTime() / 1000);
  const to = Math.floor(new Date(`${endDate}T23:59:59+08:00`).getTime() / 1000);

  let gmv = 0;
  let cancelledGMV = 0;
  let cancelledCount = 0;
  let allOrders: any[] = [];
  let sampleKeys: string[] = [];
  let pageToken = "";
  let pages = 0;

  for (let i = 0; i < 100; i++) {
    const qp: Record<string, string> = {
      access_token: accessToken,
      app_key: appKey,
      shop_cipher: shopCipher,
      shop_id: "",
      version: ORDERS_VERSION,
      page_size: "50",
    };
    if (pageToken) qp.page_token = pageToken;
    const urlForSign =
      `${SHOP_BASE}${ORDERS_ENDPOINT}?` +
      Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
    const body = { create_time_ge: from, create_time_lt: to };
    const sig = tiktokShop.signByUrl(urlForSign, appSecret, body);
    const finalParams: Record<string, string> = {
      ...qp,
      sign: String(sig.signature),
      timestamp: String(sig.timestamp),
    };
    const finalQs = Object.keys(finalParams)
      .sort().map((k) => `${k}=${encodeURIComponent(finalParams[k])}`).join("&");
    const res = await fetch(`${SHOP_BASE}${ORDERS_ENDPOINT}?${finalQs}`, {
      method: "POST",
      headers: {
        "x-tts-access-token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`orders/search code=${data.code}: ${data.message ?? ""}`);
    }
    const orders = data.data?.orders ?? [];
    if (i === 0 && orders.length > 0) sampleKeys = Object.keys(orders[0] ?? {});
    allOrders = allOrders.concat(orders);
    pages++;
    pageToken = data.data?.next_page_token ?? "";
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 400));
  }

  for (const o of allOrders) {
    let orderTotal = 0;
    for (const item of o.line_items ?? []) {
      orderTotal += parseFloat(item.sale_price ?? 0) + parseFloat(item.platform_discount ?? 0);
    }
    const st = String(o.status ?? "").toUpperCase();
    if (st === "CANCELLED" || st === "REFUNDED") {
      cancelledCount++;
      cancelledGMV += orderTotal;
    } else {
      gmv += orderTotal;
    }
  }
  const orderCount = allOrders.length - cancelledCount;
  return {
    gmv, orderCount,
    totalOrderCount: allOrders.length,
    cancelledCount, cancelledGMV,
    sampleKeys, pages,
  };
}

export async function getShopGMV(shopNumber: string, startDate: string, endDate: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (shopNumber !== "1") throw new Error("shop-order GMV is shop-1-only for now");
  const appKey = cleanEnv(process.env.SHOP_APP_KEY);
  const appSecret = cleanEnv(process.env.SHOP_APP_SECRET);
  if (!appKey || !appSecret) {
    return {
      shopName: shop.name,
      configured: false as const,
      hint: "missing SHOP_APP_KEY/SECRET env (Partner Center Custom app)",
    };
  }
  const creds = await getShopCredentials("1");
  if (!creds) {
    return {
      shopName: shop.name,
      configured: false as const,
      hint: "missing shop token: set TIKTOK_SHOP1_ACCESS_TOKEN/REFRESH_TOKEN/SHOP_CIPHER env or row in credentials.shop_tokens",
    };
  }
  if (!creds.shop_cipher) {
    return {
      shopName: shop.name,
      configured: false as const,
      hint: "missing TIKTOK_SHOP1_SHOP_CIPHER (comes with the authorize step, same place as access_token)",
    };
  }
  const orders = await fetchShopOrders(
    appKey, appSecret, creds.access_token, creds.shop_cipher, startDate, endDate
  );
  // Denominator reuses the Marketing-API spend (live+product+manual+tax) so the
  // two numerators are comparable side-by-side.
  const roas = await getShopROAS("1", startDate, endDate);
  const trueRoas = roas.totalAdsSpend > 0 ? orders.gmv / roas.totalAdsSpend : 0;
  const trueActual = roas.totalCostWithTaxes > 0 ? orders.gmv / roas.totalCostWithTaxes : 0;
  return {
    shopName: shop.name,
    configured: true as const,
    dateRange: { start: startDate, end: endDate },
    shopOrderGMV: orders.gmv,
    shopOrderCount: orders.orderCount,
    shopTotalOrders: orders.totalOrderCount,
    shopCancelledCount: orders.cancelledCount,
    shopCancelledGMV: orders.cancelledGMV,
    sampleKeys: orders.sampleKeys,
    pages: orders.pages,
    adsGMV: roas.gmv,
    adsOrderCount: roas.orderCount,
    totalAdsSpend: roas.totalAdsSpend,
    totalCostWithTaxes: roas.totalCostWithTaxes,
    trueRoas,
    trueActualRoas: trueActual,
    adsRoas: roas.roas,
    adsActualRoas: roas.actualRoas,
    deltaVsAds: roas.gmv > 0 ? (orders.gmv - roas.gmv) / roas.gmv : 0,
    currency: "MYR",
  };
}
