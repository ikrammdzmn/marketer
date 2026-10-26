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
import { getCampaignSessions, getManualCampaigns } from "./gmv";

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
