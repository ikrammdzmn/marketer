"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";
import DateRangePicker from "../DateRangePicker";
import { Hint } from "../hint";
import { rangeLabel } from "@/lib/ttam-scores";

// /seller-creative — Creative Seller Center (port of the claude-system
// Creative Analisis dashboard). 5 tabs:
//   Seller = Shop Open API organic (NEW tables, this module pulls it).
//   Product = GMV Max video ads (served by /creative, same video IDs).
//   Live = live rooms (served by /shop-live).
//   Ads = Ads Manager boost rows (pending integrated-API pull).
//   Evergreen = age + monthly-order rule (pending owner approval, doc 04).
// Rule: GMV Max reads ~13% higher than Seller Center for the same
// video/day — compare side-by-side, never sum.

type Tab = "seller" | "product" | "live" | "ads" | "evergreen";

function Spin({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <span className={`inline-block animate-spin rounded-full border border-zinc-500 border-t-transparent align-middle ${className}`} />
  );
}

function postedAge(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const p = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const n = Math.round((Date.parse(today) - Date.parse(p)) / 86400000);
  if (!n || n <= 0) return "—";
  return `${n - 1}d`;
}

export default function SellerCreativePage() {
  const todayMYT = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const shiftMYT = (iso: string, k: number) =>
    new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + k * 86400000)
      .toISOString().slice(0, 10);
  const [tab, setTab] = useState<Tab>("seller");
  // Default = "Past 7 days" preset (today-7 → yesterday, 7 closed dates) —
  // Shop organic lags ~2d so today is usually empty.
  const [start, setStart] = useState(() => shiftMYT(todayMYT(), -7));
  const [end, setEnd] = useState(() => shiftMYT(todayMYT(), -1));
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [topAccounts, setTopAccounts] = useState<Record<string, any>>({});
  const [ruleNote, setRuleNote] = useState("");
  const [split, setSplit] = useState<any>(null);
  const [statusF, setStatusF] = useState("all");
  const [msg, setMsg] = useState("");
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeOut, setProbeOut] = useState<any>(null);
  const [cls, setCls] = useState("all");
  const [sort, setSort] = useState("gmv");
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);
  // Fetch progress popup (same pattern as gmv-max: elapsed/ETA/10s stay/Cancel).
  const [fetchProg, setFetchProg] = useState<{ total: number; done: number; label: string; failed: string[]; startedAt: number; finishedAt?: number } | null>(null);
  const fetchCancelRef = useRef(false);
  const fetchCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearProgClose = () => {
    if (fetchCloseTimer.current) { clearTimeout(fetchCloseTimer.current); fetchCloseTimer.current = null; }
  };
  const [fetchNow, setFetchNow] = useState(0);
  useEffect(() => {
    if (!fetchProg) return;
    setFetchNow(Date.now());
    const id = setInterval(() => setFetchNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [fetchProg !== null]);
  useEffect(() => () => clearProgClose(), []);
  // DB-first auto-load on open (cheap Neon read, same as Fetch; TikTok
  // pull stays manual via Sync). Runs once with the default past-7d range.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function finishProg(t0: number, total: number, okCount: number, failed: string[]) {
    const doneCount = okCount + failed.length;
    const elapsedDone = Math.max(0, Math.round((Date.now() - t0) / 1000));
    setFetchProg({ total, done: doneCount, label: `Done in ${elapsedDone}s`, failed: [...failed], startedAt: t0, finishedAt: Date.now() });
    clearProgClose();
    fetchCloseTimer.current = setTimeout(() => { setFetchProg(null); fetchCloseTimer.current = null; }, 10000);
  }

  async function load() {
    if (fetching) return;
    setFetching(true);
    setMsg("");
    const t0 = Date.now();
    fetchCancelRef.current = false;
    clearProgClose();
    setFetchProg({ total: 1, done: 0, label: rangeLabel(start, end), failed: [], startedAt: t0 });
    try {
      const r = await fetch(
        `/api/seller-creative/overview?startDate=${start}&endDate=${end}&accountClass=${cls}&sort=${sort}&limit=100`
      ).then((x) => x.json());
      if (r.error) {
        setMsg(r.error);
        toast(r.error, "err");
        return;
      }
      setRows(r.rows ?? []);
      setTotals(r.totals ?? null);
      setBreakdown(r.breakdown ?? []);
      setTopAccounts(r.topAccounts ?? {});
      setRuleNote(r.rule?.note ?? "");
      setSplit(r.split ?? null);
      if ((r.rows ?? []).length === 0) setMsg("No organic rows cached for this range yet — press Sync from Shop.");
      else setMsg(`${r.rows.length} videos.`);
      finishProg(t0, 1, 1, []);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      setMsg(m);
      toast(m, "err");
      finishProg(t0, 1, 0, [m.slice(0, 120)]);
    } finally {
      setFetching(false);
    }
  }

  async function postJSON(url: string, body: unknown): Promise<any> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Timeouts/proxies answer HTML — surface that instead of a parse error.
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error(`server answer not JSON (HTTP ${res.status}): ${txt.slice(0, 120)}`);
    }
  }

  async function sync() {
    if (syncing || fetching) return;
    setSyncing(true);
    try {
      const ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(start);
      const mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(end);
      if (!ma || !mb) {
        setMsg("Pick a valid date range first.");
        return;
      }
      const n = Math.round((Date.UTC(+mb[1], +mb[2] - 1, +mb[3]) - Date.UTC(+ma[1], +ma[2] - 1, +ma[3])) / 86400000) + 1;
      if (n <= 0 || n > 31) {
        setMsg("Range must be 1–31 days.");
        return;
      }
      // Server caps one POST at 7d (Hobby 60s). Organic days are heavy,
      // so chunk SINGLE days, listing only (imp fills separately below) —
      // newest-first so recent data lands even if aborted.
      const chunks: { s: string; e: string }[] = [];
      let ce = end;
      const addDays = (iso: string, k: number) =>
        new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + k * 86400000)
          .toISOString().slice(0, 10);
      while (ce >= start) {
        chunks.push({ s: ce, e: ce });
        ce = addDays(ce, -1);
        if (chunks.length > 31) break;
      }
      let vids = 0, dys = 0, okChunks = 0;
      const errs: string[] = [];
      const failed: string[] = [];
      const t0 = Date.now();
      fetchCancelRef.current = false;
      clearProgClose();
      setFetchProg({ total: chunks.length, done: 0, label: rangeLabel(chunks[0].s, chunks[0].e), failed: [], startedAt: t0 });
      for (let i = 0; i < chunks.length; i++) {
        if (fetchCancelRef.current) break;
        const ch = chunks[i];
        setMsg(chunks.length > 1 ? `Syncing from Shop… chunk ${i + 1}/${chunks.length} (${ch.s}–${ch.e})` : "Syncing from Shop…");
        setFetchProg({ total: chunks.length, done: i, label: rangeLabel(ch.s, ch.e), failed: [...failed], startedAt: t0 });
        try {
          const r = await postJSON("/api/seller-creative/sync", {
            shopNumber: "1", startDate: ch.s, endDate: ch.e, withImp: false,
          });
          if (r.error) {
            errs.push(`${ch.s}–${ch.e}: ${r.error}`);
            failed.push(ch.s);
            setFetchProg({ total: chunks.length, done: i + 1, label: rangeLabel(ch.s, ch.e), failed: [...failed], startedAt: t0 });
            continue;
          }
          vids += r.videos ?? 0;
          dys += r.days ?? 0;
          okChunks += 1;
        } catch (e) {
          errs.push(`${ch.s}–${ch.e}: ${e instanceof Error ? e.message : "failed"}`);
          failed.push(ch.s);
        }
        setFetchProg({ total: chunks.length, done: i + 1, label: rangeLabel(ch.s, ch.e), failed: [...failed], startedAt: t0 });
      }
      const okMsg = `Synced ${vids} video-days over ${dys}d${errs.length ? ` · ${errs.length} chunk(s) failed` : ""}.`;
      const firstErr = errs.length ? ` First error: ${errs[0].slice(0, 220)}` : "";
      const cancelled = fetchCancelRef.current;
      setMsg((cancelled ? "Cancelled: " : "") + okMsg + (errs.length ? firstErr : ""));
      toast((cancelled ? "Cancelled: " : "") + (errs.length ? `${okMsg}${firstErr}` : okMsg), errs.length || cancelled ? "err" : "ok");
      finishProg(t0, chunks.length, okChunks, failed);
      if (!errs.length && !cancelled) await load();
    } finally {
      setSyncing(false);
    }
  }

  async function fillImp() {
    if (syncing || fetching) return;
    setSyncing(true);
    try {
      const ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(start);
      const mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(end);
      if (!ma || !mb) {
        setMsg("Pick a valid date range first.");
        return;
      }
      const n = Math.round((Date.UTC(+mb[1], +mb[2] - 1, +mb[3]) - Date.UTC(+ma[1], +ma[2] - 1, +ma[3])) / 86400000) + 1;
      if (n <= 0 || n > 31) {
        setMsg("Range must be 1–31 days.");
        return;
      }
      const addDays = (iso: string, k: number) =>
        new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + k * 86400000)
          .toISOString().slice(0, 10);
      let total = 0;
      let okDays = 0;
      const failed: string[] = [];
      const t0 = Date.now();
      fetchCancelRef.current = false;
      clearProgClose();
      setFetchProg({ total: n, done: 0, label: `Filling product views… ${n}d`, failed: [], startedAt: t0 });
      for (let i = n - 1; i >= 0; i--) {
        if (fetchCancelRef.current) break;
        const d = addDays(start, i);
        const doneDays = n - 1 - i;
        setFetchProg({ total: n, done: doneDays, label: `Filling product views… ${d}`, failed: [...failed], startedAt: t0 });
        for (let round = 0; round < 8; round++) {
          if (fetchCancelRef.current) break;
          setMsg(`Filling product views… ${d} (batch ${round + 1}, +${total} filled)`);
          try {
            const r = await postJSON("/api/seller-creative/imp", { shopNumber: "1", date: d, limit: 5 });
            if (r.error) {
              setMsg(`Imp fill stopped: ${r.error}`);
              toast(r.error, "err");
              failed.push(d);
              finishProg(t0, n, okDays, failed);
              return;
            }
            total += r.filled ?? 0;
            if ((r.empty ?? 0) > 0 && (r.filled ?? 0) === 0) {
              setMsg(`Imp fill: ${r.empty} calls returned no values — field names unverified. Press Probe and paste impKeys/impSample.`);
              toast("Imp calls empty — paste probe impSample for mapping.", "err");
              failed.push(d);
              finishProg(t0, n, okDays, failed);
              return;
            }
            if ((r.remaining ?? 0) <= 0) break;
          } catch (e) {
            setMsg(`Imp fill stopped: ${e instanceof Error ? e.message : "failed"}`);
            toast("Imp fill stopped — retry to continue.", "err");
            failed.push(d);
            finishProg(t0, n, okDays, failed);
            return;
          }
        }
        if (fetchCancelRef.current) break;
        okDays += 1;
        setFetchProg({ total: n, done: doneDays + 1, label: `Filling product views… ${d}`, failed: [...failed], startedAt: t0 });
      }
      const cancelled = fetchCancelRef.current;
      const okMsg = `${cancelled ? "Cancelled: " : ""}Filled product views for ${total} video-days.`;
      setMsg(okMsg + (failed.length ? ` · ${failed.length} day(s) failed: ${failed.join(", ")}` : ""));
      toast(okMsg, failed.length || cancelled ? "err" : "ok");
      finishProg(t0, n, okDays, failed);
      if (!failed.length && !cancelled) await load();
    } finally {
      setSyncing(false);
    }
  }

  async function probe() {
    setProbing(true);
    setProbeOut(null);
    try {
      const r = await fetch(`/api/seller-creative/probe?shopNumber=1&date=${start}`).then((x) => x.json());
      setProbeOut(r);
      if (r.error) toast(r.error, "err");
    } catch (e) {
      setProbeOut({ error: e instanceof Error ? e.message : "probe failed" });
    } finally {
      setProbing(false);
    }
  }

  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");
  const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-MY") : "—");
  const [openId, setOpenId] = useState<string | null>(null);
  const tabs: [Tab, string][] = [
    ["seller", "Seller Center"],
    ["product", "Product GMV Max"],
    ["live", "Live"],
    ["ads", "Ads Manager"],
    ["evergreen", "Evergreen"],
  ];

  // Top-5 (Claude parity: single GMV-sorted list, no metric sub-tabs —
  // those belong to the Product GMV Max tab).
  const topBase: any[] = statusF === "all" ? rows : rows.filter((r: any) => r.status === statusF);
  const num = (v: unknown) => Number(v ?? 0);
  const byGmv = [...topBase].filter((r: any) => num(r.gmv) > 0).sort((a: any, b: any) => num(b.gmv) - num(a.gmv));
  const curList = byGmv.slice(0, 5);
  const shownList = curList;
  const metricLabel = "Gross Revenue";
  const topGmvSum = curList.reduce((s: number, r: any) => s + num(r.gmv), 0);
  const totGmv = num(totals?.gmv);
  const sharePct = totGmv > 0 ? (topGmvSum / totGmv) * 100 : NaN;
  // Group benchmarks for Kenapa kuat (same filtered set as the list).
  const sOrd1kAvg = (() => { const v = topBase.filter((r: any) => Number(r.views) > 0).map((r: any) => Number(r.order_per_1k ?? NaN)).filter((x) => Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; })();
  const sCtrAvg = (() => { const v = topBase.filter((r: any) => Number(r.views) > 0 && r.clicks !== null && r.clicks !== undefined).map((r: any) => (Number(r.clicks) / Number(r.views)) * 100).filter((x) => Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; })();
  const ageD = (v: unknown): number | null => {
    if (!v) return null;
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const p = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const n = Math.round((Date.parse(today) - Date.parse(p)) / 86400000);
    if (!n || n <= 0) return null;
    return n - 1;
  };
  // Doc-08 cutoffs: hook tiers from reference P25/P75 (loaded rows, ≥500 imp
  // where retention exists); ROI floor 8 ("jauh melepasi"); completion
  // setanding ±15%; endurance tinggalkan ≤28 / 29–37 / ≥38. Fixed win-signal
  // order: reply format, authority, ROI≥8, evergreen. Subtitle-only bullets
  // (voice start, beg-kuning timing, script density) stay absent by design.
  const linkTags = (cap: string) => {
    const parts = String(cap ?? "").split(/(#[\p{L}\p{N}_]+)/u);
    return parts.map((p, i) => /^#[\p{L}\p{N}_]+$/u.test(p)
      ? <a key={i} href={`https://www.tiktok.com/tag/${encodeURIComponent(p.slice(1))}`} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{p}</a>
      : <span key={i}>{p}</span>);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 text-sm">
      <ModuleRedirect module="seller-creative" />
      <h2 className="mb-1 text-lg font-semibold">Creative Seller Center</h2>
      <p className="mb-3 text-[12px] text-zinc-400">
        Organic video performance from TikTok Shop (views, GMV, orders per video per day).
        GMV Max reads ~13% higher for the same video/day — compare side-by-side, never summed.
      </p>
      <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-zinc-100 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "seller" && (
        <>
          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[["Views", f0(Number(totals?.views ?? NaN))], ["GMV", `MYR ${f2(Number(totals?.gmv ?? NaN))}`], ["Orders", f0(Number(totals?.orders ?? NaN))], ["Videos", f0(Number(totals?.videos ?? NaN))], ["Video menjual", f0(Number(totals?.selling ?? NaN))]].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                <div className="text-[10px] text-zinc-500">{k}</div>
                <div className="text-sm font-medium tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          {breakdown.length > 0 && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {["internal", "top_affiliate", "affiliate", "inactive"].map((c) => {
                const b = breakdown.find((x: any) => x.cls === c);
                const top = topAccounts[c];
                return (
                  <div key={c} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[12px]">
                    <div className="font-medium capitalize text-zinc-200">{c === "top_affiliate" ? "Top Affiliate" : c} · {f0(Number(b?.videos ?? 0))} videos · {f0(Number(b?.selling ?? 0))} menjual</div>
                    <div className="text-zinc-400 tabular-nums">{f0(Number(b?.views ?? 0))} views · MYR {f2(Number(b?.gmv ?? 0))} · {f0(Number(b?.orders ?? 0))} orders</div>
                    <div className="text-[11px] text-zinc-500">Top: {top?.username ?? "— (nama belum ada — tunggu metadata)"}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
            <button ref={rangeBtnRef} onClick={() => {
              if (!calOpen && rangeBtnRef.current) {
                const r = rangeBtnRef.current.getBoundingClientRect();
                setCalPos({ top: r.bottom + 8, left: r.left });
              }
              setCalOpen((v) => !v);
            }} className="rounded bg-zinc-900 px-2 py-1">{rangeLabel(start, end)} 📅</button>
            <button onClick={load} disabled={fetching || syncing} className="inline-flex items-center gap-2 rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:opacity-50">
              {fetching ? (<><Spin />Fetching…</>) : "Fetch rows"}
            </button>
            <button onClick={sync} disabled={syncing || fetching} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-1 hover:bg-emerald-600 disabled:opacity-50">
              {syncing ? (<><Spin className="h-3 w-3 border-white/60 border-t-transparent" />Syncing…</>) : "Sync from Shop"}
            </button>
            <button onClick={fillImp} disabled={syncing || fetching} title="Fill product views/clicks for big and selling videos (slow TikTok leg, runs in small batches)" className="inline-flex items-center gap-2 rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:opacity-50">
              Fill product views
            </button>
            <select value={cls} onChange={(e) => setCls(e.target.value)} title="Account class (from /accounts mapping)" className="max-w-48 rounded bg-zinc-900 px-2 py-1">
              <option value="all">Class: All</option>
              <option value="internal">Internal</option>
              <option value="top_affiliate">Top Affiliate</option>
              <option value="affiliate">Affiliate</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="max-w-48 rounded bg-zinc-900 px-2 py-1">
              <option value="gmv">Sort: GMV</option>
              <option value="views">Sort: Views</option>
              <option value="orders">Sort: Orders</option>
            </select>
            <select value={statusF} onChange={(e) => setStatusF(e.target.value)} title="Status verdict (phase 1 rule)" className="max-w-48 rounded bg-zinc-900 px-2 py-1">
              <option value="all">Status: Semua</option>
              <option value="Winner">Winner</option>
              <option value="Baik">Baik</option>
              <option value="Sampel kecil">Sampel kecil</option>
              <option value="Tiada jualan">Tiada jualan</option>
            </select>
            <button onClick={probe} disabled={probing} className="rounded-lg border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:opacity-50">
              {probing ? "Probing…" : "Probe Shop API"}
            </button>
            <span className="text-zinc-500">{msg}</span>
          </div>
          <p className="mb-2 text-[11px] text-zinc-500">Shop organic lags ~2d — today/yesterday usually return 0 rows. Probe shows <span className="font-mono">latestAvailable</span>; Sync that day or older.</p>
          {calOpen && (
            <DateRangePicker
              from={start} to={end} pos={calPos}
              onApply={(f, t) => { setStart(f); setEnd(t); setCalOpen(false); }}
              onClose={() => setCalOpen(false)}
            />
          )}
          {probeOut && (
            <pre className="mb-2 max-h-96 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-2 font-mono text-[11px] text-zinc-300">
              {JSON.stringify(probeOut, null, 2)}
            </pre>
          )}
          {rows.length > 0 && (
          <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <h3 className="font-medium text-zinc-100">Top 5 video: {metricLabel}</h3>
            <p className="mb-2 text-[11px] text-zinc-500">Disusun ikut GMV dalam tempoh dipilih. Tekan petak video untuk main + data.</p>
            <div className="space-y-2">
              {shownList.map((r: any, idx: number) => {
                const open = openId === r.video_id;
                const posted = String(r.posted_api ?? r.posted_from_id ?? "").slice(0, 10) || "—";
                const o1k = num(r.order_per_1k);
                const ctrV = Number(r.views) > 0 && r.clicks !== null && r.clicks !== undefined ? (Number(r.clicks) / Number(r.views)) * 100 : NaN;
                const age = ageD(r.posted_api ?? r.posted_from_id);
                const isReply = /^\s*replying to @/i.test(String(r.caption ?? ""));
                const isAuthority = /doktor|\bdr\b|pakar/i.test(String(r.caption ?? ""));
                const roiV = r.roi === null || r.roi === undefined ? NaN : Number(r.roi);
                const winSignals: string[] = [];
                if (isReply) winSignals.push("format balas komen (menjawab soalan penonton)");
                if (isAuthority) winSignals.push("penanda doktor (authority)");
                if (Number.isFinite(roiV) && roiV >= 8) winSignals.push(`ROI iklan ${roiV.toFixed(1)}, jauh melepasi pulang modal`);
                if (age !== null && age >= 60) winSignals.push(`masih menjual ${age} hari selepas post (evergreen)`);
                return (
                  <div key={r.video_id} onClick={() => setOpenId(open ? null : r.video_id)} className={`cursor-pointer rounded-xl border px-3 py-2 ${idx === 0 ? "border-amber-300/60 bg-amber-200/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-300 text-zinc-900" : "bg-orange-400/20 text-orange-200"}`}>{idx + 1}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : r.video_id); }}
                        title={open ? "Close" : "Open video + data"}
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800 hover:bg-zinc-700"
                      >
                        {open ? (
                          <span className="flex h-full w-full items-center justify-center text-xs text-zinc-300">✕</span>
                        ) : r.cover_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-zinc-400">▶</span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-zinc-100" title={r.caption ?? r.video_id}>{(r.caption ?? "").slice(0, 90) || r.video_id}</div>
                        <div className="font-mono text-[10px] text-zinc-600" title={r.video_id}>{r.video_id}</div>
                        <div className="text-[11px] text-zinc-500">{r.username ?? "—"} · dipost {posted}</div>
                      </div>
                      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline ${r.account_class === "internal" ? "bg-sky-900 text-sky-200" : r.account_class === "top_affiliate" ? "bg-amber-900 text-amber-200" : r.account_class === "inactive" ? "bg-zinc-900 text-zinc-500" : "bg-zinc-800 text-zinc-300"}`}>{r.account_class === "top_affiliate" ? "Top Affiliate" : r.account_class ?? "affiliate"}</span>
                      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline ${r.status === "Winner" ? "bg-emerald-900 text-emerald-200" : r.status === "Baik" ? "bg-sky-900 text-sky-200" : "bg-zinc-800 text-zinc-300"}`}>{r.status ?? "—"}</span>
                      <div className="shrink-0 text-right tabular-nums">
                        <div className="text-[10px] text-zinc-500">GMV</div>
                        <div className="text-sm font-semibold text-zinc-100">RM{f0(num(r.gmv))}</div>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <div className="text-[10px] text-zinc-500">Order</div>
                        <div className="text-sm font-semibold text-zinc-100">{f0(num(r.orders ?? r.sku_orders))}</div>
                      </div>
                      <div className="hidden shrink-0 text-right tabular-nums sm:block">
                        <div className="text-[10px] text-zinc-500">Views</div>
                        <div className="text-sm font-semibold text-zinc-100">{f0(num(r.views))}</div>
                      </div>
                    </div>
                    {open && (
                      <div onClick={(e) => e.stopPropagation()} className="mt-2 flex flex-col gap-2 rounded-lg bg-black/30 p-2 sm:flex-row">
                        <iframe
                          key={r.video_id}
                          src={`https://www.tiktok.com/player/v1/${r.video_id}?embed_from=oembed&music_info=1&description=1`}
                          className="aspect-[325/578] w-40 shrink-0 rounded-lg sm:w-48"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          title={`TikTok video ${r.video_id}`}
                        />
                        <div className="min-w-0 flex-1 text-[12px]">
                          <div className="rounded-lg bg-zinc-100 p-3 text-zinc-900">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 font-bold text-red-500">{String(r.username ?? "?").slice(0, 1).toUpperCase()}</span>
                              <div>
                                <div className="font-medium">{r.username ?? "—"}</div>
                                <div className="text-[11px] text-zinc-500">@{r.username ?? "—"} · dipost {posted}</div>
                              </div>
                            </div>
                            <div className="mt-2 leading-relaxed">{linkTags(String(r.caption ?? r.video_id))}</div>
                          </div>
                          <div className="mt-2">
                            <div className="font-medium text-zinc-200">Kenapa kuat:<Hint text="Auto-ditulis daripada angka video ini lawan purata grup dalam julat ini. Bukan penilaian manusia." /></div>
                            <div className="mt-1 text-zinc-400">GMV RM{f0(num(r.gmv))} daripada {f0(num(r.orders))} order di Seller Center, menjual pada {r.days} hari.<Hint text="Jumlah jualan TikTok Shop dikaitkan kepada video ini dalam tempoh dipilih (organik + ads). GMV Max tidak ditambah — banding sebelah-sebelah." /></div>
                            <div className="text-zinc-400">Penonton mudah beli: {f2(o1k)} order setiap 1k tontonan (purata {f2(sOrd1kAvg)}).<Hint text={`Kadar beli = order ÷ tontonan × 1000. Purata ${topBase.filter((x: any) => Number(x.views) > 0).length} video dalam julat ini.`} /></div>
                            {Number.isFinite(ctrV) && <div className="text-zinc-400">Klik ke produk: CTR {ctrV.toFixed(1)}%{Number.isFinite(sCtrAvg) ? ` (purata ${f2(sCtrAvg)}%)` : ""}.<Hint text="Klik kad produk ÷ tontonan. Imp = paparan kad produk, bukan tontonan video." /></div>}
                            {r.in_gmvmax && <div className="text-zinc-400">Video ini juga ada dalam GMV Max: GMV RM{f0(num(r.gmvmax_gmv))}{Number(r.gmvmax_cost) > 0 ? ` daripada kos ads RM${f0(num(r.gmvmax_cost))}` : ""}.<Hint text="Ya = video ini juga menjual melalui iklan GMV Max dalam tempoh ini. Angka tidak dicampur." /></div>}
                          </div>
                          {winSignals.length > 0 && (
                            <div className="mt-2">
                              <div className="font-medium text-zinc-200">Kenapa boleh menang:<Hint text="Isyarat dalam susunan tetap: format balas komen, penanda doktor, ROI jauh melepasi, evergreen." /></div>
                              {winSignals.map((s, i) => <div key={i} className="text-zinc-400">Isyarat {i + 1}: {s}.</div>)}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-zinc-500">Had: tak tonton visual (potongan, teks atas skrin, ekspresi). Kata-kata seperti "hook kuat" bermaksud angka tinggi, bukan penilaian kreatif.</div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-400">
                            <div>Views: <span className="text-zinc-200">{f0(num(r.views))}</span></div>
                            <div>Ord/1k: <span className="text-zinc-200">{f2(num(r.order_per_1k))}</span></div>
                            <div>Imp: <span className="text-zinc-200">{r.imp === null ? "—" : f0(num(r.imp))}</span> · Clicks: <span className="text-zinc-200">{r.clicks === null ? "—" : f0(num(r.clicks))}</span><Hint text="Paparan dan klik kad produk (bukan tontonan video). — = belum ditarik; tekan Fill product views." /></div>
                            <div>GMV Max: <span className="text-zinc-200">{r.in_gmvmax ? `Ya (MYR ${f2(num(r.gmvmax_gmv))})` : "Tidak"}</span><Hint text="Ya = video ini juga menjual melalui iklan GMV Max dalam tempoh ini." /></div>
                            <div>Days: <span className="text-zinc-200">{r.days}</span> · Class: <span className="text-zinc-200">{r.account_class ?? "affiliate"}</span><Hint text="Dari senarai /accounts: Internal / Top Affiliate / Affiliate / Inactive." /></div>
                            <div>Untung: <span className="text-zinc-200">RM{f2(num(r.untung))}</span> · Kos ads: <span className="text-zinc-200">RM{f2(num(r.gmvmax_cost))}</span><Hint text="Untung = GMV × 0.35 − kos ads (margin 35% andaian). Kos = belanja GMV Max video ini." /></div>
                          </div>
                          <a href={`https://www.tiktok.com/@_/video/${r.video_id}`} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-lg bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-500">Buka di TikTok</a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {shownList.length === 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-[12px] text-zinc-500">Tiada video layak dengan penapis semasa.</div>}
            </div>
            <div className="mt-2 rounded-xl border border-amber-200/40 bg-amber-200/10 p-3 text-[12px] text-amber-100/90">
              <div className="font-medium">💡 Analisis: kenapa kategori ini winning</div>
              <div className="mt-1">Syarat senarai ini: Hanya video dengan GMV melebihi RM0 layak: {byGmv.length} video.</div>
              <div>Lima video ini bawa GMV RM{f0(topGmvSum)}{Number.isFinite(sharePct) ? ` (${sharePct.toFixed(1)}% daripada GMV semua video)` : ""}.</div>
            </div>
          </div>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="px-2 py-1.5">Video</th>
                    <th className="px-2 py-1.5">Account</th>
                    <th className="px-2 py-1.5">Class</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5 text-right">Views</th>
                    <th className="px-2 py-1.5 text-right">GMV</th>
                    <th className="px-2 py-1.5 text-right">Orders</th>
                    <th className="px-2 py-1.5 text-right">Untung</th>
                    <th className="px-2 py-1.5 text-right">ROI</th>
                    <th className="px-2 py-1.5 text-right">Ord/1k</th>
                    <th className="px-2 py-1.5 text-right">Imp</th>
                    <th className="px-2 py-1.5 text-right">Clicks</th>
                    <th className="px-2 py-1.5 text-center">GMV Max</th>
                    <th className="px-2 py-1.5 text-right">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(statusF === "all" ? rows : rows.filter((r: any) => r.status === statusF)).map((r: any) => (
                    <Fragment key={r.video_id}>
                    <tr onClick={() => setOpenId(openId === r.video_id ? null : r.video_id)} className="cursor-pointer border-b border-zinc-800/60 hover:bg-zinc-900/60">
                      <td className="max-w-56 truncate px-2 py-1.5" title={`${r.caption ?? ""}\n${r.video_id}`}>
                        <a onClick={(e) => e.stopPropagation()} className="text-sky-300 hover:underline" href={`https://www.tiktok.com/@_/video/${r.video_id}`} target="_blank" rel="noreferrer">
                          {(r.caption ?? "").slice(0, 40) || r.video_id}
                        </a>
                        <div className="text-[10px] text-zinc-500">{postedAge(r.posted_api ?? r.posted_from_id) !== "—" ? `${postedAge(r.posted_api ?? r.posted_from_id)} old` : "age unknown"}</div>
                        <div className="font-mono text-[10px] text-zinc-600">{r.video_id}</div>
                      </td>
                      <td className="px-2 py-1.5 text-zinc-300">{r.username ?? "—"}</td>
                      <td className="px-2 py-1.5 text-zinc-400">{r.account_class ?? "affiliate"}</td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "Winner" ? "bg-emerald-900 text-emerald-200" : r.status === "Baik" ? "bg-sky-900 text-sky-200" : r.status === "Sampel kecil" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-500"}`}>
                          {r.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{f0(Number(r.views ?? NaN))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{f2(Number(r.gmv ?? NaN))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{f0(Number(r.orders ?? NaN))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.untung === null || r.untung === undefined || !Number.isFinite(Number(r.untung)) ? "—" : f2(Number(r.untung))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.roi === null || r.roi === undefined || !Number.isFinite(Number(r.roi)) ? "—" : Number(r.roi).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{f2(Number(r.order_per_1k ?? NaN))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.imp === null ? "—" : f0(Number(r.imp))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.clicks === null ? "—" : f0(Number(r.clicks))}</td>
                      <td className="px-2 py-1.5 text-center" title={r.in_gmvmax ? `GMV Max MYR ${f2(Number(r.gmvmax_gmv ?? 0))} — banding, bukan jumlah` : "Tiada jualan GMV Max dalam tempoh ini"}>
                        {r.in_gmvmax ? <span className="text-emerald-300">Ya</span> : <span className="text-zinc-500">Tidak</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.days}</td>
                    </tr>
                    {openId === r.video_id && (
                    <tr className="border-b border-zinc-800/60 bg-black/20">
                      <td colSpan={14} className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <iframe
                            key={r.video_id}
                            src={`https://www.tiktok.com/player/v1/${r.video_id}?embed_from=oembed&music_info=1&description=1`}
                            className="aspect-[325/578] w-40 shrink-0 rounded-lg sm:w-48"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            title={`TikTok video ${r.video_id}`}
                          />
                          <div className="min-w-0 flex-1 text-[12px]">
                            <div className="font-medium text-zinc-100" title={r.caption ?? r.video_id}>{(r.caption ?? "").slice(0, 120) || r.video_id}</div>
                            <div className="mt-1 text-zinc-500">{r.username ?? "—"} · dipost {String(r.posted_api ?? r.posted_from_id ?? "").slice(0, 10) || "—"} · {f0(num(r.views))} views</div>
                            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-400">
                              <div>Untung: <span className="text-zinc-200">RM{f2(num(r.untung))}</span> · Kos ads: <span className="text-zinc-200">RM{f2(num(r.gmvmax_cost))}</span></div>
                              <div>GMV Max: <span className="text-zinc-200">{r.in_gmvmax ? `Ya (MYR ${f2(num(r.gmvmax_gmv))})` : "Tidak"}</span> · Class: <span className="text-zinc-200">{r.account_class ?? "affiliate"}</span></div>
                            </div>
                            <a href={`https://www.tiktok.com/@_/video/${r.video_id}`} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-lg border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800">Open in TikTok ↗</a>
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-zinc-500">
            {split ? `60+40: ${split.sellers} penjual teratas + ${split.discovery} discovery tontonan. ` : ""}
            {ruleNote ? `${ruleNote}. ` : ""}
            Imp — = not yet pulled (today&apos;s data fills on later runs). Organic = Seller Center GMV on days with no GMV Max sale; the two sources are never added together (GMV Max reads ~13% higher for the same video/day).
          </p>
        </>
      )}

      {tab === "product" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="font-medium">Product GMV Max videos</h3>
          <p className="mt-1 text-[12px] text-zinc-400">
            Served by the existing <Link href="/creative" className="text-sky-300 hover:underline">/creative</Link> module
            (same video IDs — <span className="font-mono">item_id = video_id</span>). Open it for kill/scale verdicts, trends and insight labels.
          </p>
          <Link href="/creative" className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium hover:bg-emerald-600">Open /creative →</Link>
        </div>
      )}

      {tab === "live" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="font-medium">Live rooms</h3>
          <p className="mt-1 text-[12px] text-zinc-400">
            Served by the existing <Link href="/shop-live" className="text-sky-300 hover:underline">/shop-live</Link> module
            (list grain + room detail for marketing and affiliate rooms).
          </p>
          <Link href="/shop-live" className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium hover:bg-emerald-600">Open /shop-live →</Link>
        </div>
      )}

      {tab === "ads" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="font-medium">TikTok Ads Manager</h3>
          <p className="mt-1 text-[12px] text-zinc-400">
            Boost rows (spend, impressions, engagement — no sales) come from the Marketing API integrated report,
            a different token from Shop. Not yet pulled — this tab lights up once the integrated pull lands.
            Table <span className="font-mono">creative.ads_manager_day</span> is already migrated (038) and waiting.
          </p>
        </div>
      )}

      {tab === "evergreen" && (() => {
        const evRows = rows.map((r: any) => {
          const age = ageD(r.posted_api ?? r.posted_from_id);
          const orders = Number(r.orders ?? 0);
          const roi = r.roi === null || r.roi === undefined || !Number.isFinite(Number(r.roi)) ? null : Number(r.roi);
          const st = age === null ? "Umur tidak diketahui" : age < 60 ? "Belum layak" : orders < 3 ? "Belum layak" : "Calon Evergreen";
          return { r, age, orders, roi, st };
        }).sort((a: any, b: any) => ((b.st === "Calon Evergreen") ? 1 : 0) - ((a.st === "Calon Evergreen") ? 1 : 0) || Number(b.r.gmv ?? 0) - Number(a.r.gmv ?? 0));
        const nCalon = evRows.filter((x: any) => x.st === "Calon Evergreen").length;
        const nDays = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1);
        return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="font-medium">Evergreen — Calon (v1)</h3>
          <p className="mt-1 text-[12px] text-zinc-400">
            Rule penuh: posted ≥60 hari, ≥3 order dalam sekurang-kurangnya 2 daripada 3 bulan terkini, ROI gabungan ≥2.86 ("Kuat" = layak ketiga-tiga bulan).
            Liputan data: {start} → {end} ({nDays} hari) — rule penuh perlukan 3 bulan sejarah, matang automatik bila Neon cukup umur. "Kuat" dikira sendiri bila data tiba.
            {nCalon > 0 ? ` ${nCalon} calon daripada ${evRows.length} video.` : ` Tiada calon dalam julat ini (${evRows.length} video).`}
          </p>
          {evRows.length > 0 && (
          <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-2 py-1.5">Video</th>
                  <th className="px-2 py-1.5">Dipost</th>
                  <th className="px-2 py-1.5 text-right">Umur</th>
                  <th className="px-2 py-1.5 text-right">Order</th>
                  <th className="px-2 py-1.5 text-right">GMV</th>
                  <th className="px-2 py-1.5 text-right">ROI</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {evRows.map(({ r, age, roi, st }: any) => (
                  <tr key={r.video_id} className="border-b border-zinc-800/60 hover:bg-zinc-900/60">
                    <td className="max-w-56 truncate px-2 py-1.5" title={`${r.caption ?? ""}\n${r.video_id}`}>
                      <a className="text-sky-300 hover:underline" href={`https://www.tiktok.com/@_/video/${r.video_id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        {(r.caption ?? "").slice(0, 40) || r.video_id}
                      </a>
                      <div className="font-mono text-[10px] text-zinc-600">{r.video_id}</div>
                    </td>
                    <td className="px-2 py-1.5 text-zinc-400">{String(r.posted_api ?? r.posted_from_id ?? "").slice(0, 10) || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{age === null ? "—" : `${age}d`}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{f0(Number(r.orders ?? NaN))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{f2(Number(r.gmv ?? NaN))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{roi === null ? "—" : roi.toFixed(1)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st === "Calon Evergreen" ? "bg-emerald-900 text-emerald-200" : "bg-zinc-800 text-zinc-300"}`}>{st}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
        );
      })()}
      {fetchProg && (() => {
        const endTs = fetchProg.finishedAt ?? fetchNow ?? fetchProg.startedAt;
        const elapsed = Math.max(0, Math.floor((endTs - fetchProg.startedAt) / 1000));
        const finished = !!fetchProg.finishedAt;
        const eta = !finished && fetchProg.total > 1 && fetchProg.done > 0
          ? Math.max(0, Math.round((elapsed / fetchProg.done) * (fetchProg.total - fetchProg.done)))
          : null;
        const pct = fetchProg.total ? Math.round((fetchProg.done / fetchProg.total) * 100) : 0;
        const indeterminate = !finished && fetchProg.done === 0;
        return (
        <div className="fixed bottom-4 right-4 z-[60] w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
          <div className="flex items-center justify-between text-sm font-medium text-zinc-100">
            <span>{finished ? `Done ✓ ${fetchProg.done}/${fetchProg.total} · ${elapsed}s` : `Fetching Shop… ${fetchProg.done}/${fetchProg.total} · ${elapsed}s`}</span>
            {fetchProg.total > 1 && !finished && (
            <button
              onClick={() => { fetchCancelRef.current = true; }}
              className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-800"
            >Cancel</button>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            {indeterminate
              ? <div className="h-full w-1/4 animate-pulse rounded-full bg-emerald-500" />
              : <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-400">{fetchProg.label}{eta !== null ? ` · ≈${eta}s left` : ""}</div>
          {fetchProg.failed.length > 0 && (
            <div className="mt-1 text-[11px] text-amber-300">{fetchProg.failed.length} slice(s) failed: {fetchProg.failed.join(", ")}</div>
          )}
        </div>
        );
      })()}
    </main>
  );
}
