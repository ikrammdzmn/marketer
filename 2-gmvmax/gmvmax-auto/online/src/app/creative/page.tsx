"use client";

import { useState, useRef, useEffect } from "react";

// /creative — Creative analysis module (tab 3). Phase 1: API capability probe
// (can TikTok replace the xlsx export?). Phase 2: nightly sync + analysis UI.
export default function CreativePage() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [acctsMsg, setAcctsMsg] = useState("");
  const [targets, setTargets] = useState({ topN: "20", minImpr: "", maxCpm: "" });
  const [dragUid, setDragUid] = useState<number | null>(null);
  const [showMgr, setShowMgr] = useState(false);
  const [mgrTab, setMgrTab] = useState<"accounts" | "catalog">("accounts");
  const [editing, setEditing] = useState(false);
  const [acctCols, setAcctCols] = useState<Record<string, boolean>>(() => {
    try { return { name: true, username: true, account_id: true, note: true, active: true, live: true, top_affiliate: true, updated_at: true, row_num: true, ...JSON.parse(localStorage.getItem("creative-acct-cols") ?? "{}") }; }
    catch { return { name: true, username: true, account_id: true, note: true, active: true, live: true, top_affiliate: true, updated_at: true, row_num: true }; }
  });
  const [catCols, setCatCols] = useState<Record<string, boolean>>(() => {
    try { return { id: true, label: true, note: true, archived: true, campaign: true, ...JSON.parse(localStorage.getItem("creative-cat-cols") ?? "{}") }; }
    catch { return { id: true, label: true, note: true, archived: true, campaign: true }; }
  });
  const todayMYT = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [crStart, setCrStart] = useState(todayMYT());
  const [crEnd, setCrEnd] = useState(todayMYT());
  const [crRows, setCrRows] = useState<any[]>([]);
  const [crMsg, setCrMsg] = useState("");
  const [crBusy, setCrBusy] = useState(false);
  const [crCamps, setCrCamps] = useState<any[]>([]);
  const [crCamp, setCrCamp] = useState("1858977225474178");
  const [catalog, setCatalog] = useState<{ campaigns: any[]; products: any[] }>({ campaigns: [], products: [] });
  const [catMsg, setCatMsg] = useState("");

  const authHeader = { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` };
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadMapping();
    loadCamps();
  }, []);
  const snapRef = useRef("");
  function snapOf(a: any[], t: any, c: any): string {
    const strip = (x: any) => {
      const { _uid, updated_at, ...rest } = x ?? {};
      return rest;
    };
    return JSON.stringify({ a: a.map(strip), t, c });
  }

  function toggleAcctCol(k: string) {
    setAcctCols((p) => {
      const n = { ...p, [k]: !p[k] };
      try { localStorage.setItem("creative-acct-cols", JSON.stringify(n)); } catch { /* private mode */ }
      return n;
    });
  }
  function toggleCatCol(k: string) {
    setCatCols((p) => {
      const n = { ...p, [k]: !p[k] };
      try { localStorage.setItem("creative-cat-cols", JSON.stringify(n)); } catch { /* private mode */ }
      return n;
    });
  }
  function openManage() {
    setShowMgr(true);
    setEditing(false);
  }
  function maybeCloseMgr() {
    if (snapRef.current && snapRef.current !== snapOf(accounts, targets, catalog) && !window.confirm("Discard unsaved changes?")) return;
    setShowMgr(false);
    setEditing(false);
  }
  let uidSeq = 1000;
  function withUid(rows: any[]) {
    return rows.map((r: any) => ({ ...r, _uid: uidSeq++ }));
  }
  function patch(uid: number, p: any) {
    setAccounts(accounts.map((x) => (x._uid === uid ? { ...x, ...p } : x)));
  }
  function groupOf(a: any): "internal" | "top" | "inactive" {
    if (a.active === false) return "inactive";
    if (a.top_affiliate === true) return "top";
    return "internal";
  }
  function orderedGroups(): { key: string; title: string; rows: any[] }[] {
    const g = {
      internal: [] as any[], top: [] as any[], inactive: [] as any[],
    };
    accounts.forEach((a) => { g[groupOf(a)].push(a); });
    return [
      { key: "internal", title: "Internal Account", rows: g.internal },
      { key: "top", title: "Top Affiliate", rows: g.top },
      { key: "inactive", title: "Inactive", rows: g.inactive },
    ];
  }
  function moveRow(srcUid: number, dstUid: number, after: boolean) {
    if (srcUid === dstUid) return;
    const flat: any[] = [];
    orderedGroups().forEach((g) => { g.rows.forEach((r) => { flat.push(r); }); });
    const from = flat.findIndex((r) => r._uid === srcUid);
    const to = flat.findIndex((r) => r._uid === dstUid);
    if (from < 0 || to < 0) return;
    const [moving] = flat.splice(from, 1);
    let at = flat.findIndex((r) => r._uid === dstUid);
    if (after) at += 1;
    flat.splice(at, 0, moving);
    setAccounts(flat);
  }
  function fmtStamp(iso: any): string {
    if (!iso) return "–";
    const ms = Date.now() - new Date(String(iso)).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "–";
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function collectRows(): { rows: any[]; bad: number } {
    const flat: any[] = [];
    orderedGroups().forEach((g) => { g.rows.forEach((r) => { flat.push(r); }); });
    const rows: any[] = [];
    let bad = -1;
    flat.forEach((a, i) => {
      const name = String(a.name ?? "").trim();
      const username = String(a.username ?? "").trim();
      const account_id = String(a.account_id ?? "").trim();
      const note = String(a.note ?? "").trim();
      if (!name && !username && !account_id && !note) return; // skip blank rows
      if (!name) { bad = i + 1; return; }
      rows.push({ name, username, account_id, note, active: a.active !== false, live: a.live === true, top_affiliate: a.top_affiliate === true });
    });
    return { rows, bad };
  }

  async function loadMapping() {
    setAcctsMsg("");
    setCatMsg("");
    try {
      const a = await fetch("/api/creative-accounts").then((r) => r.json());
      if (a.accounts) { setAccounts(withUid(a.accounts)); } else setAcctsMsg(a.error ?? "accounts failed");
      const t = await fetch("/api/creative-targets").then((r) => r.json());
      const tgt = { topN: "20", minImpr: "", maxCpm: "" };
      if (!t.error) {
        tgt.topN = String(t.topN ?? 20);
        tgt.minImpr = t.minImpr === null || t.minImpr === undefined ? "" : String(t.minImpr);
        tgt.maxCpm = t.maxCpm === null || t.maxCpm === undefined ? "" : String(t.maxCpm);
        setTargets(tgt);
      }
      const c = await fetch("/api/creative-catalog").then((r) => r.json());
      const cat = { campaigns: [], products: [] } as { campaigns: any[]; products: any[] };
      if (c.campaigns) { cat.campaigns = c.campaigns; cat.products = c.products; setCatalog(cat); }
      else setCatMsg(c.error ?? "catalog failed");
      snapRef.current = snapOf(a.accounts ?? [], tgt, cat);
    } catch (e) {
      setAcctsMsg(e instanceof Error ? e.message : "load failed");
    }
  }

  async function saveAll() {
    const { rows, bad } = collectRows();
    if (bad > 0) { setAcctsMsg(`Row ${bad} has details but no name — name is required.`); return; }
    setAcctsMsg("Saving…");
    const r = await fetch("/api/creative-accounts", {
      method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ accounts: rows }),
    });
    const body = await r.json();
    if (!r.ok) { setAcctsMsg(body.error ?? `HTTP ${r.status}`); return; }
    const t = await fetch("/api/creative-targets", {
      method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        topN: Number(targets.topN),
        minImpr: targets.minImpr.trim() === "" ? null : Number(targets.minImpr),
        maxCpm: targets.maxCpm.trim() === "" ? null : Number(targets.maxCpm),
      }),
    });
    const tbody = await t.json();
    if (!t.ok) { setAcctsMsg(`Accounts saved (${body.count}); targets failed: ${tbody.error ?? t.status}`); return; }
    setAcctsMsg(`Saved ${body.count} accounts + targets.`);
    loadMapping();
  }

  function downloadJSON() {
    const { rows } = collectRows();
    const blob = new Blob([JSON.stringify(rows.map((a) => ({ ...a, accountId: a.account_id, topAffiliate: a.top_affiliate })), null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = u; el.download = "accounts.json"; el.click();
    URL.revokeObjectURL(u);
  }

  function downloadCSV() {
    const { rows } = collectRows();
    const byName = new Map(accounts.map((a: any) => [String(a.name ?? "").trim(), a.updated_at ?? ""]));
    const q = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = ["Account name,Username,Account ID,Note,Active,Live,Top affiliate,Last updated"];
    rows.forEach((a) => {
      lines.push([q(a.name), q(a.username), q(a.account_id), q(a.note),
        a.active ? "TRUE" : "FALSE", a.live ? "TRUE" : "FALSE", a.top_affiliate ? "TRUE" : "FALSE",
        q(byName.get(a.name) ?? "")].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = u; el.download = "accounts.csv"; el.click();
    URL.revokeObjectURL(u);
  }

  async function saveCatalog() {
    setCatMsg("Saving…");
    const r = await fetch("/api/creative-catalog", {
      method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(catalog),
    });
    const body = await r.json();
    setCatMsg(r.ok ? `Saved ${body.campaigns} campaigns + ${body.products} products.` : (body.error ?? `HTTP ${r.status}`));
    if (r.ok) loadMapping();
  }

  async function loadRows() {
    setCrMsg("");
    try {
      const camp = crCamp === "ALL" ? "" : crCamp;
      const r = await fetch(`/api/creative-sync?shopNumber=1&startDate=${crStart}&endDate=${crEnd}${camp ? `&campaignId=${camp}` : ""}`).then((x) => x.json());
      if (r.rows) { setCrRows(r.rows); setCrMsg(r.rows.length === 0 ? "No cached rows for this range yet — press Sync from TikTok." : `${r.rows.length} rows.`); }
      else setCrMsg(r.error ?? "fetch failed");
    } catch (e) {
      setCrMsg(e instanceof Error ? e.message : "fetch failed");
    }
  }

  async function loadCamps() {
    try {
      const r = await fetch("/api/creative-sync?list=campaigns").then((x) => x.json());
      if (r.campaigns) setCrCamps(r.campaigns);
    } catch { /* picker stays manual */ }
  }

  async function syncRows() {
    setCrBusy(true);
    setCrMsg("Syncing from TikTok…");
    try {
      const r = await fetch("/api/creative-sync", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ shopNumber: "1", startDate: crStart, endDate: crEnd, campaignId: crCamp === "ALL" ? "" : crCamp }),
      });
      const body = await r.json();
      if (!r.ok) { setCrMsg(body.error ?? `HTTP ${r.status}`); return; }
      const skips = Object.keys(body.skipped ?? {}).length;
      setCrMsg(`Synced ${body.rows} rows (${body.campaigns} campaigns × ${body.days}d${skips ? `, ${skips} skips` : ""}).`);
      loadRows();
    } catch (e) {
      setCrMsg(e instanceof Error ? e.message : "sync failed");
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
      <button
        onClick={openManage}
        className="ml-2 rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
      >
        Manage
      </button>

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
        <span className="text-zinc-500">{crMsg}</span>
      </div>
      {crRows.length > 0 && (
        <div className="mb-2 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-zinc-400">
              <th className="px-2 py-1">Date</th><th className="px-2 py-1">Creative</th>
              <th className="px-2 py-1">Account</th><th className="px-2 py-1">Status</th>
              <th className="px-2 py-1 text-right">Cost</th><th className="px-2 py-1 text-right">Orders</th>
              <th className="px-2 py-1 text-right">GMV</th><th className="px-2 py-1 text-right">ROI</th>
            </tr></thead>
            <tbody>
              {crRows.map((r: any, i: number) => (
                <tr key={i} className="border-t border-zinc-800">
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

      <p className="mt-1 text-[12px] text-zinc-500">{accounts.length > 0 ? `${accounts.length} accounts` : "accounts"} · {catalog.campaigns.length > 0 ? `${catalog.campaigns.length} campaigns + ${catalog.products.length} products` : "catalog"} (open Manage to view/edit)</p>

      {showMgr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6" onClick={maybeCloseMgr}>
          <div className="mx-auto max-w-5xl rounded-xl border border-zinc-800 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Manage</h3>
              {(["accounts", "catalog"] as const).map((t) => (
                <button key={t} onClick={() => setMgrTab(t)} className={`rounded-lg px-3 py-1.5 text-[13px] capitalize ${mgrTab === t ? "bg-zinc-800" : "hover:bg-zinc-800"}`}>{t}</button>
              ))}
              <span className="flex-1" />
              <button onClick={() => setEditing(!editing)} className={`rounded-lg px-3 py-1.5 text-[13px] ${editing ? "bg-amber-800 hover:bg-amber-700" : "border border-zinc-700 hover:bg-zinc-800"}`}>{editing ? "Done editing" : "Edit"}</button>
              <button onClick={maybeCloseMgr} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[13px] hover:bg-zinc-800">✕ Close</button>
            </div>

            {mgrTab === "accounts" && (<>
              <p className="mb-2 text-[12px] text-zinc-400">Names must match the Excel file exactly (username, account ID and notes are display-only). Ticking Top/Active moves rows between groups live; drag ⠿ to reorder — Save keeps the shown order.</p>
              {acctsMsg && <p className="mb-1 text-[12px] text-zinc-400">{acctsMsg}</p>}
              <div className="mb-2 rounded-lg border border-zinc-800 px-3 py-2 text-[12px]">
                <div className="mb-1 text-zinc-400">SOP targets (blank = auto from the loaded file)</div>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    <label className="flex flex-col gap-1">Top-N
                      <input type="number" min={5} max={50} step={1} value={targets.topN} onChange={(e) => setTargets({ ...targets, topN: e.target.value })} className="w-24 rounded bg-zinc-900 px-2 py-1" />
                    </label>
                    <label className="flex flex-col gap-1">Min impressions
                      <input type="number" min={0} step={1} placeholder="auto" value={targets.minImpr} onChange={(e) => setTargets({ ...targets, minImpr: e.target.value })} className="w-28 rounded bg-zinc-900 px-2 py-1" />
                    </label>
                    <label className="flex flex-col gap-1">Max CPM (MYR)
                      <input type="number" min={0} step={0.01} placeholder="auto" value={targets.maxCpm} onChange={(e) => setTargets({ ...targets, maxCpm: e.target.value })} className="w-28 rounded bg-zinc-900 px-2 py-1" />
                    </label>
                  </div>
                ) : (
                  <div className="text-zinc-300">Top-N {targets.topN} · Min impressions {targets.minImpr === "" ? "auto" : targets.minImpr} · Max CPM {targets.maxCpm === "" ? "auto" : `MYR ${targets.maxCpm}`}</div>
                )}
              </div>
              <div className="mb-2 flex flex-wrap gap-1 text-[11px]">
                {[["row_num", "No."], ["name", "Name"], ["username", "@username"], ["account_id", "ID"], ["note", "Note"], ["active", "Active"], ["live", "Live"], ["top_affiliate", "Top"], ["updated_at", "Updated"]].map(([k, label]) => (
                  <button key={k} onClick={() => toggleAcctCol(k)} className={`rounded-full border px-2 py-0.5 ${acctCols[k] ? "border-zinc-600 text-zinc-200" : "border-zinc-800 text-zinc-600 line-through"}`}>{label}</button>
                ))}
              </div>
              {(() => {
                let n = 0;
                return orderedGroups().map((g) => (
                  <div key={g.key} className="mb-2">
                    <div className="mb-1 text-[13px] font-semibold">{g.title} ({g.rows.length})</div>
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-[12px]">
                        <thead><tr className="text-left text-[11px] text-zinc-500">
                          {acctCols.row_num && <th className="px-1 py-1 text-right" title="Row order — Save keeps the shown order">No.</th>}
                          {editing && <th className="px-1 py-1" />}
                          {acctCols.name && <th className="px-1 py-1" title="Must match the Excel file exactly">Name</th>}
                          {acctCols.username && <th className="px-1 py-1" title="Display-only">Username</th>}
                          {acctCols.account_id && <th className="px-1 py-1" title="TikTok account ID — display-only">Account ID</th>}
                          {acctCols.note && <th className="px-1 py-1" title="Display-only">Note</th>}
                          {acctCols.active && <th className="px-2 py-1" title="Unticked rows group under Inactive">Active</th>}
                          {acctCols.live && <th className="px-2 py-1" title="Shows 🔴 LIVE marker">Live</th>}
                          {acctCols.top_affiliate && <th className="px-2 py-1" title="Ticked rows group under Top Affiliate">Top</th>}
                          {acctCols.updated_at && <th className="px-2 py-1" title="Last save that changed this row">Updated</th>}
                          {editing && <th className="px-1 py-1" />}
                        </tr></thead>
                        <tbody>
                          {g.rows.map((a: any) => {
                            n += 1;
                            return (
                              <tr key={a._uid} className="border-t border-zinc-800"
                                onDragOver={editing ? (e) => e.preventDefault() : undefined}
                                onDrop={editing ? (e) => { e.preventDefault(); if (dragUid !== null) moveRow(dragUid, a._uid, true); setDragUid(null); } : undefined}>
                                {acctCols.row_num && <td className="w-8 px-1 py-1 text-right text-zinc-500">{n}.</td>}
                                {editing && <td className="w-8 px-1 py-1"><span draggable title="Drag to reorder" onDragStart={() => setDragUid(a._uid)} onDragEnd={() => setDragUid(null)} className="cursor-move text-zinc-500">⠿</span></td>}
                                {acctCols.name && <td className="px-1 py-1">{editing ? <input value={a.name ?? ""} onChange={(e) => patch(a._uid, { name: e.target.value })} placeholder="Exact account name" className="w-36 rounded bg-zinc-900 px-1 py-0.5" /> : <span className="font-medium">{a.name}</span>}</td>}
                                {acctCols.username && <td className="px-1 py-1">{editing ? <input value={a.username ?? ""} onChange={(e) => patch(a._uid, { username: e.target.value })} placeholder="username (no @)" className="w-28 rounded bg-zinc-900 px-1 py-0.5" /> : <span className="text-zinc-400">{a.username || "—"}</span>}</td>}
                                {acctCols.account_id && <td className="px-1 py-1">{editing ? <input value={a.account_id ?? ""} onChange={(e) => patch(a._uid, { account_id: e.target.value })} placeholder="ID (optional)" className="w-32 rounded bg-zinc-900 px-1 py-0.5" /> : <span className="text-zinc-500">{a.account_id || "—"}</span>}</td>}
                                {acctCols.note && <td className="px-1 py-1">{editing ? <input value={a.note ?? ""} onChange={(e) => patch(a._uid, { note: e.target.value })} placeholder="note (optional)" className="w-28 rounded bg-zinc-900 px-1 py-0.5" /> : <span className="text-zinc-400">{a.note || "—"}</span>}</td>}
                                {acctCols.active && <td className="px-2 py-1 text-center">{editing ? <input type="checkbox" checked={a.active !== false} onChange={(e) => patch(a._uid, { active: e.target.checked })} /> : (a.active !== false ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-600">—</span>)}</td>}
                                {acctCols.live && <td className="px-2 py-1 text-center">{editing ? <input type="checkbox" checked={a.live === true} onChange={(e) => patch(a._uid, { live: e.target.checked })} /> : (a.live === true ? <span>🔴</span> : <span className="text-zinc-600">—</span>)}</td>}
                                {acctCols.top_affiliate && <td className="px-2 py-1 text-center">{editing ? <input type="checkbox" checked={a.top_affiliate === true} onChange={(e) => patch(a._uid, { top_affiliate: e.target.checked })} /> : (a.top_affiliate === true ? <span className="text-amber-300">★</span> : <span className="text-zinc-600">—</span>)}</td>}
                                {acctCols.updated_at && <td className="whitespace-nowrap px-2 py-1 text-zinc-500">{fmtStamp(a.updated_at)}</td>}
                                {editing && <td className="px-1 py-1"><button onClick={() => setAccounts(accounts.filter((x) => x._uid !== a._uid))} title="Remove" className="text-red-400 hover:text-red-300">✕</button></td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {editing && <button onClick={() => { uidSeq += 1; setAccounts([...accounts, { _uid: uidSeq, name: "", username: "", account_id: "", note: "", active: true, live: false, top_affiliate: false }]); }} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">＋ Add account</button>}
                <button onClick={saveAll} className="rounded bg-emerald-700 px-3 py-1.5 hover:bg-emerald-600">Save</button>
                <button onClick={downloadJSON} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">Download JSON</button>
                <button onClick={downloadCSV} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">Download CSV</button>
              </div>
            </>)}

            {mgrTab === "catalog" && (<>
              {catMsg && <p className="mb-1 text-[12px] text-zinc-400">{catMsg}</p>}
              <div className="mb-2 flex flex-wrap gap-1 text-[11px]">
                {[["id", "ID"], ["label", "Label/Name"], ["campaign", "Campaign"], ["note", "Note"], ["archived", "Archived"]].map(([k, label]) => (
                  <button key={k} onClick={() => toggleCatCol(k)} className={`rounded-full border px-2 py-0.5 ${catCols[k] ? "border-zinc-600 text-zinc-200" : "border-zinc-800 text-zinc-600 line-through"}`}>{label}</button>
                ))}
              </div>
              <div className="mb-1 text-[13px] font-semibold">Campaigns ({catalog.campaigns.length})</div>
              <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-[12px]">
                  <tbody>
                    {catalog.campaigns.map((c: any, i: number) => (
                      <tr key={i} className="border-t border-zinc-800 first:border-t-0">
                        {catCols.id && <td className="whitespace-nowrap px-2 py-1 text-zinc-500">{c.campaign_id}</td>}
                        {catCols.label && <td className="px-1 py-1">{editing ? <input value={c.label ?? ""} onChange={(e) => setCatalog({ ...catalog, campaigns: catalog.campaigns.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className="w-48 rounded bg-zinc-900 px-1 py-0.5" placeholder="label" /> : <span className="font-medium">{c.label || "—"}</span>}</td>}
                        {catCols.note && <td className="px-1 py-1">{editing ? <input value={c.note ?? ""} onChange={(e) => setCatalog({ ...catalog, campaigns: catalog.campaigns.map((x, j) => j === i ? { ...x, note: e.target.value } : x) })} className="w-48 rounded bg-zinc-900 px-1 py-0.5" placeholder="note" /> : <span className="text-zinc-400">{c.note || "—"}</span>}</td>}
                        {catCols.archived && <td className="px-2 py-1">{editing ? <input type="checkbox" checked={c.archived === true} onChange={(e) => setCatalog({ ...catalog, campaigns: catalog.campaigns.map((x, j) => j === i ? { ...x, archived: e.target.checked } : x) })} /> : (c.archived === true ? <span className="text-zinc-500">archived</span> : <span className="text-zinc-600">—</span>)}</td>}
                        {editing && <td className="px-1 py-1"><button onClick={() => setCatalog({ ...catalog, campaigns: catalog.campaigns.filter((_, j) => j !== i) })} className="text-red-400">✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editing && <button onClick={() => setCatalog({ ...catalog, campaigns: [...catalog.campaigns, { campaign_id: "", label: "", note: "", archived: false }] })} className="mb-3 rounded border border-zinc-700 px-2 py-1 text-[12px] hover:bg-zinc-800">+ Add campaign</button>}
              <div className="mb-1 text-[13px] font-semibold">Products ({catalog.products.length})</div>
              <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-[12px]">
                  <tbody>
                    {catalog.products.map((p: any, i: number) => (
                      <tr key={i} className="border-t border-zinc-800 first:border-t-0">
                        {catCols.id && <td className="whitespace-nowrap px-2 py-1 text-zinc-500">{p.product_id}</td>}
                        {catCols.label && <td className="px-1 py-1">{editing ? <input value={p.name ?? ""} onChange={(e) => setCatalog({ ...catalog, products: catalog.products.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} className="w-40 rounded bg-zinc-900 px-1 py-0.5" placeholder="name" /> : <span className="font-medium">{p.name || "—"}</span>}</td>}
                        {catCols.campaign && <td className="px-1 py-1">{editing ? <input value={p.campaign_id ?? ""} onChange={(e) => setCatalog({ ...catalog, products: catalog.products.map((x, j) => j === i ? { ...x, campaign_id: e.target.value } : x) })} className="w-32 rounded bg-zinc-900 px-1 py-0.5" placeholder="campaign id" /> : <span className="text-zinc-400">{p.campaign_id || "—"}</span>}</td>}
                        {catCols.note && <td className="px-1 py-1">{editing ? <input value={p.note ?? ""} onChange={(e) => setCatalog({ ...catalog, products: catalog.products.map((x, j) => j === i ? { ...x, note: e.target.value } : x) })} className="w-40 rounded bg-zinc-900 px-1 py-0.5" placeholder="note" /> : <span className="text-zinc-400">{p.note || "—"}</span>}</td>}
                        {catCols.archived && <td className="px-2 py-1">{editing ? <input type="checkbox" checked={p.archived === true} onChange={(e) => setCatalog({ ...catalog, products: catalog.products.map((x, j) => j === i ? { ...x, archived: e.target.checked } : x) })} /> : (p.archived === true ? <span className="text-zinc-500">archived</span> : <span className="text-zinc-600">—</span>)}</td>}
                        {editing && <td className="px-1 py-1"><button onClick={() => setCatalog({ ...catalog, products: catalog.products.filter((_, j) => j !== i) })} className="text-red-400">✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 text-[12px]">
                {editing && <button onClick={() => setCatalog({ ...catalog, products: [...catalog.products, { product_id: "", name: "", note: "", campaign_id: "", archived: false }] })} className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800">+ Add product</button>}
                <button onClick={saveCatalog} className="rounded bg-emerald-700 px-3 py-1 hover:bg-emerald-600">Save catalog</button>
              </div>
            </>)}
          </div>
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
