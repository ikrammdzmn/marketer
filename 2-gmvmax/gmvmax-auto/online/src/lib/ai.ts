// lib/ai.ts — server-only AI snapshot + Gemini text insights (read-only).
// Never import this file from "use client" code (it pulls pg via db).
// Snapshot is Neon-cache-only: no live TikTok pulls, fast + under Hobby 60s.

import { query } from "@/lib/db";
import { SHOPS } from "@/lib/shops";
import { getAffiliateDigest } from "@/lib/affiliates";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { fetchManualSpend, getManualCampaigns } from "@/lib/gmv";

export const AI_MODULES = ["gmv", "ttam", "shop"] as const;
export type AiModule = (typeof AI_MODULES)[number];

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

type CacheEntry = { at: number; markdown: string; modules: AiModule[]; days: number; model: string };
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

export function parseModules(raw: unknown): AiModule[] {
  const list = String(raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AiModule => (AI_MODULES as readonly string[]).includes(s));
  const deduped = [...new Set(list)];
  return deduped.length > 0 ? deduped : [...AI_MODULES];
}

// ---- snapshot builders (each fail-open: missing table => note, never throw) ----

async function snapGmv(shopId: string, since: string, today: string) {
  const out: Record<string, unknown> = {};
  try {
    const c = await query(
      `SELECT campaign_id, name, account, status, delivery, budget, promotion_type
       FROM gmv.gmv_campaigns WHERE shop_id = $1 ORDER BY account, name LIMIT 40`,
      [shopId]
    );
    out.campaigns = c.rows.map((r: any) => ({
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
    const d = await query(
      `SELECT substr(hour_slot,1,10) AS d, SUM(cost) AS cost, SUM(gmv) AS gmv, SUM(orders) AS orders
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND substr(hour_slot,1,10) >= $2
       GROUP BY 1 ORDER BY 1`,
      [shopId, since]
    );
    out.daily = d.rows.map((r: any) => ({
      d: r.d,
      cost: r2(num(r.cost)),
      gmv: r2(num(r.gmv)),
      orders: num(r.orders),
      roi: num(r.cost) > 0 ? r2(num(r.gmv) / num(r.cost)) : 0,
    }));
  } catch (e) {
    out.dailyError = e instanceof Error ? e.message : "daily failed";
  }
  try {
    const t = await query(
      `SELECT campaign_id, SUM(cost) AS cost, SUM(gmv) AS gmv, SUM(orders) AS orders
       FROM gmv.hourly_campaign_metrics WHERE shop_id = $1 AND substr(hour_slot,1,10) >= $2
       GROUP BY 1 ORDER BY SUM(cost) DESC LIMIT 10`,
      [shopId, since]
    );
    out.topCampaigns = t.rows.map((r: any) => ({
      id: String(r.campaign_id),
      cost: r2(num(r.cost)),
      gmv: r2(num(r.gmv)),
      orders: num(r.orders),
      roi: num(r.cost) > 0 ? r2(num(r.gmv) / num(r.cost)) : 0,
    }));
  } catch (e) {
    out.topCampaignsError = e instanceof Error ? e.message : "top failed";
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
      [since]
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

async function snapTtam(since: string, endDate: string) {
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
  // Live adgroup-grain pull would multiply calls per campaign; campaign grain
  // (fetchManualSpend) already carries full TTAM metrics + v3 scores — enough
  // for verdicts. Capped top-8 by spend, fail-open to preset-only.
  try {
    const shop = SHOPS["1"];
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) throw new Error("no ads token");
    const manual = await fetchManualSpend(creds.access_token, shop.advertiserId, since, endDate);
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
    out.campaigns = (manual.rows as any[]).slice(0, 8).map((r) => ({
      id: String(r.campaign_id),
      name: (names.get(String(r.campaign_id))?.name ?? String(r.campaign_id)).slice(0, 60),
      status: names.get(String(r.campaign_id))?.status ?? null,
      spend: r2(num(r.spend)),
      scores: r.scores ? r2s(r.scores) : null,
      proxy: !r.metrics,
    }));
    out.campaignCount = manual.campaignCount;
    out.range = { start: since, end: endDate };
  } catch (e) {
    out.liveError = e instanceof Error ? e.message : "ttam live pull failed";
    out.note = "Live TTAM pull failed — preset metadata only; see /gmv-max TTAM drill.";
  }
  return out;
}

async function snapShop(since: string) {
  const out: Record<string, unknown> = {};
  try {
    const d = await query(
      `SELECT date, gmv, order_count, roas_after_tax, shop_order_gmv, shop_order_count,
              shop_cancelled_gmv, shop_cancelled_count
       FROM gmv.daily_shop_metrics WHERE shop_number = 1 AND date >= $1::date ORDER BY date`,
      [since]
    );
    out.daily = d.rows.map((r: any) => ({
      d: String(r.date).slice(0, 10),
      adsGmv: r2(num(r.gmv)),
      adsOrders: num(r.order_count),
      roasAfterTax: r2(num(r.roas_after_tax)),
      shopGmv: r2(num(r.shop_order_gmv)),
      shopOrders: num(r.shop_order_count),
      cancelledGmv: r2(num(r.shop_cancelled_gmv)),
    }));
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
  const since = daysAgoIso(Math.min(Math.max(days, 1), 14) - 1);
  const snapshot: Record<string, unknown> = {
    shop: shop?.name ?? "shop 1",
    currency: "MYR",
    tz: "Asia/Kuala_Lumpur",
    todayMYT: today,
    since,
    guardrails: null, // filled by caller (getAiInsight/chatAi) so prompts share one source
  };
  if (modules.includes("gmv")) snapshot.gmv = await snapGmv(shop?.shopId ?? "", since, today);
  if (modules.includes("ttam")) {
    // Closed data only: end yesterday so partial today never scores.
    const yesterday = daysAgoIso(1);
    snapshot.ttam = await snapTtam(since, since > yesterday ? since : yesterday);
  }
  if (modules.includes("shop")) snapshot.shop = await snapShop(since);
  return snapshot;
}

export type ChatTurn = { role: "user" | "ai"; text: string };

function buildPrompt(
  snapshot: Record<string, unknown>,
  modules: AiModule[],
  g: AiGuardrails,
  history?: ChatTurn[]
): string {
  const head = [
    "You are the GMV Max Online analyst for one Malaysia TikTok Shop (MYR, Asia/Kuala_Lumpur).",
    "TEXT-ONLY suggestions. Never output budget-update API calls or claim to have changed anything.",
    `Locked guardrails for this analysis: net ROI >= ${g.minNetRoi} (after seller fees), CPA <= RM${g.maxCpa}, fee rate ${g.feeRate}.`,
    `Metric math (do this explicitly): snapshot ROAS/ROI figures are GROSS (before fees). Net = gross x (1 - ${g.feeRate}). Compare NET against min net ROI; compare CPA directly against max CPA. When a verdict hinges on it, state both gross and net.`,
    "Choked state (high ROI + low spend) means suggest ROI/creative review, NOT +budget.",
    "Newest hourly slots are partial — decide off closed hours. Shop Live lags ~2d.",
  ];
  if (history && history.length > 0) {
    head.push(
      "Follow-up turn: answer the user's question using the same snapshot below. Keep it short markdown (<150 words) unless asked for detail. Restate which guardrail numbers you applied."
    );
    for (const t of history.slice(-6)) {
      head.push(`${t.role === "user" ? "User" : "You"}: ${t.text.slice(0, 1000)}`);
    }
  } else {
    head.push(
      "Reply in short markdown: 1) Verdict (1 line per module), 2) Why (bullets with numbers), 3) Suggested next checks (bullets, read-only actions). Keep under 250 words."
    );
  }
  head.push(
    "Start your reply directly with `### 1) Verdict`. Never repeat, quote, or continue the snapshot JSON or the guardrail line.",
    `Modules in scope: ${modules.join(", ")}. Ignore anything outside scope.`,
    "Snapshot (Neon cache, may be stale — say so if a section errored):",
    JSON.stringify(snapshot).slice(0, 12000)
  );
  return head.join("\n");
}

// Models sometimes echo the prompt tail (guardrail line / JSON fragment)
// before the real answer — cut everything before the mandated heading.
function stripEcho(text: string): string {
  const idx = text.indexOf("### 1)");
  if (idx > 0 && idx < 400) return text.slice(idx);
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

export async function getAiInsight(modules: AiModule[], days: number, g: AiGuardrails) {
  const key = `${modules.slice().sort().join("+")}|${days}|${g.minNetRoi}|${g.maxCpa}|${g.feeRate}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < AI_CACHE_TTL_MS) {
    return { ...hit, cached: true };
  }
  const snapshot = await buildSnapshot(modules, days);
  snapshot.guardrails = g;
  const { markdown, model } = await callGemini(buildPrompt(snapshot, modules, g));
  const entry: CacheEntry = { at: Date.now(), markdown, modules, days, model };
  cache.set(key, entry);
  return { ...entry, cached: false, snapshot };
}

export async function chatAi(
  modules: AiModule[], days: number, g: AiGuardrails, history: ChatTurn[], message: string
) {
  const clean = history
    .filter((t) => (t.role === "user" || t.role === "ai") && typeof t.text === "string")
    .map((t) => ({ role: t.role, text: t.text.slice(0, 1000) }))
    .slice(-6);
  clean.push({ role: "user" as const, text: message.slice(0, 1000) });
  const snapshot = await buildSnapshot(modules, days);
  snapshot.guardrails = g;
  const { markdown, model } = await callGemini(buildPrompt(snapshot, modules, g, clean));
  return { markdown, model, at: Date.now() };
}
