"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import DateRangePicker from "./DateRangePicker";
import { flagsForRow, verdictOf, SCORE_NAMES, bandsFromPreset, applyCustomScores } from "@/lib/ttam-scores";

const SHOPS = [
  { value: "1", label: "Him.DrSamhan" },
  { value: "2", label: "HIM CLINIC" },
  { value: "3", label: "Vigomax HQ" },
  { value: "4", label: "VigomaxPlus HQ" },
];

const METRICS = [
  { id: "total", name: "Total GMV Max" },
  { id: "LIVE_GMV_MAX", name: "LIVE GMV MAX (Marketing API)" },
  { id: "PRODUCT_GMV_MAX", name: "Product GMV Max (Marketing API)" },
  { id: "ttam", name: "TTAM (Manual, excl GMV)" },
  { id: "roas", name: "ROAS (Return on Ad Spend)" },
  { id: "hourly", name: "Hourly (per campaign, shop 1)" },
  { id: "hourly-shop", name: "Hourly shop (Shop API, shop 1)" },
  { id: "shop-gmv", name: "Shop GMV (Shop API, shop 1)" },
];

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function budgetModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case "BUDGET_MODE_DAY": return "daily";
    case "BUDGET_MODE_DYNAMIC_DAILY_BUDGET": return "avg daily";
    case "MIXED_DAILY": return "daily mix";
    case "BUDGET_MODE_TOTAL": return "lifetime";
    case "BUDGET_MODE_INFINITE": return "ad-group level";
    case "MIXED": return "mixed";
    default: return "";
  }
}

function BudgetValue({ row }: { row: any }) {
  const amount = Number(row?.budget);
  if (!Number.isFinite(amount) || amount <= 0) {
    return <span className="text-zinc-500">{row?.budgetMode === "MIXED" ? "Mixed" : row?.budgetMode === "BUDGET_MODE_INFINITE" && row?.budgetSource ? "Unlimited" : "—"}</span>;
  }
  const source = row?.budgetSource === "adgroups" ? " · groups total" : "";
  const mode = budgetModeLabel(row?.budgetMode);
  return (
    <span title={`${mode || "budget"}${source}`}>
      MYR {fmt(amount)}{mode ? <span className="ml-1 text-[10px] text-zinc-500">{mode}{source}</span> : null}
    </span>
  );
}

function BudgetUse({ value }: { value: number | null | undefined }) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? <span className="text-zinc-500">—</span>
    : <span>{Number(value).toFixed(1)}%</span>;
}

function klToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}
function klNowHour(): number {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", hour12: false })
    .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return Number(p.hour ?? 0) % 24;
}

const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";
const thCls = "text-left text-xs uppercase tracking-wide text-zinc-400 font-medium px-2 py-2";
const tdCls = "px-2 py-2";
const numCls = "px-2 py-2 text-right tabular-nums";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardCls}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Spin({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <span className={`inline-block animate-spin rounded-full border border-zinc-500 border-t-transparent align-middle ${className}`} />
  );
}

// Status ordering: ON first, unknown middle (never hide new spenders), OFF last.
const statusRank = (s: string | null | undefined) => (s === "ON" ? 0 : s === "OFF" ? 2 : 1);

// Preset-score columns. "~" = proxy inputs (plain 6s for focused views);
// EDS/ERRI are exact from API data, LQS is n/a until the 10s-live metric
// is confirmed.
const SCORE_COLS = ["EDS", "ERRI", "HPS", "ACS", "CES", "VVES", "RVS", "HRQ", "RES", "BCE", "LQS"] as const;
const EXACT_SCORES = ["EDS", "ERRI"];
function ScoreHeads({ vis, cols }: { vis: Set<string>; cols: string[] }) {
  return (<>
    <th className={`${thCls} text-right`}>Impr</th>
    {cols.filter((k) => vis.has(k)).map((k) => (
      <th key={k} title={SCORE_NAMES[k] ?? k} className={`${thCls} text-right`}>{k}{EXACT_SCORES.includes(k) ? "" : "~"}</th>
    ))}
  </>);
}
function ScoreCells({ r, vis, bands, cols, defs }: { r: any; vis: Set<string>; bands: any; cols: string[]; defs: any[] }) {
  const scores = applyCustomScores(r?.scores, r?.metrics, defs);
  const flags = flagsForRow(scores, vis, bands);
  return (<>
    <td className={numCls}>{r?.metrics ? Math.round(r.metrics.impressions ?? 0).toLocaleString() : "–"}</td>
    {cols.filter((k) => vis.has(k)).map((k) => {
      const v = scores?.[k];
      const txt = v === null || v === undefined || !Number.isFinite(v)
        ? "–"
        : k === "ACS" ? v.toFixed(4) : v.toFixed(2);
      const f = flags[k];
      const proxy = r?.sfvProxy && !EXACT_SCORES.includes(k);
      const color = txt === "–" ? "" : f === "KILL" ? " text-red-400" : f === "SCALE" ? " text-emerald-300" : " text-amber-200";
      return <td key={k} title={`${k}: ${f}`} className={`${numCls}${proxy ? " text-amber-200/80" : color}`}>{txt}</td>;
    })}
  </>);
}
function DeliveryPill({ delivery, spending }: { delivery: string; spending: boolean }) {
  // Spend proves delivery: a TikTok diagnostic flag on a spending campaign is
  // shown as grey info, never as a red alarm. Red ⛔ only when nothing spent.
  if (delivery === "Active") {
    return <span className="ml-1 rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">🟢 {delivery}</span>;
  }
  if (spending) {
    return <span title="TikTok reports this flag, but the campaign spent in this range — delivering." className="ml-1 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">{delivery}</span>;
  }
  return <span className="ml-1 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">⛔ {delivery}</span>;
}
function VerdictCell({ r, vis, bands, enough, learning, guard, defs }: { r: any; vis: Set<string>; bands: any; enough: boolean; learning: boolean; guard: any; defs: any[] }) {
  if (!enough || (r && !r.metrics)) {
    return <td className={tdCls}><span className="whitespace-nowrap rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">not enough data</span></td>;
  }
  if (learning) {
    const m = r?.metrics ?? {};
    const needSpend = Number(m.spend ?? 0) < Number(guard.min_spend ?? 30);
    const needImp = Number(m.impressions ?? 0) < Number(guard.min_impressions ?? 1000);
    const missing = needSpend && needImp ? "spend+imp" : needSpend ? "spend" : "imp";
    return <td className={tdCls}><span title={`needs RM${guard.min_spend} + ${guard.min_impressions} imp (now RM${fmt(Number(m.spend ?? 0))} / ${Math.round(Number(m.impressions ?? 0)).toLocaleString()})`} className="whitespace-nowrap rounded-full bg-sky-900 px-2 py-0.5 text-[10px] text-sky-200">LEARNING·{missing}</span></td>;
  }
  const { v, reason } = verdictOf(flagsForRow(applyCustomScores(r?.scores, r?.metrics, defs), vis, bands));
  const cls = v === "KILL" ? "bg-red-900 text-red-200" : v === "SCALE" ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200";
  return <td className={tdCls}><span title={reason} className={`rounded-full px-2 py-0.5 text-[10px] ${cls}`}>{v}</span></td>;
}

export default function Page() {
  const [shop, setShop] = useState("1");
  const [metric, setMetric] = useState("total");
  const [start, setStart] = useState(klToday());
  const [end, setEnd] = useState(klToday());
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [sessionsLoading, setSessionsLoading] = useState<string | null>(null);
  const [sessionsExpanded, setSessionsExpanded] = useState<Set<string>>(new Set());
  const [budgetRefreshing, setBudgetRefreshing] = useState<Set<string>>(new Set());
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null);
  const [shopToken, setShopToken] = useState<any>(null);
  const [shopTokenRefreshing, setShopTokenRefreshing] = useState(false);
  const [shopTokenNotice, setShopTokenNotice] = useState<string | null>(null);
  const [shopGmvMode, setShopGmvMode] = useState<"shop" | "ads">("shop");
  const [shopDailyRefreshing, setShopDailyRefreshing] = useState(false);
  const [hourPick, setHourPick] = useState<string | null>(null);
  const [hourSyncing, setHourSyncing] = useState(false);
  const [shopHourlyShowSpend, setShopHourlyShowSpend] = useState(true);
  const [shopHourlyRefreshing, setShopHourlyRefreshing] = useState(false);
  const [hourPickShop, setHourPickShop] = useState<string | null>(null);
  const [ttamExpanded, setTtamExpanded] = useState<Set<string>>(new Set());
  const [ttamAdgroups, setTtamAdgroups] = useState<Record<string, any>>({});
  const [ttamAgLoading, setTtamAgLoading] = useState<string | null>(null);
  const [adExpanded, setAdExpanded] = useState<Set<string>>(new Set());
  const [ttamAds, setTtamAds] = useState<Record<string, any>>({});
  const [ttamAdLoading, setTtamAdLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cooldown, setCooldown] = useState(0);
  const [visibleScores, setVisibleScores] = useState<Set<string>>(() => new Set(SCORE_COLS as unknown as string[]));
  const [verdictFilter, setVerdictFilter] = useState("ALL");
  const [ttamQuery, setTtamQuery] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [ttamPresets, setTtamPresets] = useState<any[]>([]);
  const [presetOverride, setPresetOverride] = useState<any>(null);

  async function pickPreset(key: string) {
    try {
      const r = await fetch(`/api/ttam-presets?key=${encodeURIComponent(key)}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "preset failed");
      const body = await r.json();
      const p = body.preset;
      setPresetOverride({ preset_key: p.preset_key, label: p.label, metrics: p.metrics ?? [], guardrails: p.guardrails ?? {}, notes: p.notes ?? "" });
      const enabled = (p.metrics ?? []).filter((m: any) => m?.enabled !== false && m?.short).map((m: any) => m.short);
      if (enabled.length) setVisibleScores(new Set(enabled));
    } catch (e) {
      setError(e instanceof Error ? e.message : "preset failed");
    }
  }

  // Verdicts need ≥3 days of data; shorter ranges still fetch scores.
  const daySpan = (() => {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 99;
    return Math.round((b - a) / 86400000) + 1;
  })();
  // Preset guardrails (DB) with hardcoded fallbacks. Override (picker)
  // wins over the fetch-time preset — no refetch needed (scores are
  // preset-independent; only flags/verdicts/guards recompute).
  const effPreset = presetOverride ?? data?.preset;
  const guard = {
    min_spend: Number(effPreset?.guardrails?.min_spend ?? 30),
    min_impressions: Number(effPreset?.guardrails?.min_impressions ?? 1000),
    min_days: Number(effPreset?.guardrails?.min_days ?? 3),
  };
  const enoughDays = daySpan >= guard.min_days;
  const bands = bandsFromPreset(effPreset);
  // Score columns come from the active preset (custom metrics included);
  // hardcoded 11 only when no preset arrived (fallback/error path).
  const presetMetrics: any[] = effPreset?.metrics ?? [];
  const cols = presetMetrics.length
    ? presetMetrics.map((m: any) => m.short).filter(Boolean)
    : [...SCORE_COLS];
  const colName = (k: string) =>
    presetMetrics.find((m: any) => m.short === k)?.name ?? SCORE_NAMES[k] ?? "";
  const isLearning = (r: any) => {
    const m = r?.metrics ?? { spend: r?.spend ?? 0, impressions: 0 };
    return (
      Number(m.spend ?? 0) < guard.min_spend ||
      Number(m.impressions ?? 0) < guard.min_impressions
    );
  };
  // Display verdict state for filtering: verdict, LEARNING, or NODATA.
  const rowState = (r: any) => {
    if (!enoughDays || !r?.metrics) return "NODATA";
    if (isLearning(r)) return "LEARNING";
    return verdictOf(flagsForRow(applyCustomScores(r?.scores, r?.metrics, presetMetrics), visibleScores, bands)).v;
  };

  // Cooldown ticker: 1s steps back to 0, re-enabling Fetch.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Status filter: ALL shows everything; ON keeps ON + unknown (explicit OFF
  // excluded); OFF shows explicit OFF only.
  const passStatus = (s: any) =>
    statusFilter === "ALL" ? true : statusFilter === "ON" ? s !== "OFF" : s === "OFF";
  const sortByStatus = (list: any[], money: (x: any) => number) =>
    [...list]
      .filter((x) => passStatus(x.status))
      .sort((a, b) => statusRank(a.status) - statusRank(b.status) || money(b) - money(a));
  const chartsRef = useRef<Chart[]>([]);
  const trendLiveRef = useRef<HTMLCanvasElement | null>(null);
  const trendProdRef = useRef<HTMLCanvasElement | null>(null);
  const barRef = useRef<HTMLCanvasElement | null>(null);
  const shopDailyRef = useRef<HTMLCanvasElement | null>(null);
  const shopChartsRef = useRef<Chart[]>([]);
  const shopHourlyRef = useRef<HTMLCanvasElement | null>(null);
  const shopHourlyChartsRef = useRef<Chart[]>([]);

  // Hourly graphs (shop-hourly style): per-type GMV bars + spend dashed
  // line + ROAS line, dual axis; top-12 bars follow the picked hour.
  useEffect(() => {
    chartsRef.current.forEach((c) => c.destroy());
    chartsRef.current = [];
    if (!data || data.kind !== "hourly") return;
    const asc: string[] = [...(data.slots ?? [])].reverse();
    const short = (s: string) => s.slice(11, 16);
    const sumBy = (slot: string, type: string, k: string) =>
      (data.rows ?? []).filter((r: any) => r.hour_slot === slot && r.promotion_type === type)
        .reduce((s: number, r: any) => s + Number(r[k] ?? 0), 0);
    const mk = (el: HTMLCanvasElement | null, cfg: any) => {
      if (!el) return;
      chartsRef.current.push(new Chart(el, cfg));
    };
    const grid = { color: "#27272a" };
    const axes: any = {
      x: { ticks: { color: "#999" }, grid },
      y: { ticks: { color: "#999" }, grid },
      y1: { position: "right", ticks: { color: "#999" }, grid: { drawOnChartArea: false } },
    };
    const trend = (el: HTMLCanvasElement | null, type: string, name: string) => {
      if (!el) return;
      const gmv = asc.map((s) => sumBy(s, type, "gmv"));
      const spend = asc.map((s) => sumBy(s, type, "cost"));
      const roas = asc.map((_, i) => (spend[i] > 0 ? gmv[i] / spend[i] : null));
      mk(el, {
        data: {
          labels: asc.map(short),
          datasets: [
            { type: "bar", label: `${name} GMV (RM)`, data: gmv, backgroundColor: "#6366f1", yAxisID: "y" },
            { type: "line", label: `${name} spend (RM)`, data: spend, borderColor: "#c084fc", borderDash: [6, 4], tension: 0.3, spanGaps: true, pointRadius: 2, yAxisID: "y" },
            { type: "line", label: `${name} ROAS (x)`, data: roas, borderColor: "#22c55e", tension: 0.3, spanGaps: true, pointRadius: 2, yAxisID: "y1" },
          ],
        },
        options: { responsive: true, plugins: { legend: { labels: { color: "#eee" } } }, scales: axes },
      });
    };
    trend(trendLiveRef.current, "LIVE_GMV_MAX", "LIVE");
    trend(trendProdRef.current, "PRODUCT_GMV_MAX", "Product");
    if (barRef.current && (data.slots ?? []).length > 0) {
      const slots: string[] = data.slots ?? [];
      const pickedSlot = hourPick && slots.includes(`${data.date} ${hourPick}:00`)
        ? `${data.date} ${hourPick}:00`
        : slots[0];
      const top = [...(data.rows ?? []).filter((r: any) => r.hour_slot === pickedSlot)]
        .sort((a: any, b: any) => Number(b.cost) - Number(a.cost)).slice(0, 12);
      mk(barRef.current, {
        type: "bar",
        data: {
          labels: top.map((r: any) => String(r.campaign_name ?? r.campaign_id).slice(0, 24)),
          datasets: [
            { label: `cost @ ${short(pickedSlot)}`, data: top.map((r: any) => Number(r.cost)), backgroundColor: "#60a5fa" },
            { label: `gmv @ ${short(pickedSlot)}`, data: top.map((r: any) => Number(r.gmv)), backgroundColor: "#4ade80" },
          ],
        },
        options: { plugins: { legend: { labels: { color: "#eee" } } }, scales: { x: { ticks: { color: "#999", maxRotation: 60, minRotation: 60 } }, y: { ticks: { color: "#999" } } } },
      });
    }
    return () => { chartsRef.current.forEach((c) => c.destroy()); chartsRef.current = []; };
  }, [data, hourPick]);

  // Shop GMV multi-day chart (shop-hourly style): GMV bars + spend dashed
  // line + ROAS line, dual axis. Toggle picks the numerator; ROAS is always
  // recomputed (gmv/spend), never averaged.
  useEffect(() => {
    shopChartsRef.current.forEach((c) => c.destroy());
    shopChartsRef.current = [];
    if (!data || data.kind !== "shop-gmv") return;
    if (!shopDailyRef.current) return;
    const daily: any[] = data.daily ?? [];
    if (daily.length < 2) return;
    const useShop = shopGmvMode === "shop";
    const labels = daily.map((d: any) => String(d.date).slice(5));
    const gmv = daily.map((d: any) => Number(useShop ? d.shopGmv : d.adsGmv) || 0);
    const spend = daily.map((d: any) => Number(d.spend) || 0);
    const roas = daily.map((d: any) => {
      const s = Number(d.spend) || 0;
      if (s <= 0) return null;
      return (Number(useShop ? d.shopGmv : d.adsGmv) || 0) / s;
    });
    const c = new Chart(shopDailyRef.current, {
      data: {
        labels,
        datasets: [
          { type: "bar", label: useShop ? "Shop GMV (RM)" : "Ads GMV (RM)", data: gmv, backgroundColor: "#6366f1", yAxisID: "y" },
          { type: "line", label: "Ad spend (RM)", data: spend, borderColor: "#c084fc", borderDash: [6, 4], tension: 0.3, spanGaps: true, yAxisID: "y" },
          { type: "line", label: "ROAS (x)", data: roas, borderColor: "#22c55e", tension: 0.3, spanGaps: true, yAxisID: "y1" },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#eee" } } },
        scales: {
          x: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
          y: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
          y1: { position: "right", ticks: { color: "#999" }, grid: { drawOnChartArea: false } },
        },
      },
    });
    shopChartsRef.current.push(c);
    return () => { c.destroy(); shopChartsRef.current = shopChartsRef.current.filter((x) => x !== c); };
  }, [data, shopGmvMode]);

  async function loadSessions(campaignId: string, force = false) {
    if (sessionsLoading === campaignId) return;
    if (!force && sessions[campaignId] && !sessions[campaignId].error) return;
    setSessionsLoading(campaignId);
    try {
      const q = `shopNumber=${shop}&campaignId=${campaignId}&startDate=${start}&endDate=${end}`;
      const r = await fetch(`/api/sessions?${q}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "sessions failed");
      const body = await r.json();
      setSessions((p) => ({ ...p, [campaignId]: body }));
    } catch (e) {
      setSessions((p) => ({ ...p, [campaignId]: { error: e instanceof Error ? e.message : "sessions failed" } }));
    } finally {
      setSessionsLoading(null);
    }
  }

  // A campaign counts as live-delivering when any of its rooms is ONGOING
  // right now (current TikTok state, not historical). Drives the 🟢 Active
  // pills on campaign + account rows.
  function campaignOngoing(campaignId: string): boolean {
    return ((sessions[campaignId]?.sessions ?? []) as any[]).some((s: any) => s.liveStatus === "ONGOING");
  }

  // Toggle per-campaign room rows directly beneath that campaign.
  // Opening loads sessions on demand (cached); background auto-checks for
  // pills never expand rows by themselves.
  function toggleSessions(campaignId: string) {
    if (sessionsExpanded.has(campaignId)) {
      setSessionsExpanded((p) => {
        const n = new Set(p);
        n.delete(campaignId);
        return n;
      });
      return;
    }
    setSessionsExpanded((p) => new Set(p).add(campaignId));
    void loadSessions(campaignId);
  }

  async function refreshGmvBudget(campaign: any, promotionType: string, shopNumber: string) {
    const key = `${shopNumber}:${promotionType}:${campaign.campaignId}`;
    if (budgetRefreshing.has(key)) return;
    setBudgetRefreshing((current) => new Set(current).add(key));
    setBudgetNotice(null);
    try {
      const response = await fetch("/api/gmv-max/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNumber, campaignId: campaign.campaignId, promotionType }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "budget refresh failed");

      setData((current: any) => {
        if (!current || current.kind !== "gmv") return current;
        let changed = false;
        const sections = (current.sections ?? []).map((section: any) => {
          if (section.key !== promotionType) return section;
          return {
            ...section,
            campaigns: (section.campaigns ?? []).map((row: any) => {
              if (row.campaignId !== campaign.campaignId) return row;
              changed = true;
              const mode = String(body.budgetMode ?? "BUDGET_MODE_DAY").toUpperCase();
              const dailyMode = mode === "BUDGET_MODE_DAY" || mode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET";
              return {
                ...row,
                budget: Number(body.budget),
                budgetMode: mode,
                budgetSource: "campaign",
                budgetUsagePct: current.oneDay && dailyMode && Number(body.budget) > 0
                  ? (Number(row.cost ?? 0) / Number(body.budget)) * 100
                  : null,
              };
            }),
          };
        });
        if (!changed) return current;
        const budgetRefreshRemaining = sections.reduce((total: number, section: any) =>
          total + (section.campaigns ?? []).filter((row: any) => row.status === "ON" && row.budget == null).length, 0);
        return { ...current, sections, budgetRefreshRemaining };
      });
      setBudgetNotice(`Budget refreshed for ${campaign.campaignName}.`);
    } catch (error) {
      setBudgetNotice(error instanceof Error ? error.message : "budget refresh failed");
    } finally {
      setBudgetRefreshing((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  async function loadTtamAdgroups(campaignId: string) {
    if (ttamAdgroups[campaignId] || ttamAgLoading === campaignId) return;
    setTtamAgLoading(campaignId);
    try {
      const q = `shopNumber=${shop}&campaignId=${campaignId}&startDate=${start}&endDate=${end}`;
      const r = await fetch(`/api/ttam-adgroups?${q}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "adgroups failed");
      const body = await r.json();
      setTtamAdgroups((p) => ({ ...p, [campaignId]: body }));
    } catch (e) {
      setTtamAdgroups((p) => ({ ...p, [campaignId]: { error: e instanceof Error ? e.message : "adgroups failed" } }));
    } finally {
      setTtamAgLoading(null);
    }
  }

  async function loadTtamAds(adgroupId: string) {
    if (ttamAds[adgroupId] || ttamAdLoading === adgroupId) return;
    setTtamAdLoading(adgroupId);
    try {
      const q = `shopNumber=${shop}&adgroupId=${adgroupId}&startDate=${start}&endDate=${end}`;
      const r = await fetch(`/api/ttam-ads?${q}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "ads failed");
      const body = await r.json();
      setTtamAds((p) => ({ ...p, [adgroupId]: body }));
    } catch (e) {
      setTtamAds((p) => ({ ...p, [adgroupId]: { error: e instanceof Error ? e.message : "ads failed" } }));
    } finally {
      setTtamAdLoading(null);
    }
  }

  async function refreshShopTokenAction() {
    if (shopTokenRefreshing) return;
    setShopTokenRefreshing(true);
    setShopTokenNotice(null);
    try {
      const r = await fetch("/api/shop-token", { method: "POST" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "token refresh failed");
      setShopToken((p: any) => ({ ...p, ...body, isAdmin: true }));
      setShopTokenNotice(
        body.seeded ? "Token stored in Neon and refreshed." : "Shop token refreshed."
      );
    } catch (e) {
      setShopTokenNotice(e instanceof Error ? e.message : "token refresh failed");
    } finally {
      setShopTokenRefreshing(false);
    }
  }

  // Hourly-shop chart (shop-hourly style): shop GMV bars + ads spend
  // dashed line (toggleable) + TRUE ROAS line, dual axis.
  useEffect(() => {
    shopHourlyChartsRef.current.forEach((c) => c.destroy());
    shopHourlyChartsRef.current = [];
    if (!data || data.kind !== "hourly-shop") return;
    if (!shopHourlyRef.current) return;
    const hours: any[] = (data.hours ?? []).filter((h: any) => !h.missing);
    if (!hours.length) return;
    const labels = hours.map((h: any) => h.hour);
    const gmv = hours.map((h: any) => Number(h.shopGmv ?? 0));
    const spend = hours.map((h: any) => Number(h.adSpend ?? 0));
    const roas = hours.map((h: any) => (h.trueRoas === null || h.trueRoas === undefined ? null : Number(h.trueRoas)));
    const datasets: any[] = [
      {
        type: "bar", label: "Shop GMV (RM)", data: gmv,
        backgroundColor: hours.map((h: any) => hourPickShop && h.hour === hourPickShop ? "#a5b4fc" : "#6366f1"),
        yAxisID: "y",
      },
    ];
    if (shopHourlyShowSpend) {
      datasets.push({ type: "line", label: "Ad spend (RM)", data: spend, borderColor: "#c084fc", borderDash: [6, 4], tension: 0.3, spanGaps: true, yAxisID: "y" });
    }
    datasets.push({ type: "line", label: "TRUE ROAS (x)", data: roas, borderColor: "#22c55e", tension: 0.3, spanGaps: true, yAxisID: "y1" });
    const c = new Chart(shopHourlyRef.current, {
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#eee" } } },
        scales: {
          x: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
          y: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
          y1: { position: "right", ticks: { color: "#999" }, grid: { drawOnChartArea: false } },
        },
      },
    });
    shopHourlyChartsRef.current.push(c);
    return () => { c.destroy(); shopHourlyChartsRef.current = shopHourlyChartsRef.current.filter((x) => x !== c); };
  }, [data, shopHourlyShowSpend, hourPickShop]);

  async function refreshShopHourlyAction() {
    if (shopHourlyRefreshing) return;
    setShopHourlyRefreshing(true);
    setBudgetNotice(null);
    try {
      const r = await fetch("/api/hourly-shop/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNumber: shop, date: end }),
      });
      const post = await r.json();
      if (!r.ok) throw new Error(post.error ?? "hourly shop refresh failed");
      const g = await fetch(`/api/hourly-shop?shopNumber=${shop}&date=${end}&startDate=${start}&endDate=${end}`);
      if (!g.ok) throw new Error((await g.json()).error ?? "fetch failed");
      setData({ kind: "hourly-shop", ...(await g.json()) });
      setHourPickShop(null);
      setFetchedAt(new Date().toISOString());
      const rf = post.refreshed ?? {};
      setBudgetNotice(
        `Shop hourly refreshed for ${end}: day MYR ${fmt(rf.dayTotal ?? 0)}` +
        (rf.tied ? " (tied)" : ` (untied Δ ${fmt(rf.diff ?? 0)}, ${rf.unparseable ?? 0} unparseable — check create_time)`) + "."
      );
    } catch (e) {
      setBudgetNotice(e instanceof Error ? e.message : "hourly shop refresh failed");
    } finally {
      setShopHourlyRefreshing(false);
    }
  }

  async function refreshShopDailyAction() {
    if (shopDailyRefreshing) return;
    setShopDailyRefreshing(true);
    setBudgetNotice(null);
    try {
      const r = await fetch("/api/shop-gmv/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNumber: shop, startDate: start, endDate: end }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "daily refresh failed");
      const g = await fetch(`/api/shop-gmv?shopNumber=${shop}&startDate=${start}&endDate=${end}`);
      if (!g.ok) throw new Error((await g.json()).error ?? "fetch failed");
      setData({ kind: "shop-gmv", ...(await g.json()) });
      setFetchedAt(new Date().toISOString());
      const fails = (body.failed ?? []).length;
      setBudgetNotice(
        `Daily cache refreshed: ${(body.refreshed ?? []).length} day(s)` +
        (fails > 0 ? `, ${fails} failed (old rows kept)` : "") + "."
      );
    } catch (e) {
      setBudgetNotice(e instanceof Error ? e.message : "daily refresh failed");
    } finally {
      setShopDailyRefreshing(false);
    }
  }

  async function syncHourlyAction() {
    if (hourSyncing) return;
    setHourSyncing(true);
    setBudgetNotice(null);
    try {
      const r = await fetch("/api/hourly/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNumber: shop, date: end }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "hourly sync failed");
      setData(body);
      setHourPick(null);
      setFetchedAt(new Date().toISOString());
      const g = await fetch(`/api/hourly?shopNumber=${shop}&date=${end}&startDate=${start}&endDate=${end}`);
      if (g.ok) {
        const range = await g.json();
        setData((cur: any) => ({ ...cur, scorecard: range.scorecard, startDate: range.startDate, endDate: range.endDate }));
      }
      setBudgetNotice(`Hourly synced for ${end}: slot ${body.synced?.slot ?? "?"} (${body.synced?.stored ?? 0} rows). Newest slot is partial.`);
    } catch (e) {
      setBudgetNotice(e instanceof Error ? e.message : "hourly sync failed");
    } finally {
      setHourSyncing(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    setError(null);
    setBudgetNotice(null);
    setExpanded(new Set());
    setSessions({});
    setSessionsExpanded(new Set());
    setTtamExpanded(new Set());
    setTtamAdgroups({});
    setAdExpanded(new Set());
    setTtamAds({});
    try {
      const q = `shopNumber=${shop}&startDate=${start}&endDate=${end}`;
      if (metric === "shop-gmv") {
        const r = await fetch(`/api/shop-gmv?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "shop-gmv", ...(await r.json()) });
        setFetchedAt(new Date().toISOString());
        try {
          const tr = await fetch(`/api/shop-token`);
          if (tr.ok) setShopToken(await tr.json());
        } catch {
          // token panel stays hidden; shop numbers still render
        }
        return;
      }
      if (metric === "hourly") {
        const r = await fetch(`/api/hourly?shopNumber=${shop}&date=${end}&startDate=${start}&endDate=${end}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "hourly", ...(await r.json()) });
        setHourPick(null);
        setFetchedAt(new Date().toISOString());
        return;
      }
      if (metric === "hourly-shop") {
        const r = await fetch(`/api/hourly-shop?shopNumber=${shop}&date=${end}&startDate=${start}&endDate=${end}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "hourly-shop", ...(await r.json()) });
        setHourPickShop(null);
        setFetchedAt(new Date().toISOString());
        return;
      }
      if (metric === "roas") {
        const r = await fetch(`/api/roas?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "roas", ...(await r.json()) });
        setFetchedAt(new Date().toISOString());
        return;
      }
      if (metric === "ttam") {
        const r = await fetch(`/api/roas?${q}&includeCampaignBudgets=1`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        const body = await r.json();
        setData({ kind: "ttam", ...body });
        // Toggles follow the active preset's enabled flags.
        const enabled = (body?.preset?.metrics ?? [])
          .filter((m: any) => m?.enabled !== false && m?.short)
          .map((m: any) => m.short);
        if (enabled.length) setVisibleScores(new Set(enabled));
        setPresetOverride(null);
        try {
          const pr = await fetch(`/api/ttam-presets`);
          if (pr.ok) setTtamPresets((await pr.json()).presets ?? []);
        } catch {
          // picker stays hidden; view still uses the fetched preset
        }
        setFetchedAt(new Date().toISOString());
        return;
      }
      const types = metric === "total" ? ["LIVE_GMV_MAX", "PRODUCT_GMV_MAX"] : [metric];
      const parts = [];
      for (const t of types) {
        const r = await fetch(`/api/gmv-max?${q}&promotion_type=${t}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        parts.push(await r.json());
      }
      const gmv = parts.reduce((s, p) => s + (p.gmv ?? 0), 0);
      const cost = parts.reduce((s, p) => s + (p.cost ?? 0), 0);
      const orders = parts.reduce((s, p) => s + (p.orderCount ?? 0), 0);
      const net = gmv * 0.75;
      setFetchedAt(new Date().toISOString());
      setData({
        kind: "gmv", shopNumber: shop, shopName: parts[0]?.shopName, gmv, cost,
        roi: cost > 0 ? gmv / cost : 0, net, net_roi: cost > 0 ? net / cost : 0,
        orders, currency: "MYR", oneDay: start === end,
        budgetRefreshRemaining: parts.reduce((s, p) => s + Number(p.budgetRefreshRemaining ?? 0), 0),
        sections: parts.map((p) => ({
          key: p.promotionType,
          title: p.promotionType === "LIVE_GMV_MAX" ? "LIVE GMV Max" : "Product GMV Max",
          accounts: p.accounts ?? [],
          campaigns: p.campaigns ?? [],
        })),
        live: parts.find((p) => p.promotionType === "LIVE_GMV_MAX"),
        product: parts.find((p) => p.promotionType === "PRODUCT_GMV_MAX"),
      });
      // Auto-check live rooms for ON LIVE campaigns (cap 5, silent fail-open)
      // so campaign/account pills can reflect 🟢 Active without extra clicks.
      // Prioritize ON + spending campaigns by spend desc so top-spend rows
      // like Dr.Samhan get checked first; fill leftovers with other ON rows.
      {
        const cands: { campaignId: string; cost: number }[] = [];
        for (const p of parts) {
          if (p.promotionType !== "LIVE_GMV_MAX") continue;
          for (const c of p.campaigns ?? []) {
            if (c.status === "ON" && c.campaignId && !cands.some((x) => x.campaignId === c.campaignId)) {
              cands.push({ campaignId: c.campaignId, cost: Number(c.cost ?? 0) });
            }
          }
        }
        cands.sort((a, b) => b.cost - a.cost);
        const ids = cands.slice(0, 5).map((x) => x.campaignId);
        // Force refresh because setSessions({}) is async and the closure may
      // still hold session rows from a previous range/fetch. Queue requests
      // sequentially to avoid hammering the Marketing API on the rate limit.
      void (async () => {
        for (const id of ids) await loadSessions(id, true);
      })();
      }
      setFetchedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
      setCooldown(15);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <h1 className="text-lg font-semibold">GMV Max Online</h1>
          <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">PROD</span>
          <span className="text-xs text-zinc-400">Neon prod · live TikTok API (lag 15m–2h)</span>
          {fetchedAt && <span className="ml-auto text-xs text-zinc-500">Fetched: {fetchedAt}</span>}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-3 px-4 pb-3">
          <label className="text-xs text-zinc-400">Shop
            <select value={shop} onChange={(e) => setShop(e.target.value)} className={`${inputCls} ml-2`}>
              {SHOPS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-400">Metric
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className={`${inputCls} ml-2 max-w-[240px]`}>
              {METRICS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <div className="text-xs text-zinc-400">Range<br />
            <button onClick={() => setCalOpen((v) => !v)} className={`${inputCls}`}>{start} – {end} 📅</button>
          </div>
          <label className="text-xs text-zinc-400">Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} ml-2`}>
              <option value="ALL">All</option>
              <option value="ON">ON (+ unknown)</option>
              <option value="OFF">OFF only</option>
            </select>
          </label>
          <button
            onClick={fetchData}
            disabled={loading || cooldown > 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >{loading ? (<span className="inline-flex items-center gap-2"><Spin className="h-4 w-4 border-white/60 border-t-transparent" />Fetching…</span>) : cooldown > 0 ? `Wait ${cooldown}s` : "Fetch Data"}</button>
        </div>
      </header>

      {calOpen && (
        <DateRangePicker
          from={start} to={end}
          onApply={(f, t) => { setStart(f); setEnd(t); setCalOpen(false); }}
          onClose={() => setCalOpen(false)}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        {error && <p className="mb-3 rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">Error: {error}</p>}
        {budgetNotice && <p role="status" className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{budgetNotice}</p>}

        {data && data.kind === "gmv" && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label={metric === "total" ? "Total GMV Max" : "GMV"} value={`MYR ${fmt(data.gmv)}`} sub={data.shopName} />
              <Kpi label="Total Cost" value={`MYR ${fmt(data.cost)}`} sub={`${data.orders} orders`} />
              <Kpi label="ROI (gross)" value={`${data.roi.toFixed(2)}x`} sub={`Net ${(data.net_roi ?? 0).toFixed(2)}x (fee 25%)`} />
              <Kpi
                label="Split"
                value={`L ${fmt(data.live?.gmv ?? 0)}`}
                sub={`P ${fmt(data.product?.gmv ?? 0)}`}
              />
            </div>
            {data.live && (
              <div className="mb-2 text-xs text-zinc-400">
                LIVE — MYR {fmt(data.live.gmv)} / {fmt(data.live.cost)} · Product — MYR {fmt(data.product?.gmv ?? 0)} / {fmt(data.product?.cost ?? 0)}
              </div>
            )}
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">Breakdown by Account (click a row to expand)</h3>
            <p className="mb-2 text-[11px] text-zinc-500">Campaign budget shows the current daily amount for ON campaigns. Account budget is the sum of ON campaigns only (OFF ignored); marked partial when an ON budget is still unknown. % used is shown only for one selected day (ON day spend / ON budget sum; historical budget changes are not tracked). Uncached budget lookups fill in batches of 15 as you fetch again.</p>
            {Number(data.budgetRefreshRemaining ?? 0) > 0 && (
              <p className="mb-2 text-[11px] text-amber-300">{data.budgetRefreshRemaining} active campaign budget(s) still need an API lookup. Fetch again to continue filling the cache.</p>
            )}
            {(data.sections ?? []).map((sec: any) => (
              <div key={sec.key} className="mb-4 overflow-hidden rounded-xl border border-zinc-800">
                <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">{sec.title}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-zinc-400"><th className={thCls}></th><th className={thCls}>Account</th><th className={`${thCls} text-right`}>Cost</th><th className={`${thCls} text-right`}>GMV</th><th className={`${thCls} text-right`}>Orders</th><th className={`${thCls} text-right`}>ROI</th><th className={`${thCls} text-right`}>Budget (MYR)</th><th className={`${thCls} text-right`} title="Shown only for a single-day selection; daily spend divided by current daily budget">% used</th></tr></thead>
                    <tbody>
                      {[...(sec.accounts ?? [])]
                        .map((a: any) => ({
                          a,
                          rows: sortByStatus(
                            (sec.campaigns ?? []).filter((c: any) => c.accountName === a.name),
                            (c: any) => Number(c.cost ?? 0)
                          ),
                        }))
                        .filter((x) => x.rows.length > 0)
                        .sort((x, y) =>
                          Math.min(...x.rows.map((c: any) => statusRank(c.status))) -
                          Math.min(...y.rows.map((c: any) => statusRank(c.status))) ||
                          Number(y.a.cost ?? 0) - Number(x.a.cost ?? 0)
                        )
                        .map(({ a, rows }: any) => {
                        const key = `${sec.key}:${a.name}`;
                        const open = expanded.has(key);
                        const onRows = rows.filter((c: any) => c.status === "ON");
                        const knownOn = onRows.filter((c: any) => Number(c.budget) > 0);
                        const accountBudget = knownOn.reduce((sum: number, c: any) => sum + Number(c.budget), 0);
                        const accountSpend = onRows.reduce((sum: number, c: any) => sum + Number(c.cost ?? 0), 0);
                        const accountPartial = onRows.length > 0 && knownOn.length < onRows.length;
                        const accountBudgetUse = start === end && accountBudget > 0
                          ? (accountSpend / accountBudget) * 100 : null;
                        return (
                          <>
                            <tr key={key} onClick={() => setExpanded((p) => {
                              const n = new Set(p);
                              if (n.has(key)) n.delete(key); else n.add(key);
                              return n;
                            })} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900">
                              <td className={tdCls}>{open ? "▾" : "▸"}</td>
                              <td className={tdCls}>{a.name}
                                {(() => {
                                  const hasON = rows.some((c: any) => c.status === "ON");
                                  const accountOngoing = rows.some((c: any) => campaignOngoing(c.campaignId));
                                  const dels = [...new Set(rows.map((c: any) => c.delivery).filter(Boolean))].filter(
                                    (d) => d !== "Identity in use" && d !== "Identity in use (live)"
                                  ) as string[];
                                  return (<>
                                    {hasON && (
                                      <span className="ml-2 rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">ON</span>
                                    )}
                                    {accountOngoing ? (
                                      <span title="a live room is ongoing now" className="ml-1 rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">🟢 Active</span>
                                    ) : (
                                      dels.map((d) => (
                                        <DeliveryPill key={d} delivery={d} spending={Number(a.cost ?? 0) > 0} />
                                      ))
                                    )}
                                  </>);
                                })()}
                              </td><td className={numCls}>{fmt(a.cost)}</td><td className={numCls}>{fmt(a.gmv)}</td><td className={numCls}>{a.orders}</td><td className={numCls}>{a.roi.toFixed(2)}</td>
                              <td className={numCls}>{onRows.length > 0 && accountBudget > 0 ? (<span><BudgetValue row={{ budget: accountBudget, budgetMode: "BUDGET_MODE_DAY" }} />{accountPartial ? <span className="ml-1 text-[10px] text-amber-300" title={`${onRows.length - knownOn.length} ON campaign(s) still need a budget lookup - Fetch again`}>partial</span> : null}</span>) : "—"}</td>
                              <td className={numCls}><BudgetUse value={accountBudgetUse} /></td>
                            </tr>
                            {open && rows.map((c: any) => (
                              <Fragment key={c.campaignId}>
                              <tr className="border-t border-zinc-800 bg-zinc-900/60">
                                <td className={tdCls}></td>
                                <td className={`${tdCls} text-xs`}>{c.campaignName} <span className="text-zinc-500">({c.campaignId})</span>
                                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${c.status === "ON" ? "bg-emerald-900 text-emerald-200" : c.status === "OFF" ? "bg-zinc-700 text-zinc-200" : "bg-amber-900 text-amber-200"}`}>{c.status ?? "?"}</span>
                                  {campaignOngoing(c.campaignId) ? (
                                    <span title="a live room is ongoing now" className="ml-1 rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">🟢 Active</span>
                                  ) : (
                                    c.delivery && (
                                      <DeliveryPill delivery={c.delivery} spending={Number(c.cost ?? 0) > 0} />
                                    )
                                  )}
                                  {sec.key === "LIVE_GMV_MAX" && (
                                  <button className="ml-2 rounded border border-zinc-700 px-1.5 text-[11px] hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); toggleSessions(c.campaignId); }}>
                                    {sessionsLoading === c.campaignId ? <Spin /> : sessionsExpanded.has(c.campaignId) ? "Hide" : "Sessions"}
                                  </button>
                                  )}
                                  {sec.key === "LIVE_GMV_MAX" && sessions[c.campaignId] && !sessions[c.campaignId].error && (
                                    <span className="text-zinc-500"> ({sessions[c.campaignId].sessions?.length ?? 0} rooms)</span>
                                  )}
                                  {sec.key === "LIVE_GMV_MAX" && sessions[c.campaignId]?.error && (
                                    <span className="text-red-400"> ({sessions[c.campaignId].error})</span>
                                  )}
                                </td>
                                <td className={numCls}>{fmt(c.cost)}</td><td className={numCls}>{fmt(c.gmv)}</td><td className={numCls}>{c.orders}</td><td className={numCls}>{c.roi.toFixed(2)}</td>
                                <td className={numCls}>
                                  <div className="flex flex-col items-end gap-1">
                                    <BudgetValue row={c} />
                                    {c.status === "ON" && (
                                      <button
                                        type="button"
                                        disabled={budgetRefreshing.has(`${data.shopNumber ?? shop}:${sec.key}:${c.campaignId}`)}
                                        onClick={(event) => { event.stopPropagation(); refreshGmvBudget(c, sec.key, data.shopNumber ?? shop); }}
                                        className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                      >{budgetRefreshing.has(`${data.shopNumber ?? shop}:${sec.key}:${c.campaignId}`) ? "Refreshing…" : "Refresh budget"}</button>
                                    )}
                                  </div>
                                </td>
                                <td className={numCls}><BudgetUse value={c.budgetUsagePct} /></td>
                              </tr>
                              {sessionsExpanded.has(c.campaignId) && (sessions[c.campaignId]?.sessions ?? []).map((s: any, i: number) => (
                              <tr key={`${c.campaignId}-s${i}`} className="border-t border-zinc-800 bg-black/40">
                                <td className={tdCls}></td>
                                <td className={`${tdCls} pl-7 text-[11px]`}>room {s.roomId || "(none)"} · {s.day}
                                  {s.liveStatus && (
                                    <span title={`${s.liveLaunchedMyt ?? ""}${s.liveDuration ? ` · ${s.liveDuration}` : ""}`} className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${s.liveStatus === "ONGOING" ? "bg-emerald-900 text-emerald-200" : "bg-zinc-700 text-zinc-300"}`}>
                                      {s.liveStatus === "ONGOING" ? "🟢 ONGOING" : "⚪ END"}
                                    </span>
                                  )}
                                </td>
                                <td className={numCls}>{fmt(s.cost)}</td><td className={numCls}>{fmt(s.gmv)}</td><td className={numCls}>{s.orders}</td><td className={numCls}>{Number(s.roi ?? 0).toFixed(2)}</td><td className={numCls}></td><td className={numCls}></td>
                              </tr>
                              ))}
                              </Fragment>
                            ))}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}

        {data && data.kind === "ttam" && (
          <>
          <div className={`${cardCls} mb-4 text-sm`}>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-zinc-400">Shop Name</div><div>{data.shopName}</div>
              <div className="text-zinc-400">Manual (TTAM) Spend ({data.manualCampaignCount})</div><div className="tabular-nums">MYR {fmt(data.manualCampaignSpend)}</div>
              <div className="text-zinc-400">GMV Max Cost</div><div className="tabular-nums">MYR {fmt(data.gmvMaxCost)}</div>
              <div className="text-zinc-400">Total Ads Spend</div><div className="tabular-nums">MYR {fmt(data.totalAdsSpend)}</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">Manual campaigns ({(data.manualCampaigns ?? []).length}) — click a row for adgroups</div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <span className="text-[11px] text-zinc-400">Scores:</span>
            {cols.map((k) => (
              <button key={k} title={colName(k)} onClick={() => setVisibleScores((p) => {
                const n = new Set(p);
                if (n.has(k)) n.delete(k); else n.add(k);
                return n;
              })} className={`rounded-full px-2 py-0.5 text-[10px] ${visibleScores.has(k) ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-500 line-through"}`}>{k} · {colName(k)}</button>
            ))}
            <span className="text-[11px] text-zinc-500">{effPreset?.label ?? "theory bands (fallback)"} · min RM{guard.min_spend}/{guard.min_impressions} imp/{guard.min_days}d</span>
            {ttamPresets.length > 1 && (
              <select value={effPreset?.preset_key ?? ""} onChange={(e) => pickPreset(e.target.value)} className={`${inputCls} text-[11px]`}>
                {ttamPresets.map((p: any) => (
                  <option key={p.preset_key} value={p.preset_key}>{p.label}{p.active ? " (active)" : ""}</option>
                ))}
              </select>
            )}
            <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} className={`${inputCls} ml-auto text-[11px]`}>
              <option value="ALL">All verdicts</option>
              <option value="SCALE">SCALE</option>
              <option value="WATCH">WATCH</option>
              <option value="KILL">KILL</option>
              <option value="LEARNING">LEARNING</option>
            </select>
            <input value={ttamQuery} onChange={(e) => setTtamQuery(e.target.value)} placeholder="Search name or ID…" className={`${inputCls} w-40 text-[11px]`} />
          </div>
            <p className="mb-2 px-3 text-[11px] text-zinc-500">Budget is shown at campaign level when set there, otherwise as the sum of compatible daily ad-group budgets. % used appears only for one-day selections (day spend ÷ current budget); lifetime, unlimited, or mixed modes show no percentage.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-zinc-400"><th className={thCls}></th><th className={thCls}>Campaign</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Spend</th><th className={`${thCls} text-right`}>Budget (MYR)</th><th className={`${thCls} text-right`} title="Shown only for a single-day selection and daily-style budgets">% used</th><th className={thCls}>Verdict</th><ScoreHeads vis={visibleScores} cols={cols} /></tr></thead>
                <tbody>
                  {(sortByStatus(data.manualCampaigns ?? [], (c: any) => Number(c.spend ?? 0)))
                    .filter((c: any) => verdictFilter === "ALL" || rowState(c) === verdictFilter)
                    .filter((c: any) => !ttamQuery.trim() || `${c.name ?? ""} ${c.campaign_id ?? ""}`.toLowerCase().includes(ttamQuery.trim().toLowerCase()))
                    .map((c: any) => {
                    const open = ttamExpanded.has(c.campaign_id);
                    const ag = ttamAdgroups[c.campaign_id];
                    const agList = ag?.adgroups ?? [];
                    return (
                      <>
                        <tr key={c.campaign_id} onClick={() => {
                          setTtamExpanded((p) => {
                            const n = new Set(p);
                            if (n.has(c.campaign_id)) n.delete(c.campaign_id);
                            else { n.add(c.campaign_id); loadTtamAdgroups(c.campaign_id); }
                            return n;
                          });
                        }} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900">
                          <td className={tdCls}>{open ? "▾" : "▸"}</td>
                          <td className={`${tdCls} text-xs`}>{c.name} <span className="text-zinc-500">({c.campaign_id})</span>
                            {ag && !ag.error && (
                              <span className="text-zinc-500"> ({agList.length} adgroups)</span>
                            )}
                            {ag?.error && (
                              <span className="text-red-400"> ({ag.error})</span>
                            )}
                            {ttamAgLoading === c.campaign_id && (
                              <span className="text-zinc-500"> (<Spin />)</span>
                            )}
                          </td>
                          <td className={tdCls}>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.status === "ON" ? "bg-emerald-900 text-emerald-200" : c.status === "OFF" ? "bg-zinc-700 text-zinc-200" : "bg-amber-900 text-amber-200"}`}>{c.status ?? "?"}</span>
                          </td>
                          <td className={numCls}>{fmt(c.spend)}</td>
                          <td className={numCls}><BudgetValue row={c} /></td>
                          <td className={numCls}><BudgetUse value={c.budgetUsagePct} /></td>
                          <VerdictCell r={c} vis={visibleScores} bands={bands} enough={enoughDays} learning={isLearning(c)} guard={guard} defs={presetMetrics} />
                          <ScoreCells r={c} vis={visibleScores} bands={bands} cols={cols} defs={presetMetrics} />
                        </tr>
                        {open && sortByStatus(agList, (g: any) => Number(g.spend ?? 0)).filter((g: any) => verdictFilter === "ALL" || rowState(g) === verdictFilter).map((g: any) => {
                          const gOpen = adExpanded.has(g.adgroup_id);
                          const ad = ttamAds[g.adgroup_id];
                          const adList = ad?.ads ?? [];
                          return (
                            <>
                              <tr key={g.adgroup_id} onClick={(e) => {
                                e.stopPropagation();
                                setAdExpanded((p) => {
                                  const n = new Set(p);
                                  if (n.has(g.adgroup_id)) n.delete(g.adgroup_id);
                                  else { n.add(g.adgroup_id); loadTtamAds(g.adgroup_id); }
                                  return n;
                                });
                              }} className="cursor-pointer border-t border-zinc-800 bg-zinc-900/60">
                                <td className={tdCls}></td>
                                <td className={`${tdCls} pl-6 text-xs`}>{gOpen ? "▾" : "▸"} {g.name} <span className="text-zinc-500">({g.adgroup_id})</span>
                                  {ad && !ad.error && (
                                    <span className="text-zinc-500"> ({adList.length} ads)</span>
                                  )}
                                  {ad?.error && (
                                    <span className="text-red-400"> ({ad.error})</span>
                                  )}
                                  {ttamAdLoading === g.adgroup_id && (
                                    <span className="text-zinc-500"> (<Spin />)</span>
                                  )}
                                </td>
                                <td className={tdCls}>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${g.status === "ON" ? "bg-emerald-900 text-emerald-200" : g.status === "OFF" ? "bg-zinc-700 text-zinc-200" : "bg-amber-900 text-amber-200"}`}>{g.status ?? "?"}</span>
                                </td>
                                <td className={numCls}>{fmt(g.spend)}</td>
                                <td className={numCls}><BudgetValue row={{ ...g, budgetSource: "adgroups" }} /></td>
                                <td className={numCls}><BudgetUse value={g.budgetUsagePct} /></td>
                                <VerdictCell r={g} vis={visibleScores} bands={bands} enough={enoughDays} learning={isLearning(g)} guard={guard} defs={presetMetrics} />
                                <ScoreCells r={g} vis={visibleScores} bands={bands} cols={cols} defs={presetMetrics} />
                              </tr>
                              {gOpen && sortByStatus(adList, (a: any) => Number(a.spend ?? 0)).filter((a: any) => verdictFilter === "ALL" || rowState(a) === verdictFilter).map((a: any) => (
                                <tr key={a.ad_id} className="border-t border-zinc-800 bg-black/40">
                                  <td className={tdCls}></td>
                                  <td className={`${tdCls} pl-12 text-[11px]`}>{a.name} <span className="text-zinc-500">({a.ad_id})</span></td>
                                  <td className={tdCls}>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === "ON" ? "bg-emerald-900 text-emerald-200" : a.status === "OFF" ? "bg-zinc-700 text-zinc-200" : "bg-amber-900 text-amber-200"}`}>{a.status ?? "?"}</span>
                                  </td>
                                  <td className={numCls}>{fmt(a.spend)}</td>
                                  <td className={numCls}></td><td className={numCls}></td>
                                  <VerdictCell r={a} vis={visibleScores} bands={bands} enough={enoughDays} learning={isLearning(a)} guard={guard} defs={presetMetrics} />
                                  <ScoreCells r={a} vis={visibleScores} bands={bands} cols={cols} defs={presetMetrics} />
                                </tr>
                              ))}
                            </>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">~ = proxy (plain-6s for 6s focused views — spec warns this may double-count; live_effective_views presumed as 10s-live, pending xlsx cross-check) · EDS/ERRI exact from API · flags + verdict on the active preset (provisional — recalibrate from TTAM quartiles) · under-minimum rows show LEARNING, short ranges show scores only.</p>
          </>
        )}

        {data && (data.kind === "hourly") && (
          <>
            <p className="mb-3 text-xs text-zinc-400">
              Hour slots are real-time MYT (newest slot partial — intraday numbers revise). % shows only when prev hour spend ≥ RM50 / gmv ≥ RM200, else absolute-only.
              {hourSyncing ? " Syncing live…" : ""}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={hourSyncing}
                onClick={syncHourlyAction}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-900 disabled:opacity-50"
              >{hourSyncing ? "Syncing…" : `Sync ${end} now`}</button>
              <span className="text-xs text-zinc-500">Live TikTok pull, Telegram silent. Empty today? Sync, then charts fill.</span>
            </div>
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <div className={cardCls}><h4 className="mb-2 text-sm font-medium">LIVE trend (gmv, spend & roas)</h4><canvas ref={trendLiveRef} /></div>
              <div className={cardCls}><h4 className="mb-2 text-sm font-medium">Product trend (gmv, spend & roas)</h4><canvas ref={trendProdRef} /></div>
            </div>
            {(() => {
              const slots: string[] = data.slots ?? [];
              const present = new Set(slots.map((s: string) => s.slice(11, 16)));
              const isToday = data.date === klToday();
              const nowH = klNowHour();
              const latest = slots.length > 0 ? slots[0].slice(11, 16) : null;
              const picked = hourPick && present.has(hourPick) ? hourPick : latest;
              const pickedSlot = picked ? `${data.date} ${picked}:00` : null;
              const prevSlot = pickedSlot ? slots[slots.indexOf(pickedSlot) + 1] : null;
              const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
              const prev = prevSlot ? (data.rows ?? []).filter((r: any) => r.hour_slot === prevSlot) : [];
              const pmap = new Map(prev.map((r: any) => [r.campaign_id, r]));
              const rows = pickedSlot ? sortByStatus(
                (data.rows ?? []).filter((r: any) => r.hour_slot === pickedSlot),
                (r: any) => Number(r.cost ?? 0)
              ) : [];
              const score: any[] = data.scorecard ?? [];
              const golden = new Set([...score].sort((a: any, b: any) => Number(b.avgGmv ?? 0) - Number(a.avgGmv ?? 0)).slice(0, 5).map((d: any) => d.hour));
              const tagOf = (d: any) =>
                Number(d.avgOrders ?? 0) < 2 ? "DEAD" : golden.has(d.hour) ? "GOLDEN" : (d.cpa !== null && d.cpa !== undefined && Number(d.cpa) > 50) ? "WATCH" : "–";
              const multiDay = (data.startDate ?? data.date) !== (data.endDate ?? data.date);
              return (<>
                <div className={`${cardCls} mb-3`}>
                  <h4 className="mb-2 text-sm font-medium">Hour picker ({data.date})</h4>
                  <div className="flex flex-wrap gap-1">
                    {hours.map((h) => {
                      const has = present.has(h);
                      const future = isToday && parseInt(h.slice(0, 2), 10) > nowH;
                      const disabled = !has || future;
                      const active = picked === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={disabled}
                          onClick={() => setHourPick(h)}
                          title={future ? "future hour" : has ? h : "no data"}
                          className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${active ? "bg-zinc-100 text-zinc-900" : disabled ? "bg-zinc-900 text-zinc-600" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
                        >{h.slice(0, 2)}</button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">Grey = {isToday ? "future hour or" : ""} no stored slot. Bars + table below follow the pick{picked ? ` (${picked})` : ""}.</p>
                </div>
                <div className={`${cardCls} mb-4`}><h4 className="mb-2 text-sm font-medium">Slot bars (top 12 by cost{picked ? ` @ ${picked}` : ""})</h4><canvas ref={barRef} /></div>
                <div className={`${cardCls} mb-4`}>
                  <h4 className="mb-1 text-sm font-medium">Hour scorecard (across {multiDay ? `${data.startDate} – ${data.endDate}` : data.date}, missing excluded)</h4>
                  <p className="mb-2 text-[11px] text-amber-200/70">DEAD = &lt;2 orders/day · GOLDEN = top-5 avg GMV · WATCH = CPA &gt;RM50. Spend here is real ad cost (not allocated shape).{multiDay ? "" : " Single day — averages use n=1."}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-zinc-400"><th className={thCls}>Hour</th><th className={`${thCls} text-right`}>Days</th><th className={`${thCls} text-right`}>Avg GMV</th><th className={`${thCls} text-right`}>Avg orders</th><th className={`${thCls} text-right`}>ROAS</th><th className={`${thCls} text-right`}>CPA</th><th className={thCls}>Tag</th></tr></thead>
                      <tbody>
                        {score.length === 0 && <tr><td className={`${tdCls} text-zinc-500`} colSpan={7}>No scorecard rows — sync the range first.</td></tr>}
                        {score.map((d: any) => {
                          const t = tagOf(d);
                          return (
                            <tr key={d.hour} className={`border-t border-zinc-800 hover:bg-zinc-900 ${picked === d.hour ? "bg-zinc-900" : ""}`}>
                              <td className={tdCls}>{d.hour}</td>
                              <td className={numCls}>{d.days}</td>
                              <td className={numCls}>{fmt(d.avgGmv)}</td>
                              <td className={numCls}>{Number(d.avgOrders ?? 0).toFixed(1)}</td>
                              <td className={numCls}>{d.roas === null || d.roas === undefined ? "n/a" : `${Number(d.roas).toFixed(2)}x`}</td>
                              <td className={numCls}>{d.cpa === null || d.cpa === undefined ? "n/a" : fmt(d.cpa)}</td>
                              <td className={tdCls}><span className={`rounded-full px-2 py-0.5 text-[10px] ${t === "GOLDEN" ? "bg-emerald-900 text-emerald-200" : t === "WATCH" ? "bg-amber-900 text-amber-200" : t === "DEAD" ? "bg-zinc-700 text-zinc-300" : "text-zinc-500"}`}>{t}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mb-4 overflow-hidden rounded-xl border border-zinc-800">
                  <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">{pickedSlot ?? "—"} vs {prevSlot ?? "—"}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-zinc-400"><th className={thCls}>Campaign</th><th className={thCls}>Type</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Cost (Δ, %)</th><th className={`${thCls} text-right`}>GMV (Δ, %)</th><th className={`${thCls} text-right`}>Orders (Δ)</th></tr></thead>
                      <tbody>
                        {rows.map((r: any) => {
                          const p = pmap.get(r.campaign_id) as any;
                          const dc = p ? r.cost - p.cost : 0;
                          const dg = p ? r.gmv - p.gmv : 0;
                          const dor = p ? r.orders - p.orders : 0;
                          const pc = p && p.cost >= 50 && Number(p.cost) !== 0 ? `${(dc / p.cost * 100).toFixed(1)}%` : "n/a";
                          const pg = p && p.gmv >= 200 && Number(p.gmv) !== 0 ? `${(dg / p.gmv * 100).toFixed(1)}%` : "n/a";
                          return (
                            <tr key={r.campaign_id} className="border-t border-zinc-800 hover:bg-zinc-900">
                              <td className={`${tdCls} text-xs`}>{r.campaign_name ?? r.campaign_id}</td>
                              <td className={tdCls}>{r.promotion_type === "LIVE_GMV_MAX" ? "LIVE" : "Product"}</td>
                              <td className={tdCls}>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "ON" ? "bg-emerald-900 text-emerald-200" : r.status === "OFF" ? "bg-zinc-700 text-zinc-200" : "bg-amber-900 text-amber-200"}`}>{r.status ?? "?"}</span>
                              </td>
                              <td className={numCls}>{fmt(r.cost)} ({dc >= 0 ? "+" : ""}{fmt(dc)}, {pc})</td>
                              <td className={numCls}>{fmt(r.gmv)} ({dg >= 0 ? "+" : ""}{fmt(dg)}, {pg})</td>
                              <td className={numCls}>{r.orders} ({dor >= 0 ? "+" : ""}{dor})</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>);
            })()}
          </>
        )}

        {data && data.kind === "hourly-shop" && (
          <>
            <p className="mb-3 text-xs text-zinc-400">
              Shop-order GMV by MYT create hour (day-pull bucketed, CANCELLED/REFUNDED excluded) + cached ads spend by hour. TRUE ROAS = shop gmv / ads spend, recomputed. Blank = future hour.
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShopHourlyShowSpend((v) => !v)}
                className={`rounded-full px-2.5 py-0.5 text-xs ${shopHourlyShowSpend ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"}`}
              >{shopHourlyShowSpend ? "Spend: on" : "Spend: off"}</button>
              <button
                type="button"
                disabled={shopHourlyRefreshing}
                onClick={refreshShopHourlyAction}
                className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              >{shopHourlyRefreshing ? "Refreshing…" : `Refresh ${end}`}</button>
              {(data.cachedHours ?? 0) === 0 && <span className="text-xs text-zinc-500">Cache empty — press Refresh (pulls the day live, then buckets).</span>}
              {(data.updatedAt) && <span className="text-xs text-zinc-500">Cached {String(data.updatedAt).slice(0, 16).replace("T", " ")}</span>}
            </div>
            <div className={`${cardCls} mb-3`}><h4 className="mb-2 text-sm font-medium">Performance Over Time ({data.date})</h4><canvas ref={shopHourlyRef} /></div>
            {(() => {
              const score: any[] = data.scorecard ?? [];
              const rangeDays: number = data.rangeDays ?? 0;
              const golden = new Set([...score].sort((a: any, b: any) => Number(b.avgGmv ?? 0) - Number(a.avgGmv ?? 0)).slice(0, 5).map((d: any) => d.hour));
              const tagOf = (d: any) =>
                Number(d.avgOrders ?? 0) < 2 ? "DEAD" : golden.has(d.hour) ? "GOLDEN" : (d.cpa !== null && d.cpa !== undefined && Number(d.cpa) > 50) ? "WATCH" : "–";
              const ready = rangeDays >= 3;
              return (
                <div className={`${cardCls} mb-3`}>
                  <h4 className="mb-1 text-sm font-medium">Hour scorecard ({data.startDate ?? data.date} – {data.endDate ?? data.date}, missing excluded)</h4>
                  {!ready ? (
                    <p className="text-xs text-zinc-500">Need {3 - rangeDays} more cached day(s) for tags (have {rangeDays}) — Refresh more days first. Tags on thin history mislead.</p>
                  ) : (
                    <>
                      <p className="mb-2 text-[11px] text-amber-200/70">DEAD = &lt;2 orders/day · GOLDEN = top-5 avg GMV · WATCH = CPA &gt;RM50. Spend is real ad cost.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-zinc-400"><th className={thCls}>Hour</th><th className={`${thCls} text-right`}>Days</th><th className={`${thCls} text-right`}>Avg GMV</th><th className={`${thCls} text-right`}>Avg orders</th><th className={`${thCls} text-right`}>ROAS</th><th className={`${thCls} text-right`}>CPA</th><th className={thCls}>Tag</th></tr></thead>
                          <tbody>
                            {score.map((d: any) => {
                              const t = tagOf(d);
                              return (
                                <tr key={d.hour} className={`border-t border-zinc-800 hover:bg-zinc-900 ${hourPickShop === d.hour ? "bg-zinc-900" : ""}`}>
                                  <td className={tdCls}>{d.hour}</td>
                                  <td className={numCls}>{d.days}</td>
                                  <td className={numCls}>{fmt(d.avgGmv)}</td>
                                  <td className={numCls}>{Number(d.avgOrders ?? 0).toFixed(1)}</td>
                                  <td className={numCls}>{d.roas === null || d.roas === undefined ? "n/a" : `${Number(d.roas).toFixed(2)}x`}</td>
                                  <td className={numCls}>{d.cpa === null || d.cpa === undefined ? "n/a" : fmt(d.cpa)}</td>
                                  <td className={tdCls}><span className={`rounded-full px-2 py-0.5 text-[10px] ${t === "GOLDEN" ? "bg-emerald-900 text-emerald-200" : t === "WATCH" ? "bg-amber-900 text-amber-200" : t === "DEAD" ? "bg-zinc-700 text-zinc-300" : "text-zinc-500"}`}>{t}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <div className={`${cardCls} mb-3`}>
              <h4 className="mb-2 text-sm font-medium">Hour picker ({data.date})</h4>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setHourPickShop(null)}
                  className={`rounded px-1.5 py-0.5 text-xs ${hourPickShop === null ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-200"}`}
                >All</button>
                {(data.hours ?? []).map((h: any) => (
                  <button
                    key={h.hour}
                    type="button"
                    disabled={h.missing}
                    onClick={() => setHourPickShop(h.hour)}
                    title={h.missing ? "future hour" : h.hour}
                    className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${hourPickShop === h.hour ? "bg-zinc-100 text-zinc-900" : h.missing ? "bg-zinc-900 text-zinc-600" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
                  >{h.hour.slice(0, 2)}</button>
                ))}
              </div>
            </div>
            <div className={`${cardCls} mb-4`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-zinc-400"><th className={thCls}>Hour</th><th className={`${thCls} text-right`}>Shop GMV</th><th className={`${thCls} text-right`}>Orders</th><th className={`${thCls} text-right`}>Ad spend</th><th className={`${thCls} text-right`}>TRUE ROAS</th></tr></thead>
                  <tbody>
                    {(data.hours ?? []).filter((h: any) => hourPickShop === null || h.hour === hourPickShop).map((h: any) => (
                      <tr key={h.hour} className={`border-t border-zinc-800 ${h.missing ? "text-zinc-600" : "hover:bg-zinc-900"}`}>
                        <td className={tdCls}>{h.hour}{h.missing ? " · future" : ""}</td>
                        <td className={numCls}>{h.missing ? "—" : fmt(h.shopGmv)}</td>
                        <td className={numCls}>{h.missing ? "—" : h.shopOrders}</td>
                        <td className={numCls}>{h.missing ? "—" : fmt(h.adSpend)}</td>
                        <td className={numCls}>{h.missing || h.trueRoas === null || h.trueRoas === undefined ? "n/a" : `${Number(h.trueRoas).toFixed(2)}x`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {data && data.kind === "shop-gmv" && (
          <>
          <div className={`${cardCls} text-sm`}>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-zinc-400">Shop Name</div><div>{data.shopName}</div>
              {!data.configured ? (
                <>
                  <div className="text-zinc-400">Not configured</div><div className="text-xs">{data.hint}</div>
                  <div className="text-zinc-400">Locked ref 24–27 Sep (manual)</div><div className="text-xs">Shop MYR 143,941.26 / 1,016 orders vs ads 169,805.12 (−15.2%); TRUE ROAS 3.26x / 2.81x</div>
                </>
              ) : (
                <>
                  <div className="text-zinc-400">Shop-order GMV ({data.shopOrderCount})</div><div className="tabular-nums">MYR {fmt(data.shopOrderGMV)}</div>
                  <div className="text-zinc-400">Ads-attributed GMV ({data.adsOrderCount})</div><div className="tabular-nums">MYR {fmt(data.adsGMV)}</div>
                  <div className="text-zinc-400">Delta vs ads</div><div>{(data.deltaVsAds * 100).toFixed(1)}%</div>
                  <div className="text-zinc-400">Total Ads Spend</div><div className="tabular-nums">MYR {fmt(data.totalAdsSpend)}</div>
                  <div className="text-zinc-400">TRUE ROAS</div><div>{data.trueRoas.toFixed(2)}x</div>
                  <div className="text-zinc-400">TRUE ACTUAL</div><div>{data.trueActualRoas.toFixed(2)}x</div>
                  <div className="text-zinc-400">Ads ROAS (ref)</div><div>{data.adsRoas.toFixed(2)}x / {data.adsActualRoas.toFixed(2)}x</div>
                  {shopToken?.isAdmin && (
                    <>
                      <div className="text-zinc-400">Shop token</div>
                      <div className="text-xs">
                        {shopToken.accessExpiresAt
                          ? `valid until ${String(shopToken.accessExpiresAt).slice(0, 10)}`
                          : shopToken.hasRow === false
                            ? "env fallback (not yet in Neon)"
                            : "expiry unknown"}
                        <button
                          type="button"
                          disabled={shopTokenRefreshing}
                          onClick={refreshShopTokenAction}
                          className="ml-2 rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                        >{shopTokenRefreshing ? "Refreshing…" : "Refresh shop token"}</button>
                        {shopTokenNotice && <div className="mt-1 text-zinc-400">{shopTokenNotice}</div>}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {data.configured && (data.dateRange?.start !== data.dateRange?.end || (data.daily ?? []).length > 0) && (
            <div className={`${cardCls} mt-3`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-medium">Performance Over Time</h4>
                <span className="text-xs text-zinc-500">Daily GMV, Ad Spend & ROAS {(data.daily ?? []).length > 1 ? `(${(data.daily ?? []).length} days, cache)` : "(cache empty — refresh below)"}</span>
                <span className="ml-auto inline-flex gap-1 text-xs">
                  {(["shop", "ads"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setShopGmvMode(m)}
                      className={`rounded-full px-2.5 py-0.5 ${shopGmvMode === m ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"}`}
                    >{m === "shop" ? "Shop truth" : "Ads attributed"}</button>
                  ))}
                  <button
                    type="button"
                    disabled={shopDailyRefreshing}
                    onClick={refreshShopDailyAction}
                    className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >{shopDailyRefreshing ? "Refreshing…" : "Refresh daily cache"}</button>
                </span>
              </div>
              {(data.daily ?? []).length >= 2 ? (
                <canvas ref={shopDailyRef} />
              ) : (
                <p className="text-xs text-zinc-500">Cache empty for this range — press Refresh daily cache above (re-pulls each day live, ≤31 days).</p>
              )}
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-zinc-400"><th className={thCls}>Date</th><th className={`${thCls} text-right`}>GMV</th><th className={`${thCls} text-right`}>Ad spend</th><th className={`${thCls} text-right`}>ROAS</th><th className={`${thCls} text-right`}>Orders</th></tr></thead>
                  <tbody>
                    {(data.daily ?? []).map((d: any) => {
                      const useShop = shopGmvMode === "shop";
                      const g = Number(useShop ? d.shopGmv : d.adsGmv) || 0;
                      const s = Number(d.spend) || 0;
                      const r = useShop ? d.shopRoas : d.adsRoas;
                      const o = useShop ? d.shopOrders : d.adsOrders;
                      return (
                        <tr key={d.date} className="border-t border-zinc-800">
                          <td className={tdCls}>{d.date}</td>
                          <td className={numCls}>{fmt(g)}</td>
                          <td className={numCls}>{fmt(s)}</td>
                          <td className={numCls}>{r === null || r === undefined ? "n/a" : `${Number(r).toFixed(2)}x`}</td>
                          <td className={numCls}>{o}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Cache rows; Refresh re-pulls the range live (≤31 days). ROAS recomputed per day, never averaged.</p>
            </div>
          )}
          </>
        )}

      {data && data.kind === "roas" && (
          <div className={`${cardCls} text-sm`}>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-zinc-400">Shop Name</div><div>{data.shopName}</div>
              <div className="text-zinc-400">GMV (attributed)</div><div className="tabular-nums">MYR {fmt(data.gmv)}</div>
              <div className="text-zinc-400">Live GMV Max Cost</div><div className="tabular-nums">MYR {fmt(data.liveGMVMaxCost)}</div>
              <div className="text-zinc-400">Product GMV Max Cost</div><div className="tabular-nums">MYR {fmt(data.productGMVMaxCost)}</div>
              <div className="text-zinc-400">Manual (TTAM) Spend ({data.manualCampaignCount})</div><div className="tabular-nums">MYR {fmt(data.manualCampaignSpend)}</div>
              <div className="text-zinc-400">Total Ads Spend</div><div className="tabular-nums">MYR {fmt(data.totalAdsSpend)}</div>
              <div className="text-zinc-400">Total with SST+WHT</div><div className="tabular-nums">MYR {fmt(data.totalCostWithTaxes)}</div>
              <div className="text-zinc-400">ROAS</div><div>{data.roas.toFixed(2)}x</div>
              <div className="text-zinc-400">ACTUAL ROAS</div><div>{data.actualRoas.toFixed(2)}x</div>
              {data.shopTruthRef && (
                <>
                  <div className="text-zinc-400">Shop-truth ref ({data.shopTruthRef.start}–{data.shopTruthRef.end})</div><div className="tabular-nums">MYR {fmt(data.shopTruthRef.shopGMV)} / {data.shopTruthRef.shopOrders} orders</div>
                  <div className="text-zinc-400">Ads read vs shop (locked)</div><div>{data.shopTruthRef.ratio.toFixed(2)}x high</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


