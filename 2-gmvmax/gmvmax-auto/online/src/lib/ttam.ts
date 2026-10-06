import { getAdsCredentials } from "./ads-credentials";
import { SHOPS } from "./shops";
import { normalizeStatus, TTAM_METRICS, scoreTtamRow } from "./gmv";
import type { TtamRaw } from "./gmv";
export { TTAM_THEORY_BANDS, flagScore, flagsForRow, verdictOf, bandsFromPreset } from "./ttam-scores";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Generic paged TikTok GET: returns the raw `list` across all pages.
async function pagedList(
  accessToken: string,
  path: string,
  base: Record<string, string>
): Promise<any[]> {
  const out: any[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({ ...base, page: String(page), page_size: "100" });
    const res = await fetch(`${BASE_URL}/open_api/${API_VERSION}${path}?${params.toString()}`, {
      headers: { "Access-Token": accessToken, "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (body.code !== 0) throw new Error(`${path} code=${body.code}: ${body.message ?? ""}`);
    out.push(...(body.data?.list ?? []));
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await sleep(300);
    }
  }
  return out;
}

export interface TtamAdgroup {
  adgroup_id: string;
  name: string;
  status: string | null;
  spend: number;
  adCount?: number | null;
  metrics: Record<string, number> | null;
  scores: Record<string, number | null> | null;
  sfvProxy: boolean;
}

export interface TtamAd {
  ad_id: string;
  name: string;
  status: string | null;
  spend: number;
  metrics: Record<string, number> | null;
  scores: Record<string, number | null> | null;
  sfvProxy: boolean;
}

function emptySums(): Record<string, number> {
  const row: Record<string, number> = {};
  for (const m of TTAM_METRICS) row[m] = 0;
  return row;
}

function toRaw(row: Record<string, number>): TtamRaw {
  return {
    spend: row.spend ?? 0, imp: row.impressions ?? 0, clicks: row.clicks ?? 0,
    reach: row.reach ?? 0, sfv: row.video_watched_6s ?? 0,
    prof: row.profile_visits ?? 0, likes: row.likes ?? 0, sh: row.shares ?? 0,
    com: row.comments ?? 0, fol: row.follows ?? 0,
    awt: row.average_video_play ?? 0, live: row.live_views ?? 0,
    // live10 presumed = live_effective_views (see gmv.ts note — UI labels ~).
    live10: row.live_effective_views ?? null,
  };
}

// Integrated pull at a grain, aggregated per id-dim value passing `keep`.
// Extended metrics first, spend-only fallback (fail-open).
async function pullGrain(
  accessToken: string,
  advertiserId: string,
  dataLevel: string,
  dims: string[],
  startDate: string,
  endDate: string,
  keep: (dimensions: any) => string | null
): Promise<{ sums: Map<string, Record<string, number>>; full: boolean }> {
  const run = async (metrics: string[]) => {
    const sums = new Map<string, Record<string, number>>();
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: dataLevel,
      dimensions: JSON.stringify(dims),
      metrics: JSON.stringify(metrics),
      start_date: startDate,
      end_date: endDate,
      page: "1",
      page_size: "1000",
    });
    const res = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`integrated/get code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      const id = keep(item.dimensions ?? {});
      if (!id) continue;
      let row = sums.get(id);
      if (!row) {
        row = emptySums();
        sums.set(id, row);
      }
      for (const m of metrics) {
        const v = parseFloat(item.metrics?.[m] ?? 0);
        if (Number.isFinite(v)) row[m] = (row[m] ?? 0) + v;
      }
    }
    return sums;
  };
  try {
    return { sums: await run(TTAM_METRICS), full: true };
  } catch {
    return { sums: await run(["spend"]), full: false };
  }
}

// Adgroups of one manual campaign: names/status from adgroup/get +
// spend from the integrated report (adgroup grain, filtered to the campaign).
// Fail-open on spend: rows still return with spend 0.
export async function getTtamAdgroups(
  shopNumber: string,
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<{ campaignId: string; adgroups: TtamAdgroup[] }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  const list = await pagedList(creds.access_token, "/adgroup/get/", {
    advertiser_id: shop.advertiserId,
    filtering: JSON.stringify({ campaign_ids: [campaignId] }),
  });

  const { sums: spendBy, full } = await pullGrain(
    creds.access_token, shop.advertiserId, "AUCTION_ADGROUP",
    ["stat_time_day", "adgroup_id"], startDate, endDate,
    // NOTE: campaign_id is not a valid dimension at ADGROUP grain (40002) —
    // filter client-side by this campaign's adgroup set instead.
    (() => {
      const ids = new Set(list.map((g: any) => String(g.adgroup_id ?? g.id ?? "")));
      return (d: any) => (d?.adgroup_id && ids.has(String(d.adgroup_id)) ? String(d.adgroup_id) : null);
    })()
  );

  const adgroups = list
    .map((g: any) => {
      const id = String(g.adgroup_id ?? g.id ?? "");
      const row = spendBy.get(id);
      const raw = row ? toRaw(row) : null;
      const scored = raw ? scoreTtamRow(raw, true) : null;
      return {
        adgroup_id: id,
        name: g.adgroup_name ?? g.name ?? id,
        status: normalizeStatus(g.operation_status ?? g.status ?? g.secondary_status ?? null),
        spend: raw ? raw.spend : 0,
        metrics: full && row ? row : null,
        scores: scored ? scored.scores : null,
        sfvProxy: full,
      };
    })
    .filter((g) => g.adgroup_id)
    .sort((a, b) => b.spend - a.spend);
  return { campaignId, adgroups };
}

// Ads (creatives) of one adgroup: names/status from ad/get + spend from the
// integrated report (ad grain, filtered to the adgroup). Fail-open on spend.
export async function getTtamAds(
  shopNumber: string,
  adgroupId: string,
  startDate: string,
  endDate: string
): Promise<{ adgroupId: string; ads: TtamAd[] }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  const list = await pagedList(creds.access_token, "/ad/get/", {
    advertiser_id: shop.advertiserId,
    filtering: JSON.stringify({ adgroup_ids: [adgroupId] }),
  });

  const { sums: spendBy, full } = await pullGrain(
    creds.access_token, shop.advertiserId, "AUCTION_AD",
    ["stat_time_day", "ad_id"], startDate, endDate,
    // NOTE: adgroup_id is not a valid dimension at AD grain (40002) —
    // filter client-side by this adgroup's ad set instead.
    (() => {
      const ids = new Set(list.map((a: any) => String(a.ad_id ?? a.id ?? "")));
      return (d: any) => (d?.ad_id && ids.has(String(d.ad_id)) ? String(d.ad_id) : null);
    })()
  );

  const ads = list
    .map((a: any) => {      const id = String(a.ad_id ?? a.id ?? "");
      const row = spendBy.get(id);
      const raw = row ? toRaw(row) : null;
      const scored = raw ? scoreTtamRow(raw, true) : null;
      return {
        ad_id: id,
        name: a.ad_name ?? a.name ?? id,
        status: normalizeStatus(a.operation_status ?? a.status ?? a.secondary_status ?? null),
        spend: raw ? raw.spend : 0,
        metrics: full && row ? row : null,
        scores: scored ? scored.scores : null,
        sfvProxy: full,
      };
    })
    .filter((a) => a.ad_id)
    .sort((a, b) => b.spend - a.spend);
  return { adgroupId, ads };
}
