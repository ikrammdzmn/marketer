import { createHmac } from "crypto";
import { query } from "./db";
import { getAnalyticsAppKeys, getShopAnalyticsCredentials } from "./shop-analytics-credentials";

// Seller Center organic (TikTok Shop Open API, analytics 202509).
// Port of 2-gmvmax/tiktok-creative-analysis/claude system docs 01+03+06:
//   GET /analytics/202509/shop_videos/performance (per-day per-video:
//     views, ctr, gmv, sku_orders) — two sorts (views + gmv), stop when a
//     page has <100 views, keep rows with views >= 100 OR any GMV.
//   GET /analytics/202509/shop_videos/{id}/products/performance
//     (per-video-day product imp + clicks) — only for video-days with
//     >=10,000 views or sales (~3s/call, the slow leg, fail-open NULL).
// Server-only — pages call /api/seller-creative/* (import wall).
// Shop 1 only (owner lock).

const SHOP_BASE = "https://open-api.tiktokglobalshop.com";
const SHOP1_ID = "7495609155379170274";
const PERF_PATH = "/analytics/202509/shop_videos/performance";
const OVERVIEW_PATH = "/analytics/202509/shop_videos/overview_performance";
const MAX_PAGES = 25; // ~2,000 videos/day ÷ 100 per page + gmv-sort pass
const IMP_VIEW_FLOOR = 10000;

// Internal accounts (owner list, doc 04): exact lower match.
const INTERNAL = new Set(
  [
    "dr.samhan", "affiliatedrsamhan1", "affiliatedrsamhan5",
    "himcoffeedrsamhan", "himcoffeebydrsamhan", "himcoffeebydrsamhan1",
    "himcoffeebydrsamhan2", "himcoffeebydrsamhan3", "drsamhanofficial",
    "drsamhanofficial3", "drsamhanofficial4", "drsamhanofficial8",
    "drsamhanstore", "drsamhansembangsihat", "drsamhaninfosihat",
  ].map((s) => s.toLowerCase())
);

export function classifyAccount(username: unknown): "linked" | "internal" | "affiliate" {
  const u = String(username ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!u) return "affiliate";
  if (/samhan|himcoffee/.test(u)) return "linked";
  if (INTERNAL.has(u)) return "internal";
  return "affiliate";
}

// B-taxonomy (DB-sourced, post-pull enrichment): creative.accounts is the
// authority (exact lower match). Registered → internal / top_affiliate /
// inactive; unregistered → affiliate. Fail-open: DB error → empty map,
// caller falls back to legacy classifyAccount.
export type SellerClass = "internal" | "top_affiliate" | "affiliate" | "inactive";
export async function resolveAccountClasses(usernames: string[]): Promise<Map<string, SellerClass>> {
  const out = new Map<string, SellerClass>();
  const uniq = [...new Set(usernames.map((u) => String(u ?? "").trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];
  if (!uniq.length) return out;
  try {
    const r = await query(
      `SELECT username, active, top_affiliate FROM creative.accounts WHERE LOWER(TRIM(BOTH '@' FROM TRIM(username))) = ANY($1)`,
      [uniq]
    );
    for (const row of r.rows) {
      const u = String(row.username ?? "").trim().toLowerCase().replace(/^@/, "");
      if (!u) continue;
      out.set(u, row.active === false ? "inactive" : row.top_affiliate === true ? "top_affiliate" : "internal");
    }
  } catch {
    /* fail-open: caller falls back to classifyAccount */
  }
  return out;
}
export function sellerClassOf(username: unknown, resolved?: Map<string, SellerClass>): string {
  const u = String(username ?? "").trim().toLowerCase().replace(/^@/, "");
  if (u && resolved?.has(u)) return resolved.get(u)!;
  if (u && resolved) return "affiliate";
  return classifyAccount(username);
}

// Snowflake upload time: upper 32 bits = unix seconds (doc 05 source 1).
export function postedFromId(videoId: unknown): string | null {
  try {
    const s = String(videoId ?? "").trim();
    if (!/^\d{15,22}$/.test(s)) return null;
    const ts = Number(BigInt(s) >> BigInt(32));
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return new Date((ts + 8 * 3600) * 1000).toISOString();
  } catch {
    return null;
  }
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// TikTok wraps money as { amount: "123.45", currency: "MYR" } —
// Number(object) is NaN, so plain num() zeroed every sale (B142:
// 61 orders with RM0 GMV). Unwrap first.
const money = (v: unknown): number => {
  if (v !== null && typeof v === "object") {
    const a = (v as Record<string, unknown>).amount;
    if (a !== undefined) return num(a);
  }
  return num(v);
};

function parsePostTime(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // "2026-10-31 16:28:14" — no zone from TikTok; Seller Center runs MYT.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)
    ? s.replace(" ", "T") + "+08:00"
    : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface OrganicCreds {
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopCipher: string;
}

async function resolveOrganicCreds(): Promise<OrganicCreds> {
  const ana = getAnalyticsAppKeys();
  if (!ana.key || !ana.secret)
    throw new Error("missing SHOP_ANALYTICS_APP_KEY/SECRET env (Analytics app)");
  const creds = await getShopAnalyticsCredentials("1");
  if (!creds || !creds.shop_cipher)
    throw new Error("no shop cipher — authorize the Analytics app via Shop grants first");
  return { appKey: ana.key, appSecret: ana.secret, accessToken: creds.access_token, shopCipher: creds.shop_cipher };
}

// Local signer (same first-'=' rule as shop-live.ts — base64 page_tokens
// carry '=' padding; naive split truncates the signature input → 106001).
function signShopUrl(url: string, appSecret: string): { signature: string; timestamp: string } {
  const decoded = decodeURIComponent(url);
  const qIndex = decoded.indexOf("?");
  const pathMatch = decoded.match(/\.com(.*?)\?/);
  const path = pathMatch ? pathMatch[1] : "";
  const q = qIndex >= 0 ? decoded.slice(qIndex + 1) : "";
  const params: Record<string, string> = {};
  for (const pair of q.split("&")) {
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
  const signature = createHmac("sha256", appSecret).update(appSecret + input + appSecret).digest("hex");
  return { signature, timestamp };
}

async function shopGet(path: string, qp: Record<string, string>): Promise<any> {
  const { appKey, appSecret, accessToken, shopCipher } = await resolveOrganicCreds();
  const base: Record<string, string> = { app_key: appKey, shop_cipher: shopCipher, ...qp };
  let lastErr = "";
  for (let i = 0; i <= 3; i++) {
    const urlForSign =
      `${SHOP_BASE}${path}?` +
      Object.keys(base).sort().map((k) => `${k}=${encodeURIComponent(base[k])}`).join("&");
    const sig = signShopUrl(urlForSign, appSecret);
    const finalParams: Record<string, string> = { ...base, sign: sig.signature, timestamp: sig.timestamp };
    const finalQs = Object.keys(finalParams)
      .sort().map((k) => `${k}=${encodeURIComponent(finalParams[k])}`).join("&");
    const res = await fetch(`${SHOP_BASE}${path}?${finalQs}`, {
      method: "GET",
      headers: { "x-tts-access-token": accessToken, "content-type": "application/json" },
    });
    if (res.status === 429 && i < 3) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
      continue;
    }
    // Read as text first: timeouts/proxies answer HTML ("An error
    // occurred…") and res.json() would throw a cryptic SyntaxError.
    const txt = await res.text();
    let body: any;
    try {
      body = JSON.parse(txt);
    } catch {
      throw new Error(`shop returned non-JSON (HTTP ${res.status}): ${txt.slice(0, 120)}`);
    }
    if (body.code !== 0) {
      lastErr = `shop code=${body.code}: ${body.message ?? "failed"}`;
      if (body.code === 429 && i < 3) {
        await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
        continue;
      }
      throw new Error(lastErr);
    }
    return body.data ?? {};
  }
  throw new Error(lastErr || "shop GET failed");
}

export interface OrganicRow {
  video_id: string;
  views: number;
  ctr: number | null;
  gmv: number | null;
  sku_orders: number | null;
  username?: string | null;
  caption?: string | null;
  duration_s?: number | null;
  hashtags?: string | null;
  products?: string | null;
  posted_api?: string | null;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
}

function pickRows(list: any[]): OrganicRow[] {
  const out: OrganicRow[] = [];
  for (const r of list) {
    // Raw key is `id`; the mapped firstRow uses `video_id` — accept both.
    const id = String(r?.video_id ?? r?.id ?? "");
    if (!id) continue;
    const views = num(r?.views ?? r?.view_count);
    const gmvRaw = r?.gmv;
    const gmv = gmvRaw === null || gmvRaw === undefined ? null : money(gmvRaw);
    if (views < 100 && !(gmv !== null && gmv > 0)) continue;
    const tags = strArr(r?.hash_tags ?? r?.hashtags);
    const prods = Array.isArray(r?.products)
      ? r.products.map((p: any) => (typeof p === "string" ? p : String(p?.name ?? p?.id ?? ""))).filter(Boolean)
      : [];
    const username = r?.username != null && String(r.username).trim() ? String(r.username).trim() : null;
    out.push({
      video_id: id,
      views,
      ctr: r?.click_through_rate === null || r?.click_through_rate === undefined ? null : num(r.click_through_rate),
      gmv,
      sku_orders: r?.sku_orders === null || r?.sku_orders === undefined ? null : Math.round(num(r.sku_orders)),
      username,
      caption: r?.title != null && String(r.title).trim() ? String(r.title).trim().slice(0, 500) : null,
      duration_s: r?.duration != null ? Math.round(num(r.duration)) || null : null,
      hashtags: tags.length ? tags.join(" ").slice(0, 500) : null,
      products: prods.length ? prods.join(" | ").slice(0, 500) : null,
      posted_api: parsePostTime(r?.video_post_time ?? r?.post_time),
    });
  }
  return out;
}

// One day (endExclusive = day+1): views-sort pass + gmv-sort pass, deduped.
export async function fetchOrganicDay(dateGe: string, dateLt: string): Promise<{ rows: OrganicRow[]; latestAvailable: string | null; pages: number }> {
  const seen = new Map<string, OrganicRow>();
  let latestAvailable: string | null = null;
  let pages = 0;
  for (const sort of ["views", "gmv"]) {
    let pageToken = "";
    let thinPages = 0; // consecutive views-sort pages below the keep floor
    let flatPages = 0; // consecutive gmv-sort pages with no sellers
    for (let i = 0; i < MAX_PAGES; i++) {
      const qp: Record<string, string> = {
        start_date_ge: dateGe, end_date_lt: dateLt, sort_field: sort, page_size: "100",
      };
      if (pageToken) qp.page_token = pageToken;
      const data = await shopGet(PERF_PATH, qp);
      if (i === 0 && sort === "views") latestAvailable = data.latest_available_date ?? null;
      const list = Array.isArray(data.video_list) ? data.video_list : Array.isArray(data.videos) ? data.videos : [];
      pages++;
      let minViews = Infinity;
      let sellers = 0;
      for (const r of pickRows(list)) {
        const prev = seen.get(r.video_id);
        if (!prev) seen.set(r.video_id, r);
        else {
          // Same video can appear in both passes — backfill metadata
          // fields the first pass left null (no extra API cost).
          for (const k of ["username", "caption", "duration_s", "hashtags", "products", "posted_api"] as const) {
            if ((prev[k] ?? null) === null && (r[k] ?? null) !== null) (prev as any)[k] = r[k];
          }
        }
        if (r.views < minViews) minViews = r.views;
        if ((r.gmv ?? 0) > 0) sellers++;
      }
      // Views-sort is descending: once pages run thin, only the gmv-sort
      // pass can still add (low-view sellers) — stop early to save the
      // 60s budget. Two consecutive thin pages as safety margin.
      if (sort === "views") {
        thinPages = minViews < 100 ? thinPages + 1 : 0;
        if (thinPages >= 2) break;
      }
      // Gmv-sort is descending too: once pages carry no sellers, the rest
      // are gmv=0 rows the views pass already covered — stop early.
      if (sort === "gmv") {
        flatPages = sellers === 0 ? flatPages + 1 : 0;
        if (flatPages >= 2) break;
      }
      pageToken = String(data.next_page_token ?? data.page_token ?? "");
      if (!pageToken) break;
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return { rows: [...seen.values()], latestAvailable, pages };
}

export async function fetchOrganicImp(videoId: string, dateGe: string, dateLt: string): Promise<{ imp: number | null; clicks: number | null }> {
  const data = await shopGet(`${PERF_PATH.replace("/performance", "")}/${encodeURIComponent(videoId)}/products/performance`, {
    start_date_ge: dateGe, end_date_lt: dateLt,
  });
  // Verified shape (probe 05 Nov): { products: [{ product_impressions,
  // product_clicks, ... }], total_count, ... } — SUM across products.
  const arr = Array.isArray((data as any)?.products) ? (data as any).products : null;
  if (arr) {
    let imp = 0, clicks = 0, hasImp = false, hasClicks = false;
    for (const p of arr) {
      if (p?.product_impressions !== null && p?.product_impressions !== undefined) {
        imp += Math.round(num(p.product_impressions));
        hasImp = true;
      }
      if (p?.product_clicks !== null && p?.product_clicks !== undefined) {
        clicks += Math.round(num(p.product_clicks));
        hasClicks = true;
      }
    }
    return { imp: hasImp ? imp : null, clicks: hasClicks ? clicks : null };
  }
  // Fallback: nested `performance`, top-level, and list forms.
  const cands: any[] = [];
  if (data && typeof data === "object") {
    cands.push((data as any).performance ?? null, (data as any).data ?? null, data);
    const lst = Array.isArray((data as any).list) ? (data as any).list : Array.isArray((data as any).video_list) ? (data as any).video_list : null;
    if (lst && lst[0]) cands.push(lst[0]);
  }
  const pick = (...keys: string[]): number | null => {
    for (const c of cands) {
      if (!c || typeof c !== "object") continue;
      for (const k of keys) {
        const v = (c as Record<string, unknown>)[k];
        if (v !== null && v !== undefined) {
          if (typeof v === "object" && "amount" in (v as object)) return Math.round(money(v));
          const n = num(v);
          if (Number.isFinite(n)) return Math.round(n);
        }
      }
    }
    return null;
  };
  return {
    imp: pick("product_impressions", "product_impression", "impressions", "imp", "product_views"),
    clicks: pick("product_clicks", "product_click", "clicks", "click"),
  };
}

// One raw products/performance payload so the probe can reveal the true
// imp/clicks field names (shape never verified — B144).
export async function fetchOrganicImpSample(videoId: string, dateGe: string, dateLt: string): Promise<{ keys: string[]; sample: any }> {
  const data = await shopGet(`${PERF_PATH.replace("/performance", "")}/${encodeURIComponent(videoId)}/products/performance`, {
    start_date_ge: dateGe, end_date_lt: dateLt,
  });
  const inner = (data as any)?.performance ?? (data as any)?.data ?? data;
  const keys = inner && typeof inner === "object" && !Array.isArray(inner) ? Object.keys(inner) : [];
  const trim = (v: unknown): unknown => {
    if (typeof v === "string") return v.length > 200 ? v.slice(0, 200) + "…" : v;
    if (Array.isArray(v)) return v.slice(0, 3).map(trim);
    if (typeof v === "object" && v !== null) {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(v).slice(0, 30)) o[k] = trim((v as Record<string, unknown>)[k]);
      return o;
    }
    return v;
  };
  return { keys, sample: trim(data) };
}

// One raw page (first item only) so the probe can reveal the true
// field names for username/title/post_time (docs marked them [andaian]).
export async function fetchOrganicRawSample(dateGe: string, dateLt: string): Promise<{ keys: string[]; sample: any }> {
  const data = await shopGet(PERF_PATH, {
    start_date_ge: dateGe, end_date_lt: dateLt, sort_field: "views", page_size: "5",
  });
  const list = Array.isArray(data.video_list) ? data.video_list : Array.isArray(data.videos) ? data.videos : [];
  const first = list[0] ?? {};
  const keys = typeof first === "object" && first !== null ? Object.keys(first) : [];
  const trim = (v: unknown): unknown => {
    if (typeof v === "string") return v.length > 200 ? v.slice(0, 200) + "…" : v;
    if (Array.isArray(v)) return v.slice(0, 5).map(trim);
    if (typeof v === "object" && v !== null) {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(v).slice(0, 30)) o[k] = trim((v as Record<string, unknown>)[k]);
      return o;
    }
    return v;
  };
  return { keys, sample: trim(first) };
}

export async function fetchOrganicOverview(dateGe: string, dateLt: string): Promise<any> {
  return shopGet(OVERVIEW_PATH, { start_date_ge: dateGe, end_date_lt: dateLt });
}

export async function upsertOrganicDay(date: string, rows: OrganicRow[], impById?: Map<string, { imp: number | null; clicks: number | null }>): Promise<number> {
  let n = 0;
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const vals: string[] = [];
    const args: any[] = [];
    part.forEach((r, j) => {
      const o = j * 7;
      const imp = impById?.get(r.video_id);
      vals.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`);
      args.push(r.video_id, date, r.views, r.ctr, r.gmv, r.sku_orders, imp ? imp.imp : null);
    });
    await query(
      `INSERT INTO creative.video_day_organic (video_id, date, views, ctr, gmv, sku_orders, imp)
       VALUES ${vals.join(", ")}
       ON CONFLICT (video_id, date) DO UPDATE SET
         views = EXCLUDED.views, ctr = EXCLUDED.ctr, gmv = EXCLUDED.gmv,
         sku_orders = EXCLUDED.sku_orders,
         imp = COALESCE(EXCLUDED.imp, creative.video_day_organic.imp),
         synced_at = NOW()`,
      args
    );
    n += part.length;
    if (impById) {
      for (const r of part) {
        const c = impById.get(r.video_id);
        if (c && c.clicks !== null) {
          await query(
            `UPDATE creative.video_day_organic SET clicks = $3, synced_at = NOW()
             WHERE video_id = $1 AND date = $2`,
            [r.video_id, date, c.clicks]
          );
        }
      }
    }
  }
  return n;
}

export interface VideoMetaUpsert {
  video_id: string;
  username?: string | null;
  caption?: string | null;
  duration_s?: number | null;
  hashtags?: string | null;
  products?: string | null;
  posted_api?: string | null;
  account_class?: string | null;
  cover_url?: string | null;
  in_main1?: boolean | null;
}

export async function upsertVideoMeta(rows: VideoMetaUpsert[]): Promise<number> {
  // Batched (B140): one round-trip per 200 videos, not one per video.
  // 188 sequential INSERTs + the listing walk blew the 60s budget.
  const chunk = 200;
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const vals: string[] = [];
    const args: any[] = [];
    part.forEach((r, j) => {
      const o = j * 11;
      const fromId = postedFromId(r.video_id);
      vals.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9}, $${o + 10}, $${o + 11})`);
      args.push(
        r.video_id, r.username ?? null, r.caption ?? null, r.duration_s ?? null,
        r.hashtags ?? null, r.products ?? null, r.posted_api ?? null, fromId,
        r.account_class ?? (r.username ? classifyAccount(r.username) : null),
        r.cover_url ?? null, r.in_main1 ?? false
      );
    });
    await query(
      `INSERT INTO creative.video_meta
         (video_id, username, caption, duration_s, hashtags, products, posted_api, posted_from_id, account_class, cover_url, in_main1)
       VALUES ${vals.join(", ")}
       ON CONFLICT (video_id) DO UPDATE SET
         username = COALESCE(EXCLUDED.username, creative.video_meta.username),
         caption = COALESCE(EXCLUDED.caption, creative.video_meta.caption),
         duration_s = COALESCE(EXCLUDED.duration_s, creative.video_meta.duration_s),
         hashtags = COALESCE(EXCLUDED.hashtags, creative.video_meta.hashtags),
         products = COALESCE(EXCLUDED.products, creative.video_meta.products),
         posted_api = COALESCE(EXCLUDED.posted_api, creative.video_meta.posted_api),
         posted_from_id = COALESCE(creative.video_meta.posted_from_id, EXCLUDED.posted_from_id),
         account_class = COALESCE(EXCLUDED.account_class, creative.video_meta.account_class),
         cover_url = COALESCE(EXCLUDED.cover_url, creative.video_meta.cover_url),
         in_main1 = creative.video_meta.in_main1 OR EXCLUDED.in_main1,
         updated_at = NOW()`,
      args
    );
    n += part.length;
  }
  return n;
}

export function nextDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + 86400000).toISOString().slice(0, 10);
}

export function shop1Guard(shopNumber: string): string | null {
  if (shopNumber !== "1") return "shop-1-only for now";
  return null;
}

export { SHOP1_ID };
