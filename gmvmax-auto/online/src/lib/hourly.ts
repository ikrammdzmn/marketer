import { query } from "./db";
import { getAdsCredentials } from "./ads-credentials";
import { SHOPS, type ShopConfig } from "./shops";
import { sendTelegramFull } from "./telegram";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// Divide-by-tiny guard (locked 03 Oct): % renders only when the previous
// hour has spend >= 50 or gmv >= 200; otherwise absolute-only.
export const PCT_MIN_SPEND = 50;
export const PCT_MIN_GMV = 200;

// Emoji mapping (locked 03 Oct, stored here until tuning-without-deploy
// matters — then graduate to Vercel Env, DB last). Direction stays neutral
// (up-spend is bad, up-GMV is good), color carries judgment.
export const EMOJI = {
  live: "📹",
  product: "📦",
  fire: "🔥", // biggest GMV jump of the hour (per type)
  warn: "⚠️", // spent >= STAGNANT_SPEND with zero GMV
};
export const STAGNANT_SPEND = 5;

export interface HourlyRow {
  campaignId: string;
  hourSlot: string;
  cost: number;
  gmv: number;
  orders: number;
}

async function fetchHourlyRows(
  accessToken: string,
  shop: ShopConfig,
  promotionType: string,
  date: string
): Promise<HourlyRow[]> {
  const rows: HourlyRow[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: shop.advertiserId,
      store_ids: JSON.stringify([shop.shopId]),
      gmv_max_promotion_type: promotionType,
      dimensions: JSON.stringify(["stat_time_hour", "campaign_id"]),
      metrics: JSON.stringify(["cost", "orders", "gross_revenue"]),
      start_date: date,
      end_date: date,
      page: String(page),
      page_size: "1000",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
      { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    if (body.code !== 0) throw new Error(`hourly report code=${body.code}: ${body.message ?? ""}`);
    for (const item of body.data?.list ?? []) {
      rows.push({
        campaignId: item.dimensions?.campaign_id,
        hourSlot: item.dimensions?.stat_time_hour,
        cost: parseFloat(item.metrics?.cost ?? 0),
        gmv: parseFloat(item.metrics?.gross_revenue ?? 0),
        orders: parseInt(item.metrics?.orders ?? 0, 10),
      });
    }
    const total = body.data?.page_info?.total_page ?? 1;
    if (page >= total) hasMore = false;
    else {
      page++;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return rows;
}

export interface HourDiff {
  campaignId: string;
  campaignName: string;
  promotionType: string;
  slot: string;
  prevSlot: string;
  cost: number;
  gmv: number;
  orders: number;
  dCost: number;
  dGmv: number;
  dOrders: number;
  pCost: number | null;
  pGmv: number | null;
  budget: number | null;
}

// Hourly POC (shop 1 only): pull today's hour slots for both types, drop the
// newest 2 slots (closed-window lag edge), upsert the rest (rewrite-on-revise),
// diff the latest closed slot vs the previous stored slot, push Telegram.
export async function syncHourly(shopNumber: string, date: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (shopNumber !== "1") throw new Error("hourly POC is shop-1-only");
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  const live = await fetchHourlyRows(creds.access_token, shop, "LIVE_GMV_MAX", date);
  const product = await fetchHourlyRows(creds.access_token, shop, "PRODUCT_GMV_MAX", date);

  // The report API returns mixed types: filter each pull by the Neon
  // campaign map (unmapped campaigns keep the requested label). Without
  // this, LIVE/PRODUCT rows overwrite each other on the PK.
  const cmap0 = await query(
    `SELECT campaign_id, promotion_type FROM gmv.gmv_campaigns WHERE shop_id = $1`,
    [shop.shopId]
  );
  const pmap = new Map<string, string>();
  for (const c of cmap0.rows) pmap.set(c.campaign_id, c.promotion_type);
  const keep = (r: HourlyRow, want: string) => {
    const t = pmap.get(r.campaignId);
    return !t || t === want;
  };
  const liveF = live.filter((r) => keep(r, "LIVE_GMV_MAX"));
  const productF = product.filter((r) => keep(r, "PRODUCT_GMV_MAX"));

  // Slot edge (owner call: real-time, lag rule dropped): TikTok returns the
  // full-day grid including future zero slots — edge is the last slot with
  // any activity, everything through it is stored. The newest pair is always
  // tagged partial (intraday data revises). Slots are MYT (verified).
  const totals = new Map<string, number>();
  for (const r of [...liveF, ...productF]) {
    totals.set(r.hourSlot, (totals.get(r.hourSlot) ?? 0) + r.cost + r.gmv + r.orders);
  }
  const ordered = [...totals.keys()].sort();
  const edgeIdx = ordered.findLastIndex((s) => (totals.get(s) ?? 0) > 0);
  const closed = edgeIdx >= 0 ? ordered.slice(0, edgeIdx + 1) : [];

  let stored = 0;
  // Batched multi-row upsert (Hobby 60s cap: hundreds of sequential
  // queries time out; chunks of 500 rows run in seconds).
  const pending: Array<{ r: HourlyRow; pt: string }> = [];
  for (const r of liveF) if (closed.includes(r.hourSlot)) pending.push({ r, pt: "LIVE_GMV_MAX" });
  for (const r of productF) if (closed.includes(r.hourSlot)) pending.push({ r, pt: "PRODUCT_GMV_MAX" });
  const BATCH = 500;
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const vals: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((e, j) => {
      const o = j * 7;
      vals.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7})`);
      params.push(shop.shopId, e.r.campaignId, e.r.hourSlot, e.pt, e.r.cost, e.r.gmv, e.r.orders);
    });
    await query(
      `INSERT INTO gmv.hourly_campaign_metrics
         (shop_id, campaign_id, hour_slot, promotion_type, cost, gmv, orders)
       VALUES ${vals.join(",")}
       ON CONFLICT (shop_id, campaign_id, hour_slot) DO UPDATE SET
         promotion_type = EXCLUDED.promotion_type, cost = EXCLUDED.cost,
         gmv = EXCLUDED.gmv, orders = EXCLUDED.orders, pulled_at = now()`,
      params
    );
    stored += chunk.length;
  }

  // Jar rows (owner call): per-campaign day-so-far cumulative at slot vs
  // cumulative before slot. Diff = this hour's bucket. ROI H = bucket
  // gmv/bucket cost, ROI D = cumulative gmv/cumulative cost.
  const slot = closed[closed.length - 1] ?? null;
  const diffs: HourDiff[] = [];
  let syncedNote = "";
  if (slot) {
    const cmap = await query(
      `SELECT campaign_id, name, promotion_type, status, MAX(updated_at) OVER () AS synced_at
       FROM gmv.gmv_campaigns WHERE shop_id = $1`,
      [shop.shopId]
    );
    const info = new Map<string, { name: string; promotion_type: string; status: string | null; budget: number | null }>();
    for (const c of cmap.rows) info.set(c.campaign_id, { name: c.name, promotion_type: c.promotion_type, status: c.status ?? null, budget: null });
    // Budget column exists after 010 migration — tolerate pre-migration DBs.
    try {
      const bmap = await query(
        `SELECT campaign_id, budget FROM gmv.gmv_campaigns WHERE shop_id = $1`,
        [shop.shopId]
      );
      for (const b of bmap.rows) {
        const m = info.get(b.campaign_id);
        if (m) m.budget = b.budget === null ? null : Number(b.budget);
      }
    } catch {
      console.error("[hourly] budget column missing (run 010 migration)");
    }
    const syncedAt = cmap.rows[0]?.synced_at ?? null;
    const curCum = await query(
      `SELECT campaign_id, promotion_type, SUM(cost)::float AS cost, SUM(gmv)::float AS gmv, SUM(orders)::float AS orders
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND hour_slot LIKE $2 AND hour_slot <= $3
       GROUP BY 1, 2`,
      [shop.shopId, `${date}%`, slot]
    );
    const prevSlotRow = await query(
      `SELECT MAX(hour_slot) AS prev FROM gmv.hourly_campaign_metrics
       WHERE shop_id = $1 AND hour_slot < $2`,
      [shop.shopId, slot]
    );
    const prevSlot = prevSlotRow.rows[0]?.prev ?? null;
    const prevCum = new Map<string, { cost: number; gmv: number; orders: number }>();
    if (prevSlot) {
      const pr = await query(
        `SELECT campaign_id, SUM(cost)::float AS cost, SUM(gmv)::float AS gmv, SUM(orders)::float AS orders
         FROM gmv.hourly_campaign_metrics
         WHERE shop_id = $1 AND hour_slot LIKE $2 AND hour_slot <= $3
         GROUP BY 1`,
        [shop.shopId, `${date}%`, prevSlot]
      );
      for (const r of pr.rows) prevCum.set(r.campaign_id, r);
    }
    for (const r of curCum.rows) {
      const p = prevCum.get(r.campaign_id);
      const meta = info.get(r.campaign_id);
      const cost = Number(r.cost), gmv = Number(r.gmv), orders = Number(r.orders);
      const pc = p ? Number(p.cost) : 0;
      const pg = p ? Number(p.gmv) : 0;
      const po = p ? Number(p.orders) : 0;
      diffs.push({
        campaignId: r.campaign_id,
        campaignName: meta?.name ?? r.campaign_id,
        promotionType: r.promotion_type,
        slot, prevSlot,
        cost, gmv, orders,
        dCost: cost - pc, dGmv: gmv - pg, dOrders: orders - po,
        pCost: null,
        pGmv: null,
        budget: meta?.budget ?? null,
      });
    }
    diffs.sort((a, b) => b.cost - a.cost);
    // Whole-message ON-filter (owner call): exclude explicit OFF only —
    // unknown (unsynced) campaigns stay visible so new spenders never hide.
    // Dashboard keeps everything.
    const offIds = new Set(
      [...info.entries()].filter(([, m]) => m.status === "OFF").map(([id]) => id)
    );
    const onDiffs = diffs.filter((d) => !offIds.has(d.campaignId));
    const offExcluded = diffs.length - onDiffs.length;
    syncedNote =
      `ON-only, excludes ${offExcluded} OFF` +
      (syncedAt ? ` · status as of ${String(syncedAt).slice(0, 16).replace("T", " ")}` : "");
    diffs.length = 0;
    diffs.push(...onDiffs);
    // Lazy budget fill (movers only, fail-open): campaign/get list carries
    // no budget (proven by sample_keys) — info endpoint does (live_view.py).
    const needBud = diffs.filter((d) => d.budget === null || d.budget === undefined).slice(0, 15);
    for (const d of needBud) {
      try {
        const params = new URLSearchParams({
          advertiser_id: shop.advertiserId,
          campaign_id: d.campaignId,
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/campaign/gmv_max/info/?${params.toString()}`,
          { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        const data = body.code === 0 ? body.data ?? {} : {};
        const raw = data.budget ?? data.daily_budget ?? data.total_budget ?? null;
        const n = raw === null || raw === undefined || raw === "" ? null : Number(raw);
        if (n !== null && Number.isFinite(n) && n > 0) {
          d.budget = n;
          await query(
            `UPDATE gmv.gmv_campaigns SET budget = $1, updated_at = now() WHERE campaign_id = $2`,
            [n, d.campaignId]
          );
        }
      } catch {
        // fail-open: row shows "bud n/a", next sync retries
      }
    }
  }

  // Telegram: 2 styled messages (LIVE + Product, owner call 03 Oct),
  // all active campaigns each, stamped "as of pull time".
  const pulledAt = new Date().toISOString();
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const arrow = (n: number) => (n > 0 ? "▲" : n < 0 ? "▼" : "▪");
  const MAX = 3900; // under Telegram's 4096 cap
  // Restructured content (fixes "packed"): type totals first, then movers
  // (|dCost|>=1 or |dGmv|>=1 or orders moved), steady collapsed to a count.
  // Rich pipe uses real table blocks (probe-verified shapes); legacy HTML
  // string is the automatic fallback.
  const calc = (list: HourDiff[]) => {
    const t = (k: "cost" | "gmv" | "orders") =>
      list.reduce((s, d) => s + (k === "orders" ? d.orders : d[k]), 0);
    const tp = (k: "cost" | "gmv" | "orders") =>
      list.reduce(
        (s, d) => s + (k === "orders" ? d.orders - d.dOrders : d[k] - (k === "cost" ? d.dCost : d.dGmv)),
        0
      );
    const movers = list.filter(
      (d) => Math.abs(d.dCost) >= 1 || Math.abs(d.dGmv) >= 1 || d.dOrders !== 0
    );
    return {
      tc: t("cost"), tg: t("gmv"), tor: t("orders"),
      pc: tp("cost"), pg: tp("gmv"), por: tp("orders"),
      movers, steady: list.length - movers.length,
    };
  };
  const fmtPct = (cur: number, prev: number, min: number) =>
    prev >= min && prev !== 0 ? `${(((cur - prev) / prev) * 100).toFixed(1)}%` : "n/a";
  // Human header parts: "13:00" from "2026-10-03 13:00:00", pulled in MYT.
  const hhmm = (s: string) => s.slice(11, 16);
  const pulledMYT = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });
  const headLine = (slotA: string, slotB: string) =>
    `${hhmm(slotB)} → ${hhmm(slotA)} MYT (partial) · pulled ${pulledMYT} MYT`;
  const stateMark = (d: HourDiff, topId: string | null) => {
    if (d.campaignId === topId) return ` ${EMOJI.fire}`;
    if (d.cost >= STAGNANT_SPEND && d.gmv === 0) return ` ${EMOJI.warn}`;
    return " 🔛";
  };
  // Short display: bracket account + tail-4 (collision-safe) + active mark
  // comes from stateMark. "ot1 [Dr.Samhan]_202607262114" -> "Dr.Samhan …2114".
  const shortCampaign = (d: HourDiff, topId: string | null) => {
    const m = /\[([^\[\]]+)\]/.exec(d.campaignName ?? "");
    const account = (m ? m[1].trim() : d.campaignName.trim()).slice(0, 22) || d.campaignId;
    const tm = /(\d{4})\D*$/.exec(d.campaignName ?? "");
    const tail = tm ? tm[1] : d.campaignId.slice(-4);
    return `${account} …${tail}${stateMark(d, topId)}`;
  };
  const summarize = (
    title: string,
    list: HourDiff[],
    earlier: Array<{ hour_slot: string; c: number; g: number; o: number }> = []
  ) => {
    void earlier;
    const { tc, tg, tor, movers, steady } = calc(list);
    const hcAll = list.reduce((s, d) => s + d.dCost, 0);
    const hgAll = list.reduce((s, d) => s + d.dGmv, 0);
    const hoAll = list.reduce((s, d) => s + d.dOrders, 0);
    const fmtBud = (b: number) => (b >= 1000 ? `${parseFloat((b / 1000).toFixed(1))}k` : `${b}`);
    const roiH = (d: HourDiff) =>
      d.dCost >= 1 && d.dCost > 0 ? (d.dGmv / d.dCost).toFixed(1) : "n/a";
    const roiD = (d: HourDiff) =>
      d.cost > 0 ? (d.gmv / d.cost).toFixed(1) : "n/a";
    const budOf = (d: HourDiff) =>
      d.budget === null || d.budget === undefined
        ? "bud n/a"
        : `bud ${Math.round((d.cost / d.budget) * 100)}% of ${fmtBud(d.budget)}`;
    const head =
      `<b>${title}</b>\n${headLine(slot, list[0]?.prevSlot ?? "?")}\n` +
      `Hour cost ${hcAll.toFixed(2)} | gmv ${hgAll.toFixed(2)} | ord ${hoAll}\n` +
      `Day so far cost ${tc.toFixed(2)} | gmv ${tg.toFixed(2)} | ord ${tor}\n`;
    const lines = movers.map((d) => {
      const pc0 = d.cost - d.dCost, pg0 = d.gmv - d.dGmv, po0 = d.orders - d.dOrders;
      const sCost = `${d.dCost >= 0 ? "+" : ""}${d.dCost.toFixed(2)}`;
      const sGmv = `${d.dGmv >= 0 ? "+" : ""}${d.dGmv.toFixed(2)}`;
      const sOrd = `${d.dOrders >= 0 ? "+" : ""}${d.dOrders}`;
      const topIdL = movers.reduce<HourDiff | null>(
        (best, x) => (!best || x.dGmv > best.dGmv ? x : best),
        null
      )?.campaignId ?? null;
      return (
        `<code>${esc(shortCampaign(d, topIdL))}</code>\n` +
        `cost ${pc0.toFixed(2)} → <b>${d.cost.toFixed(2)}</b> (${sCost} ${arrow(d.dCost)}) | ` +
        `gmv ${pg0.toFixed(2)} → <b>${d.gmv.toFixed(2)}</b> (${sGmv} ${arrow(d.dGmv)})\n` +
        `ROI H ${roiH(d)} · D ${roiD(d)} | ord ${po0} → <b>${d.orders}</b> (${sOrd}) | ${budOf(d)}`
      );
    });
    let text = head + (lines.join("\n") || "<i>no movers this hour</i>");
    if (steady > 0) text += `\n<i>${steady} steady (ON)</i>`;
    text += `\n<i>${esc(syncedNote)}</i>`;
    if (text.length > MAX) {
      const kept: string[] = [];
      for (const ln of lines) {
        if ((head + kept.join("\n") + "\n" + ln).length > MAX) break;
        kept.push(ln);
      }
      text = head + kept.join("\n") + `\n<i>…and ${lines.length - kept.length} more (dashboard)</i>`;
      if (steady > 0) text += ` <i>+ ${steady} steady</i>`;
    }
    return text;
  };
  // Rich table message (probe-verified shapes 03 Oct): bold title paragraph,
  // totals paragraph, striped compact table (movers only), steady + earlier
  // hours inside collapsible Details blocks.
  const buildBlocks = (
    title: string,
    list: HourDiff[],
    earlier: Array<{ hour_slot: string; c: number; g: number; o: number }>
  ) => {
    const { tc, tg, tor, movers, steady } = calc(list);
    const prevSlot = list[0]?.prevSlot ?? "?";
    const hcAll = list.reduce((s, d) => s + d.dCost, 0);
    const hgAll = list.reduce((s, d) => s + d.dGmv, 0);
    const hoAll = list.reduce((s, d) => s + d.dOrders, 0);
    const fmtBudB = (b: number) => (b >= 1000 ? `${parseFloat((b / 1000).toFixed(1))}k` : `${b}`);
    const roiHB = (d: HourDiff) =>
      d.dCost >= 1 && d.dCost > 0 ? (d.dGmv / d.dCost).toFixed(1) : "n/a";
    const roiDB = (d: HourDiff) =>
      d.cost > 0 ? (d.gmv / d.cost).toFixed(1) : "n/a";
    const budB = (d: HourDiff) =>
      d.budget === null || d.budget === undefined
        ? "n/a"
        : `${Math.round((d.cost / d.budget) * 100)}% ${fmtBudB(d.budget)}`;
    const topId = movers.reduce<HourDiff | null>(
      (best, d) => (!best || d.dGmv > best.dGmv ? d : best),
      null
    )?.campaignId ?? null;
    const rich = (s: string) => ({ type: "bold", text: s });
    const cell = (s: string, header = false, right = false) => ({
      ...(header ? { is_header: true } : {}),
      ...(right ? { align: "right" } : {}),
      text: rich(s),
    });
    // Names plain so bold value cells stand out (whole-cell bold is the
    // max rich tables allow — partial-bold renders as literal tags).
    const nameCell = (s: string) => ({ text: s });
    // Rich table cells render <b> literally (11:21 screenshot), so values
    // stay native whole-cell bold; partial-bold lives in legacy HTML only.
    const row = (d: HourDiff) => {
      const pc0 = d.cost - d.dCost, pg0 = d.gmv - d.dGmv, po0 = d.orders - d.dOrders;
      const sCost = `${d.dCost >= 0 ? "+" : ""}${d.dCost.toFixed(2)}`;
      const sGmv = `${d.dGmv >= 0 ? "+" : ""}${d.dGmv.toFixed(2)}`;
      const sOrd = `${d.dOrders >= 0 ? "+" : ""}${d.dOrders}`;
      return [
        nameCell(shortCampaign(d, topId)),
        cell(`${pc0.toFixed(2)} → ${d.cost.toFixed(2)} (${sCost} ${arrow(d.dCost)})`, false, true),
        cell(`${pg0.toFixed(2)} → ${d.gmv.toFixed(2)} (${sGmv} ${arrow(d.dGmv)})`, false, true),
        cell(`H ${roiHB(d)} · D ${roiDB(d)}`, false, true),
        cell(`${po0} → ${d.orders} (${sOrd})`, false, true),
        cell(budB(d), false, true),
      ];
    };
    const steadyList = list.filter(
      (d) => !(Math.abs(d.dCost) >= 1 || Math.abs(d.dGmv) >= 1 || d.dOrders !== 0)
    );
    const blocks: unknown[] = [
      { type: "paragraph", text: rich(title) },
      {
        type: "paragraph",
        text: `${headLine(slot, prevSlot)}\n` +
          `Hour cost ${hcAll.toFixed(2)} | gmv ${hgAll.toFixed(2)} | ord ${hoAll}\n` +
          `Day so far: cost ${tc.toFixed(2)} | gmv ${tg.toFixed(2)} | ord ${tor}`,
      },
      {
        type: "table",
        is_striped: true,
        is_compact: true,
        cells: [
          [cell("Campaign", true), cell("Cost", true, true), cell("GMV", true, true), cell("ROI H·D", true, true), cell("Ord", true, true), cell("Bud", true, true)],
          ...movers.slice(0, 40).map(row),
        ],
      },
      {
        type: "details",
        summary: rich(steady > 0 ? `${steady} steady (ON) — tap to expand` : "no movers this hour"),
        blocks: [
          {
            type: "table",
            is_striped: true,
            is_compact: true,
            cells: [
              [cell("Steady campaign", true), cell("Cost", true, true), cell("GMV", true, true)],
              ...steadyList.slice(0, 60).map((d) => [
                nameCell(shortCampaign(d, topId)),
                cell(Number(d.cost).toFixed(2), false, true),
                cell(Number(d.gmv).toFixed(2), false, true),
              ]),
            ],
          },
        ],
      },
    ];
    if (earlier.length > 0) {
      blocks.push({
        type: "details",
        summary: rich("Earlier today — tap to expand"),
        blocks: [
          {
            type: "table",
            is_striped: true,
            is_compact: true,
            cells: [
              [cell("Slot", true), cell("Cost", true, true), cell("GMV", true, true), cell("Ord", true, true)],
              ...earlier.slice(-8).map((e) => [
                cell(e.hour_slot.slice(11, 16)),
                cell(Number(e.c).toFixed(2), false, true),
                cell(Number(e.g).toFixed(2), false, true),
                cell(String(e.o), false, true),
              ]),
            ],
          },
        ],
      });
    }
    blocks.push({ type: "paragraph", text: syncedNote });
    return blocks;
  };
  let telegram: string | boolean = false;
  if (slot) {
    const liveD = diffs.filter((d) => d.promotionType === "LIVE_GMV_MAX");
    const prodD = diffs.filter((d) => d.promotionType !== "LIVE_GMV_MAX");
    // Earlier-today totals per slot per type (excludes the current pair).
    const hist = await query(
      `SELECT hour_slot, promotion_type, SUM(cost)::float AS c, SUM(gmv)::float AS g, SUM(orders) AS o
       FROM gmv.hourly_campaign_metrics
       WHERE shop_id = $1 AND hour_slot LIKE $2 AND hour_slot < $3
       GROUP BY 1, 2 ORDER BY 1`,
      [shop.shopId, `${date}%`, slot]
    );
    const earlierAll = hist.rows as Array<{ hour_slot: string; promotion_type: string; c: number; g: number; o: number }>;
    const earlierLive = earlierAll.filter((e) => e.promotion_type === "LIVE_GMV_MAX");
    const earlierProd = earlierAll.filter((e) => e.promotion_type !== "LIVE_GMV_MAX");
    const r1 = await sendTelegramFull(
      summarize(`${EMOJI.live} LIVE GMV Max (shop 1)`, liveD, earlierLive), true, buildBlocks(`${EMOJI.live} LIVE GMV Max (shop 1)`, liveD, earlierLive)
    );
    const r2 = await sendTelegramFull(
      summarize(`${EMOJI.product} Product GMV Max (shop 1)`, prodD, earlierProd), true, buildBlocks(`${EMOJI.product} Product GMV Max (shop 1)`, prodD, earlierProd)
    );
    telegram =
      r1.ok && r2.ok
        ? `${r1.mode}+${r2.mode}`
        : `failed live=${r1.mode}:${r1.error ?? "?"} prod=${r2.mode}:${r2.error ?? "?"}`;
  }

  return { shop: shop.name, date, slots: ordered.length, closedSlots: closed.length, stored, slot, diffs, pulledAt, telegram };
}

export async function getHourlyView(shopNumber: string, date: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  const slots = await query(
    `SELECT DISTINCT hour_slot FROM gmv.hourly_campaign_metrics
     WHERE shop_id = $1 AND hour_slot LIKE $2 ORDER BY hour_slot DESC LIMIT 24`,
    [shop.shopId, `${date}%`]
  );
  const rows = await query(
    `SELECT h.campaign_id, c.name AS campaign_name, h.promotion_type,
            h.hour_slot, h.cost, h.gmv, h.orders, h.pulled_at
     FROM gmv.hourly_campaign_metrics h
     LEFT JOIN gmv.gmv_campaigns c ON c.campaign_id = h.campaign_id
     WHERE h.shop_id = $1 AND h.hour_slot LIKE $2
     ORDER BY h.hour_slot DESC, h.cost DESC`,
    [shop.shopId, `${date}%`]
  );
  return { shopName: shop.name, date, slots: slots.rows.map((r) => r.hour_slot), rows: rows.rows };
}
