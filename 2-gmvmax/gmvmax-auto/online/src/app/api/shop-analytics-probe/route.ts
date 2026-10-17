import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { requireAllowlistedUser } from "@/lib/authz";
import {
  getAnalyticsAppKeys,
  getShopAnalyticsCredentials,
} from "@/lib/shop-analytics-credentials";

const SHOP_BASE = "https://open-api.tiktokglobalshop.com";
const SHOP_PERF_PATH = "/analytics/202509/shop/performance";
const SHOP_PRODUCTS_PATH = "/analytics/202605/shop_products/performance";

function signShopUrl(
  url: string, appSecret: string
): { signature: string; timestamp: string } {
  const decoded = decodeURIComponent(url);
  const qIndex = decoded.indexOf("?");
  const pathMatch = decoded.match(/\.com(.*?)\?/);
  const path = pathMatch ? pathMatch[1] : "";
  const query = qIndex >= 0 ? decoded.slice(qIndex + 1) : "";
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    params[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  const timestamp = String(Math.floor(Date.now() / 1000) - 100);
  const all: Record<string, string> = { ...params, timestamp };
  const keys = Object.keys(all)
    .filter((k) => !["app_secret", "token", "access_token", "sign"].includes(k))
    .sort((a, b) => a.localeCompare(b));
  let input = path;
  for (const k of keys) input += k + String(all[k]);
  const signature = createHmac("sha256", appSecret)
    .update(appSecret + input + appSecret)
    .digest("hex");
  return { signature, timestamp };
}

async function signedGet(
  path: string,
  qp: Record<string, string>,
  appKey: string,
  appSecret: string,
  accessToken: string
): Promise<any> {
  void appKey;
  const urlForSign =
    `${SHOP_BASE}${path}?` +
    Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
  const sig = signShopUrl(urlForSign, appSecret);
  const finalParams: Record<string, string> = {
    ...qp,
    sign: sig.signature,
    timestamp: sig.timestamp,
  };
  const finalQs = Object.keys(finalParams)
    .sort().map((k) => `${k}=${encodeURIComponent(finalParams[k])}`).join("&");
  const res = await fetch(`${SHOP_BASE}${path}?${finalQs}`, {
    method: "GET",
    headers: {
      "x-tts-access-token": accessToken,
      "content-type": "application/json",
    },
  });
  return res.json();
}

function myt(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

// GET /api/shop-analytics-probe?shopNumber=1
// Probe-first: shop-level performance (traffic/visitors) + product funnel
// (page-view/add-to-cart). Read-only, no DB writes. Lags ~2d.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  if (shopNumber !== "1")
    return NextResponse.json({ error: "shop-analytics is shop-1-only for now" }, { status: 400 });
  // Shop analytics lags ~2d: default window ends 2d ago, 7d wide.
  const endLt = searchParams.get("end_date_lt") ?? myt(-2);
  const startGe = searchParams.get("start_date_ge") ?? myt(-9);
  try {
    const { key, secret } = getAnalyticsAppKeys();
    if (!key || !secret) throw new Error("missing SHOP_ANALYTICS_APP_KEY/SECRET env");
    const creds = await getShopAnalyticsCredentials("1");
    if (!creds?.access_token) throw new Error("missing analytics access token (authorize Analytics app first)");
    if (!creds?.shop_cipher) throw new Error("missing shop_cipher (comes with the authorize step)");
    const baseQp = { app_key: key, shop_cipher: creds.shop_cipher };

    const shopBody = await signedGet(
      SHOP_PERF_PATH,
      { ...baseQp, start_date_ge: startGe, end_date_lt: endLt, granularity: "ALL", currency: "LOCAL" },
      key, secret, creds.access_token
    );
    const intervals = shopBody?.data?.performance?.intervals ?? [];
    const first = intervals[0] ?? {};

    let productsBody: any = null;
    try {
      productsBody = await signedGet(
        SHOP_PRODUCTS_PATH,
        { ...baseQp, start_date_ge: startGe, end_date_lt: endLt, currency: "LOCAL", page_size: "5" },
        key, secret, creds.access_token
      );
    } catch (e) {
      productsBody = { error: e instanceof Error ? e.message : "product performance failed" };
    }
    const firstProduct = productsBody?.data?.products?.[0] ?? {};
    const coverage = {
      new_shop_visitors_90d: "check: shop API has avg_visitors/buyers but no 90-day-inactive split — see trafficKeys",
      assisted_new_shop_visitors_90d: "check: assisted (28-day shown-ad window) is ad-attribution — Shop API unlikely",
      assisted_cost_per_ppv: "check: product funnel has add_cart_rate/click_order_rate — see productKeys",
      assisted_purchases: "check: see productKeys + sales keys",
      assisted_gross_revenue: "check: see productKeys + sales keys",
      assisted_roas: "check: derived if revenue present",
    };
    return NextResponse.json({
      shop: "Him.DrSamhan",
      window: { start_date_ge: startGe, end_date_lt: endLt },
      shopPerformance: {
        code: shopBody?.code ?? -1,
        message: (shopBody?.message ?? "").slice(0, 200),
        latest_available_date: shopBody?.data?.latest_available_date ?? null,
        intervalKeys: Object.keys(first),
        trafficKeys: Object.keys(first?.traffic ?? {}),
        firstInterval: first,
      },
      productPerformance: {
        code: productsBody?.code ?? -1,
        message: String(productsBody?.message ?? productsBody?.error ?? "").slice(0, 200),
        productKeys: Object.keys(firstProduct),
        totalPerfKeys: Object.keys(firstProduct?.total_performance ?? {}),
        firstProduct: firstProduct,
      },
      coverage,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-analytics probe failed";
    console.error("[shop-analytics/probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
