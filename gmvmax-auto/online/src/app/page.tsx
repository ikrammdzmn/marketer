"use client";

import { useState } from "react";

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
  { id: "roas", name: "ROAS (Return on Ad Spend)" },
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

  async function fetchData() {
    setLoading(true);
    setError(null);
    setExpanded(new Set());
    try {
      const q = `shopNumber=${shop}&startDate=${start}&endDate=${end}`;
      if (metric === "roas") {
        const r = await fetch(`/api/roas?${q}`);
        if (!r.ok) throw new Error((await r.json()).error ?? "fetch failed");
        setData({ kind: "roas", ...(await r.json()) });
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
      const amap = new Map<string, any>();
      for (const p of parts) {
        for (const a of p.accounts ?? []) {
          const e = amap.get(a.name) ?? { name: a.name, cost: 0, gmv: 0, orders: 0, campaigns: 0 };
          e.cost += a.cost; e.gmv += a.gmv; e.orders += a.orders; e.campaigns += a.campaigns;
          amap.set(a.name, e);
        }
      }
      const accounts = [...amap.values()]
        .map((a) => ({ ...a, roi: a.cost > 0 ? a.gmv / a.cost : 0 }))
        .sort((a, b) => b.gmv - a.gmv);
      const cmap = new Map<string, any>();
      for (const p of parts) {
        for (const c of p.campaigns ?? []) {
          const e = cmap.get(c.campaignId) ?? {
            campaignId: c.campaignId, campaignName: c.campaignName,
            accountName: c.accountName, cost: 0, gmv: 0, orders: 0,
          };
          e.cost += c.cost; e.gmv += c.gmv; e.orders += c.orders;
          cmap.set(c.campaignId, e);
        }
      }
      const campaigns = [...cmap.values()].map((c) => ({
        ...c, roi: c.cost > 0 ? c.gmv / c.cost : 0,
      }));
      setData({
        kind: "gmv", shopName: parts[0]?.shopName, gmv, cost,
        roi: cost > 0 ? gmv / cost : 0, net, net_roi: cost > 0 ? net / cost : 0,
        orders, currency: "MYR", accounts, campaigns,
        live: parts.find((p) => p.promotionType === "LIVE_GMV_MAX"),
        product: parts.find((p) => p.promotionType === "PRODUCT_GMV_MAX"),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", background: "#0a0a0a", color: "#eee", minHeight: "100vh" }}>
      <h1>GMV Max Online</h1>
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
          <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead><tr><th></th><th>Account</th><th>Cost</th><th>GMV</th><th>Orders</th><th>ROI</th></tr></thead>
            <tbody>
              {data.accounts.map((a: any) => {
                const open = expanded.has(a.name);
                const rows = (data.campaigns ?? []).filter((c: any) => c.accountName === a.name);
                return (
                  <>
                    <tr key={a.name} onClick={() => setExpanded((p) => {
                      const n = new Set(p);
                      if (n.has(a.name)) n.delete(a.name); else n.add(a.name);
                      return n;
                    })} style={{ cursor: "pointer" }}>
                      <td>{open ? "▾" : "▸"}</td>
                      <td>{a.name}</td><td>{fmt(a.cost)}</td><td>{fmt(a.gmv)}</td><td>{a.orders}</td><td>{a.roi.toFixed(2)}</td>
                    </tr>
                    {open && rows.map((c: any) => (
                      <tr key={c.campaignId} style={{ background: "#161616" }}>
                        <td></td>
                        <td style={{ fontSize: 12 }}>{c.campaignName} <span style={{ opacity: 0.5 }}>({c.campaignId})</span></td>
                        <td>{fmt(c.cost)}</td><td>{fmt(c.gmv)}</td><td>{c.orders}</td><td>{c.roi.toFixed(2)}</td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </>
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
          </tbody>
        </table>
      )}
    </main>
  );
}
