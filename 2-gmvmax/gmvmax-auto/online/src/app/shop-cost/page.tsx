"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import DateRangePicker from "../DateRangePicker";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";
import { rangeLabel } from "@/lib/ttam-scores";
import { chartTheme, useThemeTick } from "../theme";

// /shop-cost — spend share per stream (LIVE / Product / TTAM), ads spend only.
// Server: src/lib/shop-cost.ts via GET /api/shop-cost (shop 1, ≤31d).
const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctTxt = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? "—" : `${Number(v).toFixed(1)}%`;
const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const shortDay = (d: string) => String(d ?? "").slice(5);

function minMax(
  days: any[],
  pick: (d: any) => number
): { low: number; lowDate: string; high: number; highDate: string } | null {
  if (!Array.isArray(days) || days.length === 0) return null;
  let low = Infinity;
  let high = -Infinity;
  let lowDate = "";
  let highDate = "";
  for (const d of days) {
    const v = Number(pick(d)) || 0;
    const date = String(d?.date ?? "");
    if (v < low) {
      low = v;
      lowDate = date;
    }
    if (v > high) {
      high = v;
      highDate = date;
    }
  }
  return {
    low: low === Infinity ? 0 : low,
    lowDate,
    high: high === -Infinity ? 0 : high,
    highDate,
  };
}

function RangeLine({
  mm,
}: {
  mm: { low: number; lowDate: string; high: number; highDate: string } | null;
}) {
  if (!mm || !mm.lowDate || !mm.highDate) return null;
  return (
    <div
      className="mt-0.5 text-xs tabular-nums text-zinc-500"
      title={`Low ${mm.lowDate} · High ${mm.highDate}`}
    >
      Low RM {fmt(mm.low)} ({shortDay(mm.lowDate)}) · High RM {fmt(mm.high)} ({shortDay(mm.highDate)})
    </div>
  );
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Stream = "live" | "product" | "ttam";

function mytToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}
function daysAgo(n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(mytToday())!;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
}

const STREAM_META: { id: Stream; label: string; short: string; color: string }[] = [
  { id: "live", label: "LIVE GMV Max", short: "Live", color: "#34d399" },
  { id: "product", label: "Product GMV Max", short: "Product", color: "#60a5fa" },
  { id: "ttam", label: "TTAM", short: "TTAM", color: "#fbbf24" },
];

// 2-system view: GMV Max (Live + Product, one system) vs TTAM (other system).
const GMV_COLOR = "#2dd4bf";
const GMV_LABEL = "GMV Max";

export default function ShopCostPage() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => mytToday());
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [prog, setProg] = useState<string | null>(null);
  const progCancelRef = useRef(false);
  const [stream, setStream] = useState<Stream>("live");
  const [hideZero, setHideZero] = useState(true);
  const [trendMode, setTrendMode] = useState<"pct" | "rm">("pct");
  const [viewMode, setViewMode] = useState<"three" | "two">("three");
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartObj = useRef<Chart | null>(null);

  function splitCost30(s: string, e: string): Array<{ s: string; e: string }> {
    const out: Array<{ s: string; e: string }> = [];
    let hi = e;
    while (hi >= s) {
      const hiMs = new Date(`${hi}T00:00:00Z`).getTime();
      let loMs = hiMs - 29 * 86400000;
      const sMs = new Date(`${s}T00:00:00Z`).getTime();
      if (loMs < sMs) loMs = sMs;
      const lo = new Date(loMs).toISOString().slice(0, 10);
      out.push({ s: lo, e: hi });
      if (lo <= s) break;
      hi = new Date(loMs - 86400000).toISOString().slice(0, 10);
    }
    return out;
  }

  // Merge per-slice /api/shop-cost bodies: days concat, campaigns sum per
  // stream, totals + shares recomputed. Newest slice first (fail-open).
  function mergeCostSlices(bodies: any[], f: string, t: string) {
    const first = bodies[0] ?? {};
    const days = bodies
      .flatMap((b) => b.days ?? [])
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
    const streams = ["live", "product", "ttam"] as const;
    const campaigns: Record<string, any[]> = {};
    for (const s of streams) {
      const m = new Map<string, any>();
      for (const b of bodies) {
        for (const c of b.campaigns?.[s] ?? []) {
          const id = String(c.campaignId ?? "");
          if (!id) continue;
          const prev = m.get(id);
          if (prev) {
            prev.spend = Number(prev.spend ?? 0) + Number(c.spend ?? 0);
            prev.gmv = Number(prev.gmv ?? 0) + Number(c.gmv ?? 0);
            prev.orders = Number(prev.orders ?? 0) + Number(c.orders ?? 0);
          } else {
            m.set(id, { ...c });
          }
        }
      }
      campaigns[s] = [...m.values()];
    }
    const sumStream = (s: string) => campaigns[s].reduce((n: number, c: any) => n + Number(c.spend ?? 0), 0);
    const live = sumStream("live"), product = sumStream("product"), ttam = sumStream("ttam");
    const grand = live + product + ttam;
    const pct = (v: number) => (grand > 0 ? (v / grand) * 100 : null);
    const totals = { live, product, ttam, total: grand, livePct: pct(live), productPct: pct(product), ttamPct: pct(ttam) };
    for (const s of streams) {
      const st = (totals as any)[s];
      for (const c of campaigns[s]) {
        c.pctOfStream = st > 0 ? (Number(c.spend ?? 0) / st) * 100 : null;
        c.pctOfTotal = grand > 0 ? (Number(c.spend ?? 0) / grand) * 100 : null;
      }
      campaigns[s].sort((a: any, b: any) => Number(b.spend ?? 0) - Number(a.spend ?? 0));
    }
    return {
      ...first,
      shopNumber: first.shopNumber ?? "1",
      shopName: first.shopName,
      currency: "MYR",
      dateRange: { start: f, end: t },
      totals, days, campaigns,
    };
  }

  async function fetchCost(f: string, t: string) {
    setLoading(true);
    setProg(null);
    progCancelRef.current = false;
    try {
      const spanMs = new Date(`${t}T00:00:00Z`).getTime() - new Date(`${f}T00:00:00Z`).getTime();
      const chunks = spanMs / 86400000 + 1 > 31 ? splitCost30(f, t) : [{ s: f, e: t }];
      const bodies: any[] = [];
      const failed: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        if (progCancelRef.current) break;
        const ch = chunks[i];
        if (chunks.length > 1) setProg(`Fetching ${i + 1}/${chunks.length}…`);
        try {
          const r = await fetch(
            `/api/shop-cost?shopNumber=1&startDate=${ch.s}&endDate=${ch.e}`
          );
          const body = await r.json();
          if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
          bodies.push(body);
        } catch (e) {
          failed.push(rangeLabel(ch.s, ch.e));
        }
      }
      setProg(null);
      if (!bodies.length) {
        throw new Error(failed.length ? `all ${failed.length} slice(s) failed: ${failed.join(", ")}` : "fetch failed");
      }
      const merged = mergeCostSlices(bodies, f, t);
      (merged as any)._longNotice =
        chunks.length > 1 || failed.length || progCancelRef.current
          ? `${progCancelRef.current ? "Cancelled" : "Long range"}: ${bodies.length}/${chunks.length} slice(s)${failed.length ? ` · ${failed.length} failed: ${failed.join(", ")}` : ""} · sums merge.`
          : null;
      setData(merged);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      toast(m, "err");
    } finally {
      setLoading(false);
      setProg(null);
    }
  }

  useEffect(() => {
    fetchCost(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trend: stacked 100% area — composition over time. Skipped for single-day
  // ranges (one point is not a trend) and empty ranges (empty state instead).
  const showTrend = !!data?.days && data.days.length > 1 && Number(data?.totals?.total ?? 0) > 0;
  const themeTick = useThemeTick(); // rebuild canvas chart on theme toggle
  useEffect(() => {
    if (!chartRef.current || !showTrend) return;
    chartObj.current?.destroy();
    const ct = chartTheme();
    const isPct = trendMode === "pct";
    const isTwo = viewMode === "two";
    const labels = data.days.map((d: any) => String(d.date).slice(5));
    const pctOf = (d: any, k: Stream) =>
      k === "live" ? d.livePct : k === "product" ? d.productPct : d.ttamPct;
    const rmOf = (d: any, k: Stream) =>
      k === "live" ? d.live : k === "product" ? d.product : d.ttam;
    const dayGmv = (d: any) => Number(d.live ?? 0) + Number(d.product ?? 0);
    const dayTotal = (d: any) => Number(d.total ?? 0) || dayGmv(d) + Number(d.ttam ?? 0);
    const gmvPctOf = (d: any) => {
      const tot = dayTotal(d);
      return tot > 0 ? (dayGmv(d) / tot) * 100 : 0;
    };
    const ttamPctOf = (d: any) => {
      const tot = dayTotal(d);
      return tot > 0 ? (Number(d.ttam ?? 0) / tot) * 100 : 0;
    };
    const series = isTwo
      ? [
          { label: GMV_LABEL, color: GMV_COLOR },
          { label: "TTAM", color: "#fbbf24" },
        ]
      : STREAM_META.map((s) => ({ label: s.label, color: s.color }));
    const valueOf = (d: any, idx: number): number => {
      if (!isTwo) {
        const s = STREAM_META[idx];
        return isPct ? pctOf(d, s.id) ?? 0 : rmOf(d, s.id) ?? 0;
      }
      if (idx === 0) return isPct ? gmvPctOf(d) : dayGmv(d);
      return isPct ? ttamPctOf(d) : Number(d.ttam ?? 0);
    };
    const c = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          ...series.map((s, i) => ({
            label: s.label,
            data: data.days.map((d: any) => valueOf(d, i)),
            borderColor: s.color,
            backgroundColor: `${s.color}66`,
            fill: i === 0 ? "origin" : "-1",
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
            yAxisID: "y",
          })),
          {
            label: "Total",
            data: data.days.map((d: any) => dayTotal(d)),
            borderColor: "#e4e4e7",
            backgroundColor: "transparent",
            fill: false,
            tension: 0,
            pointRadius: 2,
            pointBackgroundColor: "#e4e4e7",
            borderWidth: 2,
            borderDash: [6, 4],
            yAxisID: isPct ? "y1" : "y",
            order: -1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion() ? false : { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: ct.label, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx: any) =>
                ctx.dataset.label === "Total" || !isPct
                  ? ` ${ctx.dataset.label}: RM ${fmt(Number(ctx.parsed?.y ?? 0))}`
                  : ` ${ctx.dataset.label}: ${Number(ctx.parsed?.y ?? 0).toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { color: ct.tick }, grid: { color: ct.grid } },
          y: isPct
            ? {
                stacked: true,
                max: 100,
                ticks: { color: ct.tick, callback: (v: any) => `${intFmt.format(Number(v))}%` },
                grid: { color: ct.grid },
              }
            : {
                stacked: true,
                ticks: {
                  color: ct.tick,
                  callback: (v: any) => `RM ${intFmt.format(Number(v))}`,
                },
                grid: { color: ct.grid },
              },
          ...(isPct
            ? {
                y1: {
                  position: "right" as const,
                  ticks: {
                    color: ct.tick,
                    callback: (v: any) => `RM ${intFmt.format(Number(v))}`,
                  },
                  grid: { display: false },
                },
              }
            : {}),
        },
      },
    });
    chartObj.current = c;
    return () => c.destroy();
  }, [data, showTrend, themeTick, trendMode, viewMode]);

  const t = data?.totals;
  // 2-system derived totals: GMV Max = Live + Product (one system) vs TTAM.
  const gmvTotal = t ? Number(t.live ?? 0) + Number(t.product ?? 0) : 0;
  const ttamTotal = t ? Number(t.ttam ?? 0) : 0;
  const grandTotal = t ? Number(t.total ?? 0) || gmvTotal + ttamTotal : 0;
  const gmvPct = grandTotal > 0 ? (gmvTotal / grandTotal) * 100 : null;
  const ttamPct2 = grandTotal > 0 ? (ttamTotal / grandTotal) * 100 : null;
  const diffRm = gmvTotal - ttamTotal;
  const diffPp =
    gmvPct !== null && ttamPct2 !== null ? gmvPct - ttamPct2 : null;
  const diffTxt =
    diffPp === null || !Number.isFinite(diffPp)
      ? "—"
      : `${diffPp >= 0 ? "+" : "−"}${Math.abs(diffPp).toFixed(1)}pp`;
  const dayCount = Array.isArray(data?.days) ? data.days.length : 0;
  const avgTotal = dayCount > 0 ? grandTotal / dayCount : null;
  const dayRows: any[] = Array.isArray(data?.days) ? data.days : [];
  const mmLive = minMax(dayRows, (d) => d.live);
  const mmProduct = minMax(dayRows, (d) => d.product);
  const mmTtam = minMax(dayRows, (d) => d.ttam);
  const mmGmv = minMax(dayRows, (d) => Number(d.live ?? 0) + Number(d.product ?? 0));
  const mmTotal = minMax(dayRows, (d) => d.total);
  const mmByStream: Record<Stream, typeof mmLive> = {
    live: mmLive,
    product: mmProduct,
    ttam: mmTtam,
  };
  const allCampaigns: any[] = data?.campaigns?.[stream] ?? [];
  const hiddenZeroCount = allCampaigns.filter((c: any) => !(Number(c.spend) > 0)).length;
  const campaigns = hideZero ? allCampaigns.filter((c: any) => Number(c.spend) > 0) : allCampaigns;
  const streamTotal = stream === "live" ? t?.live : stream === "product" ? t?.product : t?.ttam;
  // Hierarchy: streams ranked by spend desc, so the biggest cost reads first.
  const ranked = t
    ? [...STREAM_META]
        .map((s) => ({
          ...s,
          spend: s.id === "live" ? t.live : s.id === "product" ? t.product : t.ttam,
          share: s.id === "live" ? t.livePct : s.id === "product" ? t.productPct : t.ttamPct,
        }))
        .sort((a, b) => b.spend - a.spend)
    : [];
  const chartSummary =
    viewMode === "two"
      ? trendMode === "pct"
        ? t
          ? `GMV Max vs TTAM share ${data?.dateRange?.start} to ${data?.dateRange?.end}: GMV Max ${pctTxt(gmvPct)}, TTAM ${pctTxt(ttamPct2)} (${diffTxt})`
          : "GMV Max vs TTAM share trend chart"
        : t
          ? `GMV Max vs TTAM RM per day ${data?.dateRange?.start} to ${data?.dateRange?.end}: GMV Max RM ${fmt(gmvTotal)}, TTAM RM ${fmt(ttamTotal)}`
          : "GMV Max vs TTAM RM trend chart"
      : trendMode === "pct"
        ? t
          ? `Spend share ${data?.dateRange?.start} to ${data?.dateRange?.end}: ` +
            ranked.map((s) => `${s.short} ${pctTxt(s.share)}`).join(", ")
          : "Spend share trend chart"
        : t
          ? `Spend RM per day ${data?.dateRange?.start} to ${data?.dateRange?.end}: ` +
            ranked.map((s) => `${s.short} RM ${fmt(s.spend)}`).join(", ")
          : "Spend RM trend chart";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ModuleRedirect module="shop-cost" />
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Shop Cost — spend share</h2>
        <p className="text-xs text-zinc-500">
          Him.DrSamhan (shop 1) · ads spend only, no tax. Up to 12 months — long ranges fetch in 30d slices.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            ref={rangeBtnRef}
            onClick={() => {
              if (!calOpen && rangeBtnRef.current) {
                const r = rangeBtnRef.current.getBoundingClientRect();
                setCalPos({ top: r.bottom + 8, left: r.left });
              }
              setCalOpen((v) => !v);
            }}
            className={inputCls}
          >
            {rangeLabel(from, to)} <span aria-hidden="true">📅</span>
          </button>
          <button
            onClick={() => fetchCost(from, to)}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Fetching…" : "Fetch"}
          </button>
          {prog && <span className="text-xs text-zinc-400">{prog}</span>}
          {loading && prog && (
            <button
              onClick={() => { progCancelRef.current = true; }}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >Cancel</button>
          )}
          {(data as any)?._longNotice && (
            <span className="text-xs text-zinc-500">{(data as any)._longNotice}</span>
          )}
        </div>
      </div>

      {calOpen && (
        <DateRangePicker
          from={from}
          to={to}
          pos={calPos}
          maxDays={365} showLong
          onApply={(f, tt) => {
            setFrom(f);
            setTo(tt);
            setCalOpen(false);
            fetchCost(f, tt);
          }}
          onClose={() => setCalOpen(false)}
        />
      )}

      <div className="px-4 pb-16 pt-4">
        {t && (
          <>
            {/* Hero: total first, share bar + legend inside — one card answers
                "how much" and "where". Streams below ranked by spend desc. */}
            <div className={cardCls}>
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <div className="text-xs text-zinc-400">Total ads spend</div>
                  <div className="text-2xl font-semibold tabular-nums">RM {fmt(t.total)}</div>
                  <div className="mb-2 text-xs tabular-nums text-zinc-500">
                    {data?.dateRange ? rangeLabel(data.dateRange.start, data.dateRange.end) : ""}
                    {avgTotal !== null && ` · RM ${fmt(avgTotal)}/day avg`}
                  </div>
                  {mmTotal && (
                    <div
                      className="mb-2 text-xs tabular-nums text-zinc-500"
                      title={`Low ${mmTotal.lowDate} · High ${mmTotal.highDate}`}
                    >
                      Low RM {fmt(mmTotal.low)} ({shortDay(mmTotal.lowDate)}) · High RM{" "}
                      {fmt(mmTotal.high)} ({shortDay(mmTotal.highDate)})
                    </div>
                  )}
                </div>
                <span className="ml-auto flex gap-1">
                  <button
                    onClick={() => setViewMode("three")}
                    aria-pressed={viewMode === "three"}
                    title="Show Live / Product / TTAM separately"
                    className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "three" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                  >
                    3-way
                  </button>
                  <button
                    onClick={() => setViewMode("two")}
                    aria-pressed={viewMode === "two"}
                    title="Show GMV Max (Live + Product) vs TTAM"
                    className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "two" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                  >
                    2-way
                  </button>
                </span>
              </div>
              {viewMode === "three" ? (
                <>
                  <div
                    className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-800"
                    role="img"
                    aria-label={chartSummary}
                  >
                    {ranked.map((s) => {
                      const w = Number.isFinite(Number(s.share)) ? Number(s.share) : 0;
                      if (w <= 0) return null;
                      return <div key={s.id} style={{ width: `${w}%`, background: s.color }} />;
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    {ranked.map((s, i) => (
                      <div key={s.id} className="rounded-lg bg-zinc-950/60 px-2.5 py-2">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                          <span className="truncate">
                            #{i + 1} {s.label}
                          </span>
                          <span className="ml-auto shrink-0 text-zinc-500">{pctTxt(s.share)}</span>
                        </div>
                        <div className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100">
                          RM {fmt(s.spend)}
                        </div>
                        <div className="mt-0.5 text-xs tabular-nums text-zinc-500">
                          RM {fmt(dayCount > 0 ? Number(s.spend ?? 0) / dayCount : 0)}/day avg
                        </div>
                        <RangeLine mm={mmByStream[s.id]} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-800"
                    role="img"
                    aria-label={chartSummary}
                  >
                    {[
                      { id: "gmv", w: gmvPct, color: GMV_COLOR },
                      { id: "ttam", w: ttamPct2, color: "#fbbf24" },
                    ].map((s) => {
                      const w = Number.isFinite(Number(s.w)) ? Number(s.w) : 0;
                      if (w <= 0) return null;
                      return <div key={s.id} style={{ width: `${w}%`, background: s.color }} />;
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-zinc-950/60 px-2.5 py-2">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: GMV_COLOR }} />
                        <span className="truncate">{GMV_LABEL} (Live + Product)</span>
                        <span className="ml-auto shrink-0 text-zinc-500">{pctTxt(gmvPct)}</span>
                      </div>
                      <div className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100">
                        RM {fmt(gmvTotal)}
                      </div>
                      <div className="mt-0.5 text-xs tabular-nums text-zinc-500">
                        RM {fmt(dayCount > 0 ? gmvTotal / dayCount : 0)}/day avg
                      </div>
                      <RangeLine mm={mmGmv} />
                    </div>
                    <div className="rounded-lg bg-zinc-950/60 px-2.5 py-2">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "#fbbf24" }} />
                        <span className="truncate">TTAM</span>
                        <span className="ml-auto shrink-0 text-zinc-500">{pctTxt(ttamPct2)}</span>
                      </div>
                      <div className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100">
                        RM {fmt(ttamTotal)}
                      </div>
                      <div className="mt-0.5 text-xs tabular-nums text-zinc-500">
                        RM {fmt(dayCount > 0 ? ttamTotal / dayCount : 0)}/day avg
                      </div>
                      <RangeLine mm={mmTtam} />
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-zinc-950/60 px-2.5 py-2 text-xs tabular-nums text-zinc-300">
                    Gap (GMV Max − TTAM): RM {fmt(diffRm)} · {diffTxt}
                  </div>
                </>
              )}
            </div>

            {/* Trend: compact stacked share, multi-day only */}
            {showTrend ? (
              <div className={`${cardCls} mt-3`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    Trend — {viewMode === "two" ? (trendMode === "pct" ? "GMV Max vs TTAM % per day" : "GMV Max vs TTAM RM per day") : trendMode === "pct" ? "spend % per day" : "spend RM per day"}
                  </span>
                  <span className="ml-auto flex gap-1">
                    <button
                      onClick={() => setViewMode("three")}
                      aria-pressed={viewMode === "three"}
                      title="Show Live / Product / TTAM separately"
                      className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "three" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                    >
                      3-way
                    </button>
                    <button
                      onClick={() => setViewMode("two")}
                      aria-pressed={viewMode === "two"}
                      title="Show GMV Max (Live + Product) vs TTAM"
                      className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "two" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                    >
                      2-way
                    </button>
                    <span aria-hidden="true" className="mx-1 w-px self-stretch bg-zinc-700" />
                    <button
                      onClick={() => setTrendMode("rm")}
                      aria-pressed={trendMode === "rm"}
                      className={`rounded-lg border px-2 py-1 text-xs ${trendMode === "rm" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                    >
                      RM
                    </button>
                    <button
                      onClick={() => setTrendMode("pct")}
                      aria-pressed={trendMode === "pct"}
                      className={`rounded-lg border px-2 py-1 text-xs ${trendMode === "pct" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                    >
                      %
                    </button>
                  </span>
                </div>
                <div className="relative h-56">
                  <canvas ref={chartRef} role="img" aria-label={chartSummary} />
                </div>
              </div>
            ) : (
              data.days.length <= 1 && (
                <p className="mt-3 text-xs text-zinc-500">
                  Single-day range — share bar above says it all, no trend to draw.
                </p>
              )
            )}

            {/* Day table */}
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="text-sm font-medium">
                  Daily spend + share ({data.days.length}d){viewMode === "two" ? " — GMV Max vs TTAM" : ""}
                </span>
                <span className="ml-auto flex gap-1">
                  <button
                    onClick={() => setViewMode("three")}
                    aria-pressed={viewMode === "three"}
                    className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "three" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                  >
                    3-way
                  </button>
                  <button
                    onClick={() => setViewMode("two")}
                    aria-pressed={viewMode === "two"}
                    className={`rounded-lg border px-2 py-1 text-xs ${viewMode === "two" ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                  >
                    2-way
                  </button>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {viewMode === "three" ? (
                      <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                        <th className="px-2 py-2 font-medium">Date</th>
                        <th className="px-2 py-2 text-right font-medium">Live RM</th>
                        <th className="px-2 py-2 text-right font-medium">Live %</th>
                        <th className="px-2 py-2 text-right font-medium">Product RM</th>
                        <th className="px-2 py-2 text-right font-medium">Product %</th>
                        <th className="px-2 py-2 text-right font-medium">TTAM RM</th>
                        <th className="px-2 py-2 text-right font-medium">TTAM %</th>
                        <th className="px-2 py-2 text-right font-medium">Total</th>
                      </tr>
                    ) : (
                      <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                        <th className="px-2 py-2 font-medium">Date</th>
                        <th className="px-2 py-2 text-right font-medium">GMV Max RM</th>
                        <th className="px-2 py-2 text-right font-medium">GMV Max %</th>
                        <th className="px-2 py-2 text-right font-medium">TTAM RM</th>
                        <th className="px-2 py-2 text-right font-medium">TTAM %</th>
                        <th className="px-2 py-2 text-right font-medium">Total</th>
                        <th className="px-2 py-2 text-right font-medium">Diff RM</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {data.days.map((d: any) => {
                      if (viewMode === "two") {
                        const g = Number(d.live ?? 0) + Number(d.product ?? 0);
                        const tt = Number(d.ttam ?? 0);
                        const tot = Number(d.total ?? 0) || g + tt;
                        const gPct = tot > 0 ? (g / tot) * 100 : null;
                        const tPct = tot > 0 ? (tt / tot) * 100 : null;
                        return (
                          <tr key={d.date} className="border-t border-zinc-800">
                            <td className="px-2 py-2">{d.date}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{pctTxt(gPct)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(tt)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{pctTxt(tPct)}</td>
                            <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(tot)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g - tt)}</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={d.date} className="border-t border-zinc-800">
                          <td className="px-2 py-2">{d.date}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(d.live)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pctTxt(d.livePct)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(d.product)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pctTxt(d.productPct)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(d.ttam)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pctTxt(d.ttamPct)}</td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(d.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign % per stream (deepest drill, last) */}
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
              <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="mr-2 text-sm font-medium">Campaign share</span>
                {STREAM_META.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStream(s.id)}
                    aria-pressed={stream === s.id}
                    className={`rounded-lg border px-2 py-1 text-xs ${stream === s.id ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                  >
                    {s.label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-zinc-500">
                  stream total RM {fmt(Number(streamTotal ?? 0))} · {campaigns.length} campaigns
                </span>
                <button
                  onClick={() => setHideZero((v) => !v)}
                  aria-pressed={hideZero}
                  title={hideZero && hiddenZeroCount > 0 ? `Show ${hiddenZeroCount} zero-spend campaigns` : "Hide zero-spend campaigns"}
                  className={`rounded-lg border px-2 py-1 text-xs ${hideZero ? "border-emerald-600 bg-emerald-950" : "border-zinc-700"}`}
                >
                  {hideZero && hiddenZeroCount > 0 ? `Hide 0-spend (${hiddenZeroCount})` : "Hide 0-spend"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Campaign</th>
                      <th className="px-2 py-2 font-medium">Account</th>
                      <th className="px-2 py-2 text-right font-medium">Spend RM</th>
                      <th className="px-2 py-2 text-right font-medium">% of stream</th>
                      <th className="px-2 py-2 text-right font-medium">% of total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c: any) => (
                      <tr key={c.campaignId} className="border-t border-zinc-800">
                        <td className="max-w-72 truncate px-2 py-2" title={`${c.name} (${c.campaignId})`}>
                          {c.name}
                        </td>
                        <td className="px-2 py-2 text-zinc-400">{c.account}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(c.spend)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{pctTxt(c.pctOfStream)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{pctTxt(c.pctOfTotal)}</td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr className="border-t border-zinc-800">
                        <td colSpan={5} className="px-2 py-3 text-center text-xs text-zinc-500">
                          No spend in this stream for the range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {!data && !loading && (
          <p className="text-xs text-zinc-500">Press Fetch to load spend share.</p>
        )}
      </div>
    </div>
  );
}
