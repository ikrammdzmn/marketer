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
const SHOP1_ID = "7495609155379170274"; // Him.DrSamhan (shop-1-only lock)
// Live Room detail family (Live Data scope): documented version is 202502.
// The bundled OAS baseline only knew 202309 (stale) — 202309 calls 500 with
// 36009003 regardless of token. Always use this const for room calls.
const LIVE_ROOM_VERSION = "202502";
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

// Debug-only: first page of UNFILTERED TikTok rows (reveals fields the
// picker drops). Same auth/shape as fetchShopLiveSessions page 1.
export async function fetchShopLiveSessionsRaw(
  shopNumber: string,
  startDateGe: string,
  endDateLt: string,
  accountType: string,
  currency = "LOCAL"
): Promise<{
  latestAvailableDate: string | null;
  totalCount: number;
  rawRows: any[];
}> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  const { appKey, appSecret, accessToken, shopCipher } = await resolveLiveCreds();
  const qp: Record<string, string> = {
    app_key: appKey,
    shop_cipher: shopCipher,
    start_date_ge: startDateGe,
    end_date_lt: endDateLt,
    account_type: accountType,
    currency,
    page_size: "100",
  };
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
  const rows = Array.isArray(data.live_stream_sessions) ? data.live_stream_sessions : [];
  return {
    latestAvailableDate: data.latest_available_date ?? null,
    totalCount: Number(data.total_count ?? 0),
    rawRows: rows,
  };
}

// Debug-only: hunt one session id across up to 5 raw pages (AFFILIATE lists
// run 500+ rows; raw=1 shows page 1 only). Returns the UNFILTERED row.
export async function findShopLiveSessionRaw(
  shopNumber: string,
  startDateGe: string,
  endDateLt: string,
  accountType: string,
  sessionId: string,
  currency = "LOCAL"
): Promise<{
  found: boolean;
  page: number;
  rowKeys: string[];
  row: any | null;
}> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  if (!sessionId) throw new Error("need sessionId (digits)");
  const { appKey, appSecret, accessToken, shopCipher } = await resolveLiveCreds();
  let pageToken = "";
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
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
    const rows = Array.isArray(data.live_stream_sessions) ? data.live_stream_sessions : [];
    for (const r of rows) {
      if (String(r?.id ?? "") === sessionId) {
        return { found: true, page, rowKeys: Object.keys(r ?? {}), row: r };
      }
    }
    pageToken = String(data.next_page_token ?? "");
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { found: false, page: -1, rowKeys: [], row: null };
}

// Debug-only: distinct creators across up to 5 raw AFFILIATE pages.
// open_ids lengths-only here (prefix) — answers whether a grant identity
// appears anywhere in shop data without pasting 500 rows.
export async function scanAffiliateCreators(
  shopNumber: string,
  startDateGe: string,
  endDateLt: string,
  accountType: string,
  currency = "LOCAL"
): Promise<Array<{
  user_name: string | null;
  nick_name: string | null;
  author_type: string | null;
  open_prefix: string;
  rooms: number;
}>> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  const { appKey, appSecret, accessToken, shopCipher } = await resolveLiveCreds();
  const seen = new Map<string, { user_name: string | null; nick_name: string | null; author_type: string | null; open_prefix: string; rooms: number }>();
  let pageToken = "";
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
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
    const rows = Array.isArray(data.live_stream_sessions) ? data.live_stream_sessions : [];
    for (const r of rows) {
      const c = r?.creator ?? {};
      const oid = String(c.open_id ?? "");
      const key = oid || `noid:${String(c.user_name ?? "?")}`;
      const cur = seen.get(key) ?? {
        user_name: c.user_name ?? null,
        nick_name: c.nick_name ?? null,
        author_type: c.author_type ?? null,
        open_prefix: oid.slice(0, 8),
        rooms: 0,
      };
      cur.rooms++;
      seen.set(key, cur);
    }
    pageToken = String(data.next_page_token ?? "");
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return [...seen.values()].sort((a, b) => b.rooms - a.rooms);
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

// 202502 live-room detail family (Live Data scope, creator token only).
// Unlike the 202609 minute endpoint, these are keyed by room. The bundled
// OAS baseline only knew 202309 (stale) — 202309 calls 500 with 36009003.
// The probe that decides affiliate detail.
export async function fetchLiveCoreStats(
  shopNumber: string,
  liveRoomId: string
): Promise<{ liveRoomId: string; stats: any }> {
  if (shopNumber !== "1") throw new Error("shop-live is shop-1-only for now");
  if (!liveRoomId) throw new Error("need liveRoomId (digits, e.g. from the room picker or Seller Center URL)");
  const { appKey, appSecret, accessToken } = await resolveLiveCreds();
  const path = `/analytics/${LIVE_ROOM_VERSION}/live_rooms/${encodeURIComponent(liveRoomId)}/core_stats`;
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

// Creator-token reader for 036 (fail-closed: no row = no call, never falls
// back to the seller token — that path is the 28001022 under test).
export interface CreatorGrant {
  creator_open_id: string;
  creator_user: string | null;
  creator_name: string | null;
  access_token: string;
  refresh_token: string | null;
}

export async function getShopCreatorGrant(
  creatorOpenId: string
): Promise<CreatorGrant> {
  if (!creatorOpenId) throw new Error("need creatorOpenId (from /shop-auth/grant status)");
  const { query } = await import("./db");
  try {
    await query(`SELECT shop_id FROM credentials.shop_creator_tokens LIMIT 0`);
  } catch {
    throw new Error("creator table unreadable (run 036 on this DB?)");
  }
  const r = await query(
    `SELECT creator_open_id, creator_user, creator_name, access_token, refresh_token
     FROM credentials.shop_creator_tokens WHERE shop_id = $1 AND creator_open_id = $2`,
    [SHOP1_ID, creatorOpenId]
  );
  if (r.rows.length > 0 && r.rows[0].access_token) return r.rows[0] as CreatorGrant;
  throw new Error(
    `no creator grant for open_id ${creatorOpenId.slice(0, 8)}… (len ${creatorOpenId.length}) — Copy id from /shop-auth/grant status`
  );
}

export async function listShopCreatorGrants(): Promise<Array<{
  creator_open_id: string;
  creator_user: string | null;
  creator_name: string | null;
  tokenLen: number;
}>> {
  const { query } = await import("./db");
  try {
    const r = await query(
      `SELECT creator_open_id, creator_user, creator_name, access_token
       FROM credentials.shop_creator_tokens WHERE shop_id = $1 ORDER BY updated_at DESC`,
      [SHOP1_ID]
    );
    return r.rows.map((row: any) => ({
      creator_open_id: String(row.creator_open_id ?? ""),
      creator_user: row.creator_user ?? null,
      creator_name: row.creator_name ?? null,
      tokenLen: String(row.access_token ?? "").length,
    }));
  } catch {
    return [];
  }
}

// Live Room Core Stats with a CREATOR token (Live Data scope). Same 202502
// path as fetchLiveCoreStats, but the creator's access_token replaces the
// seller token. First live run decides: cipher needed or not, room id =
// live id or not. Errors propagate verbatim (code + message) for mapping.
export async function fetchLiveCoreStatsAsCreator(
  creatorOpenId: string,
  liveRoomId: string
): Promise<{ liveRoomId: string; creator: string; stats: any }> {
  const out = await fetchLiveRoomAsCreator(creatorOpenId, liveRoomId, "core_stats");
  return { liveRoomId: out.liveRoomId, creator: out.creator, stats: out.data };
}

const LIVE_ROOM_ENDPOINTS = [
  "core_stats",
  "traffic_performances",
  "gmv_trend_performances",
  "product_stats",
] as const;

// Generic Live Room caller with a CREATOR token. Endpoint is one of the
// 202502 live_rooms family. Returns data or throws code + request_id.
export async function fetchLiveRoomAsCreator(
  creatorOpenId: string,
  liveRoomId: string,
  endpoint: string,
  opts: { withCipher?: boolean } = {}
): Promise<{ liveRoomId: string; creator: string; endpoint: string; data: any }> {
  if (!creatorOpenId) throw new Error("need creatorOpenId (from /shop-auth/grant status)");
  if (!liveRoomId) throw new Error("need liveRoomId (digits, affiliate room id from the AFFILIATE list)");
  if (!endpoint) throw new Error("need endpoint (one of the 202502 live_rooms family)");
  const { getAnalyticsAppKeys } = await import("./shop-analytics-credentials");
  const grant = await getShopCreatorGrant(creatorOpenId);
  const { key, secret } = getAnalyticsAppKeys();
  if (!key || !secret) throw new Error("missing SHOP_ANALYTICS_APP_KEY/SECRET env");
  const path = `/analytics/${LIVE_ROOM_VERSION}/live_rooms/${encodeURIComponent(liveRoomId)}/${endpoint}`;
  const qp: Record<string, string> = { app_key: key };
  if (opts.withCipher) {
    const live = await resolveLiveCreds();
    qp.shop_cipher = live.shopCipher;
  }
  const urlForSign =
    `${SHOP_BASE}${path}?` +
    Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
  const sig = signShopUrl(urlForSign, secret);

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
      "x-tts-access-token": grant.access_token,
      "content-type": "application/json",
    },
  });
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(`creator ${endpoint} code=${body.code}: ${body.message ?? "failed"} (req=${body.request_id ?? "?"})`);
  }
  return {
    liveRoomId,
    creator: grant.creator_user ?? grant.creator_open_id,
    endpoint,
    data: body.data?.stats ?? body.data ?? {},
  };
}

export { LIVE_ROOM_ENDPOINTS };

// Grant lookup by admin label (case-insensitive). Open_ids differ across
// surfaces (alliance nAKT… vs shop B35v… for the same human), so matching
// runs on the labeled username, which the admin sets at grant time.
export async function findShopCreatorGrantByUser(
  creatorUser: string
): Promise<CreatorGrant> {
  const want = creatorUser.trim().replace(/^@/, "").toLowerCase();
  if (!want) throw new Error("need creatorUser (affiliate row creator.user_name)");
  const { query } = await import("./db");
  let rows: any[] = [];
  try {
    const r = await query(
      `SELECT creator_open_id, creator_user, creator_name, access_token, refresh_token
       FROM credentials.shop_creator_tokens WHERE shop_id = $1`,
      [SHOP1_ID]
    );
    rows = r.rows ?? [];
  } catch {
    throw new Error("creator table unreadable (run 036 on this DB?)");
  }
  const hit = rows.find(
    (x) => String(x.creator_user ?? "").replace(/^@/, "").toLowerCase() === want && x.access_token
  );
  if (!hit) {
    throw new Error(
      `no creator grant labeled "${want}" (mint a link on /shop-auth/grant, approve as @${want}, then set Name/Username)`
    );
  }
  return hit as CreatorGrant;
}

// Full room bundle for /shop-live AFFILIATE rooms: all four Live Data
// endpoints in parallel, fail-open per endpoint (one red endpoint never
// kills the other three). Hobby-safe: ~4 calls, seconds total.
export async function fetchLiveRoomBundleAsCreator(
  creatorUser: string,
  liveRoomId: string
): Promise<{
  liveRoomId: string;
  creator: string;
  core: any | null;
  traffic: any | null;
  gmvTrend: any | null;
  products: any | null;
  errors: Array<{ endpoint: string; code: string }>;
}> {
  if (!liveRoomId) throw new Error("need liveRoomId (affiliate live_id from the AFFILIATE list)");
  const { getAnalyticsAppKeys } = await import("./shop-analytics-credentials");
  const grant = await findShopCreatorGrantByUser(creatorUser);
  const { key, secret } = getAnalyticsAppKeys();
  if (!key || !secret) throw new Error("missing SHOP_ANALYTICS_APP_KEY/SECRET env");
  async function call(endpoint: string): Promise<any> {
    const path = `/analytics/${LIVE_ROOM_VERSION}/live_rooms/${encodeURIComponent(liveRoomId)}/${endpoint}`;
    const qp: Record<string, string> = { app_key: key };
    const urlForSign =
      `${SHOP_BASE}${path}?` +
      Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
    const sig = signShopUrl(urlForSign, secret);
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
        "x-tts-access-token": grant.access_token,
        "content-type": "application/json",
      },
    });
    const body = await res.json();
    if (body.code !== 0) {
      throw new Error(`creator ${endpoint} code=${body.code}: ${body.message ?? "failed"} (req=${body.request_id ?? "?"})`);
    }
    return body.data ?? {};
  }
  const eps = ["core_stats", "traffic_performances", "gmv_trend_performances", "product_stats"] as const;
  const settled = await Promise.allSettled(eps.map((ep) => call(ep)));
  const out: any = { liveRoomId, creator: grant.creator_user ?? grant.creator_open_id, core: null, traffic: null, gmvTrend: null, products: null, errors: [] };
  settled.forEach((s, i) => {
    const ep = eps[i];
    if (s.status === "fulfilled") {
      const d = s.value ?? {};
      if (ep === "core_stats") out.core = d.stats ?? d;
      else if (ep === "traffic_performances") out.traffic = d.traffic_performances ?? [];
      else if (ep === "gmv_trend_performances") out.gmvTrend = d.gmv_trend_performances ?? [];
      else out.products = d.product_stats ?? [];
    } else {
      out.errors.push({ endpoint: ep, code: s.reason instanceof Error ? s.reason.message : "failed" });
    }
  });
  return out;
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
