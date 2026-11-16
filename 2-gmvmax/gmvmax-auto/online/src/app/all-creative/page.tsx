"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModuleRedirect } from "../module-gate";

// /all-creative — menu board: 5 KPI mini-cards, each deep-linking to its
// dedicated page. One light snapshot call (past 7d closed), no heavy pulls.
function shiftMYT(iso: string, k: number) {
  return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + k * 86400000)
    .toISOString().slice(0, 10);
}
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-MY") : "—");
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");

export default function AllCreativePage() {
  const [snap, setSnap] = useState<any>(null);
  const [msg, setMsg] = useState("Loading…");
  const [refreshing, setRefreshing] = useState(false);
  const end = shiftMYT(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }), -1);
  const start = shiftMYT(end, -6);

  async function load() {
    setRefreshing(true);
    try {
      const b = await fetch(`/api/all-creative?startDate=${start}&endDate=${end}&t=${Date.now()}`, { cache: "no-store" }).then((x) => x.json());
      if (b.error) setMsg(b.error);
      else {
        setSnap(b);
        setMsg("");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    let dead = false;
    (async () => {
      const b = await fetch(`/api/all-creative?startDate=${start}&endDate=${end}`, { cache: "no-store" }).then((x) => x.json()).catch((e) => ({ error: e instanceof Error ? e.message : "fetch failed" }));
      if (dead) return;
      if (b.error) setMsg(b.error);
      else {
        setSnap(b);
        setMsg("");
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = "rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col";
  const kpi = (k: string, v: string) => (
    <div key={k}>
      <div className="text-[10px] text-zinc-500">{k}</div>
      <div className="text-sm font-semibold tabular-nums text-zinc-100">{v}</div>
    </div>
  );
  const openBtn = (href: string) => (
    <Link href={href} className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-center font-medium hover:bg-emerald-600">Open →</Link>
  );
  const liveStamp = snap?.stamps?.LIVE_GMV_MAX;
  const prodStamp = snap?.stamps?.PRODUCT_GMV_MAX;

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 text-sm">
      <ModuleRedirect module={["gmv-max", "creative", "shop-live", "seller-creative", "live-roi"]} />
      <h2 className="mb-1 text-lg font-semibold">All Creative</h2>
      <p className="mb-3 text-[12px] text-zinc-400">
        Menu board — past 7 closed days ({start} → {end}). Numbers come from each module&apos;s last Sync — sync there, refresh here.
        {msg ? ` ${msg}` : ""}
      </p>
      <div className="mb-3">
        <button onClick={load} disabled={refreshing} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50">
          {refreshing ? "Refreshing…" : "Refresh ↻"}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className={card}>
          <h3 className="font-medium">Product GMV Max</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {kpi("Spend", `RM${f0(Number(snap?.product?.cost ?? NaN))}`)}
            {kpi("GMV", `RM${f0(Number(snap?.product?.gmv ?? NaN))}`)}
            {kpi("Orders", f0(Number(snap?.product?.orders ?? NaN)))}
            {kpi("Videos", f0(Number(snap?.product?.videos ?? NaN)))}
          </div>
          <div className="mt-2 truncate text-[11px] text-zinc-500" title={snap?.product?.top?.title ?? ""}>
            Top: {(snap?.product?.top?.title ?? "").slice(0, 70) || "—"}
          </div>
          <div className="text-[11px] text-zinc-600">{prodStamp?.slot ? `sync: ${String(prodStamp.slot).slice(0, 16)}` : "sync stamp tiada"}</div>
          {openBtn("/creative")}
        </div>
        <div className={card}>
          <h3 className="font-medium">Live Dashboard</h3>
          <div className="mt-2 text-[12px] text-zinc-400">Rooms live di TikTok Shop — KPIs, traffic, products, GMV trend.</div>
          <div className="mt-2 text-[11px] text-zinc-500">{liveStamp?.slot ? `Last sync: ${String(liveStamp.slot).slice(0, 16)}` : "Sync stamp tiada — buka page dan Sync."}</div>
          <div className="flex-1" />
          {openBtn("/shop-live")}
        </div>
        <div className={card}>
          <h3 className="font-medium">TikTok Ads Manager</h3>
          <div className="mt-2 text-[12px] text-zinc-400">Boost rows (spend, impressions — no sales) need the Marketing API integrated pull. Table migrated, pull belum landing.</div>
          <div className="flex-1" />
          <span className="mt-3 inline-block rounded-lg border border-zinc-800 px-4 py-2 text-center text-zinc-600">Segera</span>
        </div>
        <div className={card}>
          <h3 className="font-medium">Evergreen</h3>
          <div className="mt-2 text-[12px] text-zinc-400">Rule preview (<span className="text-amber-300">cadangan — belum diluluskan</span>): posted ≥60d, ≥3 orders in 2 of last 3 months, combined ROI ≥2.86.</div>
          <div className="flex-1" />
          {openBtn("/seller-creative")}
        </div>
        <div className={card}>
          <h3 className="font-medium">Seller Center</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {kpi("Views", f0(Number(snap?.seller?.views ?? NaN)))}
            {kpi("GMV", `RM${f0(Number(snap?.seller?.gmv ?? NaN))}`)}
            {kpi("Orders", f0(Number(snap?.seller?.orders ?? NaN)))}
            {kpi("Videos", f0(Number(snap?.seller?.videos ?? NaN)))}
          </div>
          <div className="mt-2 truncate text-[11px] text-zinc-500" title={snap?.seller?.top?.caption ?? ""}>
            Top: {(snap?.seller?.top?.caption ?? "").slice(0, 70) || "—"}
          </div>
          {openBtn("/seller-creative")}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-zinc-600">GMV Max reads ~13% higher than Seller Center for the same video/day — compare side-by-side, never summed.</p>
    </main>
  );
}
