// Live ROI — server-only (imports pg + TikTok APIs; never client-imported).
// Combines Live GMV Max session cost + TTAM adgroup cost over a live window
// and recomputes blended ROAS / net ROI.
//
// Identity link: TTAM adgroup/get + ad/get rows carry identity fields
// (identity_id / identity_type / tiktok user). The API passes them through
// untouched; the /live-roi page auto-suggests matches against the session's
// TikTok account (account_api/account_user or bracket) and leaves the final
// pick to manual checkboxes (no invented mapping).
import { query } from "./db";
import { SHOPS } from "./shops";
import { getAdsCredentials } from "./ads-credentials";
import { getCampaignSessions, getManualCampaigns, getRoomAdsAttribution } from "./gmv";
import type { RoomAdsAttribution } from "./gmv";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";
const FEE_RATE = 0.25; // net = gross * (1 - fee), matches collector/Telegram lock
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface LiveRoiSession {
  campaignId: string;
  campaignName: string;
  account: string | null;
  identityId: string | null;
  roomId: string;
  title: string | null;
  cost: number;
  gmv: number;
  orders: number;
  roi: number;
  days: number;
  firstDay: string | null;
  lastDay: string | null;
  liveStatus: string | null;
  liveLaunchedMyt: string | null;
  liveDuration: string | null;
}

export async function listLiveRoiSessions(
  shopNumber: string,
  startDate: string,
  endDate: string
): Promise<{ sessions: LiveRoiSession[]; campaigns: { id: string; name: string; account: string | null }[]; errors: string[]; skipped: number }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  let campaigns: { id: string; name: string; account: string | null; identityId: string | null }[] = [];
  try {
    try {
      const r = await query(
        `SELECT campaign_id, name, account, identity_id FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2 ORDER BY name`,
        [shop.shopId, "LIVE_GMV_MAX"]
      );
      campaigns = (r.rows ?? []).map((c: any) => ({
        id: String(c.campaign_id),
        name: String(c.name ?? c.campaign_id),
        account: c.account ? String(c.account) : null,
        identityId: c.identity_id ? String(c.identity_id) : null,
      }));
    } catch {
      // pre-027 DBs lack identity_id — fail-open without it
      const r = await query(
        `SELECT campaign_id, name, account FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2 ORDER BY name`,
        [shop.shopId, "LIVE_GMV_MAX"]
      );
      campaigns = (r.rows ?? []).map((c: any) => ({
        id: String(c.campaign_id),
        name: String(c.name ?? c.campaign_id),
        account: c.account ? String(c.account) : null,
        identityId: null,
      }));
    }
  } catch {
    campaigns = [];
  }
  if (campaigns.length === 0) {
    throw new Error("no LIVE_GMV_MAX campaigns in Neon cache — open /gmv-max and Fetch once, or run /api/campaigns/sync");
  }
  // Pre-filter: only drill campaigns with cached hourly spend in the window
  // (a room drill costs 2 TikTok calls per campaign; drilling dozens
  // sequentially blows the Hobby 60s cap). Fail-open to all on cache miss.
  const spendBy = new Map<string, number>();
  try {
    const hr = await query(
      `SELECT campaign_id, SUM(cost) AS s FROM gmv.hourly_campaign_metrics
        WHERE shop_id = $1 AND hour_slot >= $2 AND hour_slot < $3 GROUP BY campaign_id`,
      [shop.shopId, `${startDate} 00:00:00`, `${addDays(endDate, 1)} 00:00:00`]
    );
    for (const row of hr.rows ?? []) spendBy.set(String(row.campaign_id), Number(row.s ?? 0));
  } catch {
    // pre-009 DB or empty cache — drill everything (capped below)
  }
  let targets = campaigns;
  let skipped = 0;
  if (spendBy.size > 0) {
    targets = campaigns
      .map((c) => ({ c, s: spendBy.get(c.id) ?? 0 }))
      .sort((a, b) => b.s - a.s)
      .filter((x) => x.s > 0)
      .map((x) => x.c);
    skipped = campaigns.length - targets.length;
    if (targets.length === 0) {
      return { sessions: [], campaigns, errors: [], skipped };
    }
  }
  const MAX_DRILLS = 12;
  if (targets.length > MAX_DRILLS) {
    skipped += targets.length - MAX_DRILLS;
    targets = targets.slice(0, MAX_DRILLS);
  }
  // Parallel batches of 4 (was fully sequential: ~2 calls x N campaigns).
  const sessions: LiveRoiSession[] = [];
  const errors: string[] = [];
  for (let i = 0; i < targets.length; i += 4) {
    const batch = targets.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map((c) => getCampaignSessions(shopNumber, c.id, startDate, endDate))
    );
    results.forEach((r, bi) => {
      const c = batch[bi];
      if (r.status !== "fulfilled") {
        errors.push(`${c.id}: ${r.reason instanceof Error ? r.reason.message : "drill failed"}`);
        return;
      }
      for (const s of r.value.sessions ?? []) {
        sessions.push({
          campaignId: c.id,
          campaignName: c.name,
          account: c.account,
          identityId: c.identityId,
          roomId: String(s.roomId ?? ""),
          title: s.liveTitle ?? s.liveName ?? null,
          cost: Number(s.cost ?? 0),
          gmv: Number(s.gmv ?? 0),
          orders: Number(s.orders ?? 0),
          roi: Number(s.roi ?? 0),
          days: Number(s.days ?? 1),
          firstDay: s.firstDay ?? null,
          lastDay: s.lastDay ?? null,
          liveStatus: s.liveStatus ?? null,
          liveLaunchedMyt: s.liveLaunchedMyt ?? null,
          liveDuration: (s as any).liveDuration ?? null,
        });
      }
    });
    if (i + 4 < targets.length) await sleep(300);
  }
  sessions.sort((a, b) => b.gmv - a.gmv);
  return { sessions, campaigns, errors, skipped };
}

function addDays(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
}

export interface LiveRoiTtamOption {
  adgroup_id: string;
  name: string;
  campaign_id: string;
  campaign_name: string;
  status: string | null;
  spend: number;
  identity_id: string | null;
  identity_type: string | null;
  identity_hint: string | null;
}

// TTAM adgroup options with spend + identity passthrough. Fail-open per
// campaign (a failing campaign still leaves the rest listed).
export async function listLiveRoiTtamOptions(
  shopNumber: string,
  startDate: string,
  endDate: string
): Promise<{ adgroups: LiveRoiTtamOption[]; errors: string[]; skipped: number }> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  const manuals = await getManualCampaigns(creds.access_token, shop.advertiserId);
  // Pre-filter: one campaign-grain spend pull, expand only spenders
  // (each expansion costs 1 adgroup/get + 1 report call).
  let entries = [...manuals.entries()];
  let skipped = 0;
  try {
    const campSpend = await pullCampaignSpend(creds.access_token, shop.advertiserId, entries.map(([cid]) => cid), startDate, endDate);
    const active = entries.filter(([cid]) => (campSpend.get(cid) ?? 0) > 0);
    if (active.length > 0) {
      skipped = entries.length - active.length;
      entries = active;
    }
  } catch {
    // fail-open: expand everything (capped below)
  }
  const MAX_TTAM_CAMPAIGNS = 20;
  if (entries.length > MAX_TTAM_CAMPAIGNS) {
    skipped += entries.length - MAX_TTAM_CAMPAIGNS;
    entries = entries.slice(0, MAX_TTAM_CAMPAIGNS);
  }
  const adgroups: LiveRoiTtamOption[] = [];
  const errors: string[] = [];
  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(async ([cid, meta]) => {
        const list = await pagedAdgroups(creds.access_token, shop.advertiserId, cid);
        const ids = new Set(list.map((g: any) => String(g.adgroup_id ?? g.id ?? "")));
        const spendBy = await pullAdgroupSpend(creds.access_token, shop.advertiserId, ids, startDate, endDate);
        return { cid, meta, list, spendBy };
      })
    );
    results.forEach((r, bi) => {
      const [cid, meta] = batch[bi];
      if (r.status !== "fulfilled") {
        errors.push(`${cid}: ${r.reason instanceof Error ? r.reason.message : "adgroup pull failed"}`);
        return;
      }
      for (const g of r.value.list) {
        const id = String(g.adgroup_id ?? g.id ?? "");
        if (!id) continue;
        adgroups.push({
          adgroup_id: id,
          name: String(g.adgroup_name ?? g.name ?? id),
          campaign_id: cid,
          campaign_name: meta.name,
          status: g.operation_status ?? g.status ?? g.secondary_status ?? null,
          spend: r.value.spendBy.get(id) ?? 0,
          identity_id: g.identity_id ?? g.tiktok_user_id ?? g.advertiser_id_identity ?? null,
          identity_type: g.identity_type ?? null,
          identity_hint: g.identity_name ?? g.display_name ?? g.tiktok_username ?? null,
        });
      }
    });
    if (i + 3 < entries.length) await sleep(300);
  }
  adgroups.sort((a, b) => b.spend - a.spend);
  return { adgroups, errors, skipped };
}

// One campaign-grain spend pull across many campaigns (pre-filter; the
// adgroup grain pull stays per-campaign because parent+child dimension
// combos are 40002 — see ttam.ts / B37).
async function pullCampaignSpend(
  accessToken: string,
  advertiserId: string,
  campaignIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const want = new Set(campaignIds);
  const sums = new Map<string, number>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: JSON.stringify(["stat_time_day", "campaign_id"]),
      metrics: JSON.stringify(["spend"]),
      start_date: startDate,
      end_date: endDate,
      page: String(page),
      page_size: "1000",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`integrated/get code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      const id = String(item.dimensions?.campaign_id ?? "");
      if (!id || !want.has(id)) continue;
      const v = parseFloat(item.metrics?.spend ?? 0);
      if (Number.isFinite(v)) sums.set(id, (sums.get(id) ?? 0) + v);
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await sleep(300);
    }
  }
  return sums;
}

async function pagedAdgroups(accessToken: string, advertiserId: string, campaignId: string): Promise<any[]> {
  const out: any[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      page: String(page),
      page_size: "100",
    });
    const res = await fetch(`${BASE_URL}/open_api/${API_VERSION}/adgroup/get/?${params.toString()}`, {
      headers: { "Access-Token": accessToken, "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (body.code !== 0) throw new Error(`adgroup/get code=${body.code}: ${body.message ?? ""}`);
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

// Spend-only integrated pull at ADGROUP grain, filtered client-side to `ids`
// (parent+child dimension combos are 40002 — see ttam.ts / B37).
async function pullAdgroupSpend(
  accessToken: string,
  advertiserId: string,
  ids: Set<string>,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const sums = new Map<string, number>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_ADGROUP",
      dimensions: JSON.stringify(["stat_time_day", "adgroup_id"]),
      metrics: JSON.stringify(["spend"]),
      start_date: startDate,
      end_date: endDate,
      page: String(page),
      page_size: "1000",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`integrated/get code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      const id = String(item.dimensions?.adgroup_id ?? "");
      if (!id || !ids.has(id)) continue;
      const v = parseFloat(item.metrics?.spend ?? 0);
      if (Number.isFinite(v)) sums.set(id, (sums.get(id) ?? 0) + v);
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await sleep(300);
    }
  }
  return sums;
}

export interface LiveRoiCombined {
  session: LiveRoiSession;
  ttamSpend: number;
  ttamPicked: { adgroup_id: string; name: string; spend: number }[];
  totalCost: number;
  blendedRoas: number | null;
  blendedNetRoi: number | null;
  feeRate: number;
  note: string;
}

// Combined math: session GMV (attributed) over GMV Max session cost + picked
// TTAM adgroup spend, same date window. Net uses the caller-supplied fee
// (default/locked 25% when omitted or out of range).
export async function combineLiveRoi(
  shopNumber: string,
  campaignId: string,
  roomId: string,
  startDate: string,
  endDate: string,
  adgroupIds: string[],
  feeRateInput?: number
): Promise<LiveRoiCombined> {
  const drill = await getCampaignSessions(shopNumber, campaignId, startDate, endDate);
  const s = (drill.sessions ?? []).find((x: any) => String(x.roomId) === String(roomId));
  if (!s) throw new Error(`room ${roomId} has no rows in ${startDate}..${endDate} for campaign ${campaignId}`);
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  const want = new Set((adgroupIds ?? []).map(String).filter(Boolean));
  const spendBy = want.size > 0
    ? await pullAdgroupSpend(creds.access_token, shop.advertiserId, want, startDate, endDate)
    : new Map<string, number>();
  // Names for the receipt: resolve via adgroup/get only for picked ids.
  const picked: { adgroup_id: string; name: string; spend: number }[] = [];
  if (want.size > 0) {
    const manuals = await getManualCampaigns(creds.access_token, shop.advertiserId);
    for (const [cid] of manuals) {
      try {
        const list = await pagedAdgroups(creds.access_token, shop.advertiserId, cid);
        for (const g of list) {
          const id = String(g.adgroup_id ?? g.id ?? "");
          if (want.has(id)) {
            picked.push({ adgroup_id: id, name: String(g.adgroup_name ?? g.name ?? id), spend: spendBy.get(id) ?? 0 });
          }
        }
        if (picked.length >= want.size) break;
      } catch {
        // fail-open: keep spend-only rows below
      }
      await sleep(300);
    }
    for (const id of want) {
      if (!picked.some((p) => p.adgroup_id === id)) {
        picked.push({ adgroup_id: id, name: id, spend: spendBy.get(id) ?? 0 });
      }
    }
  }
  const liveCost = Number(s.cost ?? 0);
  const liveGmv = Number(s.gmv ?? 0);
  const ttamSpend = picked.reduce((sum, p) => sum + p.spend, 0);
  const totalCost = liveCost + ttamSpend;
  const feeRate =
    Number.isFinite(feeRateInput) && (feeRateInput as number) >= 0 && (feeRateInput as number) <= 0.9
      ? (feeRateInput as number)
      : FEE_RATE;
  const blendedRoas = totalCost > 0 ? liveGmv / totalCost : null;
  const blendedNetRoi = totalCost > 0 ? (liveGmv * (1 - feeRate)) / totalCost : null;
  return {
    session: {
      campaignId,
      campaignName: "",
      account: null,
      identityId: null,
      roomId: String(s.roomId ?? roomId),
      title: s.liveTitle ?? null,
      cost: liveCost,
      gmv: liveGmv,
      orders: Number(s.orders ?? 0),
      roi: Number(s.roi ?? 0),
      days: Number(s.days ?? 1),
      firstDay: s.firstDay ?? null,
      lastDay: s.lastDay ?? null,
      liveStatus: s.liveStatus ?? null,
      liveLaunchedMyt: s.liveLaunchedMyt ?? null,
      liveDuration: (s as any).liveDuration ?? null,
    },
    ttamSpend,
    ttamPicked: picked.sort((a, b) => b.spend - a.spend),
    totalCost,
    blendedRoas,
    blendedNetRoi,
    feeRate,
    note: "Session GMV is GMV Max-attributed (room grain). TTAM spend is feeder cost in the same window — blended ROI = session GMV / (GMV Max session cost + picked TTAM spend).",
  };
}

export interface ShopLiveBlended {
  ads: RoomAdsAttribution;
  ttamSpend: number;
  ttamPicked: { adgroup_id: string; name: string; campaign_name: string; spend: number }[];
  totalCost: number;
  blendedGrossRoi: number | null;
  blendedNetRoi: number | null;
  feeRate: number;
  errors: string[];
  note: string;
}

async function resolvePickedTtamNames(
  accessToken: string,
  advertiserId: string,
  want: Set<string>,
  spendBy: Map<string, number>
): Promise<{ adgroup_id: string; name: string; campaign_name: string; spend: number }[]> {
  const picked: { adgroup_id: string; name: string; campaign_name: string; spend: number }[] = [];
  if (want.size === 0) return picked;
  const manuals = await getManualCampaigns(accessToken, advertiserId);
  for (const [cid, meta] of manuals) {
    try {
      const list = await pagedAdgroups(accessToken, advertiserId, cid);
      for (const g of list) {
        const id = String(g.adgroup_id ?? g.id ?? "");
        if (want.has(id)) {
          picked.push({
            adgroup_id: id,
            name: String(g.adgroup_name ?? g.name ?? id),
            campaign_name: String(meta.name ?? cid),
            spend: spendBy.get(id) ?? 0,
          });
        }
      }
      if (picked.length >= want.size) break;
    } catch {
      // fail-open: keep spend-only rows below
    }
    await sleep(300);
  }
  for (const id of want) {
    if (!picked.some((p) => p.adgroup_id === id)) {
      picked.push({ adgroup_id: id, name: id, campaign_name: "", spend: spendBy.get(id) ?? 0 });
    }
  }
  return picked.sort((a, b) => b.spend - a.spend);
}

// Shop-live blend: the already-computed room-window GMV Max attribution plus
// manually picked TTAM adgroup spend over the same MYT window. No auto
// mapping: the caller passes explicit adgroup ids. When the room has no GMV
// Max match, this returns spend-only with null blended ROIs (never 0.00x).
export async function combineShopLiveBlended(
  shopNumber: string,
  roomId: string,
  startSec: number,
  endSec: number | null,
  adgroupIds: string[],
  feeRateInput?: number
): Promise<ShopLiveBlended> {
  const ads = await getRoomAdsAttribution(shopNumber, roomId, startSec, endSec);
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  const want = new Set((adgroupIds ?? []).map(String).filter(Boolean));
  const errors: string[] = [];
  let spendBy = new Map<string, number>();
  if (want.size > 0) {
    try {
      spendBy = await pullAdgroupSpend(creds.access_token, shop.advertiserId, want, ads.startDate, ads.endDate);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "ttam spend pull failed");
    }
  }
  const ttamPicked = await resolvePickedTtamNames(creds.access_token, shop.advertiserId, want, spendBy);
  const ttamSpend = ttamPicked.reduce((s, p) => s + p.spend, 0);
  const totalCost = ads.cost + ttamSpend;
  const feeRate =
    Number.isFinite(feeRateInput) && (feeRateInput as number) >= 0 && (feeRateInput as number) <= 0.9
      ? (feeRateInput as number)
      : FEE_RATE;
  const blended = ads.matched && totalCost > 0;
  return {
    ads,
    ttamSpend,
    ttamPicked,
    totalCost,
    blendedGrossRoi: blended ? ads.gmv / totalCost : null,
    blendedNetRoi: blended ? (ads.gmv * (1 - feeRate)) / totalCost : null,
    feeRate,
    errors,
    note: ads.matched
      ? "Blended ROI = GMV Max room GMV / (GMV Max room cost + picked TTAM spend). TTAM spend is each picked adgroup's full window spend — a feeder shared by several rooms counts in full on every room."
      : "No GMV Max room match — TTAM spend shown receipt-only, blended ROI suppressed (no valid numerator).",
  };
}

export interface RoomHourBucket {
  hour: string; // "HH:00"
  gmvCost: number;
  gmvGmv: number;
  gmvOrders: number;
  ttamSpend: number;
  ttamImpressions: number;
}

export interface RoomHourAttribution {
  roomId: string;
  date: string;
  fromHour: number;
  toHour: number;
  isToday: boolean;
  gmvCost: number;
  gmvGmv: number;
  gmvOrders: number;
  gmvCampaigns: { campaignId: string; campaignName: string; cost: number; gmv: number; orders: number }[];
  ttamSpend: number;
  ttamImpressions: number;
  ttamPicked: { adgroup_id: string; name: string; campaign_name: string; spend: number; impressions: number }[];
  totalCost: number;
  blendedGrossRoi: number | null;
  blendedNetRoi: number | null;
  feeRate: number;
  hourly: RoomHourBucket[];
  checkedCampaigns: number;
  errors: string[];
  method: string;
}

function hourOfSlot(slot: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(slot ?? ""));
  return m ? Number(m[4]) : null;
}

// Hour-range blend for one Shop LIVE room on one MYT date. GMV leg scans the
// matched campaigns' room x hour rows; TTAM leg pulls adgroup x hour rows for
// the picked ids. Both legs filter to [fromHour, toHour). Impressions ride
// along on the TTAM leg only (GMV Max hourly has no impression metric).
export async function getRoomHourAttribution(
  shopNumber: string,
  roomId: string,
  date: string,
  fromHour: number,
  toHour: number,
  campaignIds: string[],
  adgroupIds: string[],
  feeRateInput?: number
): Promise<RoomHourAttribution> {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const wantRoom = String(roomId ?? "").trim();
  if (!wantRoom) throw new Error("need roomId (Shop LIVE live_id)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("need date=YYYY-MM-DD");
  if (!Number.isInteger(fromHour) || !Number.isInteger(toHour) || fromHour < 0 || fromHour > 23 || toHour < 1 || toHour > 24 || toHour <= fromHour) {
    throw new Error("need fromHour 0-23 and toHour 1-24 with toHour > fromHour");
  }
  const campaigns = [...new Set((campaignIds ?? []).map(String).filter(Boolean))].slice(0, 5);
  const wantAds = new Set((adgroupIds ?? []).map(String).filter(Boolean));
  if (campaigns.length === 0 && wantAds.size === 0) {
    throw new Error("need at least one matched GMV campaign or one picked TTAM adgroup");
  }
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);
  const feeRate =
    Number.isFinite(feeRateInput) && (feeRateInput as number) >= 0 && (feeRateInput as number) <= 0.9
      ? (feeRateInput as number)
      : FEE_RATE;

  const errors: string[] = [];
  const buckets = new Map<string, RoomHourBucket>();
  const bucket = (h: number) => {
    const key = `${String(h).padStart(2, "0")}:00`;
    let b = buckets.get(key);
    if (!b) {
      b = { hour: key, gmvCost: 0, gmvGmv: 0, gmvOrders: 0, ttamSpend: 0, ttamImpressions: 0 };
      buckets.set(key, b);
    }
    return b;
  };
  const inRange = (slot: string) => {
    if (!String(slot ?? "").startsWith(date)) return false;
    const h = hourOfSlot(slot);
    return h !== null && h >= fromHour && h < toHour;
  };

  // GMV leg: room x hour per matched campaign (page through; target room can
  // sit on a late page, so scan while TikTok reports more).
  const gmvByCampaign: { campaignId: string; campaignName: string; cost: number; gmv: number; orders: number }[] = [];
  try {
    const cmap = await query(
      `SELECT campaign_id, name FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = $2`,
      [shop.shopId, "LIVE_GMV_MAX"]
    ).catch(() => ({ rows: [] as any[] }));
    const names = new Map((cmap.rows ?? []).map((r: any) => [String(r.campaign_id ?? ""), String(r.name ?? r.campaign_id ?? "")]));
    for (const cid of campaigns) {
      let cost = 0, gmv = 0, orders = 0;
      try {
        for (let page = 1; page <= 10; page++) {
          const params = new URLSearchParams({
            advertiser_id: shop.advertiserId,
            store_ids: JSON.stringify([shop.shopId]),
            gmv_max_promotion_type: "LIVE_GMV_MAX",
            dimensions: JSON.stringify(["room_id", "stat_time_hour"]),
            filtering: JSON.stringify({ campaign_ids: [cid] }),
            metrics: JSON.stringify(["cost", "orders", "gross_revenue"]),
            start_date: date,
            end_date: date,
            page: String(page),
            page_size: "1000",
          });
          const res = await fetch(
            `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
            { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
          );
          const body = await res.json();
          if (body.code !== 0) throw new Error(`room hour report code=${body.code}: ${String(body.message ?? "").slice(0, 120)}`);
          for (const item of body.data?.list ?? []) {
            if (String(item.dimensions?.room_id ?? "") !== wantRoom) continue;
            const slot = String(item.dimensions?.stat_time_hour ?? "");
            if (!inRange(slot)) continue;
            const h = hourOfSlot(slot) as number;
            const b = bucket(h);
            const c = parseFloat(item.metrics?.cost ?? 0) || 0;
            const g = parseFloat(item.metrics?.gross_revenue ?? 0) || 0;
            const o = parseInt(item.metrics?.orders ?? 0, 10) || 0;
            cost += c; gmv += g; orders += o;
            b.gmvCost += c; b.gmvGmv += g; b.gmvOrders += o;
          }
          const total = Number(body.data?.page_info?.total_page ?? 1) || 1;
          if (page >= total) break;
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (e) {
        errors.push(`${cid}: ${e instanceof Error ? e.message : "room hour pull failed"}`);
      }
      if (cost > 0 || gmv > 0 || orders > 0) {
        gmvByCampaign.push({ campaignId: cid, campaignName: names.get(cid) ?? cid, cost, gmv, orders });
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "gmv hour leg failed");
  }

  // TTAM leg: adgroup x hour, spend + impressions for the picked ids.
  const ttamPicked: { adgroup_id: string; name: string; campaign_name: string; spend: number; impressions: number }[] = [];
  const spendBy = new Map<string, number>();
  const impBy = new Map<string, number>();
  if (wantAds.size > 0) {
    try {
      for (let page = 1; page <= 5; page++) {
        const params = new URLSearchParams({
          advertiser_id: shop.advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_ADGROUP",
          dimensions: JSON.stringify(["stat_time_hour", "adgroup_id"]),
          metrics: JSON.stringify(["spend", "impressions"]),
          start_date: date,
          end_date: date,
          page: String(page),
          page_size: "1000",
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
          { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        if (body.code !== 0) throw new Error(`ttam hour report code=${body.code}: ${String(body.message ?? "").slice(0, 120)}`);
        for (const item of body.data?.list ?? []) {
          const id = String(item.dimensions?.adgroup_id ?? "");
          if (!id || !wantAds.has(id)) continue;
          const slot = String(item.dimensions?.stat_time_hour ?? "");
          if (!inRange(slot)) continue;
          const h = hourOfSlot(slot) as number;
          const s = parseFloat(item.metrics?.spend ?? 0) || 0;
          const im = parseFloat(item.metrics?.impressions ?? 0) || 0;
          spendBy.set(id, (spendBy.get(id) ?? 0) + s);
          impBy.set(id, (impBy.get(id) ?? 0) + im);
          const b = bucket(h);
          b.ttamSpend += s;
          b.ttamImpressions += im;
        }
        const total = Number(body.data?.page_info?.total_page ?? 1) || 1;
        if (page >= total) break;
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "ttam hour pull failed");
    }
    for (const id of wantAds) {
      ttamPicked.push({
        adgroup_id: id,
        name: id,
        campaign_name: "",
        spend: spendBy.get(id) ?? 0,
        impressions: impBy.get(id) ?? 0,
      });
    }
    // Names for the receipt (fail-open: id-only rows stay).
    try {
      const manuals = await getManualCampaigns(creds.access_token, shop.advertiserId);
      for (const [cid, meta] of manuals) {
        try {
          const list = await pagedAdgroups(creds.access_token, shop.advertiserId, cid);
          for (const g of list) {
            const id = String(g.adgroup_id ?? g.id ?? "");
            const hit = ttamPicked.find((p) => p.adgroup_id === id);
            if (hit && hit.name === id) {
              hit.name = String(g.adgroup_name ?? g.name ?? id);
              hit.campaign_name = String(meta.name ?? cid);
            }
          }
          if (ttamPicked.every((p) => p.name !== p.adgroup_id)) break;
        } catch {
          // fail-open per campaign
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      // fail-open: spend rows keep id-only names
    }
  }
  ttamPicked.sort((a, b) => b.spend - a.spend);

  const gmvCost = gmvByCampaign.reduce((s, x) => s + x.cost, 0);
  const gmvGmv = gmvByCampaign.reduce((s, x) => s + x.gmv, 0);
  const gmvOrders = gmvByCampaign.reduce((s, x) => s + x.orders, 0);
  const ttamSpend = ttamPicked.reduce((s, p) => s + p.spend, 0);
  const ttamImpressions = ttamPicked.reduce((s, p) => s + p.impressions, 0);
  const totalCost = gmvCost + ttamSpend;
  const mytToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const isToday = date === mytToday;
  return {
    roomId: wantRoom,
    date,
    fromHour,
    toHour,
    isToday,
    gmvCost,
    gmvGmv,
    gmvOrders,
    gmvCampaigns: gmvByCampaign,
    ttamSpend,
    ttamImpressions,
    ttamPicked,
    totalCost,
    blendedGrossRoi: gmvGmv > 0 && totalCost > 0 ? gmvGmv / totalCost : null,
    blendedNetRoi: gmvGmv > 0 && totalCost > 0 ? (gmvGmv * (1 - feeRate)) / totalCost : null,
    feeRate,
    hourly: [...buckets.values()].sort((a, b) => (a.hour < b.hour ? -1 : 1)),
    checkedCampaigns: campaigns.length,
    errors,
    method: isToday
      ? "room x hour + adgroup x hour rows for the picked range; today is partial — TikTok restates intraday data"
      : "room x hour + adgroup x hour rows for the picked range; same gross/net formula as the daily join",
  };
}
