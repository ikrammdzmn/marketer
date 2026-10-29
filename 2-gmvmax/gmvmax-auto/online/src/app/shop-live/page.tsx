"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "../toast";
import DateRangePicker from "../DateRangePicker";
import { ModuleRedirect } from "../module-gate";

// /shop-live — Shop LIVE minute performance module (Partner API 202510).
// Server lib: src/lib/shop-live.ts. Read-only (no DB writes yet).
// Ads-side columns (Cost/ROI/Active) + avg watch are documented gaps,
// not fetched — see the note card below.
const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? "n/a"
    : `${(Number(v) * 100).toFixed(digits)}%`;

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardCls}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function ShopLivePage() {
  const mytToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const daysAgo = (n: number) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
  };
  // Range is inclusive on both ends (calendar-picker skill). The sessions
  // list API takes an exclusive end, so callers add +1 day (addDays below).
  const addDays = (iso: string, n: number) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
  };
  const [liveId, setLiveId] = useState("");
  const [currency, setCurrency] = useState("LOCAL");
  const [sessStart, setSessStart] = useState(() => daysAgo(14));
  const [sessEnd, setSessEnd] = useState(() => mytToday());
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [sessType, setSessType] = useState("MARKETING_ACCOUNTS");
  const [sessions, setSessions] = useState<any[]>([]);
  const [latestAvail, setLatestAvail] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsMsg, setRoomsMsg] = useState("");
  const [data, setData] = useState<any>(null);
  const [probe, setProbe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [grants, setGrants] = useState<string[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomMsg, setRoomMsg] = useState("");

  useEffect(() => {
    fetch("/api/shop-live/creator-grants", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const body = await r.json();
        if (Array.isArray(body.users)) setGrants(body.users);
      })
      .catch(() => {});
  }, []);

  async function loadRooms() {
    setRoomsLoading(true);
    setRoomsMsg("");
    setSessions([]);
    try {
      const r = await fetch(
        `/api/shop-live/sessions?shopNumber=1&startDateGe=${sessStart}&endDateLt=${addDays(sessEnd, 1)}&accountType=${encodeURIComponent(sessType)}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setSessions(body.sessions ?? []);
      setLatestAvail(body.latestAvailableDate ?? null);
      const n = (body.sessions ?? []).length;
      setRoomsMsg(n === 0 ? "No rooms in this range." : `${n} room(s)${body.totalCount > n ? ` (of ${body.totalCount}, first pages)` : ""}.`);
      if (n === 1 && body.sessions[0]?.id) setLiveId(String(body.sessions[0].id));
    } catch (e) {
      const m = e instanceof Error ? e.message : "rooms failed";
      setRoomsMsg(m);
      toast(m, "err");
    } finally {
      setRoomsLoading(false);
    }
  }

  async function runProbe() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (sessions.some((s: any) => String(s.id) === liveId.trim() && s.author_type === "AFFILIATE")) {
      toast("AFFILIATE room: TikTok denies minute detail (28001022) — metadata only.", "err");
      return;
    }
    setProbing(true);
    setProbe(null);
    try {
      const r = await fetch(
        `/api/shop-live/probe?shopNumber=1&liveId=${encodeURIComponent(liveId.trim())}&currency=${currency}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setProbe(body);
      toast("Probe ok — first page shape captured.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "probe failed";
      toast(m, "err");
    } finally {
      setProbing(false);
    }
  }

  async function runFetch() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (sessions.some((s: any) => String(s.id) === liveId.trim() && s.author_type === "AFFILIATE")) {
      toast("AFFILIATE room: use Room detail below (creator grant) — minute detail denied 28001022.", "err");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const r = await fetch(
        `/api/shop-live/overview?shopNumber=1&liveId=${encodeURIComponent(liveId.trim())}&currency=${currency}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setData(body);
      toast(`Fetched ${body.intervals} minute intervals (${body.pages} page(s)).`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      toast(m, "err");
    } finally {
      setLoading(false);
    }
  }

  const selRoom = sessions.find((s: any) => String(s.id) === liveId.trim());
  const selCreator = selRoom?.creator_user ?? "";
  const selGranted = selCreator && grants.includes(String(selCreator).replace(/^@/, "").toLowerCase());

  async function runRoomDetail() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (!selRoom) { toast("Load rooms first (or paste a liveId from the AFFILIATE list).", "err"); return; }
    const creator = String(selRoom.creator_user ?? "").trim();
    if (!creator) { toast("Room has no creator user — cannot match a grant.", "err"); return; }
    setRoomLoading(true);
    setRoom(null);
    setRoomMsg("");
    try {
      const r = await fetch(
        `/api/shop-live/room-detail?shopNumber=1&roomId=${encodeURIComponent(liveId.trim())}&creatorUser=${encodeURIComponent(creator)}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setRoom(body);
      const n = (body.errors ?? []).length;
      setRoomMsg(n > 0 ? `${4 - n}/4 blocks ok (${(body.errors ?? []).map((e: any) => e.endpoint).join(", ")} failed).` : "4/4 blocks ok.");
      toast("Room detail fetched.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "room detail failed";
      setRoomMsg(m);
      toast(m, "err");
    } finally {
      setRoomLoading(false);
    }
  }

  const s = data?.summary;
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ModuleRedirect module="shop-live" />
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Shop Live Performance</h2>
        <p className="text-xs text-zinc-500">
          Minute-grain LIVE dashboard data (Partner API 202510). Pick a room
          below or paste a liveId. Read-only — no cache writes yet. Data lags
          ~2 days (watch latest-available date).
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="text-xs text-zinc-400">Range<br />
            <button ref={rangeBtnRef} onClick={() => {
              if (!calOpen && rangeBtnRef.current) {
                const r = rangeBtnRef.current.getBoundingClientRect();
                setCalPos({ top: r.bottom + 8, left: r.left });
              }
              setCalOpen((v) => !v);
            }} className={`${inputCls}`}>{sessStart} – {sessEnd} 📅</button>
          </div>
          <label className="text-xs text-zinc-400">Rooms
            <select value={sessType} onChange={(e) => setSessType(e.target.value)} className={`${inputCls} ml-2`}>
              <option value="MARKETING_ACCOUNTS">MARKETING (detail readable)</option>
              <option value="AFFILIATE_ACCOUNTS">AFFILIATE (metadata only)</option>
            </select>
          </label>
          <button onClick={loadRooms} disabled={roomsLoading}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
            {roomsLoading ? "Loading…" : "Load rooms"}
          </button>
          {sessions.length > 0 && (
            <label className="text-xs text-zinc-400">Room
              <select value={liveId} onChange={(e) => setLiveId(e.target.value)} className={`${inputCls} ml-2 max-w-72`}>
                <option value="">— pick —</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {(s.start_time ?? "").slice(0, 10)} · {s.title ?? "(untitled)"} · {s.creator_nick ?? s.creator_user ?? ""}
                    {s.author_type === "AFFILIATE" ? (grants.includes(String(s.creator_user ?? "").replace(/^@/, "").toLowerCase()) ? " (creator ✓)" : " (metadata only)") : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {(roomsMsg || latestAvail) && (
          <p className="mt-1 text-[11px] text-zinc-500">
            {roomsMsg}{latestAvail ? ` Latest data: ${latestAvail}.` : ""}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">Live ID
            <input value={liveId} onChange={(e) => setLiveId(e.target.value)}
              placeholder="or paste id directly" className={`${inputCls} ml-2 w-56`} />
          </label>
          <label className="text-xs text-zinc-400">Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} ml-2`}>
              <option value="LOCAL">LOCAL (MYR)</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <button onClick={runProbe} disabled={probing}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
            {probing ? "Probing…" : "Probe shape"}
          </button>
          <button onClick={runFetch} disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
            {loading ? "Fetching…" : "Fetch overview"}
          </button>
          <button onClick={runRoomDetail} disabled={roomLoading}
            title="AFFILIATE room detail via the labeled creator grant (Live Data v202502)"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50">
            {roomLoading ? "Fetching…" : "Fetch room detail"}
          </button>
          <a href="/api/shop-auth/start?app=analytics" title="Admin + seller login; grant lands in Neon"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
            Authorize analytics app
          </a>
        </div>
      </div>

      {calOpen && (
        <DateRangePicker
          from={sessStart} to={sessEnd} pos={calPos}
          onApply={(f, t) => { setSessStart(f); setSessEnd(t); setCalOpen(false); }}
          onClose={() => setCalOpen(false)}
        />
      )}

      <div className="px-4 pb-16 pt-4">
        {probe && (
          <div className={`${cardCls} mb-4 text-xs`}>
            <div className="mb-1 text-sm font-medium">Probe — first page coverage</div>
            <div className="text-zinc-400">Title: {probe.overall?.live_title ?? "—"} · intervals on page: {probe.intervalsOnFirstPage}</div>
            <pre className="mt-2 overflow-x-auto text-[11px] text-zinc-300">{JSON.stringify({ keys: probe.intervalKeys, coverage: probe.coverage }, null, 2)}</pre>
          </div>
        )}

        {roomMsg && (
          <p className="mb-2 text-[11px] text-zinc-500">{roomMsg}</p>
        )}
        {room && (
          <>
            <div className="mb-1 text-sm font-medium">
              Room detail — {room.creator} · {room.liveRoomId}
            </div>
            {(room.errors ?? []).length > 0 && (
              <div className={`${cardCls} mb-3 text-xs text-amber-300`}>
                Partial: {(room.errors ?? []).map((e: any) => `${e.endpoint}: ${e.code}`).join(" · ")}
              </div>
            )}
            {room.core && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="GMV" value={`${room.core.local_gmv?.currency ?? ""} ${fmt(Number(room.core.local_gmv?.amount ?? 0))}`} sub={`${room.core.sales ?? 0} items sold`} />
                <Kpi label="Paid orders" value={String(room.core.paid_order_count ?? 0)} sub={`${room.core.buyer_count ?? 0} buyers · AOV ${fmt(Number(room.core.local_unit_price?.amount ?? 0))}`} />
                <Kpi label="Watch PV" value={Number(room.core.watch_pv ?? 0).toLocaleString()} sub={`${Number(room.core.product_view_count ?? 0).toLocaleString()} product views`} />
                <Kpi label="CTR" value={pct(Number(room.core.click_through_rate))} sub={`CTOR ${pct(Number(room.core.click_order_rate))}`} />
                <Kpi label="Avg watch" value={`${room.core.avg_watching_duration ?? 0}s`} sub={`peak ${Number(room.core.peak_concurrent_user_count ?? 0).toLocaleString()} concurrent`} />
                <Kpi label="Engagement" value={Number(room.core.accumulated_comment_count ?? 0).toLocaleString()} sub={`${Number(room.core.accumulated_new_follower_count ?? 0).toLocaleString()} new followers · ${Number(room.core.accumulated_sharing_count ?? 0).toLocaleString()} shares`} />
              </div>
            )}
            {selRoom?.traffic && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="Impressions (list)" value={selRoom.traffic.impressions == null ? "n/a" : Number(selRoom.traffic.impressions).toLocaleString()} sub="session grain — absent on affiliate rows" />
                <Kpi label="Views (list)" value={selRoom.traffic.views == null ? "n/a" : Number(selRoom.traffic.views).toLocaleString()} sub={`${selRoom.traffic.viewers == null ? "?" : Number(selRoom.traffic.viewers).toLocaleString()} unique · dashboard Views`} />
                <Kpi label="Product clicks (list)" value={selRoom.traffic.product_clicks == null ? "n/a" : Number(selRoom.traffic.product_clicks).toLocaleString()} sub="dashboard Product clicks" />
                <Kpi label="Tap-through (list)" value={pct(selRoom.traffic.tap_through_rate == null ? null : Number(selRoom.traffic.tap_through_rate))} sub={`CTR ${pct(selRoom.traffic.ctr == null ? null : Number(selRoom.traffic.ctr))} · CTOR ${pct(selRoom.traffic.ctor_sku_order == null ? null : Number(selRoom.traffic.ctor_sku_order))} · exact fields, not derived`} />
                <Kpi label="Avg viewing (list)" value={`${selRoom.traffic.avg_viewing_duration ?? "n/a"}${selRoom.traffic.avg_viewing_duration == null ? "" : "s"}`} sub={`GMV/h ${(selRoom.traffic.gmv_per_hour?.amount ?? "—")} ${selRoom.traffic.gmv_per_hour?.currency ?? ""}`} />
                <Kpi label="Live GMV (list)" value={`${selRoom.sales_performance?.live_gmv?.currency ?? ""} ${fmt(Number(selRoom.sales_performance?.live_gmv?.amount ?? 0))}`} sub={`indirect ${fmt(Number(selRoom.sales_performance?.live_indirect_gmv?.amount ?? 0))} · attributed ${fmt(Number(selRoom.sales_performance?.live_attributed_gmv?.amount ?? 0))}${(() => { try { return Date.parse(String(selRoom.end_time ?? "").replace(" ", "T") + "+08:00") > Date.now() ? " · live now — list lags, trust room grain" : ""; } catch { return ""; } })()}`} />
              </div>
            )}
            {(room.traffic ?? []).length > 0 && (() => {
              const totalPV = (room.traffic ?? []).reduce((a: number, t: any) => a + Number(t.source?.watch_pv ?? 0), 0);
              const share = (v: number) => totalPV > 0 ? `${(v / totalPV * 100).toFixed(1)}%` : "—";
              return (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Traffic sources (watch PV + share)</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-medium">Channel</th>
                    <th className="px-2 py-2 text-right font-medium">Watch PV</th>
                    <th className="px-2 py-2 text-right font-medium">Share</th>
                    <th className="px-2 py-2 font-medium">Breakdown</th>
                  </tr></thead>
                  <tbody>
                    {(room.traffic ?? []).map((t: any, i: number) => (
                      <tr key={i} className="border-t border-zinc-800 first:border-t-0">
                        <td className="px-2 py-1">{t.source?.name ?? "?"}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{Number(t.source?.watch_pv ?? 0).toLocaleString()}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{share(Number(t.source?.watch_pv ?? 0))}</td>
                        <td className="px-2 py-1 text-zinc-500">{(t.sub_sources ?? []).map((x: any) => `${x.name} ${Number(x.watch_pv ?? 0).toLocaleString()}`).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
            {(room.products ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Products ({(room.products ?? []).length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 text-right font-medium">GMV</th>
                      <th className="px-2 py-2 text-right font-medium">Paid</th>
                      <th className="px-2 py-2 text-right font-medium">CTR</th>
                      <th className="px-2 py-2 text-right font-medium">CTOR</th>
                      <th className="px-2 py-2 text-right font-medium">Exposure</th>
                      <th className="px-2 py-2 text-right font-medium">Stock</th>
                    </tr></thead>
                    <tbody>
                      {[...(room.products ?? [])].sort((a: any, b: any) => Number(b.local_gmv?.amount ?? 0) - Number(a.local_gmv?.amount ?? 0)).map((p: any) => (
                        <tr key={p.product_id} className="border-t border-zinc-800">
                          <td className="max-w-72 truncate px-2 py-2" title={p.product_name}>{p.product_name}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(p.local_gmv?.amount ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.paid_order_count}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pct(Number(p.click_through_rate))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pct(Number(p.click_to_order_rate ?? p.click_order_rate))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.exposure_count == null ? "n/a" : Number(p.exposure_count).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.inventory_left_count == null ? "n/a" : Number(p.inventory_left_count).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(room.gmvTrend ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">GMV trend (15-min, MYT)</div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {(room.gmvTrend.find((g: any) => g.stats_type === "TREND_GMV")?.data_points ?? []).map((d: any) => {
                        const o = (room.gmvTrend.find((g: any) => g.stats_type === "TREND_CREATED_ORDER")?.data_points ?? []).find((x: any) => x.timestamp === d.timestamp);
                        return (
                          <tr key={d.timestamp} className="border-t border-zinc-800 first:border-t-0">
                            <td className="px-2 py-1 tabular-nums">{new Date(Number(d.timestamp) * 1000).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmt(Number(d.gmv?.amount ?? 0))}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{o?.order_count ?? 0} orders</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {s && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="GMV" value={`${s.currency ?? ""} ${fmt(s.gmv)}`} sub={s.live_title ?? ""} />
              <Kpi label="SKU orders" value={String(s.sku_orders)} sub={`${s.main_orders} main · ${s.customers} customers`} />
              <Kpi label="Impressions" value={Number(s.impressions).toLocaleString()} sub={`${Number(s.views).toLocaleString()} views · ${Number(s.unique_viewers).toLocaleString()} unique`} />
              <Kpi label="CTR (mean)" value={pct(s.mean_ctr)} sub={`tap-through~ ${pct(s.tap_through_rate)}`} />
              <Kpi label="CTOR sku (derived)" value={pct(s.derived_ctor_sku)} sub={`mean interval ${pct(s.mean_ctor_sku)}`} />
              <Kpi label="AOV" value={`${s.currency ?? ""} ${s.aov !== null ? fmt(s.aov) : "n/a"}`} sub="avg_price (main order)" />
              <Kpi label="GMV / hour" value={s.gmv_per_hour !== null ? fmt(s.gmv_per_hour) : "n/a"} sub={`${s.items_sold} items sold`} />
              <Kpi label="Peak viewers" value={String(s.peak_viewers)} sub={`${s.product_clicks.toLocaleString()} product clicks`} />
            </div>
            <div className={`${cardCls} mb-4 text-xs text-zinc-400`}>
              Gaps (by design, not fetched): Ads Cost / GMV Max ROI / GMV MAX active live on the
              Marketing-API side (join follows); avg viewing duration has no field in this payload.
              Tap-through~ = product_clicks ÷ views. GMV includes returns/refunds per the doc.
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">
                Hourly buckets (MYT, {data.hourly?.length ?? 0}h · {data.intervals} minute intervals)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-medium">Hour</th>
                    <th className="px-2 py-2 text-right font-medium">GMV</th>
                    <th className="px-2 py-2 text-right font-medium">SKU orders</th>
                    <th className="px-2 py-2 text-right font-medium">Views</th>
                    <th className="px-2 py-2 text-right font-medium">Clicks</th>
                    <th className="px-2 py-2 text-right font-medium">Impr</th>
                  </tr></thead>
                  <tbody>
                    {(data.hourly ?? []).map((h: any) => (
                      <tr key={h.hour} className="border-t border-zinc-800">
                        <td className="px-2 py-2">{h.hour}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(h.gmv)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{h.sku_orders}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.views).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.product_clicks).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.impressions).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
