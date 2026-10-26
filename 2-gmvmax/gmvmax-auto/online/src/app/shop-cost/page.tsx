"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import DateRangePicker from "../DateRangePicker";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";

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

export default function ShopCostPage() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => mytToday());
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<Stream>("live");
  const [hideZero, setHideZero] = useState(true);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartObj = useRef<Chart | null>(null);

  async function fetchCost(f: string, t: string) {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/shop-cost?shopNumber=1&startDate=${f}&endDate=${t}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setData(body);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      toast(m, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCost(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trend: stacked 100% area — composition over time. Skipped for single-day
  // ranges (one point is not a trend) and empty ranges (empty state instead).
  const showTrend = !!data?.days && data.days.length > 1 && Number(data?.totals?.total ?? 0) > 0;
  useEffect(() => {
    if (!chartRef.current || !showTrend) return;
    chartObj.current?.destroy();
    const labels = data.days.map((d: any) => String(d.date).slice(5));
    const pctOf = (d: any, k: Stream) =>
      k === "live" ? d.livePct : k === "product" ? d.productPct : d.ttamPct;
    const c = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: STREAM_META.map((s, i) => ({
          label: s.label,
          data: data.days.map((d: any) => pctOf(d, s.id) ?? 0),
          borderColor: s.color,
          backgroundColor: `${s.color}66`,
          fill: i === 0 ? "origin" : "-1",
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion() ? false : { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "#eee", boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label}: ${Number(ctx.parsed?.y ?? 0).toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { color: "#999" }, grid: { color: "#27272a" } },
          y: {
            stacked: true,
            max: 100,
            ticks: { color: "#999", callback: (v: any) => `${intFmt.format(Number(v))}%` },
            grid: { color: "#27272a" },
          },
        },
      },
    });
    chartObj.current = c;
    return () => c.destroy();
  }, [data, showTrend]);

  const t = data?.totals;
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
  const chartSummary = t
    ? `Spend share ${data?.dateRange?.start} to ${data?.dateRange?.end}: ` +
      ranked.map((s) => `${s.short} ${pctTxt(s.share)}`).join(", ")
    : "Spend share trend chart";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ModuleRedirect module="shop-cost" />
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Shop Cost — spend share</h2>
        <p className="text-xs text-zinc-500">
          Him.DrSamhan (shop 1) · ads spend only, no tax. One day or range ≤31d.
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
            {from} – {to} <span aria-hidden="true">📅</span>
          </button>
          <button
            onClick={() => fetchCost(from, to)}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Fetching…" : "Fetch"}
          </button>
        </div>
      </div>

      {calOpen && (
        <DateRangePicker
          from={from}
          to={to}
          pos={calPos}
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
              <div className="text-xs text-zinc-400">Total ads spend</div>
              <div className="text-2xl font-semibold tabular-nums">RM {fmt(t.total)}</div>
              <div className="mb-2 text-xs text-zinc-500">
                {data?.dateRange?.start} – {data?.dateRange?.end}
              </div>
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
                  </div>
                ))}
              </div>
            </div>

            {/* Trend: compact stacked share, multi-day only */}
            {showTrend ? (
              <div className={`${cardCls} mt-3`}>
                <div className="mb-2 text-sm font-medium">Trend — spend % per day</div>
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
              <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">
                Daily spend + share ({data.days.length}d)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
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
                  </thead>
                  <tbody>
                    {data.days.map((d: any) => (
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
                    ))}
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
