// lib/ai.ts — server-only AI snapshot + Gemini text insights (read-only).
// Never import this file from "use client" code (it pulls pg via db).
// Snapshot is Neon-cache-only: no live TikTok pulls, fast + under Hobby 60s.

import { query } from "@/lib/db";
import { SHOPS } from "@/lib/shops";
import { getAffiliateDigest } from "@/lib/affiliates";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { fetchManualSpend, getManualCampaigns } from "@/lib/gmv";
import { flagsForRow, verdictOf } from "@/lib/ttam-scores";

export const AI_MODULES = ["gmv", "ttam", "shop"] as const;
export type AiModule = (typeof AI_MODULES)[number];

export const AI_LANGS = ["en", "ms"] as const;
export type AiLang = (typeof AI_LANGS)[number];

export const AI_CACHE_TTL_MS = 15 * 60 * 1000;

export type AiGuardrails = { minNetRoi: number; maxCpa: number; feeRate: number };

export const AI_GUARD_DEFAULTS: AiGuardrails = { minNetRoi: 7.0, maxCpa: 21.18, feeRate: 0.25 };

export function sanitizeGuardrails(raw: Partial<AiGuardrails>): AiGuardrails {
  const cl = (n: number, lo: number, hi: number, fb: number) =>
    Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
  return {
    minNetRoi: cl(Number(raw.minNetRoi), 1, 30, AI_GUARD_DEFAULTS.minNetRoi),
    maxCpa: cl(Number(raw.maxCpa), 1, 500, AI_GUARD_DEFAULTS.maxCpa),
    feeRate: cl(Number(raw.feeRate), 0, 0.6, AI_GUARD_DEFAULTS.feeRate),
  };
}

type CacheEntry = { at: number; markdown: string; modules: AiModule[]; days: number; model: string; lang: AiLang };
const cache = new Map<string, CacheEntry>();

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

function mytToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}
function daysAgoIso(n: number): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseLang(raw: unknown): AiLang {
  const s = String(raw ?? "en").trim().toLowerCase();
  return s === "ms" || s === "my" || s.startsWith("ms-") ? "ms" : "en";
}

export function parseModules(raw: unknown): AiModule[] {
  const list = String(raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AiModule => (AI_MODULES as readonly string[]).includes(s));
  const deduped = [...new Set(list)];
  return deduped.length > 0 ? deduped : [...AI_MODULES];
}

// ---- snapshot builders (each fail-open: missing table => note, never throw) ----

function pct(cur: number, prev: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}

async function snapGmv(shopId: string, curSince: string, today: string, prevSince: string, prevEnd: string, yesterday: string) {
  const out: Record<string, unknown> = {};
  const meta = new Map<string, any>();
  try {
    const c = await query(
      `SELECT campaign_id, name, account, status, delivery, budget, promotion_type
       FROM gmv.gmv_campaigns WHERE shop_id = $1 ORDER BY account, name LIMIT 60`,
      [shopId]
    );
    for (const r of c.rows as any[]) meta.set(String(r.campaign_id), r);
    out.campaignMeta = [...meta.values()].slice(0, 60).map((r: any) => ({
      id: String(r.campaign_id),
      name: String(r.name ?? "").slice(0, 60),
      acct: r.account ?? null,
      status: r.status ?? null,
      type: r.promotion_type ?? null,
      budget: r.budget === null || r.budget === undefined ? null : num(r.budget),
    }));
  } catch (e) {
    out.campaignsError = e instanceof Error ? e.message : "campaigns failed";
  }
  try {
    // One 2x-window pull, split in JS into current vs previous CLOSED periods.
    // Today is always partial (live edge) — excluded from WoW, covered by todayHours.
    const d = await query(
      `SELECT substr(hour_slot,1,10) AS d, campaign_id,
              SUM(cost) AS cost, SUM(gmv) AS gmv, SUM(orders) AS orders
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND substr(hour_slot,1,10) >= $2
       GROUP BY 1, 2 ORDER BY 1`,
      [shopId, prevSince]
    );
    const per = new Map<string, { cur: { cost: number; gmv: number; orders: number }; prev: { cost: number; gmv: number; orders: number } }>();
    const dayTotals = new Map<string, { cost: number; gmv: number; orders: number }>();
    for (const r of d.rows as any[]) {
      const day = String(r.d);
      if (day > yesterday) continue; // live edge — todayHours covers it
      const id = String(r.campaign_id);
      const cost = num(r.cost), gmv = num(r.gmv), orders = num(r.orders);
      const dt = dayTotals.get(day) ?? { cost: 0, gmv: 0, orders: 0 };
      dt.cost += cost; dt.gmv += gmv; dt.orders += orders;
      dayTotals.set(day, dt);
      const e = per.get(id) ?? { cur: { cost: 0, gmv: 0, orders: 0 }, prev: { cost: 0, gmv: 0, orders: 0 } };
      const slot = day >= curSince ? e.cur : e.prev;
      slot.cost += cost; slot.gmv += gmv; slot.orders += orders;
      per.set(id, e);
    }
    const tot = (pick: (e: { cur: { cost: number; gmv: number; orders: number }; prev: { cost: number; gmv: number; orders: number } }) => { cost: number; gmv: number; orders: number }) => {
      let cost = 0, gmv = 0, orders = 0;
      for (const e of per.values()) { cost += pick(e).cost; gmv += pick(e).gmv; orders += pick(e).orders; }
      return { cost: r2(cost), gmv: r2(gmv), orders: Math.round(orders) };
    };
    const cur = tot((e) => e.cur), prev = tot((e) => e.prev);
    const roiOf = (t: { cost: number; gmv: number }) => (t.cost > 0 ? r2(t.gmv / t.cost) : 0);
    out.totals = {
      cur: { ...cur, roi: roiOf(cur) },
      prev: { ...prev, roi: roiOf(prev) },
      deltaPct: { cost: pct(cur.cost, prev.cost), gmv: pct(cur.gmv, prev.gmv), orders: pct(cur.orders, prev.orders) },
    };
    out.coverage = { days: dayTotals.size, campaigns: per.size, lastDay: [...dayTotals.keys()].sort().pop() ?? null };
    out.daily = [...dayTotals.entries()]
      .filter(([day]) => day >= curSince)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, t]) => ({ d: day, cost: r2(t.cost), gmv: r2(t.gmv), orders: Math.round(t.orders), roi: t.cost > 0 ? r2(t.gmv / t.cost) : 0 }));
    const rows = [...per.entries()].map(([id, e]) => {
      const m = meta.get(id);
      const roiC = e.cur.cost > 0 ? r2(e.cur.gmv / e.cur.cost) : 0;
      const roiP = e.prev.cost > 0 ? r2(e.prev.gmv / e.prev.cost) : 0;
      return {
        id,
        name: (m?.name ? String(m.name).slice(0, 50) : id),
        status: m?.status ?? null,
        type: m?.promotion_type ?? m?.type ?? null,
        budget: m?.budget === null || m?.budget === undefined ? null : r2(num(m.budget)),
        cost: r2(e.cur.cost), gmv: r2(e.cur.gmv), orders: Math.round(e.cur.orders), roi: roiC,
        prevCost: r2(e.prev.cost), prevGmv: r2(e.prev.gmv), prevRoi: roiP,
        dCostPct: pct(e.cur.cost, e.prev.cost), dGmvPct: pct(e.cur.gmv, e.prev.gmv),
      };
    });
    rows.sort((a, b) => b.cost - a.cost);
    out.topCampaigns = rows.slice(0, 10);
    out.worst = rows.filter((r) => r.cost >= 5 && r.gmv <= 0).slice(0, 5);
    out.fallers = rows.filter((r) => r.dGmvPct !== null && (r.dGmvPct as number) <= -20).sort((a, b) => (a.dGmvPct as number) - (b.dGmvPct as number)).slice(0, 5);
  } catch (e) {
    out.dailyError = e instanceof Error ? e.message : "daily failed";
  }
  try {
    const h = await query(
      `SELECT hour_slot, SUM(cost) AS cost, SUM(gmv) AS gmv
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND hour_slot LIKE $2 || '%'
       GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
      [shopId, today]
    );
    out.todayHours = h.rows.map((r: any) => ({
      slot: String(r.hour_slot).slice(11, 16),
      cost: r2(num(r.cost)),
      gmv: r2(num(r.gmv)),
    }));
    out.todayHoursNote = "Newest slots are partial by definition — decide off closed hours.";
  } catch (e) {
    out.todayHoursError = e instanceof Error ? e.message : "hours failed";
  }
  try {
    const cr = await query(
      `SELECT date, campaign_id, item_id, LEFT(title,60) AS title, cost, orders, gmv, roi
       FROM creative.daily_rows WHERE date >= $1 ORDER BY cost DESC LIMIT 10`,
      [curSince]
    );
    out.topCreatives = cr.rows.map((r: any) => ({
      d: String(r.date).slice(0, 10),
      item: String(r.item_id),
      title: r.title ?? null,
      cost: r2(num(r.cost)),
      gmv: r2(num(r.gmv)),
      roi: r2(num(r.roi)),
      orders: num(r.orders),
    }));
  } catch {
    out.topCreativesNote = "creative.daily_rows unavailable (run 018 / sync first)";
  }
  return out;
}

async function snapTtam(since: string, endDate: string, prevSince: string, prevEnd: string) {
  const out: Record<string, unknown> = {};
  try {
    const p = await query(
      `SELECT preset_key, label, guardrails, notes FROM ttam.presets WHERE active = true ORDER BY updated_at DESC LIMIT 1`
    );
    const row = p.rows[0];
    out.activePreset = row
      ? { key: row.preset_key, label: row.label, guardrails: row.guardrails, notes: String(row.notes ?? "").slice(0, 300) }
      : null;
    if (!row) out.activePresetNote = "no active preset";
  } catch (e) {
    out.presetError = e instanceof Error ? e.message : "preset failed";
  }
  // Campaign-grain TTAM (fetchManualSpend) carries full metrics + v3 scores.
  // WoW via two parallel pulls (cur + prev); prev fail-open to cur-only.
  // Top-10 by current spend with flags/verdict so the model names campaigns.
  try {
    const shop = SHOPS["1"];
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) throw new Error("no ads token");
    const [curR, prevR] = await Promise.all([
      fetchManualSpend(creds.access_token, shop.advertiserId, since, endDate),
      fetchManualSpend(creds.access_token, shop.advertiserId, prevSince, prevEnd).catch(() => null),
    ]);
    const manual = curR;
    const prevSpend = new Map<string, number>();
    if (prevR) for (const r of (prevR.rows as any[])) prevSpend.set(String(r.campaign_id), num(r.spend));
    let names = new Map<string, { name: string; status: string | null }>();
    try {
      const info = await getManualCampaigns(creds.access_token, shop.advertiserId);
      names = new Map(
        [...info.entries()].map(([id, c]) => [id, { name: c.name, status: c.status }])
      );
    } catch (e) {
      // id-only rows still score; names are cosmetic — but say so loudly.
      out.namesNote = `campaign names unavailable (${(e instanceof Error ? e.message : "campaign/get failed").slice(0, 120)}) — ids shown`;
    }
    const r2s = (s: Record<string, number | null>) => {
      const o: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(s)) {
        o[k] = typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
      }
      return o;
    };
    const curSpend = r2(num(manual.spend));
    const prevSpendTot = prevR ? r2(num(prevR.spend)) : null;
    out.totals = { curSpend, prevSpend: prevSpendTot, dSpendPct: prevSpendTot === null ? null : pct(curSpend, prevSpendTot) };
    out.campaigns = (manual.rows as any[]).slice(0, 10).map((r) => {
      const id = String(r.campaign_id);
      const spend = r2(num(r.spend));
      const ps = prevSpend.has(id) ? r2(prevSpend.get(id) ?? 0) : null;
      const scores = r.scores ? r2s(r.scores) : null;
      const vis = new Set(Object.keys(scores ?? {}));
      const flags = scores ? flagsForRow(scores, vis) : null;
      const verdict = flags ? verdictOf(flags) : null;
      const m = r.metrics as Record<string, number> | null;
      return {
        id,
        name: (names.get(id)?.name ?? id).slice(0, 50),
        status: names.get(id)?.status ?? null,
        spend, prevSpend: ps, dSpendPct: ps === null ? null : pct(spend, ps),
        metrics: m ? {
          imp: Math.round(num(m.impressions)), clicks: Math.round(num(m.clicks)),
          sfv6s: Math.round(num(m.video_watched_6s)), likes: Math.round(num(m.likes)),
          live: Math.round(num(m.live_views)),
        } : null,
        scores, flags, verdict: verdict?.v ?? null,
        proxy: !r.metrics,
      };
    });
    out.campaignCount = manual.campaignCount;
    out.range = { start: since, end: endDate, prevStart: prevSince, prevEnd };
    out.feederNote = "TTAM is feeder traffic — no orders/GMV expected. Judge on cheap reach, 6s-hold and live views, not ROI.";
  } catch (e) {
    out.liveError = e instanceof Error ? e.message : "ttam live pull failed";
    out.note = "Live TTAM pull failed — preset metadata only; see /gmv-max TTAM drill.";
  }
  return out;
}

async function snapShop(since: string, prevSince: string) {
  const out: Record<string, unknown> = {};
  try {
    const d = await query(
      `SELECT date, gmv, order_count, roas_after_tax, shop_order_gmv, shop_order_count,
              shop_cancelled_gmv, shop_cancelled_count
       FROM gmv.daily_shop_metrics WHERE shop_number = 1 AND date >= $1::date ORDER BY date`,
      [prevSince]
    );
    const rows = (d.rows as any[]).map((r: any) => ({
      d: String(r.date).slice(0, 10),
      adsGmv: r2(num(r.gmv)),
      adsOrders: num(r.order_count),
      roasAfterTax: num(r.roas_after_tax),
      shopGmv: num(r.shop_order_gmv) ? r2(num(r.shop_order_gmv)) : null,
      shopOrders: num(r.shop_order_count) ? Math.round(num(r.shop_order_count)) : null,
      cancelledGmv: r2(num(r.shop_cancelled_gmv)),
    }));
    const sum = (list: typeof rows) => {
      let adsGmv = 0, adsOrders = 0, shopGmv = 0, shopOrders = 0;
      for (const r of list) {
        adsGmv += r.adsGmv; adsOrders += r.adsOrders;
        shopGmv += r.shopGmv ?? 0; shopOrders += r.shopOrders ?? 0;
      }
      return { adsGmv: r2(adsGmv), adsOrders: Math.round(adsOrders), shopGmv: r2(shopGmv), shopOrders: Math.round(shopOrders) };
    };
    const cur = sum(rows.filter((r) => r.d >= since));
    const prev = sum(rows.filter((r) => r.d < since));
    out.totals = { cur, prev, deltaPct: { adsGmv: pct(cur.adsGmv, prev.adsGmv), shopGmv: pct(cur.shopGmv, prev.shopGmv) } };
    out.daily = rows.filter((r) => r.d >= since);
    out.coverage = { rows: rows.length, lastDay: rows.length ? rows[rows.length - 1].d : null };
    if (!rows.length) out.emptyNote = "daily_shop_metrics has no rows in window — owner presses Refresh daily cache on the Shop GMV tab (up to 31d per press), then re-runs Analyze.";
  } catch (e) {
    out.dailyError = e instanceof Error ? e.message : "shop daily failed";
  }
  try {
    const a = await getAffiliateDigest();
    out.affiliates =
      "needsConnect" in (a as object)
        ? { needsConnect: true }
        : {
            dueToday: (a as any).dueToday?.length ?? 0,
            overdue: (a as any).overdue?.length ?? 0,
            dueTomorrow: (a as any).dueTomorrow?.length ?? 0,
            pendingQueue: (a as any).pendingQueue?.length ?? 0,
          };
  } catch (e) {
    out.affiliatesError = e instanceof Error ? e.message : "affiliates failed";
  }
  out.shopLiveNote = "Shop Live minute detail is per-room live-API (lags ~2d) — not pulled here; see /shop-live.";
  return out;
}

export async function buildSnapshot(modules: AiModule[], days: number) {
  const shop = SHOPS["1"];
  const today = mytToday();
  const n = Math.min(Math.max(days, 1), 14);
  // WoW on CLOSED days only: current = n days ending yesterday, previous = prior n days.
  const yesterday = daysAgoIso(1);
  const curSince = daysAgoIso(n);
  const prevSince = daysAgoIso(2 * n);
  const prevEnd = daysAgoIso(n + 1);
  const snapshot: Record<string, unknown> = {
    shop: shop?.name ?? "shop 1",
    currency: "MYR",
    tz: "Asia/Kuala_Lumpur",
    todayMYT: today,
    since: curSince,
    prevSince,
    prevEnd,
    compare: `current ${curSince}..${yesterday} (closed) vs previous ${prevSince}..${prevEnd}; today ${today} is partial and excluded from WoW`,
    guardrails: null, // filled by caller (getAiInsight/chatAi) so prompts share one source
  };
  if (modules.includes("gmv")) snapshot.gmv = await snapGmv(shop?.shopId ?? "", curSince, today, prevSince, prevEnd, yesterday);
  if (modules.includes("ttam")) {
    snapshot.ttam = await snapTtam(curSince, yesterday, prevSince, prevEnd);
  }
  if (modules.includes("shop")) snapshot.shop = await snapShop(curSince, prevSince);
  return snapshot;
}

export type ChatTurn = { role: "user" | "ai"; text: string };

function buildPrompt(
  snapshot: Record<string, unknown>,
  modules: AiModule[],
  g: AiGuardrails,
  lang: AiLang,
  history?: ChatTurn[]
): string {
  const ms = lang === "ms";
  const head = ms ? [
    "Anda ialah penganalisis Marketer HW untuk satu kedai TikTok Malaysia (MYR, Asia/Kuala_Lumpur).",
    "Cadangan TEKS SAHAJA. Jangan output panggilan API ubah-bajet atau dakwa telah mengubah apa-apa.",
    `Guardrail terkunci analisis ini: ROI bersih >= ${g.minNetRoi} (selepas yuran penjual), CPA <= RM${g.maxCpa}, kadar yuran ${g.feeRate}.`,
    `Matematik metrik (buat secara eksplisit): angka ROAS/ROI snapshot adalah KASAR (sebelum yuran). Bersih = kasar x (1 - ${g.feeRate}). Bandingkan BERSIH dengan ROI bersih minimum; bandingkan CPA terus dengan CPA maksimum. Bila keputusan bergantung padanya, nyatakan kedua-dua kasar dan bersih.`,
    "Keadaan tersedak (ROI tinggi + belanja rendah) bermaksud cadang semakan ROI/kreatif, BUKAN +bajet.",
    "Slot jam terkini adalah separa — buat keputusan dari jam tertutup. Shop Live ketinggalan ~2h.",
    "WoW banding hari tertutup sahaja (hari ini separa dan sudah dikecualikan dari jumlah snapshot).",
    "Bahasa mudah: pada penggunaan pertama, tulis istilah penuh diikuti singkatan dalam kurungan — cth. minggu-ke-minggu (WoW), nilai dagangan kasar (GMV), pulangan pelaburan (ROI), kos per pemerolehan (CPA), pulangan perbelanjaan iklan (ROAS), nilai pesanan purata (AOV). Jangan mulakan dengan singkatan semata-mata.",
    "TTAM ialah trafik feeder — tiada orders/GMV dijangka. Nilai pada reach murah, 6s-hold dan live views, bukan ROI.",
  ] : [
    "You are the Marketer HW analyst for one Malaysia TikTok Shop (MYR, Asia/Kuala_Lumpur).",
    "TEXT-ONLY suggestions. Never output budget-update API calls or claim to have changed anything.",
    `Locked guardrails for this analysis: net ROI >= ${g.minNetRoi} (after seller fees), CPA <= RM${g.maxCpa}, fee rate ${g.feeRate}.`,
    `Metric math (do this explicitly): snapshot ROAS/ROI figures are GROSS (before fees). Net = gross x (1 - ${g.feeRate}). Compare NET against min net ROI; compare CPA directly against max CPA. When a verdict hinges on it, state both gross and net.`,
    "Choked state (high ROI + low spend) means suggest ROI/creative review, NOT +budget.",
    "Newest hourly slots are partial — decide off closed hours. Shop Live lags ~2d.",
    "WoW compares closed days only (today is partial and already excluded from the snapshot totals).",
    "Plain words: on first use, write the full term followed by the short form in brackets — e.g. week-over-week (WoW), gross merchandise value (GMV), return on investment (ROI), cost per acquisition (CPA), return on ad spend (ROAS), average order value (AOV). Never open with a bare short form.",
    "TTAM is feeder traffic — no orders/GMV expected. Judge on cheap reach, 6s-hold and live views, not ROI.",
  ];
  if (history && history.length > 0) {
    head.push(ms
      ? "Pusingan susulan: jawab soalan pengguna guna snapshot sama di bawah. Ringkas markdown (<150 patah) kecuali diminta detail. Nyatakan semula nombor guardrail yang diguna."
      : "Follow-up turn: answer the user's question using the same snapshot below. Keep it short markdown (<150 words) unless asked for detail. Restate which guardrail numbers you applied."
    );
    for (const t of history.slice(-6)) {
      head.push(`${t.role === "user" ? "User" : "You"}: ${t.text.slice(0, 1000)}`);
    }
  } else {
    head.push(ms
      ? "Balas dalam markdown ringkas (<300 patah) dengan TEPAT 4 bahagian ini: `### 1) Ringkasan Prestasi` (WoW: jualan, order, belanja, ROI/ROAS + % perubahan vs tempoh sebelumnya), `### 2) Kejayaan Utama` (kempen terbaik dengan nombor + nama kempen), `### 3) Masalah Kritikal & Kebocoran Wang` (kempen jatuh/bazir: nama, belanja, ROAS, % jatuh), `### 4) 3 Cadangan Tindakan Segera` (bernombor, setiap satu namakan kempen + tab mana untuk semak: /gmv-max, /creative, /shop-live). Namakan kempen sebenar dari snapshot — jangan tulis `campaign X` generik."
      : "Reply in short markdown (<300 words) with EXACTLY these 4 sections: `### 1) Performance summary` (WoW: sales, orders, spend, ROI/ROAS + % change vs previous period), `### 2) Key wins` (best campaigns with numbers + campaign names), `### 3) Critical leaks` (falling/wasteful campaigns: name, spend, ROAS, % drop), `### 4) 3 Immediate actions` (numbered, each naming the campaign + which tab to verify: /gmv-max, /creative, /shop-live). Name real campaigns from the snapshot — never generic `campaign X`."
    );
  }
  head.push(
    ms ? "Mula balasan terus dengan `### 1) Ringkasan Prestasi` diikuti angka headline (jualan/margin/%), BUKAN nota caveat — jurang data kekal satu baris pendek di hujung bahagian dengan butang Refresh yang tepat."
      : "Start your reply directly with `### 1) Performance summary` followed by headline numbers (sales/orders/spend + % changes) — NEVER open with a caveat, *(Note...)* line, or data-quality apology. Data gaps get one short line at the END of the section naming the exact fix button (e.g. Refresh daily cache on the Shop GMV tab).",
    `Modules in scope: ${modules.join(", ")}. Ignore anything outside scope.`,
    ms ? "Snapshot (cache Neon + WoW vs tempoh sebelumnya, mungkin basi — nyatakan jika bahagian error):"
      : "Snapshot (Neon cache + WoW vs previous period, may be stale — say so if a section errored):",
    JSON.stringify(snapshot).slice(0, 14000)
  );
  return head.join("\n");
}

// Models sometimes echo the prompt tail (guardrail line / JSON fragment)
// before the real answer — cut everything before the mandated heading.
function stripEcho(text: string): string {
  const a = text.indexOf("### 1)");
  if (a > 0 && a < 600) return text.slice(a);
  return text;
}

async function callGemini(prompt: string): Promise<{ markdown: string; model: string }> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) throw new Error("GEMINI_API_KEY is not set (local .env.local + Vercel env), ask owner to add it");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body as any)?.error?.message ?? `Gemini HTTP ${res.status}`;
      throw new Error(String(msg).slice(0, 300));
    }
    const parts = (body as any)?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: any) => String(p?.text ?? "")).join("").trim();
    if (!text) throw new Error("Gemini returned no text");
    return { markdown: stripEcho(text).slice(0, 6000), model };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAiInsight(modules: AiModule[], days: number, g: AiGuardrails, lang: AiLang = "en") {
  const key = `${modules.slice().sort().join("+")}|${days}|${g.minNetRoi}|${g.maxCpa}|${g.feeRate}|${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < AI_CACHE_TTL_MS) {
    return { ...hit, cached: true };
  }
  const snapshot = await buildSnapshot(modules, days);
  snapshot.guardrails = g;
  snapshot.lang = lang;
  const { markdown, model } = await callGemini(buildPrompt(snapshot, modules, g, lang));
  const entry: CacheEntry = { at: Date.now(), markdown, modules, days, model, lang };
  cache.set(key, entry);
  return { ...entry, cached: false, snapshot };
}

export async function chatAi(
  modules: AiModule[], days: number, g: AiGuardrails, history: ChatTurn[], message: string, lang: AiLang = "en"
) {
  const clean = history
    .filter((t) => (t.role === "user" || t.role === "ai") && typeof t.text === "string")
    .map((t) => ({ role: t.role, text: t.text.slice(0, 1000) }))
    .slice(-6);
  clean.push({ role: "user" as const, text: message.slice(0, 1000) });
  const snapshot = await buildSnapshot(modules, days);
  snapshot.guardrails = g;
  snapshot.lang = lang;
  const { markdown, model } = await callGemini(buildPrompt(snapshot, modules, g, lang, clean));
  return { markdown, model, at: Date.now() };
}
