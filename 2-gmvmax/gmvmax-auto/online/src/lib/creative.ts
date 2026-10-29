import { query } from "@/lib/db";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { SHOPS } from "@/lib/shops";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// Phase A: per-creative nightly sync for PRODUCT GMV Max.
// Chain per campaign: product grain (item_group_ids) -> creative grain
// (dims ["item_id"], dual campaign+item_group filter, single day).
// Rewrite-on-revise; per-day fail-open so kills leave partial progress.
// NOTE: roi/cost_per_order are NOT pulled — recomputed in the mapper from
// cost/gmv/orders (same math, slimmer payload). Never re-add them here
// without removing the mapper computation (else stored 0s).
const CREATIVE_METRICS = [
  "title", "tt_account_name", "shop_content_type",
  "creative_delivery_status", "orders", "gross_revenue", "cost",
  "product_impressions", "product_clicks", "product_click_rate",
  "ad_click_rate", "ad_conversion_rate",
  "ad_video_view_rate_2s", "ad_video_view_rate_6s",
  "ad_video_view_rate_p25", "ad_video_view_rate_p50",
  "ad_video_view_rate_p75", "ad_video_view_rate_p100",
];

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

async function gmvGet(accessToken: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${qs.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  return res.json();
}

async function tiktokGet(accessToken: string, path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}${path}?${qs.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  return res.json();
}

function parseCreateTime(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // "YYYY-MM-DD HH:mm:ss" (TikTok ad/get) -> treat as UTC when no zone given.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)
    ? s.replace(" ", "T") + "Z"
    : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// True TikTok Time posted per item_id (Post ID). Tries, in order:
// A. file/video/ad/info (video_ids batch, has create_time),
// B. ad/get mapped by tiktok_item_id (has create_time),
// C. gmv_max/video/get store library (best-effort match).
// All fail-open — misses return no entry (caller stores a 'miss' row).
async function fetchVideoCreateTimes(
  accessToken: string, advertiserId: string, videoIds: string[],
  dbg: Record<string, string>
): Promise<Map<string, { postedAt: string; source: string }>> {
  const out = new Map<string, { postedAt: string; source: string }>();
  const ids = [...new Set(videoIds.map((v) => String(v ?? "").trim()))]
    .filter((v) => v && v !== "-1" && v !== "N/A");
  let first = "";
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    try {
      const body = await tiktokGet(accessToken, "/file/video/ad/info/", {
        advertiser_id: advertiserId,
        video_ids: JSON.stringify(batch),
      });
      if (body.code === 0) {
        const list = body.data?.list ?? body.data?.videos ?? body.data?.video_list ?? [];
        if (!first) first = `code=0 rows=${list.length}`;
        for (const v of list) {
          const vid = String(v.video_id ?? v.id ?? "");
          const pt = parseCreateTime(v.create_time ?? v.createTime ?? v.created_at);
          if (vid && pt && !out.has(vid)) out.set(vid, { postedAt: pt, source: "file/video/ad/info" });
        }
        if (out.size > 0) continue;
      } else if (!first) {
        first = `code=${body.code} ${String(body.message ?? "").slice(0, 60)}`;
      }
    } catch (e) {
      if (!first) first = `fetch-failed ${e instanceof Error ? e.message.slice(0, 60) : ""}`;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  dbg.video = `${first || "no-batches"} matched=${out.size}`;
  return out;
}

async function fetchAdCreateTimes(
  accessToken: string, advertiserId: string, campaignIds: string[],
  dbg: Record<string, string>
): Promise<Map<string, { postedAt: string; source: string }>> {
  const out = new Map<string, { postedAt: string; source: string }>();
  const targets = campaignIds.filter((id) => /^\d{5,32}$/.test(id)).slice(0, 20);
  const scopes: Record<string, string>[] = targets.length > 0
    ? [{ filtering: JSON.stringify({ campaign_ids: targets }) }]
    : [{}];
  let first = "", rows = 0;
  for (const extra of scopes) {
    let page = 1;
    for (let n = 0; n < 3; n++) {
      try {
        const body = await tiktokGet(accessToken, "/ad/get/", {
          advertiser_id: advertiserId,
          page: String(page),
          page_size: "100",
          ...extra,
        });
        if (body.code !== 0) {
          if (!first) first = `code=${body.code} ${String(body.message ?? "").slice(0, 60)}`;
          break;
        }
        const list = body.data?.list ?? [];
        rows += list.length;
        if (!first) first = "code=0";
        for (const a of list) {
          const pid = a.tiktok_item_id != null && String(a.tiktok_item_id) !== ""
            ? String(a.tiktok_item_id) : null;
          const pt = parseCreateTime(a.create_time ?? a.createTime);
          if (pid && pt && !out.has(pid)) out.set(pid, { postedAt: pt, source: "ad/get" });
          // URL-tail Post ID fallback (ad_name is often the TikTok URL).
          const tail = String(a.ad_name ?? "").match(/(\d{15,25})\s*$/)?.[1];
          if (tail && pt && !out.has(tail)) out.set(tail, { postedAt: pt, source: "ad/get:url-tail" });
        }
        const total = body.data?.page_info?.total_page ?? 1;
        if (page >= total) break;
        page++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        if (!first) first = `fetch-failed ${e instanceof Error ? e.message.slice(0, 60) : ""}`;
        break;
      }
    }
  }
  dbg.ad = `${first || "no-scopes"} rows=${rows} matched=${out.size}`;
  return out;
}

// Per-store GMV video library (unprobed candidate): bulk-match create_time
// for the missing set. Shape is unverified — fail-open on any code/shape.
async function fetchGmvVideoCreateTimes(
  accessToken: string, shop: any, want: Set<string>,
  dbg: Record<string, string>
): Promise<Map<string, { postedAt: string; source: string }>> {
  const out = new Map<string, { postedAt: string; source: string }>();
  if (want.size === 0) { dbg.gmv = "no-missing"; return out; }
  // Verified pattern from gmv_max/identity/get: store calls need BOTH
  // store_id and store_authorized_bc_id (probe: either alone 40002s).
  const bc = String(shop.storeBcId ?? "");
  if (!bc) { dbg.gmv = "no-store-bc"; return out; }
  const shape: Record<string, string> = {
    store_id: String(shop.shopId),
    store_authorized_bc_id: bc,
  };
  let first = "", rows = 0;
  {
    let page = 1;
    for (let n = 0; n < 3; n++) {
      try {
        const body = await tiktokGet(accessToken, "/gmv_max/video/get/", {
          advertiser_id: shop.advertiserId,
          ...shape,
          page: String(page),
          page_size: "50",
        });
        if (body.code !== 0) {
          if (!first) first = `code=${body.code} ${String(body.message ?? "").slice(0, 60)}`;
          break;
        }
        const list = body.data?.list ?? body.data?.videos ?? body.data?.video_list ?? [];
        rows += list.length;
        if (!first) first = "code=0";
        for (const v of list) {
          const vid = String(v.video_id ?? v.item_id ?? v.tiktok_item_id ?? v.id ?? "");
          const pt = parseCreateTime(v.create_time ?? v.createTime ?? v.created_at ?? v.publish_time ?? v.create_timestamp);
          if (vid && pt && want.has(vid) && !out.has(vid)) {
            out.set(vid, { postedAt: pt, source: "gmv_max/video/get" });
          }
        }
        const total = body.data?.page_info?.total_page ?? 1;
        if (page >= total || out.size >= want.size) break;
        page++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        if (!first) first = `fetch-failed ${e instanceof Error ? e.message.slice(0, 60) : ""}`;
        break;
      }
    }
  }
  dbg.gmv = `${first || "no-keys"} rows=${rows} matched=${out.size}`;
  return out;
}

// Fill creative.item_meta for item_ids seen in daily_rows but not yet mapped.
// Caps work for the Hobby 60s limit. Tolerates pre-035 DBs (returns skipped).
// force=true retries recent misses (manual Sync passes it; the 7d gate stays
// for any future automatic caller).
export async function enrichItemMeta(
  accessToken: string, shop: any, campaignIds: string[], limit = 200, force = false
): Promise<{ found: number; missed: number; skipped: string | null; debug: Record<string, string> }> {
  const dbg: Record<string, string> = {};
  let missing: string[] = [];
  try {
    const r = await query(
      force
        ? `SELECT d.item_id FROM (SELECT DISTINCT item_id FROM creative.daily_rows
            WHERE item_id NOT IN ('', '-1', 'N/A')) d
           LEFT JOIN creative.item_meta m ON m.item_id = d.item_id
           WHERE m.item_id IS NULL OR m.posted_at IS NULL
           LIMIT ${Math.min(Math.max(limit, 1), 500)}`
        : `SELECT d.item_id FROM (SELECT DISTINCT item_id FROM creative.daily_rows
        WHERE item_id NOT IN ('', '-1', 'N/A')) d
       LEFT JOIN creative.item_meta m ON m.item_id = d.item_id
       WHERE m.item_id IS NULL OR (m.posted_at IS NULL AND m.synced_at < NOW() - INTERVAL '7 days')
       LIMIT ${Math.min(Math.max(limit, 1), 500)}`
    );
    missing = r.rows.map((x: any) => String(x.item_id)).filter(Boolean);
  } catch {
    return { found: 0, missed: 0, skipped: "035_creative_item_meta.sql not run yet", debug: dbg };
  }
  if (missing.length === 0) return { found: 0, missed: 0, skipped: null, debug: dbg };
  let byVideo = new Map<string, { postedAt: string; source: string }>();
  try {
    byVideo = await fetchVideoCreateTimes(accessToken, shop.advertiserId, missing, dbg);
  } catch { byVideo = new Map(); }
  let byAd = new Map<string, { postedAt: string; source: string }>();
  if (byVideo.size < missing.length) {
    try {
      byAd = await fetchAdCreateTimes(accessToken, shop.advertiserId, campaignIds, dbg);
    } catch { byAd = new Map(); }
  }
  let byGmv = new Map<string, { postedAt: string; source: string }>();
  if (byVideo.size + byAd.size < missing.length) {
    try {
      byGmv = await fetchGmvVideoCreateTimes(accessToken, shop, new Set(missing), dbg);
    } catch { byGmv = new Map(); }
  }
  let found = 0, missed = 0;
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const vals: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((id, j) => {
      const hit = byVideo.get(id) ?? byAd.get(id) ?? byGmv.get(id);
      vals.push(`($${j * 3 + 1},$${j * 3 + 2}::timestamptz,$${j * 3 + 3})`);
      params.push(id, hit ? hit.postedAt : null, hit ? hit.source : "miss");
      if (hit) found++; else missed++;
    });
    try {
      await query(
        `INSERT INTO creative.item_meta (item_id, posted_at, source) VALUES ${vals.join(",")}
         ON CONFLICT (item_id) DO UPDATE SET
           posted_at = COALESCE(creative.item_meta.posted_at, EXCLUDED.posted_at),
           source = CASE WHEN EXCLUDED.posted_at IS NOT NULL THEN EXCLUDED.source
                         ELSE creative.item_meta.source END,
           synced_at = NOW()`,
        params
      );
    } catch {
      return { found, missed, skipped: "item_meta upsert failed", debug: dbg };
    }
  }
  return { found, missed, skipped: null, debug: dbg };
}

export async function listProductCampaigns(shopNumber: string): Promise<{ ids: string[]; accessToken: string; shop: any }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  // IDs come from the Neon campaign cache (same map the report pulls filter by),
  // not campaign/get — its param requirements drift (store_ids, then dimensions).
  const r = await query(
    "SELECT campaign_id FROM gmv.gmv_campaigns WHERE advertiser_id = $1 AND promotion_type = 'PRODUCT_GMV_MAX' ORDER BY campaign_id",
    [shop.advertiserId]
  );
  const ids = r.rows.map((x: any) => String(x.campaign_id)).filter(Boolean);
  if (ids.length === 0) throw new Error("no PRODUCT campaigns cached — Fetch dashboard data once first");
  return { ids, accessToken: creds.access_token, shop };
}

export async function syncCreativeDay(
  accessToken: string, shop: any, campaignId: string, date: string
): Promise<{ rows: number; skipped: string | null }> {
  const base = {
    advertiser_id: shop.advertiserId,
    store_ids: JSON.stringify([shop.shopId]),
    gmv_max_promotion_type: "PRODUCT_GMV_MAX",
    start_date: date,
    end_date: date,
  };
  const prod = await gmvGet(accessToken, {
    ...base,
    dimensions: JSON.stringify(["item_group_id"]),
    filtering: JSON.stringify({ campaign_ids: [campaignId] }),
    metrics: JSON.stringify(["orders", "gross_revenue"]),
    page_size: "50",
  });
  if (prod.code !== 0) return { rows: 0, skipped: `product grain code=${prod.code}` };
  const groups: string[] = [];
  for (const row of prod.data?.list ?? []) {
    const g = String(row.dimensions?.item_group_id ?? "");
    if (g) groups.push(g);
  }
  if (groups.length === 0) return { rows: 0, skipped: "no item groups" };
  // Day grain (item_id x stat_time_day): per-day rows only — the dateless
  // grain returned the 30k lifetime library and mislabeled it as one day.
  // Paginated (cap 10 pages/call, rewrite-on-revise resumes cleanly) and
  // batched upserts (500/chunk) for the 60s Hobby cap.
  const groupTag = groups.length === 1 ? groups[0] : "";
  const cols = ["date", "campaign_id", "item_group_id", "item_id", "title", "tt_account",
    "content_type", "status", "cost", "orders", "gmv", "roi", "cpo", "impressions",
    "clicks", "click_rate", "conv_rate", "v2s", "v6s", "vp25", "vp50", "vp75", "vp100"];
  let n = 0;
  let page = 1;
  let totalPages = 1;
  const MAX_PAGES = 10;
  while (page <= totalPages && page <= MAX_PAGES) {
    const creative = await gmvGet(accessToken, {
      ...base,
      dimensions: JSON.stringify(["item_id", "stat_time_day"]),
      filtering: JSON.stringify({ campaign_ids: [campaignId], item_group_ids: groups.slice(0, 20) }),
      metrics: JSON.stringify(CREATIVE_METRICS),
      page: String(page),
      page_size: "1000",
    });
    if (creative.code !== 0) {
      return { rows: n, skipped: n > 0 ? `page ${page} code=${creative.code} (partial kept)` : `creative grain code=${creative.code}` };
    }
    totalPages = creative.data?.page_info?.total_page ?? 1;
    const list = creative.data?.list ?? [];
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500);
      const vals: string[] = [];
      const params: unknown[] = [];
      chunk.forEach((row: any, j: number) => {
        const o = j * cols.length;
        const ph: string[] = [];
        for (let k = 0; k < cols.length; k++) ph.push(`$${o + k + 1}`);
        ph[0] += "::date";
        vals.push(`(${ph.join(",")})`);
        const d = row.dimensions ?? {};
        const m = row.metrics ?? {};
        const cCost = num(m.cost), cGmv = num(m.gross_revenue), cOrd = Math.round(num(m.orders));
        params.push(
          String(d.stat_time_day ?? date).slice(0, 10), campaignId, groupTag, String(d.item_id ?? ""),
          String(m.title ?? ""), String(m.tt_account_name ?? ""), String(m.shop_content_type ?? ""),
          String(m.creative_delivery_status ?? ""),
          cCost, cOrd, cGmv, cCost > 0 ? cGmv / cCost : 0, cOrd > 0 ? cCost / cOrd : 0,
          Math.round(num(m.product_impressions)), Math.round(num(m.product_clicks)),
          num(m.product_click_rate), num(m.ad_conversion_rate),
          num(m.ad_video_view_rate_2s), num(m.ad_video_view_rate_6s),
          num(m.ad_video_view_rate_p25), num(m.ad_video_view_rate_p50),
          num(m.ad_video_view_rate_p75), num(m.ad_video_view_rate_p100)
        );
      });
      await query(
        `INSERT INTO creative.daily_rows (${cols.join(", ")})
         VALUES ${vals.join(",")}
         ON CONFLICT (date, campaign_id, item_id) DO UPDATE SET
          item_group_id=EXCLUDED.item_group_id, title=EXCLUDED.title, tt_account=EXCLUDED.tt_account,
          content_type=EXCLUDED.content_type, status=EXCLUDED.status, cost=EXCLUDED.cost,
          orders=EXCLUDED.orders, gmv=EXCLUDED.gmv, roi=EXCLUDED.roi, cpo=EXCLUDED.cpo,
          impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, click_rate=EXCLUDED.click_rate,
          conv_rate=EXCLUDED.conv_rate, v2s=EXCLUDED.v2s, v6s=EXCLUDED.v6s, vp25=EXCLUDED.vp25,
          vp50=EXCLUDED.vp50, vp75=EXCLUDED.vp75, vp100=EXCLUDED.vp100, synced_at=NOW()`,
        params
      );
      n += chunk.length;
    }
    page++;
  }
  const skipped = totalPages > MAX_PAGES ? `truncated ${MAX_PAGES}/${totalPages} pages — re-run to continue` : null;
  return { rows: n, skipped };
}

export function eachDay(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const d = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (d <= end && out.length < 32) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
