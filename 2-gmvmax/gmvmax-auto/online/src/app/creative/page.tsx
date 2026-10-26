"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";

// /creative — Creative analysis module (tab 3). Capability probe + cached
// PRODUCT rows. Account/catalog editing moved to /accounts + /catalog.
export default function CreativePage() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const todayMYT = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [crStart, setCrStart] = useState(todayMYT());
  const [crEnd, setCrEnd] = useState(todayMYT());
  const [crRows, setCrRows] = useState<any[]>([]);
  const [crMsg, setCrMsg] = useState("");
  const [crBusy, setCrBusy] = useState(false);
  const [crCamps, setCrCamps] = useState<any[]>([]);
  const [crCamp, setCrCamp] = useState("1858977225474178");
  const [crStatus, setCrStatus] = useState("ALL");

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
  }, []);

  async function loadRows() {
    setCrMsg("");
    try {
      const camp = crCamp === "ALL" ? "" : crCamp;
      const r = await fetch(`/api/creative-sync?shopNumber=1&startDate=${crStart}&endDate=${crEnd}${camp ? `&campaignId=${camp}` : ""}`).then((x) => x.json());
      if (r.rows) { setCrRows(r.rows); setCrMsg(r.rows.length === 0 ? "No cached rows for this range yet — press Sync from TikTok." : `${r.rows.length} rows.`); }
      else { setCrMsg(r.error ?? "fetch failed"); toast(r.error ?? "fetch failed", "err"); }
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

  // Kill-list (Stage 7.1): aggregate cached day-rows by post over the range.
  function killList() {
    const byPost = new Map<string, { cost: number; gmv: number; orders: number; imp: number; days: Set<string>; title: string; account: string; status: string }>();
    for (const r of crRows) {
      const id = String(r.item_id ?? "?");
      let e = byPost.get(id);
      if (!e) {
        e = { cost: 0, gmv: 0, orders: 0, imp: 0, days: new Set(), title: String(r.title ?? ""), account: String(r.tt_account ?? ""), status: String(r.status ?? "") };
        byPost.set(id, e);
      }
      e.cost += Number(r.cost ?? 0);
      e.gmv += Number(r.gmv ?? 0);
      e.orders += Number(r.orders ?? 0);
      e.imp += Number(r.impressions ?? 0);
      e.days.add(String(r.date ?? "").slice(0, 10));
      if (String(r.status ?? "") === "DELIVERING") e.status = "DELIVERING";
      if (!e.title && r.title) e.title = String(r.title);
    }
    const rows = [...byPost.entries()].map(([id, e]) => ({
      id, ...e, days: e.days.size,
      roi: e.cost > 0 ? e.gmv / e.cost : 0,
      verdict: e.cost >= 50 && (e.cost === 0 || e.gmv / e.cost < 2) ? "KILL"
        : e.cost >= 20 && e.gmv === 0 ? "KILL"
        : e.cost > 0 && e.gmv / e.cost >= 10 ? "SCALE"
        : e.cost > 0 ? "WATCH" : "—",
    })).sort((a, b) => b.cost - a.cost);
    const tc = rows.reduce((s, r) => s + r.cost, 0);
    const tg = rows.reduce((s, r) => s + r.gmv, 0);
    const hero = rows[0];
    const tailWaste = rows.filter((r) => r.roi < 2).reduce((s, r) => s + r.cost, 0);
    return { rows, totalCost: tc, totalGmv: tg, roi: tc > 0 ? tg / tc : 0, hero, tailWaste };
  }

  function killCsv(rows: { id: string; title: string; account: string; status: string; days: number; cost: number; gmv: number; roi: number; orders: number; imp: number; verdict: string }[]) {
    const head = "post_id,title,account,status,days,spend,gmv,roi,orders,impressions,verdict";
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.id, q(r.title), q(r.account), r.status, r.days, r.cost.toFixed(2), r.gmv.toFixed(2), r.roi.toFixed(2), r.orders, r.imp, r.verdict].join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kill-list-${crStart}_${crEnd}.csv`;
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
        body: JSON.stringify({ shopNumber: "1", startDate: crStart, endDate: crEnd, campaignId: crCamp === "ALL" ? "" : crCamp }),
      });
      const body = await r.json();
      if (!r.ok) { const m = body.error ?? `HTTP ${r.status}`; setCrMsg(m); toast(m, "err"); return; }
      const skips = Object.keys(body.skipped ?? {}).length;
      const okMsg = `Synced ${body.rows} rows (${body.campaigns} campaigns × ${body.days}d${skips ? `, ${skips} skips` : ""}).`;
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
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
        <select value={crCamp} onChange={(e) => setCrCamp(e.target.value)} onFocus={loadCamps} className="max-w-64 rounded bg-zinc-900 px-2 py-1">
          <option value="1858977225474178">himcoffee (1858…4178)</option>
          {crCamps.filter((c: any) => String(c.campaign_id) !== "1858977225474178").map((c: any) => (
            <option key={c.campaign_id} value={c.campaign_id}>{(c.catalog_label || c.name || "").slice(0, 30)} ({String(c.campaign_id).slice(0, 4)}…{String(c.campaign_id).slice(-4)})</option>
          ))}
          <option value="ALL">All PRODUCT campaigns</option>
        </select>
        <input type="date" value={crStart} onChange={(e) => setCrStart(e.target.value)} className="rounded bg-zinc-900 px-2 py-1" />
        <span className="text-zinc-500">→</span>
        <input type="date" value={crEnd} onChange={(e) => setCrEnd(e.target.value)} className="rounded bg-zinc-900 px-2 py-1" />
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
      {crShown.length > 0 && (
        <div className="mb-2 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-zinc-400">
              <th className="px-2 py-1">#</th><th className="px-2 py-1">Date</th><th className="px-2 py-1">Creative</th>
              <th className="px-2 py-1">Account</th><th className="px-2 py-1">Status</th>
              <th className="px-2 py-1 text-right">Cost</th><th className="px-2 py-1 text-right">Orders</th>
              <th className="px-2 py-1 text-right">GMV</th><th className="px-2 py-1 text-right">ROI</th>
            </tr></thead>
            <tbody>
              {crShown.map((r: any, i: number) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-2 py-1 text-zinc-500">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-zinc-500">{String(r.date).slice(0, 10)}</td>
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

      {(() => {
        if (crRows.length === 0) return null;
        const k = killList();
        const shown = crStatus === "ALL" ? k.rows : k.rows.filter((r) => (r.status || "—") === crStatus);
        const sCost = shown.reduce((s, r) => s + r.cost, 0);
        const sGmv = shown.reduce((s, r) => s + r.gmv, 0);
        const sRoi = sCost > 0 ? sGmv / sCost : 0;
        const sHero = shown[0];
        const sTail = shown.filter((r) => r.roi < 2).reduce((s, r) => s + r.cost, 0);
        return (
          <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Kill list{crStatus !== "ALL" ? ` · ${crStatus}` : ""}</span>
              <span className="text-[11px] text-zinc-500">
                {shown.length} posts · spend MYR {sCost.toFixed(0)} · GMV {sGmv.toFixed(0)} · ROI {sRoi.toFixed(2)}
                {sHero && sCost > 0 ? ` · hero ${(100 * sHero.cost / sCost).toFixed(0)}% (${sHero.title.slice(0, 28) || sHero.id})` : ""}
                {sTail > 0 ? ` · tail waste MYR ${sTail.toFixed(0)}` : ""}
              </span>
              <button onClick={() => killCsv(shown)} className="ml-auto rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">CSV</button>
              <button onClick={selectKills} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800" title="Select all KILL rows (excludes Unattributed)">Select KILL</button>
              <button onClick={() => void copyDraft()} disabled={exSel.size === 0} className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-200 hover:bg-red-950 disabled:opacity-50" title="Copy selected post IDs — remove them in Ads Manager by hand">
                {exCopied ? `Copied ${exSel.size}!` : `Copy draft (${exSel.size})`}
              </button>
            </div>
            {exSel.size > 0 && (
              <p className="mt-1 text-[11px] text-amber-200/80">Draft: remove these {exSel.size} post(s) in Ads Manager → campaign → creatives. Read-only draft — nothing is applied from here.</p>
            )}
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-zinc-800">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-zinc-900"><tr className="text-left text-zinc-400">
                  <th className="px-2 py-1">#</th><th className="px-2 py-1">Ex</th><th className="px-2 py-1">Post</th><th className="px-2 py-1">Account</th>
                  <th className="px-2 py-1">Status</th><th className="px-2 py-1 text-right">Days</th>
                  <th className="px-2 py-1 text-right">Spend</th><th className="px-2 py-1 text-right">GMV</th>
                  <th className="px-2 py-1 text-right">ROI</th><th className="px-2 py-1">Verdict</th>
                </tr></thead>
                <tbody>
                  {shown.slice(0, 300).map((r, i) => (
                    <tr key={r.id} className="border-t border-zinc-800">
                      <td className="px-2 py-1 text-zinc-500">{i + 1}</td>
                      <td className="px-2 py-1"><input type="checkbox" checked={exSel.has(r.id)} onChange={() => toggleEx(r.id)} aria-label={`exclude ${r.id}`} /></td>
                      <td className="max-w-64 truncate px-2 py-1" title={`${r.title} · ${r.id}`}>{r.title || (r.id === "-1" ? "Unattributed" : `post ${r.id.slice(0, 8)}…`)}</td>
                      <td className="whitespace-nowrap px-2 py-1">{r.account || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "DELIVERING" ? "bg-emerald-900 text-emerald-200" : "bg-zinc-700 text-zinc-300"}`}>{r.status || "—"}</span></td>
                      <td className="px-2 py-1 text-right text-zinc-400">{r.days}</td>
                      <td className="px-2 py-1 text-right">{r.cost.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{r.gmv.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-medium ${r.roi >= 10 ? "text-emerald-300" : r.roi < 2 && r.cost >= 20 ? "text-red-300" : ""}`}>{r.roi.toFixed(2)}</td>
                      <td className="px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.verdict === "KILL" ? "bg-red-950 text-red-200" : r.verdict === "SCALE" ? "bg-emerald-900 text-emerald-200" : r.verdict === "WATCH" ? "bg-amber-950 text-amber-200" : "text-zinc-500"}`}>{r.verdict}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown.length > 300 && <p className="mt-1 text-[11px] text-zinc-500">Showing top 300 by spend — full list in CSV.</p>}
          </div>
        );
      })()}

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
    </main>
  );
}
