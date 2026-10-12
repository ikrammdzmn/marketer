import { getShopCredentials } from "./shop-credentials";
import {
  getAnalyticsAppKeys,
  getShopAnalyticsCredentials,
} from "./shop-analytics-credentials";
import { createHmac } from "crypto";

// Shop LIVE minute performance (Partner API 202510):
// GET /analytics/202510/shop_lives/{live_id}/performance_per_minutes
// Scope: data.shop_analytics.public.read (seller token + shop_cipher).
// Doc: 2-gmvmax/gmvmax-auto/DOC MD/Get Shop LIVE Minute Performance.md
// Server-only — client pages must call /api/shop-live/* (import wall).

const SHOP_BASE = "https://open-api.tiktokglobalshop.com";
const ANALYTICS_VERSION = "202510";
// List path is versioned separately (verified from the List doc):
const LIVES_PATH = "/analytics/202609/shop_lives/performance";
const MAX_PAGES = 15; // 15 × 100 one-minute intervals = 25h ceiling
const MAX_LIST_PAGES = 5; // list pages (370-session range ≈ 4 pages)

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface ShopLiveOverall {
  live_title: string | null;
  start_time: number | null;
  end_time: number | null;
  duration: number;
  gmv: number;
  currency: string | null;
  items_sold: number;
  unique_viewers: number;
  impressions: number;
}

export interface ShopLiveSummary extends ShopLiveOverall {
  main_orders: number;
  sku_orders: number;
  customers: number;
  views: number;
  peak_viewers: number;
  product_clicks: number;
  product_impressions: number;
  // Derived (label ~ in UI): tap-through has no exact field —
  // defined here as product_clicks / views.
  tap_through_rate: number | null;
  // Derived CTOR: total sku_orders / total product_clicks.
  derived_ctor_sku: number | null;
  mean_ctor_sku: number | null;
  mean_ctr: number | null;
  aov: number | null;
  gmv_per_hour: number | null;
  // Explicitly unavailable in this payload (never invent):
  // avg_viewing_duration, ads_cost, gmv_max_roi, gmv_max_active.
}

export interface ShopLiveHour {
  hour: string; // MYT "HH:00"
  gmv: number;
  items_sold: number;
  sku_orders: number;
  main_orders: number;
  views: number;
  viewers: number;
  product_clicks: number;
  product_impressions: number;
  impressions: number;
}

// Verified spec: DOC MD/Get Shop LIVE Performance List.md. The doc's Query
// Header is the ENTIRE signed set — app_key/shop_cipher/dates/account_type
// (+ documented optionals). access_token, shop_id, and version travel outside
// signing (header / path / proxy envelope): sending them in-query breaks the
// signature (106001), which is what killed every earlier variant.
export interface ShopLiveSession {
  id: string;
  title: string | null;
  creator_nick: string | null;
  creator_user: string | null;
  author_type: string | null;
  start_time: string | null;
  end_time: string | null;
  // Per-session KPI blocks (list already returns the full dashboard grain:
  // traffic.tap_through_rate / avg_viewing_duration / gmv_per_hour exact,
  // sales.live_attributed_*, interactions for OFFICIAL/MARKETING only).
  traffic: any | null;
  sales: any | null;
  interactions: any | null;
}

// Collection path verified: DOC MD/Get Shop LIVE Performance List.md
// (202609 is its own version line, separate from the 202510 minute path).
export async function fetchShopLiveSessions(
  shopNumber: string,
  startDateGe: string,
  endDateLt: string,
  accountType: string,
  maxPages = MAX_LIST_PAGES,
  currency = "LOCAL"
): Promise<{
  sessions: ShopLiveSession[];
  latestAvailableDate: string | null;
  totalCount: number;
  pages: number;
}> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  if (!startDateGe || !endDateLt) throw new Error("need startDateGe + endDateLt (YYYY-MM-DD)");
  if (!accountType) throw new Error("need accountType (e.g. MARKETING)");
  const { appKey, appSecret, accessToken, shopCipher } = await resolveLiveCreds();

  let sessions: ShopLiveSession[] = [];
  let latestAvailableDate: string | null = null;
  let totalCount = 0;
  let pageToken = "";
  let pages = 0;
  for (let i = 0; i < Math.min(Math.max(maxPages, 1), MAX_LIST_PAGES); i++) {
    const qp: Record<string, string> = {
      app_key: appKey,
      shop_cipher: shopCipher,
      start_date_ge: startDateGe,
      end_date_lt: endDateLt,
      account_type: accountType,
      currency,
      page_size: "100",
    };
    if (pageToken) qp.page_token = pageToken;
    const urlForSign =
      `${SHOP_BASE}${LIVES_PATH}?` +
      Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
    const sig = signShopUrl(urlForSign, appSecret);
    if (sig instanceof Error) throw new Error(`sign failed: ${sig.message}`);
    const finalParams: Record<string, string> = {
      ...qp,
      sign: String(sig.signature),
      timestamp: String(sig.timestamp),
    };
    const finalQs = Object.keys(finalParams)
      .sort().map((k) => `${k}=${encodeURIComponent(finalParams[k])}`).join("&");
    const res = await fetch(`${SHOP_BASE}${LIVES_PATH}?${finalQs}`, {
      method: "GET",
      headers: {
        "x-tts-access-token": accessToken,
        "content-type": "application/json",
      },
    });
    const body = await res.json();
    if (body.code !== 0) {
      throw new Error(`shop-live sessions code=${body.code}: ${body.message ?? "failed"}`);
    }
    const data = body.data ?? {};
    if (i === 0) latestAvailableDate = data.latest_available_date ?? null;
    if (Number(data.total_count)) totalCount = Number(data.total_count);
    const rows = Array.isArray(data.live_stream_sessions) ? data.live_stream_sessions : [];
    for (const r of rows) {
      sessions.push({
        id: String(r?.id ?? ""),
        title: r?.title ?? null,
        creator_nick: r?.creator?.nick_name ?? null,
        creator_user: r?.creator?.user_name ?? null,
        author_type: r?.creator?.author_type ?? null,
        start_time: r?.start_time ?? null,
        end_time: r?.end_time ?? null,
        traffic: r?.traffic && Object.keys(r.traffic).length > 0 ? r.traffic : null,
        sales: r?.sales_performance && Object.keys(r.sales_performance).length > 0 ? r.sales_performance : null,
        interactions: r?.interaction_performance && Object.keys(r.interaction_performance).length > 0 ? r.interaction_performance : null,
      });
    }
    pages++;
    pageToken = String(data.next_page_token ?? "");
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { sessions, latestAvailableDate, totalCount, pages };
}

function mytHourLabel(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  return `${h}:00`;
}

// Local signer: byte-identical to tiktok-shop signByUrl EXCEPT it splits
// each pair on the FIRST '=' only. The lib's naive split('=') truncates
// base64 page_token values ("....MQ=="), so any paged follow-up (page 2+)
// signs a truncated token while sending the full one — instant 106001.
// MARKETING lists fit one page (hence green); AFFILIATE (370 rows) always
// pages, hence always failed. Same latent bug exists in shop-orders.ts
// (untouched — its path works today, do not "fix" blind).
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

async function fetchLivePage(
  appKey: string,
  appSecret: string,
  accessToken: string,
  shopCipher: string,
  liveId: string,
  currency: string,
  pageToken: string
): Promise<any> {
  const path = `/analytics/${ANALYTICS_VERSION}/shop_lives/${encodeURIComponent(liveId)}/performance_per_minutes`;
  const qp: Record<string, string> = {
    app_key: appKey,
    shop_cipher: shopCipher,
    currency,
  };
  if (pageToken) qp.page_token = pageToken;
  const urlForSign =
    `${SHOP_BASE}${path}?` +
    Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
  const sig = signShopUrl(urlForSign, appSecret);
  if (sig instanceof Error) throw new Error(`sign failed: ${sig.message}`);
  const finalParams: Record<string, string> = {
    ...qp,
    sign: String(sig.signature),
    timestamp: String(sig.timestamp),
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
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(`shop-live code=${body.code}: ${body.message ?? "failed"}`);
  }
  // Sample shape: data: { performance: { overall, intervals }, next_page_token, total_count }
  const data = body.data ?? {};
  return {
    perf: data.performance ?? data ?? {},
    nextPageToken: String(data.next_page_token ?? ""),
    totalCount: Number(data.total_count ?? 0),
  };
}

export interface LiveCreds {
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopCipher: string;
}

// Dual-key model: prefer the Analytics app keys (025); fall back to the
// legacy single keypair (Connectors app) so nothing breaks before the new
// app is wired. Legacy calls are expected to fail 105005 (missing scope).
async function resolveLiveCreds(): Promise<LiveCreds> {
  const ana = getAnalyticsAppKeys();
  const anaCreds = ana.key && ana.secret ? await getShopAnalyticsCredentials("1") : null;
  if (anaCreds && anaCreds.shop_cipher) {
    return {
      appKey: ana.key,
      appSecret: ana.secret,
      accessToken: anaCreds.access_token,
      shopCipher: anaCreds.shop_cipher,
    };
  }
  const appKey = cleanEnv(process.env.SHOP_APP_KEY);
  const appSecret = cleanEnv(process.env.SHOP_APP_SECRET);
  if (!appKey || !appSecret) {
    throw new Error(
      "missing SHOP_ANALYTICS_APP_KEY/SECRET env (new Analytics app) and no SHOP_APP_KEY/SECRET fallback"
    );
  }
  const creds = await getShopCredentials("1");
  if (!creds) throw new Error("missing shop token (env or credentials.shop_tokens row)");
  if (!creds.shop_cipher) throw new Error("missing shop_cipher (comes with the authorize step)");
  return { appKey, appSecret, accessToken: creds.access_token, shopCipher: creds.shop_cipher };
}

export async function fetchShopLivePerformance(
  shopNumber: string,
  liveId: string,
  currency = "LOCAL",
  maxPages = MAX_PAGES
): Promise<{ overall: ShopLiveOverall; intervals: any[]; pages: number; totalCount: number }> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  if (!liveId) throw new Error("need liveId (digits from the Seller Center live URL)");
  const { appKey, appSecret, accessToken, shopCipher } = await resolveLiveCreds();

  let overall: any = {};
  let intervals: any[] = [];
  let totalCount = 0;
  let pageToken = "";
  let pages = 0;
  for (let i = 0; i < Math.min(maxPages, 15); i++) {
    const { perf, nextPageToken, totalCount: tc } = await fetchLivePage(
      appKey, appSecret, accessToken, shopCipher,
      liveId, currency, pageToken
    );
    if (i === 0) overall = perf.overall ?? {};
    intervals = intervals.concat(perf.intervals ?? []);
    if (tc) totalCount = tc;
    pages++;
    pageToken = nextPageToken;
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { overall: normalizeOverall(overall), intervals, pages, totalCount };
}

// 202309 live-room detail family (bundled OAS baseline). Unlike the 202609
// minute endpoint, these are keyed by room and may predate its creator-type
// permission wall — the probe that decides affiliate detail.
export async function fetchLiveCoreStats(
  shopNumber: string,
  liveRoomId: string
): Promise<{ liveRoomId: string; stats: any }> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  if (!liveRoomId) throw new Error("need liveRoomId (digits, e.g. from the room picker or Seller Center URL)");
  const { appKey, appSecret, accessToken } = await resolveLiveCreds();
  const path = `/analytics/202309/live_rooms/${encodeURIComponent(liveRoomId)}/core_stats`;
  // OAS lists no query params, but the API answers 36009004 unless app_key
  // travels in-query (and signed). Cipher stays out unless asked.
  const qp: Record<string, string> = { app_key: appKey };
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
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(`shop-live core-stats code=${body.code}: ${body.message ?? "failed"}`);
  }
  return { liveRoomId, stats: body.data?.stats ?? body.data ?? {} };
}

function normalizeOverall(o: any): ShopLiveOverall {
  return {
    live_title: o?.live_title ?? null,
    start_time: Number(o?.start_time) || null,
    end_time: Number(o?.end_time) || null,
    duration: Number(o?.duration) || 0,
    gmv: num(o?.gmv?.amount),
    currency: o?.gmv?.currency ?? null,
    items_sold: Number(o?.items_sold) || 0,
    unique_viewers: Number(o?.unique_viewers) || 0,
    impressions: Number(o?.impressions) || 0,
  };
}

export function summarizeShopLive(overall: ShopLiveOverall, intervals: any[]): ShopLiveSummary {
  let sku = 0, main = 0, cust = 0, views = 0, peak = 0;
  let clicks = 0, prodImp = 0, ctrSum = 0, ctrN = 0, ctorSum = 0, ctorN = 0;
  for (const it of intervals) {
    const s = it?.sales ?? {};
    const t = it?.traffic ?? {};
    const c = it?.conversion?.click_to_order_rate ?? {};
    sku += Number(s.sku_orders) || 0;
    main += Number(s.main_orders) || 0;
    cust += Number(s.customers) || 0;
    views += Number(t.views) || 0;
    peak = Math.max(peak, Number(t.viewers) || 0);
    clicks += Number(t.product_clicks) || 0;
    prodImp += Number(t.product_impressions) || 0;
    const ctr = parseFloat(t.ctr);
    if (Number.isFinite(ctr)) { ctrSum += ctr; ctrN++; }
    const ctor = parseFloat(c.sku_order_ctor);
    if (Number.isFinite(ctor)) { ctorSum += ctor; ctorN++; }
  }
  const hours = overall.duration > 0 ? overall.duration / 3600 : 0;
  return {
    ...overall,
    main_orders: main,
    sku_orders: sku,
    customers: cust,
    views,
    peak_viewers: peak,
    product_clicks: clicks,
    product_impressions: prodImp,
    tap_through_rate: views > 0 ? clicks / views : null,
    derived_ctor_sku: clicks > 0 ? sku / clicks : null,
    mean_ctor_sku: ctorN > 0 ? ctorSum / ctorN : null,
    mean_ctr: ctrN > 0 ? ctrSum / ctrN : null,
    aov: main > 0 ? overall.gmv / main : null,
    gmv_per_hour: hours > 0 ? overall.gmv / hours : null,
  };
}

export function bucketShopLiveHours(intervals: any[]): ShopLiveHour[] {
  const map = new Map<string, ShopLiveHour>();
  for (const it of intervals) {
    const ts = Number(it?.start_time) || 0;
    if (!ts) continue;
    const hour = mytHourLabel(ts);
    let row = map.get(hour);
    if (!row) {
      row = {
        hour, gmv: 0, items_sold: 0, sku_orders: 0, main_orders: 0,
        views: 0, viewers: 0, product_clicks: 0, product_impressions: 0, impressions: 0,
      };
      map.set(hour, row);
    }
    const s = it?.sales ?? {};
    const t = it?.traffic ?? {};
    row.gmv += num(s.gmv?.amount);
    row.items_sold += Number(s.items_sold) || 0;
    row.sku_orders += Number(s.sku_orders) || 0;
    row.main_orders += Number(s.main_orders) || 0;
    row.views += Number(t.views) || 0;
    row.viewers = Math.max(row.viewers, Number(t.viewers) || 0);
    row.product_clicks += Number(t.product_clicks) || 0;
    row.product_impressions += Number(t.product_impressions) || 0;
    row.impressions += Number(t.impressions) || 0;
  }
  return [...map.values()].sort((a, b) => (a.hour < b.hour ? -1 : 1));
}
