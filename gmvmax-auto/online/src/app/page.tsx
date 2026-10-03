"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

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
  { id: "shop-gmv", name: "Shop GMV (Shop API, shop 1)" },
];

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function klToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
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
  const chartsRef = useRef<Chart[]>([]);
  const trendLiveRef = useRef<HTMLCanvasElement | null>(null);
  const trendProdRef = useRef<HTMLCanvasElement | null>(null);
  const barRef = useRef<HTMLCanvasElement | null>(null);

  // Hourly graphs: slot-trend footsteps (cost + gmv lines per type) + latest-slot candy bars.
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
    const line = (label: string, color: string, vals: number[]) => ({
      label, data: vals, borderColor: color, backgroundColor: color, tension: 0.3, pointRadius: 2,
    });
    if (trendLiveRef.current) {
      mk(trendLiveRef.current, {
        type: "line",
        data: {
          labels: asc.map(short),
          datasets: [
            line("LIVE cost", "#60a5fa", asc.map((s) => sumBy(s, "LIVE_GMV_MAX", "cost"))),
            line("LIVE gmv", "#4ade80", asc.map((s) => sumBy(s, "LIVE_GMV_MAX", "gmv"))),
          ],
        },
        options: { plugins: { legend: { labels: { color: "#eee" } } }, scales: { x: { ticks: { color: "#999" } }, y: { ticks: { color: "#999" } } } },
      });
    }
    if (trendProdRef.current) {
      mk(trendProdRef.current, {
        type: "line",
        data: {
          labels: asc.map(short),
          datasets: [
            line("Product cost", "#60a5fa", asc.map((s) => sumBy(s, "PRODUCT_GMV_MAX", "cost"))),
            line("Product gmv", "#4ade80", asc.map((s) => sumBy(s, "PRODUCT_GMV_MAX", "gmv"))),
          ],
        },
        options: { plugins: { legend: { labels: { color: "#eee" } } }, scales: { x: { ticks: { color: "#999" } }, y: { ticks: { color: "#999" } } } },
      });
    }
    if (barRef.current && (data.slots ?? []).length > 0) {
      const latest = (data.slots ?? [])[0];
      const top = [...(data.rows ?? []).filter((r: any) => r.hour_slot === latest)]
        .sort((a: any, b: any) => Number(b.cost) - Number(a.cost)).slice(0, 12);
      mk(barRef.current, {
        type: "bar",
        data: {
          labels: top.map((r: any) => String(r.campaign_name ?? r.campaign_id).slice(0, 24)),
          datasets: [
            { label: `cost @ ${short(latest)}`, data: top.map((r: any) => Number(r.cost)), backgroundColor: "#60a5fa" },
            { label: `gmv @ ${short(latest)}`, data: top.map((r: any) => Number(r.gmv)), backgroundColor: "#4ade80" },
          ],
        },
        options: { plugins: { legend: { labels: { color: "#eee" } } }, scales: { x: { ticks: { color: "#999", maxRotation: 60, minRotation: 60 } }, y: { ticks: { color: "#999" } } } },
      });
    }
    return () => { chartsRef.current.forEach((c) => c.destroy()); chartsRef.current = []; };
  }, [data]);

  async function loadSessions(campaignId: string) {
    if (sessions[campaignId] || sessionsLoading === campaignId) return;
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

  async function fetchData() {
    setLoading(true);
    setError(null);
    setExpanded(new Set());
    setSessions({});
    try {
      const q = `shopNumber=${shop}&startDate=${start}&endDate=${end}`;
      if (metric === "shop-gmv") {
        const r = await fetch(`/api/shop-gmv?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "shop-gmv", ...(await r.json()) });
        setFetchedAt(new Date().toISOString());
        return;
      }
      if (metric === "hourly") {
        const r = await fetch(`/api/hourly?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "hourly", ...(await r.json()) });
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
        const r = await fetch(`/api/roas?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "ttam", ...(await r.json()) });
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
        kind: "gmv", shopName: parts[0]?.shopName, gmv, cost,
        roi: cost > 0 ? gmv / cost : 0, net, net_roi: cost > 0 ? net / cost : 0,
        orders, currency: "MYR",
        sections: parts.map((p) => ({
          key: p.promotionType,
          title: p.promotionType === "LIVE_GMV_MAX" ? "LIVE GMV Max" : "Product GMV Max",
          accounts: p.accounts ?? [],
          campaigns: p.campaigns ?? [],
        })),
        live: parts.find((p) => p.promotionType === "LIVE_GMV_MAX"),
        product: parts.find((p) => p.promotionType === "PRODUCT_GMV_MAX"),
      });
      setFetchedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", background: "#0a0a0a", color: "#eee", minHeight: "100vh" }}>
      <h1>GMV Max Online</h1>
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        Branch: PROD (Neon prod) | Data: live TikTok API (lag 15m-2h, closed-window for cron)
        {fetchedAt ? ` | Fetched: ${fetchedAt}` : ""}
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 16 }}>
        <label>Shop<br />
          <select value={shop} onChange={(e) => setShop(e.target.value)}>
            {SHOPS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label>Metric<br />
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label>Start<br /><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>End<br /><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <button onClick={fetchData} disabled={loading}>{loading ? "Fetching…" : "Fetch Data"}</button>
      </div>
      {error && <p style={{ color: "#f66" }}>Error: {error}</p>}
      {data && data.kind === "gmv" && (
        <>
          <table cellPadding={8} style={{ borderCollapse: "collapse", marginBottom: 16 }}>
            <tbody>
              <tr><td>Shop Name</td><td>{data.shopName}</td></tr>
              <tr><td>{metric === "total" ? "Total GMV Max" : "GMV"}</td><td>MYR {fmt(data.gmv)}</td></tr>
              <tr><td>Total Cost</td><td>MYR {fmt(data.cost)}</td></tr>
              <tr><td>ROI (gross)</td><td>{data.roi.toFixed(2)}x</td></tr>
              <tr><td>Net ROI (fee 25%)</td><td>{data.net_roi.toFixed(2)}x</td></tr>
              <tr><td>Orders</td><td>{data.orders}</td></tr>
              {data.live && <tr><td>LIVE — GMV / Cost</td><td>MYR {fmt(data.live.gmv)} / {fmt(data.live.cost)}</td></tr>}
              {data.product && <tr><td>Product — GMV / Cost</td><td>MYR {fmt(data.product.gmv)} / {fmt(data.product.cost)}</td></tr>}
            </tbody>
          </table>
          <h3>Breakdown by Account (click a row to expand campaigns)</h3>
          {(data.sections ?? []).map((sec: any) => (
          <div key={sec.key}>
          <h4>{sec.title}</h4>
          <table cellPadding={8} style={{ borderCollapse: "collapse", marginBottom: 16 }}>
            <thead><tr><th></th><th>Account</th><th>Cost</th><th>GMV</th><th>Orders</th><th>ROI</th></tr></thead>
            <tbody>
              {sec.accounts.map((a: any) => {
                const key = `${sec.key}:${a.name}`;
                const open = expanded.has(key);
                const rows = (sec.campaigns ?? []).filter((c: any) => c.accountName === a.name);
                return (
                  <>
                    <tr key={key} onClick={() => setExpanded((p) => {
                      const n = new Set(p);
                      if (n.has(key)) n.delete(key); else n.add(key);
                      return n;
                    })} style={{ cursor: "pointer" }}>
                      <td>{open ? "▾" : "▸"}</td>
                      <td>{a.name}</td><td>{fmt(a.cost)}</td><td>{fmt(a.gmv)}</td><td>{a.orders}</td><td>{a.roi.toFixed(2)}</td>
                    </tr>
                    {open && rows.map((c: any) => (
                      <tr key={c.campaignId} style={{ background: "#161616" }}>
                        <td></td>
                        <td style={{ fontSize: 12 }}>{c.campaignName} <span style={{ opacity: 0.5 }}>({c.campaignId})</span>
                          <span style={{
                            marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 8,
                            background: c.status === "ON" ? "#0a4d1e" : c.status === "OFF" ? "#4d4d4d" : "#3a2f0a",
                            color: c.status === "ON" ? "#7dffa8" : c.status === "OFF" ? "#ccc" : "#ffd97d",
                          }}>{c.status ?? "?"}</span>
                          <button style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); loadSessions(c.campaignId); }}>
                            {sessionsLoading === c.campaignId ? "…" : "Sessions"}
                          </button>
                          {sessions[c.campaignId] && !sessions[c.campaignId].error && (
                            <span style={{ opacity: 0.6 }}> ({sessions[c.campaignId].sessions?.length ?? 0} rooms)</span>
                          )}
                          {sessions[c.campaignId]?.error && (
                            <span style={{ color: "#f66" }}> ({sessions[c.campaignId].error})</span>
                          )}
                        </td>
                        <td>{fmt(c.cost)}</td><td>{fmt(c.gmv)}</td><td>{c.orders}</td><td>{c.roi.toFixed(2)}</td>
                      </tr>
                    ))}
                    {open && rows.map((c: any) => (sessions[c.campaignId]?.sessions ?? []).map((s: any, i: number) => (
                      <tr key={`${c.campaignId}-s${i}`} style={{ background: "#0f0f0f" }}>
                        <td></td>
                        <td style={{ fontSize: 11, paddingLeft: 28 }}>room {s.roomId || "(none)"} · {s.day}</td>
                        <td>{fmt(s.cost)}</td><td>{fmt(s.gmv)}</td><td>{s.orders}</td><td>{Number(s.roi ?? 0).toFixed(2)}</td>
                      </tr>
                    )))}
                  </>
                );
              })}
            </tbody>
          </table>
          </div>
          ))}
        </>
      )}
      {data && data.kind === "ttam" && (
        <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr><td>Shop Name</td><td>{data.shopName}</td></tr>
            <tr><td>Manual (TTAM) Spend ({data.manualCampaignCount} campaigns)</td><td>MYR {fmt(data.manualCampaignSpend)}</td></tr>
            <tr><td>GMV Max Cost (live+product)</td><td>MYR {fmt(data.gmvMaxCost)}</td></tr>
            <tr><td>Total Ads Spend</td><td>MYR {fmt(data.totalAdsSpend)}</td></tr>
          </tbody>
        </table>
      )}
      {data && (data.kind === "hourly") && (
        <>
          <p style={{ opacity: 0.7, fontSize: 12 }}>
            Hour slots are real-time MYT (newest pair tagged partial — intraday numbers revise). Message shows ON campaigns only; dashboard shows all. % shows only when prev hour spend ≥ RM50 / gmv ≥ RM200, else absolute-only.
          </p>
          <h4>LIVE trend (cost vs gmv per slot)</h4>
          <div style={{ maxWidth: 900 }}><canvas ref={trendLiveRef} /></div>
          <h4>Product trend (cost vs gmv per slot)</h4>
          <div style={{ maxWidth: 900 }}><canvas ref={trendProdRef} /></div>
          <h4>Latest slot bars (top 12 by cost)</h4>
          <div style={{ maxWidth: 900 }}><canvas ref={barRef} /></div>
          {(data.slots ?? []).map((slot: string) => {
            const rows = (data.rows ?? []).filter((r: any) => r.hour_slot === slot);
            const prevSlot = (data.slots ?? [])[(data.slots ?? []).indexOf(slot) + 1];
            const prev = (data.rows ?? []).filter((r: any) => r.hour_slot === prevSlot);
            const pmap = new Map(prev.map((r: any) => [r.campaign_id, r]));
            return (
              <div key={slot}>
                <h4>{slot} vs {prevSlot ?? "—"}</h4>
                <table cellPadding={8} style={{ borderCollapse: "collapse", marginBottom: 16 }}>
                  <thead><tr><th>Campaign</th><th>Type</th><th>Cost (Δ, %)</th><th>GMV (Δ, %)</th><th>Orders (Δ)</th></tr></thead>
                  <tbody>
                    {rows.map((r: any) => {
                      const p = pmap.get(r.campaign_id) as any;
                      const dc = p ? r.cost - p.cost : 0;
                      const dg = p ? r.gmv - p.gmv : 0;
                      const dor = p ? r.orders - p.orders : 0;
                      const pc = p && p.cost >= 50 && Number(p.cost) !== 0 ? `${(dc / p.cost * 100).toFixed(1)}%` : "n/a";
                      const pg = p && p.gmv >= 200 && Number(p.gmv) !== 0 ? `${(dg / p.gmv * 100).toFixed(1)}%` : "n/a";
                      return (
                        <tr key={r.campaign_id}>
                          <td style={{ fontSize: 12 }}>{r.campaign_name ?? r.campaign_id}</td>
                          <td>{r.promotion_type === "LIVE_GMV_MAX" ? "LIVE" : "Product"}</td>
                          <td>{fmt(r.cost)} ({dc >= 0 ? "+" : ""}{fmt(dc)}, {pc})</td>
                          <td>{fmt(r.gmv)} ({dg >= 0 ? "+" : ""}{fmt(dg)}, {pg})</td>
                          <td>{r.orders} ({dor >= 0 ? "+" : ""}{dor})</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}
      {data && data.kind === "shop-gmv" && (
        <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr><td>Shop Name</td><td>{data.shopName}</td></tr>
            {!data.configured ? (
              <>
                <tr><td>Not configured</td><td style={{ fontSize: 12 }}>{data.hint}</td></tr>
                <tr><td>Locked ref 24–27 Sep (manual)</td><td>Shop MYR 143,941.26 / 1,016 orders vs ads 169,805.12 (−15.2%); TRUE ROAS 3.26x / 2.81x</td></tr>
              </>
            ) : (
              <>
                <tr><td>Shop-order GMV ({data.shopOrderCount} orders)</td><td>MYR {fmt(data.shopOrderGMV)}</td></tr>
                <tr><td>Ads-attributed GMV ({data.adsOrderCount} orders)</td><td>MYR {fmt(data.adsGMV)}</td></tr>
                <tr><td>Delta vs ads</td><td>{(data.deltaVsAds * 100).toFixed(1)}%</td></tr>
                <tr><td>Total Ads Spend</td><td>MYR {fmt(data.totalAdsSpend)}</td></tr>
                <tr><td>TRUE ROAS (shop / spend)</td><td>{data.trueRoas.toFixed(2)}x</td></tr>
                <tr><td>TRUE ACTUAL (shop / spend+tax)</td><td>{data.trueActualRoas.toFixed(2)}x</td></tr>
                <tr><td>Ads ROAS (for ref)</td><td>{data.adsRoas.toFixed(2)}x / {data.adsActualRoas.toFixed(2)}x</td></tr>
              </>
            )}
          </tbody>
        </table>
      )}
      {data && data.kind === "roas" && (
        <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr><td>Shop Name</td><td>{data.shopName}</td></tr>
            <tr><td>GMV (attributed)</td><td>MYR {fmt(data.gmv)}</td></tr>
            <tr><td>Live GMV Max Cost</td><td>MYR {fmt(data.liveGMVMaxCost)}</td></tr>
            <tr><td>Product GMV Max Cost</td><td>MYR {fmt(data.productGMVMaxCost)}</td></tr>
            <tr><td>Manual (TTAM) Spend ({data.manualCampaignCount} campaigns)</td><td>MYR {fmt(data.manualCampaignSpend)}</td></tr>
            <tr><td>Total Ads Spend</td><td>MYR {fmt(data.totalAdsSpend)}</td></tr>
            <tr><td>Total with SST+WHT</td><td>MYR {fmt(data.totalCostWithTaxes)}</td></tr>
            <tr><td>ROAS</td><td>{data.roas.toFixed(2)}x</td></tr>
            <tr><td>ACTUAL ROAS</td><td>{data.actualRoas.toFixed(2)}x</td></tr>
            {data.shopTruthRef && (
              <>
                <tr><td>Shop-truth ref ({data.shopTruthRef.start}–{data.shopTruthRef.end})</td><td>MYR {fmt(data.shopTruthRef.shopGMV)} / {data.shopTruthRef.shopOrders} orders</td></tr>
                <tr><td>Ads read vs shop (locked)</td><td>{data.shopTruthRef.ratio.toFixed(2)}x high</td></tr>
              </>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
