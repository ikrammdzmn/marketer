"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import Link from "next/link";
import Chart from "chart.js/auto";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";
import DateRangePicker from "../DateRangePicker";

function isoAddDays(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 86400000).toISOString().slice(0, 10);
}
function isoDayCount(a: string, b: string): number {
  const ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(a || "");
  const mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b || "");
  if (!ma || !mb) return 0;
  return Math.round((Date.UTC(+mb[1], +mb[2] - 1, +mb[3]) - Date.UTC(+ma[1], +ma[2] - 1, +ma[3])) / 86400000) + 1;
}
// /creative — Creative analysis module (tab 3). Capability probe + cached
// PRODUCT rows. Account/catalog editing moved to /accounts + /catalog.

// Ads-daily trend chart (local-tool style): up to 2 ticked metrics, legend,
// missing days break the line (spanGaps off). MYR metrics share the left
// axis, others ride the right one.
const TREND_DEFS: Record<string, { label: string; color: string; axis: "y" | "y1"; suffix: string; goodDown: boolean }> = {
  cost: { label: "Cost", color: "#2dd4bf", axis: "y", suffix: " MYR", goodDown: true },
  gmv: { label: "Gross revenue", color: "#fb923c", axis: "y", suffix: " MYR", goodDown: false },
  orders: { label: "Orders", color: "#60a5fa", axis: "y1", suffix: "", goodDown: false },
  cpo: { label: "Cost per order", color: "#facc15", axis: "y1", suffix: " MYR", goodDown: true },
  roi: { label: "ROI", color: "#4ade80", axis: "y1", suffix: "", goodDown: false },
};
function trendVal(d: { cost: number; gmv: number; orders: number } | null, k: string): number | null {
  if (!d) return null;
  if (k === "cost") return d.cost;
  if (k === "gmv") return d.gmv;
  if (k === "orders") return d.orders;
  if (k === "cpo") return d.orders > 0 ? d.cost / d.orders : null;
  if (k === "roi") return d.cost > 0 ? d.gmv / d.cost : null;
  return null;
}
const PALETTE = ["#60a5fa", "#f87171", "#4ade80", "#fb923c", "#c084fc", "#f472b6", "#2dd4bf", "#a3e635", "#facc15", "#94a3b8"];
const TREND_METRIC_LABEL: Record<string, string> = { gmv: "Revenue (MYR)", cost: "Cost (MYR)", orders: "Orders" };
// Top-N multi-line chart (local-tool style): legend toggles lines natively,
// missing days break the line.
function TrendMultiChart({ days, series }: { days: string[]; series: { id: string; label: string; color: string; data: (number | null)[] }[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const sig = JSON.stringify([days, series]);
  useEffect(() => {
    let c: Chart | null = null;
    if (ref.current && days.length > 0 && series.length > 0) {
      c = new Chart(ref.current, {
        data: {
          labels: days.map((d) => d.slice(5)),
          datasets: series.map((s) => ({
            type: "line" as const,
            label: s.label,
            data: s.data,
            borderColor: s.color,
            backgroundColor: s.color,
            borderWidth: 1.5,
            tension: 0.3,
            spanGaps: false,
            pointRadius: 2,
          })),
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { labels: { color: "#eee", boxWidth: 12, font: { size: 10 } } } },
          scales: {
            x: { ticks: { color: "#999", maxTicksLimit: 10 }, grid: { color: "#27272a" } },
            y: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
          },
        } as any,
      });
    }
    return () => { c?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return <canvas ref={ref} />;
}
function TrendChart({ days, sel }: { days: { date: string; cost: number; gmv: number; orders: number; gap?: boolean }[]; sel: string[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const sig = JSON.stringify([days, sel]);
  useEffect(() => {
    let c: Chart | null = null;
    if (ref.current && days.length > 0 && sel.length > 0) {
      c = new Chart(ref.current, {
        data: {
          labels: days.map((d) => d.date.slice(5)),
          datasets: sel.filter((k) => TREND_DEFS[k]).map((k) => ({
            type: "line" as const,
            label: `${TREND_DEFS[k].label}${TREND_DEFS[k].axis === "y" ? " (MYR)" : k === "roi" ? " (x)" : ""}`,
            data: days.map((d) => trendVal(d.gap ? null : d, k)),
            borderColor: TREND_DEFS[k].color,
            backgroundColor: TREND_DEFS[k].color,
            borderWidth: 2,
            tension: 0.3,
            spanGaps: false,
            pointRadius: 3,
            yAxisID: TREND_DEFS[k].axis,
          })),
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { labels: { color: "#eee" } } },
          scales: {
            x: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
            y: { ticks: { color: "#999" }, grid: { color: "#27272a" } },
            y1: {
              position: "right", ticks: { color: "#999" }, grid: { drawOnChartArea: false },
              display: sel.some((k) => TREND_DEFS[k]?.axis === "y1"),
            },
          },
        } as any,
      });
    }
    return () => { c?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return <canvas ref={ref} />;
}
export default function CreativePage() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const todayMYT = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [crStart, setCrStart] = useState(todayMYT());
  const [crEnd, setCrEnd] = useState(todayMYT());
  const [crRows, setCrRows] = useState<any[]>([]);
  const [crTotals, setCrTotals] = useState<any>(null);
  const [crTotalsStatus, setCrTotalsStatus] = useState("ALL");
  const [crMsg, setCrMsg] = useState("");
  const [crBusy, setCrBusy] = useState(false);
  const [metaText, setMetaText] = useState("");
  const [metaMsg, setMetaMsg] = useState("");
  const [metaBusy, setMetaBusy] = useState(false);
  const [crCamps, setCrCamps] = useState<any[]>([]);
  const [crCamp, setCrCamp] = useState("1858977225474178");
  const [crStatus, setCrStatus] = useState("ALL");
  const [crVerdict, setCrVerdict] = useState("ALL");
  const [crKind, setCrKind] = useState("all");
  const [crAccounts, setCrAccounts] = useState<any[]>([]);
  const [crKillSort, setCrKillSort] = useState<"spend" | "gmv">("spend");
  const [crColsOpen, setCrColsOpen] = useState(false);
  const [crHidden, setCrHidden] = useState<Set<string>>(new Set());
  const [killOpen, setKillOpen] = useState<Set<string>>(new Set());
  const [dailyOpen, setDailyOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [crRowsOpen, setCrRowsOpen] = useState(false);
  const [trendSel, setTrendSel] = useState<string[]>(["cost", "gmv"]);
  const [trendMetric, setTrendMetric] = useState("gmv");
  const [soloId, setSoloId] = useState<string | null>(null);
  const [trendPrev, setTrendPrev] = useState<any>(null);
  function toggleTrend(k: string) {
    setTrendSel((p) => {
      if (p.includes(k)) return p.filter((x) => x !== k);
      if (p.length >= 2) return [...p.slice(1), k];
      return [...p, k];
    });
  }
  const [crTargets, setCrTargets] = useState<any>(null);
  const [crTopN, setCrTopN] = useState(20);
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Status filter options derived from loaded rows (counts included).
  const crStatusCounts = (() => {
    const m = new Map<string, number>();
    for (const r of crRows) {
      const s = String(r.status || "—");
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const crShown = crStatus === "ALL" ? crRows : crRows.filter((r) => String(r.status || "—") === crStatus);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCamps();
    loadTargets();
    fetch("/api/creative-accounts").then((x) => x.json()).then((b) => {
      if (Array.isArray(b.accounts)) setCrAccounts(b.accounts);
    }).catch(() => { /* kinds fall back to unlisted */ });
  }, []);

  // Vs-previous window (same length, ending the day before start) for the
  // trend cards — lightweight totalsOnly aggregates, never rows.
  useEffect(() => {
    const n = isoDayCount(crStart, crEnd);
    if (n <= 0 || n > 31) { setTrendPrev(null); return; }
    const pe = isoAddDays(crStart, -1);
    const ps = isoAddDays(crStart, -n);
    if (!ps || !pe) { setTrendPrev(null); return; }
    const camp = crCamp === "ALL" ? "" : crCamp;
    const st = crStatus !== "ALL" ? `&status=${encodeURIComponent(crStatus)}` : "";
    const cid = camp ? `&campaignId=${camp}` : "";
    let dead = false;
    fetch(`/api/creative-sync?shopNumber=1&startDate=${ps}&endDate=${pe}${cid}${st}&totalsOnly=1`)
      .then((x) => x.json())
      .then((b) => { if (!dead) setTrendPrev(b.totals ?? null); })
      .catch(() => { if (!dead) setTrendPrev(null); });
    return () => { dead = true; };
  }, [crStart, crEnd, crCamp, crStatus]);

  async function loadTargets() {
    try {
      const r = await fetch("/api/creative-targets").then((x) => x.json());
      if (r && typeof r.topN === "number") {
        setCrTargets(r);
        setCrTopN(r.topN);
      }
    } catch { /* strip falls back to auto */ }
  }

  // KPI header (ratio-safe): server totals over the FULL range when they
  // match the active status filter — never summed from the LIMIT-truncated
  // display rows (B117). Falls back to client sums otherwise.
  const kpis = (() => {
    if (crTotals && crTotalsStatus === crStatus) {
      const cost = Number(crTotals.cost ?? 0), gmv = Number(crTotals.gmv ?? 0);
      const orders = Number(crTotals.orders ?? 0), imp = Number(crTotals.imp ?? 0);
      return {
        cost, gmv, orders, imp,
        roi: cost > 0 ? gmv / cost : NaN,
        cpm: imp > 0 ? (cost / imp) * 1000 : NaN,
        aov: orders > 0 ? gmv / orders : NaN,
      };
    }
    let cost = 0, gmv = 0, orders = 0, imp = 0;
    for (const r of crShown) {
      cost += Number(r.cost ?? 0);
      gmv += Number(r.gmv ?? 0);
      orders += Number(r.orders ?? 0);
      imp += Number(r.impressions ?? 0);
    }
    return {
      cost, gmv, orders, imp,
      roi: cost > 0 ? gmv / cost : NaN,
      cpm: imp > 0 ? (cost / imp) * 1000 : NaN,
      aov: orders > 0 ? gmv / orders : NaN,
    };
  })();
  const sop = (() => {
    if (crShown.length === 0) return null;
    const top = [...crShown].sort((a: any, b: any) => Number(b.cost ?? 0) - Number(a.cost ?? 0)).slice(0, crTopN);
    const imps = top.map((r: any) => Number(r.impressions ?? 0));
    const autoMin = Math.min(...imps);
    const cpms = top.map((r: any) => {
      const c = Number(r.cost ?? 0), i = Number(r.impressions ?? 0);
      return i > 0 ? (c / i) * 1000 : NaN;
    }).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    const autoMed = cpms.length === 0 ? NaN : cpms[Math.floor(cpms.length / 2)];
    const minImpr = crTargets?.minImpr ?? autoMin;
    const maxCpm = crTargets?.maxCpm ?? autoMed;
    return {
      minImpr, maxCpm,
      minTag: crTargets?.minImpr != null ? "yours" : "auto",
      cpmTag: crTargets?.maxCpm != null ? "yours" : "auto",
    };
  })();
  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");
  const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-MY") : "—");

  async function loadRows() {
    setCrMsg("");
    try {
      const camp = crCamp === "ALL" ? "" : crCamp;
      const cid = camp ? `&campaignId=${camp}` : "";
      const st0 = crStatus;
      const st = st0 !== "ALL" ? `&status=${encodeURIComponent(st0)}` : "";
      // Per-day chunked fetch (B117 follow-up): a single LIMIT-2000 read
      // serves newest-first, so the oldest day starves when the range is
      // big. One GET per day merges everything; per-day totals stay exact
      // even if a single day ever outgrows the cap.
      const n = isoDayCount(crStart, crEnd);
      if (n <= 0 || n > 31) { setCrMsg("Range must be 1–31 days."); return; }
      let all: any[] = [];
      const tot = { cost: 0, gmv: 0, orders: 0, imp: 0, n: 0 };
      let failed = 0;
      for (let i = 0; i < n; i++) {
        const d = isoAddDays(crStart, i);
        try {
          const r = await fetch(`/api/creative-sync?shopNumber=1&startDate=${d}&endDate=${d}${cid}${st}`).then((x) => x.json());
          if (r.rows) {
            all = all.concat(r.rows);
            if (r.totals) {
              tot.cost += Number(r.totals.cost ?? 0);
              tot.gmv += Number(r.totals.gmv ?? 0);
              tot.orders += Number(r.totals.orders ?? 0);
              tot.imp += Number(r.totals.imp ?? 0);
              tot.n += Number(r.totals.n ?? 0);
            }
          } else failed++;
        } catch {
          failed++;
        }
      }
      setCrRows(all);
      setCrTotals(all.length > 0 ? tot : null);
      setCrTotalsStatus(st0);
      if (all.length === 0) setCrMsg("No cached rows for this range yet — press Sync from TikTok.");
      else setCrMsg(`${all.length} rows${failed > 0 ? ` · ${failed}d failed (partial)` : ""}.`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      setCrMsg(m);
      toast(m, "err");
    }
  }

  async function loadCamps() {
    try {
      const r = await fetch("/api/creative-sync?list=campaigns").then((x) => x.json());
      if (r.campaigns) setCrCamps(r.campaigns);
    } catch { /* picker stays manual */ }
  }

  // Kill-list (Stage 7.1 + verdict reasons + FATIGUE): aggregate cached
  // day-rows by post over the range. FATIGUE needs >=3 distinct days in the
  // loaded range, else it stays hidden (short-range note in the header).
  // Kill-list column picker (state-only: resets to all-visible on reload).
  const KILL_COLS = [
    { key: "num", label: "#" },
    { key: "ex", label: "Ex" },
    { key: "post", label: "Post" },
    { key: "postid", label: "Post ID" },
    { key: "posted", label: "Posted" },
    { key: "age", label: "Age" },
    { key: "shape", label: "Shape" },
    { key: "account", label: "Account" },
    { key: "status", label: "Status" },
    { key: "days", label: "Days" },
    { key: "spend", label: "Spend" },
    { key: "gmv", label: "GMV" },
    { key: "roi", label: "ROI" },
    { key: "verdict", label: "Verdict" },
    { key: "why", label: "Why" },
  ];
  function toggleCol(key: string) {
    setCrHidden((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }
  // Account-kind join (client-side, no migration): creative tt_account vs
  // /accounts allowlist. Username first (@handle is stable), display name
  // second. Registry rule (owner): registered plain = internal, registered
  // + top_affiliate = top affiliate, registered + inactive = inactive,
  // anything unregistered = affiliate. Product-card rows get no label
  // (handled at render, not here).
  const normAcct = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/^@/, "");
  const acctByUser = new Map<string, any>();
  const acctByName = new Map<string, any>();
  for (const a of crAccounts) {
    const u = normAcct(a.username);
    if (u && !acctByUser.has(u)) acctByUser.set(u, a);
    const n = normAcct(a.name);
    if (n && !acctByName.has(n)) acctByName.set(n, a);
  }
  function acctKind(ttAccount: unknown): "internal" | "top affiliate" | "affiliate" | "inactive" {
    const a = acctByUser.get(normAcct(ttAccount)) ?? acctByName.get(normAcct(ttAccount));
    if (!a) return "affiliate";
    if (a.active === false) return "inactive";
    if (a.top_affiliate) return "top affiliate";
    return "internal";
  }
  function postedDay(v: unknown): string {
    if (!v) return "";
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  }
  function postedAge(v: unknown): string {
    const p = postedDay(v);
    if (!p) return "—";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const n = isoDayCount(p, today);
    if (!n || n <= 0) return "—";
    return `${n - 1}d`;
  }
  function killList() {
    const byPost = new Map<string, { cost: number; gmv: number; orders: number; imp: number; clicks: number; w2s: number; w6s: number; w25: number; w50: number; w75: number; w100: number; days: Set<string>; perDay: Map<string, { cost: number; gmv: number; orders: number }>; title: string; account: string; status: string; postedAt: string | null }>();
    for (const r of crRows) {
      const id = String(r.item_id ?? "?");
      let e = byPost.get(id);
      if (!e) {
        e = { cost: 0, gmv: 0, orders: 0, imp: 0, clicks: 0, w2s: 0, w6s: 0, w25: 0, w50: 0, w75: 0, w100: 0, days: new Set(), perDay: new Map(), title: String(r.title ?? ""), account: String(r.tt_account ?? ""), status: String(r.status ?? ""), postedAt: null };
        byPost.set(id, e);
      }
      if (!e.postedAt && (r as any).posted_at) e.postedAt = String((r as any).posted_at);
      const c = Number(r.cost ?? 0), g = Number(r.gmv ?? 0);
      e.cost += c;
      e.gmv += g;
      e.orders += Number(r.orders ?? 0);
      const im = Number(r.impressions ?? 0);
      e.imp += im;
      e.clicks += Number(r.clicks ?? 0);
      // Impression-weighted rate sums (rates as reported by TikTok).
      const wv = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const acc = (key: "w2s" | "w6s" | "w25" | "w50" | "w75" | "w100", v: unknown) => {
        const n = wv(v);
        if (n !== null) e[key] += im * n;
      };
      acc("w2s", r.v2s); acc("w6s", r.v6s); acc("w25", r.vp25);
      acc("w50", r.vp50); acc("w75", r.vp75); acc("w100", r.vp100);
      const d = String(r.date ?? "").slice(0, 10);
      e.days.add(d);
      const pd = e.perDay.get(d) ?? { cost: 0, gmv: 0, orders: 0 };
      pd.cost += c; pd.gmv += g; pd.orders += Number(r.orders ?? 0);
      e.perDay.set(d, pd);
      if (String(r.status ?? "") === "DELIVERING") e.status = "DELIVERING";
      if (!e.title && r.title) e.title = String(r.title);
    }
    const allDays = [...new Set(crRows.map((r: any) => String(r.date ?? "").slice(0, 10)))].sort();
    const fatigueOn = allDays.length >= 3;
    const cut = Math.ceil(allDays.length / 2);
    const lateSet = new Set(allDays.slice(cut));
    const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "—");
    const rows = [...byPost.entries()].map(([id, e]) => {
      const roi = e.cost > 0 ? e.gmv / e.cost : 0;
      // Diagnostics: impression-weighted hook/hold (TikTok-reported rates)
      // + count-based CTR/CVR (well-defined from clicks/imp/orders).
      const wavg = (w: number) => (e.imp > 0 ? w / e.imp : NaN);
      const hook = wavg(e.w2s);
      const ctr = e.imp > 0 ? (e.clicks / e.imp) * 100 : NaN;
      const cvr = e.clicks > 0 ? (e.orders / e.clicks) * 100 : NaN;
      const hookFrag = Number.isFinite(hook) ? ` · hook ${f1(hook)} 2s` : "";
      const clickFrag = e.clicks > 0 && e.orders === 0 ? ` · ${e.clicks} clicks, 0 orders — check product/price` : "";
      let earlyC = 0, earlyG = 0, lateC = 0, lateG = 0;
      if (fatigueOn) {
        for (const [d, pd] of e.perDay) {
          if (lateSet.has(d)) { lateC += pd.cost; lateG += pd.gmv; }
          else { earlyC += pd.cost; earlyG += pd.gmv; }
        }
      }
      const earlyRoi = earlyC > 0 ? earlyG / earlyC : 0;
      const lateRoi = lateC > 0 ? lateG / lateC : 0;
      let verdict: string, reason: string;
      if (e.cost >= 50 && roi < 2) {
        verdict = "KILL"; reason = `RM${e.cost.toFixed(0)} spend, ROI ${f1(roi)} (<2)${hookFrag}${clickFrag}`;
      } else if (e.cost >= 20 && e.gmv === 0) {
        verdict = "KILL"; reason = `RM${e.cost.toFixed(0)} spend, 0 orders${hookFrag}${clickFrag}`;
      } else if (fatigueOn && e.days.size >= 3 && lateC >= 10 && earlyRoi >= 5 && lateRoi < earlyRoi * 0.5 && lateRoi < 3) {
        verdict = "FATIGUE"; reason = `was ROI ${f1(earlyRoi)} → last half ${f1(lateRoi)}, still spending RM${lateC.toFixed(0)}`;
      } else if (e.cost > 0 && roi >= 10) {
        verdict = "SCALE"; reason = `ROI ${f1(roi)}, RM${e.cost.toFixed(0)} spend, ${e.orders} orders`;
      } else if (e.cost > 0 && roi >= 3 && e.orders >= 3) {
        verdict = "SCALE"; reason = `ROI ${f1(roi)}, ${e.orders} orders over ${e.days.size}d`;
      } else if (e.cost > 0) {
        verdict = "WATCH";
        reason = e.cost < 50 ? `only RM${e.cost.toFixed(0)} spend (need RM50)${hookFrag}` : e.days.size < 3 ? `only ${e.days.size}d (need 3)${hookFrag}` : `ROI ${f1(roi)} — not kill, not scale yet${hookFrag}`;
      } else {
        verdict = "—"; reason = "no spend";
      }
      if (acctKind(e.account) === "inactive" && e.cost > 0) reason += " · ⚠ inactive account spending";
      return { id, ...e, days: e.days.size, roi, verdict, reason, hook, ctr, cvr };
    }).sort((a, b) => (crKillSort === "gmv" ? b.gmv - a.gmv : b.cost - a.cost));
    const tc = rows.reduce((s, r) => s + r.cost, 0);
    const tg = rows.reduce((s, r) => s + r.gmv, 0);
    const hero = rows[0];
    const tailWaste = rows.filter((r) => r.roi < 2).reduce((s, r) => s + r.cost, 0);
    return { rows, totalCost: tc, totalGmv: tg, roi: tc > 0 ? tg / tc : 0, hero, tailWaste, fatigueOn, rangeDays: allDays.length };
  }

  function killCsv(rows: { id: string; title: string; account: string; status: string; days: number; cost: number; gmv: number; roi: number; orders: number; imp: number; verdict: string; reason: string; postedAt?: string | null }[]) {
    const head = "post_id,title,account,status,posted,age_days,days,spend,gmv,roi,orders,impressions,verdict,reason";
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.id, q(r.title), q(r.account), r.status, postedDay((r as any).postedAt), postedAge((r as any).postedAt).replace("d", ""), r.days, r.cost.toFixed(2), r.gmv.toFixed(2), r.roi.toFixed(2), r.orders, r.imp, r.verdict, q(r.reason)].join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kill-list-${crStart}_${crEnd}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function trendCsv(rows: { id: string; title: string; account: string; verdict: string; dm: Map<string, { gmv: number; cost: number; orders: number }>; tot: { gmv: number; cost: number; orders: number } }[], days: string[], metric: string) {
    const mv = (o: { gmv: number; cost: number; orders: number }) => (metric === "cost" ? o.cost : metric === "orders" ? o.orders : o.gmv);
    const head = ["post_id", "title", "account", "verdict", `total_${metric}`, ...days].join(",");
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.id, q(r.title), q(r.account), r.verdict, mv(r.tot).toFixed(2), ...days.map((d) => { const v = r.dm.get(d); return v ? mv(v).toFixed(2) : ""; })].join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trend-per-creative-${crStart}_${crEnd}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Exclusion draft (Stage 9): checkbox selection, KILL preselected.
  // Read-only — owner applies the IDs in Ads Manager by hand (write tools
  // gated till Dec). Draft copies as plain post IDs, one per line.
  const [exSel, setExSel] = useState<Set<string>>(new Set());
  const [exCopied, setExCopied] = useState(false);

  function toggleEx(id: string) {
    setExSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setExCopied(false);
  }

  function selectKills() {
    const k = killList();
    setExSel(new Set(k.rows.filter((r) => r.verdict === "KILL" && r.id !== "-1").map((r) => r.id)));
    setExCopied(false);
  }

  async function copyDraft() {
    const ids = [...exSel];
    if (ids.length === 0) return;
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setExCopied(true);
    } catch {
      setExCopied(false);
    }
  }

  async function syncRows() {
    setCrBusy(true);
    setCrMsg("Syncing from TikTok…");
    try {
      const r = await fetch("/api/creative-sync", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` },
        body: JSON.stringify({ shopNumber: "1", startDate: crStart, endDate: crEnd, campaignId: crCamp === "ALL" ? "" : crCamp, metaForce: true }),
      });
      const body = await r.json();
      if (!r.ok) { const m = body.error ?? `HTTP ${r.status}`; setCrMsg(m); toast(m, "err"); return; }
      const skips = Object.keys(body.skipped ?? {}).length;
      const meta = body.meta as { found?: number; missed?: number; skipped?: string | null; debug?: Record<string, string> } | undefined;
      const dbg = meta?.debug ? Object.entries(meta.debug).map(([k, v]) => `${k}:${v}`).join(" ") : "";
      const metaMsg = meta
        ? meta.skipped ? ` · posted: ${meta.skipped}`
          : (meta.found || meta.missed) ? ` · posted: ${meta.found ?? 0} filled, ${meta.missed ?? 0} unknown${(meta.found ?? 0) === 0 && dbg ? ` [${dbg}]` : ""}`
          : " · posted: up to date"
        : "";
      const okMsg = `Synced ${body.rows} rows (${body.campaigns} campaigns × ${body.days}d${skips ? `, ${skips} skips` : ""})${metaMsg}.`;
      setCrMsg(okMsg);
      toast(okMsg);
      loadRows();
    } catch (e) {
      const m = e instanceof Error ? e.message : "sync failed";
      setCrMsg(m);
      toast(m, "err");
    } finally {
      setCrBusy(false);
    }
  }

  async function importMeta() {
    setMetaMsg("");
    const rows = metaText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [a, b] = l.split(/[,;\t]/).map((s) => s.trim());
      return { item_id: a ?? "", posted_at: b ?? "" };
    }).filter((r) => r.item_id);
    if (rows.length === 0) { setMetaMsg("Paste post_id,date lines first."); return; }
    setMetaBusy(true);
    try {
      const r = await fetch("/api/creative-meta", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` },
        body: JSON.stringify({ rows }),
      });
      const body = await r.json();
      if (!r.ok) { const m = body.error ?? `HTTP ${r.status}`; setMetaMsg(m); toast(m, "err"); return; }
      const okMsg = `Imported ${body.imported} posted dates (${body.haveDates}/${body.imported} of these posts now have dates)${body.skippedBad ? `, ${body.skippedBad} bad lines skipped` : ""}.`;
      setMetaMsg(okMsg);
      toast(okMsg);
      setMetaText("");
      loadRows();
    } catch (e) {
      const m = e instanceof Error ? e.message : "import failed";
      setMetaMsg(m);
      toast(m, "err");
    } finally {
      setMetaBusy(false);
    }
  }

  async function runProbe() {    setBusy(true);
    setErr("");
    setOut(null);
    try {
      const r = await fetch("/api/creative-probe?shopNumber=1");
      const body = await r.json();
      if (!r.ok) setErr(body.error ?? `HTTP ${r.status}`);
      else setOut(body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "probe failed");
    } finally {
      setBusy(false);
    }
  }

  function verdict(): string {
    if (!out) return "";
    const gmvOk = Object.values(out.gmv_max_report ?? {}).some((t: any) =>
      Object.values(t ?? {}).some((d: any) => d.dims === "OK"));
    const adOk = (out.integrated_basic ?? {})["AUCTION_AD"]?.full_set === "OK";
    if (gmvOk) return "GMV Max serves creative grains — full fetch is possible.";
    if (adOk) return "Numbers fetchable at ad grain; GMV grains missing — partial.";
    return "No creative grain on either surface — exports stay for now.";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 text-sm">
      <ModuleRedirect module="creative" />
      <h2 className="mb-1 text-lg font-semibold">Creative analysis</h2>
      <p className="mb-3 text-[12px] text-zinc-400">
        Goal: replace the xlsx export with direct TikTok pulls (shop 1). First step is the
        capability probe below — it asks TikTok which creative grains and metrics exist.
      </p>
      <button
        onClick={runProbe}
        disabled={busy}
        className="rounded-lg bg-emerald-700 px-4 py-2 font-medium hover:bg-emerald-600 disabled:opacity-50"
      >
        {busy ? "Probing TikTok…" : "Run creative probe"}
      </button>
      <Link
        href="/accounts"
        className="ml-2 inline-block rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
      >
        Accounts
      </Link>
      <Link
        href="/catalog"
        className="ml-2 inline-block rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
      >
        Catalog
      </Link>

      <h3 className="mb-1 mt-4 font-medium">Creative rows (cached, PRODUCT)</h3>
      {/* KPI header + SOP strip (same filtered set as both tables) */}
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[["Spend", `MYR ${f2(kpis.cost)}`], ["GMV", `MYR ${f2(kpis.gmv)}`], ["ROI", f2(kpis.roi)], ["Orders", f0(kpis.orders)], ["Impressions", f0(kpis.imp)], ["CPM", f2(kpis.cpm)], ["AOV", f2(kpis.aov)]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5">
            <div className="text-[10px] text-zinc-500">{k}</div>
            <div className="text-sm font-medium tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] text-zinc-400">
        {sop ? (
          <>
            <span>Top <select value={crTopN} onChange={(e) => setCrTopN(Number(e.target.value))} className="rounded bg-zinc-900 px-1 py-0.5" title="Top-N window for auto benchmarks (view only, not saved)">{[10, 15, 20, 25].map((n) => (<option key={n} value={n}>{n}</option>))}</select> min impr {f0(sop.minImpr)} <span className="text-zinc-600">({sop.minTag})</span> · CPM bar med {f2(sop.maxCpm)} <span className="text-zinc-600">({sop.cpmTag})</span></span>
            <span className="text-zinc-600">· status: {crStatus}{crTargets ? "" : " · targets table missing (auto)"}</span>
          </>
        ) : (
          <span>No cached rows for this range yet — press Sync from TikTok.</span>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
        <select value={crCamp} onChange={(e) => setCrCamp(e.target.value)} onFocus={loadCamps} className="max-w-64 rounded bg-zinc-900 px-2 py-1">
          <option value="1858977225474178">himcoffee (1858…4178)</option>
          {crCamps.filter((c: any) => String(c.campaign_id) !== "1858977225474178").map((c: any) => (
            <option key={c.campaign_id} value={c.campaign_id}>{(c.catalog_label || c.name || "").slice(0, 30)} ({String(c.campaign_id).slice(0, 4)}…{String(c.campaign_id).slice(-4)})</option>
          ))}
          <option value="ALL">All PRODUCT campaigns</option>
        </select>
        <button ref={rangeBtnRef} onClick={() => {
          if (!calOpen && rangeBtnRef.current) {
            const r = rangeBtnRef.current.getBoundingClientRect();
            setCalPos({ top: r.bottom + 8, left: r.left });
          }
          setCalOpen((v) => !v);
        }} className="rounded bg-zinc-900 px-2 py-1">{crStart} – {crEnd} 📅</button>
        <button onClick={loadRows} className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800">Fetch rows</button>
        <button onClick={syncRows} disabled={crBusy} className="rounded bg-emerald-700 px-3 py-1 hover:bg-emerald-600 disabled:opacity-50">{crBusy ? "Syncing…" : "Sync from TikTok (≤7d)"}</button>
        <select value={crStatus} onChange={(e) => setCrStatus(e.target.value)} title="Filter both tables by delivery status" className="max-w-48 rounded bg-zinc-900 px-2 py-1">
          <option value="ALL">Status: All ({crRows.length})</option>
          {crStatusCounts.map(([s, n]) => (
            <option key={s} value={s}>{s} ({n})</option>
          ))}
        </select>
        <span className="text-zinc-500">{crMsg}</span>
      </div>
      {calOpen && (
        <DateRangePicker
          from={crStart} to={crEnd} pos={calPos}
          onApply={(f, t) => { setCrStart(f); setCrEnd(t); setCalOpen(false); }}
          onClose={() => setCalOpen(false)}
        />
      )}
      <details className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[12px] text-zinc-400">
        <summary className="cursor-pointer hover:text-zinc-200">Import posted times (from TikTok xlsx — the API has no post dates)</summary>
        <p className="mt-1 text-[11px] text-zinc-500">Paste <span className="text-zinc-300">Post ID,Time posted</span> lines from the export — one per line, comma/tab/semicolon separated. Naive times assumed MYT. Fills empties only, never overwrites. Then Fetch rows.</p>
        <textarea value={metaText} onChange={(e) => setMetaText(e.target.value)} rows={4} placeholder={"7701570274545650965,2026-09-14 10:23:00\n7701544367940521237,2026-09-13 21:05:00"} className="mt-1 w-full rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-zinc-200" />
        <div className="mt-1 flex items-center gap-2">
          <button onClick={importMeta} disabled={metaBusy} className="rounded bg-emerald-700 px-3 py-1 text-zinc-100 hover:bg-emerald-600 disabled:opacity-50">{metaBusy ? "Importing…" : "Import"}</button>
          {metaMsg && <span className="text-zinc-400">{metaMsg}</span>}
        </div>
      </details>
      {(() => {
        if (crRows.length === 0) return null;
        const byAcct = new Map<string, { gmv: number; cost: number; orders: number; posts: Set<string>; conv: Map<string, { o: number; g: number }> }>();
        for (const r of crShown) {
          const name = String(r.tt_account || "—");
          let a = byAcct.get(name);
          if (!a) { a = { gmv: 0, cost: 0, orders: 0, posts: new Set(), conv: new Map() }; byAcct.set(name, a); }
          const gv = Number(r.gmv ?? 0);
          const od = Number(r.orders ?? 0);
          a.gmv += gv;
          a.cost += Number(r.cost ?? 0);
          a.orders += od;
          const pid = String(r.item_id ?? "?");
          a.posts.add(pid);
          const c = a.conv.get(pid) ?? { o: 0, g: 0 };
          c.o += od; c.g += gv;
          a.conv.set(pid, c);
        }
        const list = [...byAcct.entries()].map(([name, d]) => ({
          name, gmv: d.gmv, cost: d.cost, orders: d.orders, posts: d.posts.size,
          conv: [...d.conv.values()].filter((v) => v.o > 0 || v.g > 0).length,
          roi: d.cost > 0 ? d.gmv / d.cost : 0,
        })).sort((a, b) => b.gmv - a.gmv);
        const total = list.reduce((s, a) => s + a.gmv, 0);
        const kindSum = new Map<string, number>();
        for (const a of list) {
          const kk = acctKind(a.name);
          kindSum.set(kk, (kindSum.get(kk) ?? 0) + a.gmv);
        }
        const kindTotals = (["internal", "top affiliate", "affiliate", "inactive"] as const)
          .map((kk) => `${kk} MYR ${(kindSum.get(kk) ?? 0).toFixed(0)}`).join(" · ");
        return (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-zinc-200">Top 10 accounts by revenue{crStatus !== "ALL" ? ` · ${crStatus}` : ""}</h3>
            <p className="mb-2 text-[11px] text-zinc-500">{kindTotals}</p>
            <div className="mb-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {list.slice(0, 10).map((a) => (
                <div key={a.name} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-zinc-200">{a.name}</span>
                    <span className="tabular-nums text-zinc-100">MYR {a.gmv.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${total > 0 ? (a.gmv / total) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-0.5 text-[10px] tabular-nums text-zinc-500">{total > 0 ? ((a.gmv / total) * 100).toFixed(1) : "0.0"}% of revenue · ROI {a.roi.toFixed(2)} · {a.conv}/{a.posts} converted</div>
                </div>
              ))}
            </div>
            <div className="mb-2">
              <button onClick={() => setAcctOpen((v) => !v)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">
                {acctOpen ? `Hide per-account summary (${list.length})` : `Per-account summary (${list.length}) ▾`}
              </button>
            </div>
            {acctOpen && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead><tr className="text-zinc-400"><th className="px-2 py-2 text-left text-xs uppercase tracking-wide font-medium">Account</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">Posts</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">Converted</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">GMV</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">Cost</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">ROI</th><th className="px-2 py-2 text-right text-xs uppercase tracking-wide font-medium">Orders</th></tr></thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.name} className="border-t border-zinc-800 hover:bg-zinc-900">
                      <td className="px-2 py-2">{a.name}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.posts}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.conv}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.gmv.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.cost.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.roi.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{a.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })()}
      {(() => {
        if (crRows.length === 0) return null;
        const k = killList();
        const shown = (crStatus === "ALL" ? k.rows : k.rows.filter((r) => (r.status || "—") === crStatus))
          .filter((r) => crVerdict === "ALL" || r.verdict === crVerdict)
          .filter((r) => crKind === "all" || (r.account !== "Product card" && acctKind(r.account) === crKind));
        const sCost = shown.reduce((s, r) => s + r.cost, 0);
        const sGmv = shown.reduce((s, r) => s + r.gmv, 0);
        const sRoi = sCost > 0 ? sGmv / sCost : 0;
        const sHero = shown[0];
        const sTail = shown.filter((r) => r.roi < 2).reduce((s, r) => s + r.cost, 0);
        const kindBase = crStatus === "ALL" ? k.rows : k.rows.filter((r) => (r.status || "—") === crStatus);
        const inactSpend = new Map<string, number>();
        for (const row of kindBase) {
          if (acctKind(row.account) === "inactive" && Number(row.cost ?? 0) > 0) {
            const nm = row.account || "—";
            inactSpend.set(nm, (inactSpend.get(nm) ?? 0) + Number(row.cost ?? 0));
          }
        }
        const visCols = KILL_COLS.filter((c) => !crHidden.has(c.key)).length || 1;
        const f1d = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "—");
        const davg = (r: any, w: number) => (Number(r.imp ?? 0) > 0 ? w / Number(r.imp) : NaN);
        const pct2 = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)}%` : "—");
        const shapeSvg = (vals: (number | null)[]) => {
          const present = vals.filter((v): v is number => v !== null);
          const mx = Math.max(...present, 0);
          const segs: string[][] = [];
          let cur: string[] = [];
          vals.forEach((v, i) => {
            if (v === null) { if (cur.length > 1) segs.push(cur); cur = []; return; }
            cur.push(`${(i / Math.max(vals.length - 1, 1)) * 120},${24 - (mx > 0 ? (v / mx) * 22 : 0)}`);
          });
          if (cur.length > 1) segs.push(cur);
          if (segs.length === 0) return <span className="text-zinc-600">—</span>;
          return (<svg viewBox="0 0 120 28" className="h-7 w-28">{segs.map((pp, j) => (<polyline key={j} points={pp.join(" ")} fill="none" stroke="#60a5fa" strokeWidth="1.5" />))}</svg>);
        };
        const rdays: string[] = [];
        { const nn = isoDayCount(crStart, crEnd); for (let i = 0; i < nn && i < 31; i++) rdays.push(isoAddDays(crStart, i)); }
        const dmv = (o: { gmv: number; cost: number; orders: number }) => (trendMetric === "cost" ? o.cost : trendMetric === "orders" ? o.orders : o.gmv);
        const soloK = soloId ? k.rows.find((x: any) => x.id === soloId) ?? null : null;
        return (
          <>
          {inactSpend.size > 0 && (
            <p className="mb-2 rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-200">
              ⚠ Inactive but spending: {[...inactSpend.entries()].map(([nm, c]) => `${nm} MYR ${c.toFixed(2)}`).join(" · ")}
            </p>
          )}
          <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Kill list{crStatus !== "ALL" ? ` · ${crStatus}` : ""}{crVerdict !== "ALL" ? ` · ${crVerdict}` : ""}</span>
              <select value={crVerdict} onChange={(e) => setCrVerdict(e.target.value)} title="Filter by verdict" className="rounded bg-zinc-900 px-2 py-1 text-xs">
                {["ALL", "SCALE", "WATCH", "KILL", "FATIGUE"].map((v) => (
                  <option key={v} value={v}>{v === "ALL" ? "Verdict: All" : v}</option>
                ))}
              </select>
              <select value={crKind} onChange={(e) => setCrKind(e.target.value)} title="Filter by account kind (/accounts)" className="rounded bg-zinc-900 px-2 py-1 text-xs">
                {([["all", "Kind: All"], ["internal", "Internal"], ["top affiliate", "Top affiliate"], ["affiliate", "Affiliate"], ["inactive", "Inactive"]] as const).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <span className="inline-flex overflow-hidden rounded-lg border border-zinc-700 text-xs" title="Rank kill list by spend or GMV">
                {(["spend", "gmv"] as const).map((s) => (
                  <button key={s} onClick={() => setCrKillSort(s)} className={`px-2 py-1 ${crKillSort === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>{s === "spend" ? "Spend" : "GMV"}</button>
                ))}
              </span>
              <button onClick={() => setCrColsOpen((v) => !v)} title="Show/hide columns (resets on reload)" className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">Columns…</button>
              <button onClick={() => setDailyOpen((v) => !v)} title="Show/hide per-day columns" className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">Daily {dailyOpen ? "▾" : "▸"}</button>
              <span className="text-[11px] text-zinc-500">
                {shown.length} posts · spend MYR {sCost.toFixed(0)} · GMV {sGmv.toFixed(0)} · ROI {sRoi.toFixed(2)}
                {sHero && sCost > 0 ? ` · hero ${(100 * sHero.cost / sCost).toFixed(0)}% (${sHero.title.slice(0, 28) || sHero.id})` : ""}
                {sTail > 0 ? ` · tail waste MYR ${sTail.toFixed(0)}` : ""}
              </span>
              {!k.fatigueOn && <span className="text-[11px] text-zinc-600">(FATIGUE off — need 3+ days)</span>}
              <button onClick={() => killCsv(shown)} className="ml-auto rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">CSV</button>
              <button onClick={selectKills} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800" title="Select all KILL rows (excludes Unattributed)">Select KILL</button>
              <button onClick={() => void copyDraft()} disabled={exSel.size === 0} className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-200 hover:bg-red-950 disabled:opacity-50" title="Copy selected post IDs — remove them in Ads Manager by hand">
                {exCopied ? `Copied ${exSel.size}!` : `Copy draft (${exSel.size})`}
              </button>
            </div>
            {crColsOpen && (
              <div className="mt-2 flex flex-wrap items-center gap-1 rounded-lg border border-zinc-800 bg-black/40 px-2 py-1.5">
                <button onClick={() => setCrHidden(new Set())} className="rounded px-1.5 py-0.5 text-[11px] text-emerald-300 hover:bg-zinc-800">All</button>
                <button onClick={() => setCrHidden(new Set(KILL_COLS.map((c) => c.key)))} className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800">None</button>
                {KILL_COLS.map((c) => (
                  <label key={c.key} className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800">
                    <input type="checkbox" checked={!crHidden.has(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
            {exSel.size > 0 && (
              <p className="mt-1 text-[11px] text-amber-200/80">Draft: remove these {exSel.size} post(s) in Ads Manager → campaign → creatives. Read-only draft — nothing is applied from here.</p>
            )}
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-zinc-800">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-zinc-900"><tr className="text-left text-zinc-400">
                  {!crHidden.has("num") && <th className="px-2 py-1">#</th>}{!crHidden.has("ex") && <th className="px-2 py-1">Ex</th>}{!crHidden.has("post") && <th className="px-2 py-1">Post</th>}{!crHidden.has("postid") && <th className="px-2 py-1">Post ID</th>}{!crHidden.has("posted") && <th className="px-2 py-1">Posted</th>}{!crHidden.has("age") && <th className="px-2 py-1 text-right">Age</th>}{!crHidden.has("shape") && <th className="px-2 py-1">Shape</th>}{!crHidden.has("account") && <th className="px-2 py-1">Account</th>}
                  {!crHidden.has("status") && <th className="px-2 py-1">Status</th>}{!crHidden.has("days") && <th className="px-2 py-1 text-right">Days</th>}
                  {!crHidden.has("spend") && <th className="px-2 py-1 text-right">Spend</th>}{!crHidden.has("gmv") && <th className="px-2 py-1 text-right">GMV</th>}
                  {!crHidden.has("roi") && <th className="px-2 py-1 text-right">ROI</th>}{!crHidden.has("verdict") && <th className="px-2 py-1">Verdict</th>}{!crHidden.has("why") && <th className="px-2 py-1">Why</th>}
                  {dailyOpen && rdays.map((d) => (<th key={d} className="px-2 py-1 text-right">{d.slice(5)}</th>))}
                  {dailyOpen && <th className="px-2 py-1 text-right">Total</th>}
                </tr></thead>
                <tbody>
                  {shown.slice(0, 300).map((r, i) => (
                    <Fragment key={r.id}>
                    <tr className="border-t border-zinc-800">
                      {!crHidden.has("num") && <td className="px-2 py-1 text-zinc-500">{i + 1}</td>}
                      {!crHidden.has("ex") && <td className="px-2 py-1"><input type="checkbox" checked={exSel.has(r.id)} onChange={() => toggleEx(r.id)} aria-label={`exclude ${r.id}`} /></td>}
                      {!crHidden.has("post") && <td className="max-w-64 truncate px-2 py-1" title={`${r.title} · ${r.id}`}><button onClick={() => setKillOpen((p) => { const n = new Set(p); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} className="mr-1 text-zinc-500 hover:text-zinc-200" title="Hook/hold diagnostics">{killOpen.has(r.id) ? "▾" : "▸"}</button>{r.title || (r.id === "-1" ? "Unattributed" : `post ${r.id.slice(0, 8)}…`)}</td>}
                      {!crHidden.has("postid") && <td className="whitespace-nowrap px-2 py-1 font-mono text-[11px] text-zinc-300" title={`${r.id} (click to copy)`} onClick={() => { try { void navigator.clipboard.writeText(String(r.id ?? "")); } catch { /* clipboard unavailable */ } }} style={{ cursor: "copy" }}>{r.id === "-1" ? "—" : r.id}</td>}
                      {!crHidden.has("posted") && <td className="whitespace-nowrap px-2 py-1 text-zinc-300" title={(r as any).postedAt ? `TikTok posted ${(r as any).postedAt}` : "TikTok posted time unknown — Sync from TikTok to fill"}>{postedDay((r as any).postedAt) || "—"}</td>}
                      {!crHidden.has("age") && <td className="px-2 py-1 text-right tabular-nums text-zinc-400">{postedAge((r as any).postedAt)}</td>}
                      {!crHidden.has("shape") && <td className="px-2 py-1"><button onClick={() => setSoloId(r.id)} title="Enlarge trend">{shapeSvg(rdays.map((d) => { const v = r.perDay.get(d); return v ? dmv(v) : null; }))}</button></td>}
                      {!crHidden.has("account") && <td className="whitespace-nowrap px-2 py-1">{r.account || "—"}{(r.account && r.account !== "Product card") ? (() => {
                        const k = acctKind(r.account);
                        const hot = k === "inactive" && Number(r.cost ?? 0) > 0;
                        const cls = hot ? "bg-red-900 text-red-200" : k === "top affiliate" ? "bg-emerald-900 text-emerald-200" : k === "affiliate" ? "bg-sky-900 text-sky-200" : k === "inactive" ? "bg-zinc-700 text-zinc-400" : "bg-zinc-700 text-zinc-300";
                        return <span title={hot ? "inactive account but spending" : `account kind: ${k}`} className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${cls}`}>{hot ? "⚠ inactive" : k}</span>;
                      })() : null}</td>}
                      {!crHidden.has("status") && <td className="whitespace-nowrap px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "DELIVERING" ? "bg-emerald-900 text-emerald-200" : "bg-zinc-700 text-zinc-300"}`}>{r.status || "—"}</span></td>}
                      {!crHidden.has("days") && <td className="px-2 py-1 text-right text-zinc-400">{r.days}</td>}
                      {!crHidden.has("spend") && <td className="px-2 py-1 text-right">{r.cost.toFixed(2)}</td>}
                      {!crHidden.has("gmv") && <td className="px-2 py-1 text-right">{r.gmv.toFixed(2)}</td>}
                      {!crHidden.has("roi") && <td className={`px-2 py-1 text-right font-medium ${r.roi >= 10 ? "text-emerald-300" : r.roi < 2 && r.cost >= 20 ? "text-red-300" : ""}`}>{r.roi.toFixed(2)}</td>}
                      {!crHidden.has("verdict") && <td className="px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.verdict === "KILL" ? "bg-red-950 text-red-200" : r.verdict === "SCALE" ? "bg-emerald-900 text-emerald-200" : r.verdict === "FATIGUE" ? "bg-orange-950 text-orange-200" : r.verdict === "WATCH" ? "bg-amber-950 text-amber-200" : "text-zinc-500"}`}>{r.verdict}</span></td>}
                      {!crHidden.has("why") && <td className="max-w-64 truncate px-2 py-1 text-[11px] text-zinc-400" title={r.reason}>{r.reason}</td>}
                      {dailyOpen && rdays.map((d) => { const v = r.perDay.get(d); return (<td key={d} className="px-2 py-1 text-right tabular-nums">{v ? dmv(v).toFixed(2) : "="}</td>); })}
                      {dailyOpen && <td className="px-2 py-1 text-right font-medium tabular-nums">{rdays.reduce((s, d) => { const v = r.perDay.get(d); return s + (v ? dmv(v) : 0); }, 0).toFixed(2)}</td>}
                    </tr>
                    {killOpen.has(r.id) && (
                      <tr key={`${r.id}-diag`} className="border-t border-zinc-800 bg-black/40">
                        <td colSpan={visCols} className="px-2 py-1 pl-8 text-[11px] text-zinc-400" title="Impression-weighted across the range · view rates as reported by TikTok">
                          Hook 2s {f1d(davg(r, r.w2s))} · 6s {f1d(davg(r, r.w6s))} · Hold p25 {f1d(davg(r, r.w25))} · p50 {f1d(davg(r, r.w50))} · p75 {f1d(davg(r, r.w75))} · p100 {f1d(davg(r, r.w100))} · CTR {pct2(r.ctr)} · CVR {pct2(r.cvr)} <button onClick={() => setSoloId(r.id)} className="ml-1 rounded border border-zinc-700 px-1.5 text-[11px] hover:bg-zinc-800" title="Enlarge trend">trend ↗</button>
                          {(() => {
                            const pdays = crRows
                              .filter((x: any) => String(x.item_id ?? "?") === r.id)
                              .sort((a: any, b: any) => (String(a.date) < String(b.date) ? -1 : 1));
                            if (pdays.length < 2) return null;
                            const mx = Math.max(...pdays.map((x: any) => Number(x.gmv ?? 0)), 0);
                            const pts = pdays.map((x: any, i: number) => `${(i / Math.max(pdays.length - 1, 1)) * 200},${40 - (mx > 0 ? (Number(x.gmv ?? 0) / mx) * 36 : 0)}`).join(" ");
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <svg viewBox="0 0 200 44" className="h-11 w-52" role="img" aria-label="Per-day GMV">
                                  <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="2" />
                                </svg>
                                <span className="tabular-nums">
                                  {pdays.map((x: any) => `${String(x.date).slice(5)}: ${Number(x.cost ?? 0).toFixed(0)}/${Number(x.gmv ?? 0).toFixed(0)}`).join(" · ")}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {shown.length > 300 && <p className="mt-1 text-[11px] text-zinc-500">Showing top 300 by spend — full list in CSV.</p>}
          </div>
            {soloK && (() => {
              const svals = rdays.map((d) => { const v = soloK.perDay.get(d); return v ? dmv(v) : null; });
              const present = svals.filter((v): v is number => v !== null);
              const stot = present.reduce((s, v) => s + v, 0);
              const latest = present.length > 0 ? present[present.length - 1] : NaN;
              const first = present.length > 0 ? present[0] : NaN;
              const sdays = rdays.map((d) => { const v = soloK.perDay.get(d); return v ? { date: d, gmv: v.gmv, cost: v.cost, orders: v.orders } : { date: d, gmv: 0, cost: 0, orders: 0, gap: true }; });
              const stat = (l: string, v: string) => (
                <div className="rounded-lg bg-zinc-900 px-2 py-1.5"><div className="text-[10px] text-zinc-500">{l}</div><div className="text-sm font-medium tabular-nums">{v}</div></div>
              );
              const f2s = (v: number) => v.toFixed(2);
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSoloId(null)}>
                  <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{soloK.title || soloK.id}</div>
                        <div className="text-[11px] text-zinc-500">{soloK.id} · {soloK.account} · {soloK.verdict} · Metric: {TREND_METRIC_LABEL[trendMetric]}</div>
                      </div>
                      <button onClick={() => setSoloId(null)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">✕ Close</button>
                    </div>
                    <TrendChart days={sdays} sel={[trendMetric]} />
                    <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                      {stat(`Total ${TREND_METRIC_LABEL[trendMetric]}`, Number.isFinite(stot) ? f2s(stot) : "—")}
                      {stat("Latest day", Number.isFinite(latest) ? f2s(latest) : "—")}
                      {stat("Δ latest–first", Number.isFinite(latest) && Number.isFinite(first) ? `${latest >= first ? "+" : ""}${f2s(latest - first)}` : "—")}
                      {stat("Days present", `${present.length}/${rdays.length}`)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        );
      })()}

      {(() => {
        if (crRows.length === 0) return null;
        const byDay = new Map<string, { gmv: number; cost: number; orders: number }>();
        for (const r of crShown) {
          const d = String(r.date ?? "").slice(0, 10);
          let e = byDay.get(d);
          if (!e) { e = { gmv: 0, cost: 0, orders: 0 }; byDay.set(d, e); }
          e.gmv += Number(r.gmv ?? 0);
          e.cost += Number(r.cost ?? 0);
          e.orders += Number(r.orders ?? 0);
        }
        const n = isoDayCount(crStart, crEnd);
        const full: { date: string; gmv: number; cost: number; orders: number; gap?: boolean }[] = [];
        for (let i = 0; i < n && i < 31; i++) {
          const d = isoAddDays(crStart, i);
          const v = byDay.get(d);
          full.push(v ? { date: d, ...v } : { date: d, gmv: 0, cost: 0, orders: 0, gap: true });
        }
        const tot = { gmv: 0, cost: 0, orders: 0 };
        for (const [, v] of byDay) { tot.gmv += v.gmv; tot.cost += v.cost; tot.orders += v.orders; }
        const hasPrev = trendPrev && Number(trendPrev.n ?? 0) > 0;
        const pCost = Number(trendPrev?.cost ?? 0), pGmv = Number(trendPrev?.gmv ?? 0), pOrd = Number(trendPrev?.orders ?? 0);
        const cur: Record<string, number | null> = {
          cost: tot.cost, gmv: tot.gmv, orders: tot.orders,
          cpo: tot.orders > 0 ? tot.cost / tot.orders : null,
          roi: tot.cost > 0 ? tot.gmv / tot.cost : null,
        };
        const prv: Record<string, number | null> = {
          cost: pCost, gmv: pGmv, orders: pOrd,
          cpo: pOrd > 0 ? pCost / pOrd : null,
          roi: pCost > 0 ? pGmv / pCost : null,
        };
        const delta = (k: string) => {
          const c = cur[k], p = prv[k];
          if (!hasPrev || c === null || p === null || !(p > 0)) return null;
          return ((c - p) / p) * 100;
        };
        const fmtVal = (k: string, v: number | null) => {
          if (v === null || !Number.isFinite(v)) return "—";
          if (k === "orders") return Math.round(v).toLocaleString("en-MY");
          return `${v.toFixed(2)}${TREND_DEFS[k]?.suffix ?? ""}`;
        };
        const dataDays = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-zinc-200">Daily trend (ads){crStatus !== "ALL" ? ` · ${crStatus}` : ""}</h3>
            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Object.keys(TREND_DEFS).map((k) => {
                const on = trendSel.includes(k);
                const d = delta(k);
                const good = d === null ? null : TREND_DEFS[k].goodDown ? d <= 0 : d >= 0;
                return (
                  <div key={k} className={`relative rounded-lg border px-2 py-1.5 ${on ? "border-teal-400 bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleTrend(k)} title="Tick up to 2 to draw" className="absolute right-2 top-2" aria-label={`draw ${TREND_DEFS[k].label}`} />
                    <div className="text-[10px] text-zinc-500">{TREND_DEFS[k].label}</div>
                    <div className="text-sm font-medium tabular-nums">{fmtVal(k, cur[k])}</div>
                    <div className={`text-[11px] tabular-nums ${d === null ? "text-zinc-600" : good ? "text-emerald-400" : "text-red-400"}`}>
                      vs previous {d === null ? "—" : `${d >= 0 ? "+" : ""}${d.toFixed(2)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <TrendChart days={full} sel={trendSel} />
              <p className="mt-1 text-[11px] text-zinc-500">Tick up to 2 cards to draw. Missing days break the line.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead><tr className="text-zinc-400"><th className="px-2 py-1 text-left text-xs uppercase tracking-wide font-medium">Day</th><th className="px-2 py-1 text-right text-xs uppercase tracking-wide font-medium">GMV</th><th className="px-2 py-1 text-right text-xs uppercase tracking-wide font-medium">Cost</th><th className="px-2 py-1 text-right text-xs uppercase tracking-wide font-medium">Orders</th><th className="px-2 py-1 text-right text-xs uppercase tracking-wide font-medium">ROI</th></tr></thead>
                <tbody>
                  {dataDays.map(([d, v]) => (
                    <tr key={d} className="border-t border-zinc-800">
                      <td className="px-2 py-1 text-zinc-300">{d}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.gmv.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.cost.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.orders}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.cost > 0 ? (v.gmv / v.cost).toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {(() => {
        if (crRows.length === 0) return null;
        const tmap = new Map<string, Map<string, { gmv: number; cost: number; orders: number }>>();
        const tmeta = new Map<string, { title: string; account: string; group: string }>();
        for (const r of crShown) {
          const id = String(r.item_id ?? "?");
          const d = String(r.date ?? "").slice(0, 10);
          if (!tmap.has(id)) tmap.set(id, new Map());
          const dm = tmap.get(id)!;
          const e = dm.get(d) ?? { gmv: 0, cost: 0, orders: 0 };
          e.gmv += Number(r.gmv ?? 0); e.cost += Number(r.cost ?? 0); e.orders += Number(r.orders ?? 0);
          dm.set(d, e);
          if (!tmeta.has(id)) {
            tmeta.set(id, { title: String(r.title ?? ""), account: String(r.tt_account ?? "—"), group: String(r.item_group_id ?? "") });
          } else if (!tmeta.get(id)!.group && r.item_group_id) {
            tmeta.get(id)!.group = String(r.item_group_id);
          }
        }
        const n = isoDayCount(crStart, crEnd);
        const rdays: string[] = [];
        for (let i = 0; i < n && i < 31; i++) rdays.push(isoAddDays(crStart, i));
        const mv = (o: { gmv: number; cost: number; orders: number }) => (trendMetric === "cost" ? o.cost : trendMetric === "orders" ? o.orders : o.gmv);
        const vmap = new Map(killList().rows.map((x: any) => [x.id, x.verdict]));
        const posts = [...tmap.entries()].map(([id, dm]) => {
          const tot = { gmv: 0, cost: 0, orders: 0 };
          for (const [, v] of dm) { tot.gmv += v.gmv; tot.cost += v.cost; tot.orders += v.orders; }
          const m = tmeta.get(id)!;
          return { id, dm, tot, title: m.title, account: m.account, group: m.group, verdict: String(vmap.get(id) ?? "—") };
        });
        posts.sort((a, b) => mv(b.tot) - mv(a.tot));
        const series = posts.slice(0, 10).map((p, i) => ({
          id: p.id,
          label: (p.title || `post …${p.id.slice(-4)}`).slice(0, 28),
          color: PALETTE[i % PALETTE.length],
          data: rdays.map((d) => { const v = p.dm.get(d); return v ? mv(v) : null; }),
        }));
        return (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-zinc-200">Trend per creative — {posts.length} videos</h3>
            <p className="mb-2 text-[11px] text-zinc-500">Top-10 lines below; per-day cells live in the kill list (Daily ▸). Metric drives both.</p>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
              <label className="text-zinc-400">Metric
                <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)} className="ml-1 rounded bg-zinc-900 px-2 py-1">
                  {Object.entries(TREND_METRIC_LABEL).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
                </select>
              </label>
              <button onClick={() => trendCsv(posts, rdays, trendMetric)} className="rounded-lg bg-emerald-700 px-3 py-1 hover:bg-emerald-600">Export trend CSV</button>
            </div>
            <div className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <TrendMultiChart days={rdays} series={series} />
            </div>
          </div>
        );
      })()}
      {crRows.length > 0 && (
        <div className="mb-2">
          <button onClick={() => setCrRowsOpen((v) => !v)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">
            {crRowsOpen ? `Hide all rows (${crRows.length})` : `Show all rows (${crRows.length}) ▾`}
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-red-400">{err}</p>}
      {out && (
        <div className="mt-3">
          <p className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">{verdict()}</p>
          <h3 className="mb-1 font-medium">GMV Max report grains</h3>
          {(Object.entries(out.gmv_max_report ?? {}) as [string, any][]).map(([promo, dims]) => (
            <div key={promo} className="mb-2 rounded-lg border border-zinc-800 px-3 py-2">
              <div className="font-medium">{promo}</div>
              {(Object.entries(dims) as [string, any][]).map(([d, v]) => (
                <div key={d} className="mt-1 text-[12px]">
                  <span className="text-zinc-300">{d}</span>
                  <span className={v.dims === "OK" ? "text-emerald-400" : "text-red-400"}> — {v.dims === "OK" ? "OK" : v.dims}</span>
                  {v.dims === "OK" && (
                    <div className="ml-3 text-zinc-500">
                      {Object.entries(v.guesses ?? {}).map(([m, s]) => (
                        <div key={m}>{m}: <span className={String(s) === "OK" ? "text-emerald-400" : "text-zinc-400"}>{String(s)}</span></div>
                      ))}
                      <div className="mt-1 break-all">sample: {String(v.sample ?? "—").slice(0, 400)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <h3 className="mb-1 mt-3 font-medium">Integrated BASIC grains</h3>
          {(Object.entries(out.integrated_basic ?? {}) as [string, any][]).map(([g, v]) => (
            <div key={g} className="mb-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
              <span className="text-zinc-300">{g}</span>
              <span className={v.full_set === "OK" ? "text-emerald-400" : "text-red-400"}> — {v.full_set}</span>
              {v.full_set === "OK"
                ? <div className="mt-1 break-all text-zinc-500">sample: {String(v.sample ?? "—").slice(0, 400)}</div>
                : Object.entries(v.per_metric ?? {}).map(([m, s]) => (
                  <div key={m} className="ml-3 text-zinc-500">{m}: <span className={String(s) === "OK" ? "text-emerald-400" : "text-red-400"}>{String(s)}</span></div>
                ))}
            </div>
          ))}
          <h3 className="mb-1 mt-3 font-medium">Round 2 — PRODUCT xlsx mapping</h3>
          {out.round2 ? (
            <div className="mb-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
              <div className="text-zinc-300">Shopping / rate / quartile metrics (AUCTION_AD)</div>
              {Object.entries(out.round2.metrics ?? {}).map(([m, s]) => (
                <div key={m} className="ml-3 text-zinc-500">{m}: <span className={String(s) === "OK" ? "text-emerald-400" : "text-red-400"}>{String(s)}</span></div>
              ))}
              <div className="mt-2 text-zinc-300">PRODUCT campaigns: {JSON.stringify(out.round2.product_campaigns)}</div>
              <div className="mt-1 text-zinc-300">Membership (GMV ads as ad rows):</div>
              {(out.round2.membership?.attempts ?? []).map((a: any, i: number) => (
                <div key={i} className="ml-3 text-zinc-500">{a.shape}: <span className={a.code === 0 ? "text-emerald-400" : "text-red-400"}>{a.code === 0 ? `OK, ${a.rows} rows` : `code=${a.code} ${a.message ?? a.error ?? ""}`}</span>
                  {a.sample && <div className="break-all">sample: {String(a.sample).slice(0, 400)}</div>}
                </div>
              ))}
              <div className="mt-1 text-zinc-300">Ad detail:</div>
              {(out.round2.ad_detail?.attempts ?? []).map((a: any, i: number) => (
                <div key={i} className="ml-3 text-zinc-500">{a.shape}: <span className={a.code === 0 && a.count > 0 ? "text-emerald-400" : "text-red-400"}>{a.code === 0 ? `code 0, count ${a.count}` : `code=${a.code} ${a.message ?? a.error ?? ""}`}</span>
                  {a.itemKeys?.length > 0 && <div className="break-all">keys: {a.itemKeys.join(", ").slice(0, 500)}</div>}
                  {a.sample && <div className="break-all">sample: {String(a.sample).slice(0, 600)}</div>}
                </div>
              ))}
              {out.round2.ad_detail?.member_ad_ids?.length > 0 && <div className="ml-3 text-zinc-500">member ad_ids: {out.round2.ad_detail.member_ad_ids.join(", ")}</div>}
          <h3 className="mb-1 mt-3 font-medium">Round 7 — Time-posted candidates (real post IDs)</h3>
          {out.round7 ? (
            <div className="mb-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
              <div className="text-zinc-300">Samples: {JSON.stringify(out.round7.samples ?? out.round7.samples_error ?? out.round7.note ?? [])}</div>
              {out.round7.video_ad_info && (
                <div className="ml-3 mt-1 text-zinc-500">file/video/ad/info: <span className={out.round7.video_ad_info.code === 0 ? "text-emerald-400" : "text-red-400"}>{out.round7.video_ad_info.code === 0 ? `code 0, ${out.round7.video_ad_info.rows} rows` : `code=${out.round7.video_ad_info.code} ${out.round7.video_ad_info.message ?? out.round7.video_ad_info.error ?? ""}`}</span>
                  {out.round7.video_ad_info.sample && <div className="break-all">sample: {String(out.round7.video_ad_info.sample).slice(0, 500)}</div>}
                </div>
              )}
              {out.round7.ad_get && (
                <div className="ml-3 mt-1 text-zinc-500">ad/get: <span className={out.round7.ad_get.code === 0 ? "text-emerald-400" : "text-red-400"}>{out.round7.ad_get.code === 0 ? `code 0, ${out.round7.ad_get.rows} ads, post-id ${out.round7.ad_get.with_tiktok_item_id}, create_time ${out.round7.ad_get.with_create_time}, sample-match ${out.round7.ad_get.sample_match}` : `code=${out.round7.ad_get.code} ${out.round7.ad_get.message ?? out.round7.ad_get.error ?? ""}`}</span>
                  {out.round7.ad_get.firstKeys?.length > 0 && <div className="break-all">keys: {out.round7.ad_get.firstKeys.join(", ").slice(0, 500)}</div>}
                  {out.round7.ad_get.firstSample && <div className="break-all">sample: {String(out.round7.ad_get.firstSample).slice(0, 500)}</div>}
                </div>
              )}
              {(out.round7.gmv_video_get?.attempts ?? []).map((a: any, i: number) => (
                <div key={i} className="ml-3 mt-1 text-zinc-500">gmv_max/video/get [{a.shape}]: <span className={a.code === 0 ? "text-emerald-400" : "text-red-400"}>{a.code === 0 ? `code 0, ${a.rows} rows` : `code=${a.code} ${a.message ?? a.error ?? ""}`}</span>
                  {a.sample && <div className="break-all">sample: {String(a.sample).slice(0, 500)}</div>}
                </div>
              ))}
              {out.round7.creative_report_get && (
                <div className="ml-3 mt-1 text-zinc-500">creative/report/get: <span className={out.round7.creative_report_get.code === 0 ? "text-emerald-400" : "text-red-400"}>{out.round7.creative_report_get.code === 0 ? `code 0, ${out.round7.creative_report_get.rows} rows` : `code=${out.round7.creative_report_get.code} ${out.round7.creative_report_get.message ?? out.round7.creative_report_get.error ?? ""}`}</span>
                  {out.round7.creative_report_get.sample && <div className="break-all">sample: {String(out.round7.creative_report_get.sample).slice(0, 500)}</div>}
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">No round7 section — redeploy pending.</p>
          )}
          <h3 className="mb-1 mt-3 font-medium">Round 5 — PRODUCT creative grain (item_id)</h3>
          {out.round5 ? (
            <div className="mb-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
              <div className="text-zinc-300">Campaign: {String(out.round5.campaignId ?? "—")}</div>
              <div className="text-zinc-300">Product grain: <span className={String(out.round5.product_grain ?? "").startsWith("OK") ? "text-emerald-400" : "text-red-400"}>{String(out.round5.product_grain ?? out.round5.note ?? "—")}</span></div>
              <div className="text-zinc-300">Full creative set: <span className={String(out.round5.full_set ?? "").startsWith("OK") ? "text-emerald-400" : "text-red-400"}>{String(out.round5.full_set ?? out.round5.error ?? "—")}</span></div>
              {out.round5.sample && <div className="ml-3 break-all text-zinc-500">sample: {String(out.round5.sample).slice(0, 800)}</div>}
              {out.round5.per_metric && Object.entries(out.round5.per_metric).map(([m, s]) => (
                <div key={m} className="ml-3 text-zinc-500">{m}: <span className={String(s) === "OK" ? "text-emerald-400" : "text-red-400"}>{String(s)}</span></div>
              ))}
              <div className="mt-1 text-zinc-300">Day grain: <span className={String(out.round5.day_grain ?? "").startsWith("OK") ? "text-emerald-400" : "text-red-400"}>{String(out.round5.day_grain ?? "—")}</span></div>
              {out.round5.day_sample && <div className="ml-3 break-all text-zinc-500">sample: {String(out.round5.day_sample).slice(0, 600)}</div>}
              <div className="mt-1 text-zinc-300">Status filter (DELIVERING): <span className={String(out.round5.status_filter ?? "").startsWith("OK") ? "text-emerald-400" : "text-red-400"}>{String(out.round5.status_filter ?? "—")}</span></div>
            </div>
          ) : (
            <p className="text-zinc-500">No round5 section — redeploy pending.</p>
          )}
            </div>
          ) : (
            <p className="text-zinc-500">No round2 section — redeploy pending.</p>
          )}
        </div>
      )}
      {crRowsOpen && crShown.length > 0 && (
        <div className="mb-2 mt-4 overflow-x-auto rounded-lg border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">All rows ({crShown.length})</div>
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-zinc-400">
              <th className="px-2 py-1">#</th><th className="px-2 py-1">Date</th><th className="px-2 py-1">Post ID</th><th className="px-2 py-1">Posted</th><th className="px-2 py-1 text-right">Age</th><th className="px-2 py-1">Creative</th>
              <th className="px-2 py-1">Account</th><th className="px-2 py-1">Status</th>
              <th className="px-2 py-1 text-right">Cost</th><th className="px-2 py-1 text-right">Orders</th>
              <th className="px-2 py-1 text-right">GMV</th><th className="px-2 py-1 text-right">ROI</th>
            </tr></thead>
            <tbody>
              {crShown.map((r: any, i: number) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-2 py-1 text-zinc-500">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-zinc-500">{String(r.date).slice(0, 10)}</td>
                  <td className="whitespace-nowrap px-2 py-1 font-mono text-[11px] text-zinc-300" title={`${r.item_id ?? ""} (click to copy)`} onClick={() => { try { void navigator.clipboard.writeText(String(r.item_id ?? "")); } catch { /* clipboard unavailable */ } }} style={{ cursor: "copy" }}>{String(r.item_id ?? "—")}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-zinc-300">{postedDay((r as any).posted_at) || "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-zinc-400">{postedAge((r as any).posted_at)}</td>
                  <td className="max-w-64 truncate px-2 py-1" title={`${r.title ?? ""} · ${r.item_id ?? ""}`}>{r.title || (r.item_id === "-1" ? "Unattributed" : `post ${r.item_id}`)}</td>
                  <td className="whitespace-nowrap px-2 py-1">{r.tt_account || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "DELIVERING" ? "bg-emerald-900 text-emerald-200" : "bg-zinc-700 text-zinc-300"}`}>{r.status || "—"}</span></td>
                  <td className="px-2 py-1 text-right">{Number(r.cost ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{r.orders}</td>
                  <td className="px-2 py-1 text-right">{Number(r.gmv ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{Number(r.roi ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
