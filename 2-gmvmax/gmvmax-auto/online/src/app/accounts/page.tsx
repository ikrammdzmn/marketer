"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "../toast";

// /accounts — TikTok account allowlist + SOP targets. Split out of the
// /creative Manage modal so the team edits here directly.
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [acctsMsg, setAcctsMsg] = useState("");
  const [targets, setTargets] = useState({ topN: "20", minImpr: "", maxCpm: "" });
  const [dragUid, setDragUid] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acctCols, setAcctCols] = useState<Record<string, boolean>>(() => {
    try { return { name: true, username: true, account_id: true, identity_id: true, note: true, active: true, live: true, top_affiliate: true, updated_at: true, row_num: true, ...JSON.parse(localStorage.getItem("creative-acct-cols") ?? "{}") }; }
    catch { return { name: true, username: true, account_id: true, identity_id: true, note: true, active: true, live: true, top_affiliate: true, updated_at: true, row_num: true }; }
  });

  const authHeader = { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` };
  const loadedRef = useRef(false);
  // Row identity must survive re-renders: a plain `let` counter resets on
  // every render, stamping every added row with the same _uid so editing one
  // edits all twins. A ref persists, so every row stays unique.
  const uidRef = useRef(1000);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAll();
  }, []);

  function toggleAcctCol(k: string) {
    setAcctCols((p) => {
      const n = { ...p, [k]: !p[k] };
      try { localStorage.setItem("creative-acct-cols", JSON.stringify(n)); } catch { /* private mode */ }
      return n;
    });
  }
  function withUid(rows: any[]) {
    return rows.map((r: any) => ({ ...r, _uid: uidRef.current++ }));
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
      const identity_id = String(a.identity_id ?? "").trim();
      const note = String(a.note ?? "").trim();
      if (!name && !username && !account_id && !identity_id && !note) return; // skip blank rows
      if (!name) { bad = i + 1; return; }
      rows.push({ name, username, account_id, identity_id, note, active: a.active !== false, live: a.live === true, top_affiliate: a.top_affiliate === true });
    });
    return { rows, bad };
  }

  async function loadAll() {
    setAcctsMsg("");
    try {
      const a = await fetch("/api/creative-accounts").then((r) => r.json());
      if (a.accounts) setAccounts(withUid(a.accounts));
      else { setAcctsMsg(a.error ?? "accounts failed"); toast(a.error ?? "accounts failed", "err"); }
      const t = await fetch("/api/creative-targets").then((r) => r.json());
      if (!t.error) {
        setTargets({
          topN: String(t.topN ?? 20),
          minImpr: t.minImpr === null || t.minImpr === undefined ? "" : String(t.minImpr),
          maxCpm: t.maxCpm === null || t.maxCpm === undefined ? "" : String(t.maxCpm),
        });
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "load failed";
      setAcctsMsg(m);
      toast(m, "err");
    }
  }

  async function saveAll() {
    const { rows, bad } = collectRows();
    if (bad > 0) { const m = `Row ${bad} has details but no name — name is required.`; setAcctsMsg(m); toast(m, "err"); return; }
    setSaving(true);
    setAcctsMsg("Saving…");
    try {
      const r = await fetch("/api/creative-accounts", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ accounts: rows }),
      });
      const body = await r.json();
      if (!r.ok) { const m = body.error ?? `HTTP ${r.status}`; setAcctsMsg(m); toast(m, "err"); return; }
      const t = await fetch("/api/creative-targets", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          topN: Number(targets.topN),
          minImpr: targets.minImpr.trim() === "" ? null : Number(targets.minImpr),
          maxCpm: targets.maxCpm.trim() === "" ? null : Number(targets.maxCpm),
        }),
      });
      const tbody = await t.json();
      if (!t.ok) { const m = `Accounts saved (${body.count}); targets failed: ${tbody.error ?? t.status}`; setAcctsMsg(m); toast(m, "err"); return; }
      const okMsg = `Saved ${body.count} accounts + targets.`;
      setAcctsMsg(okMsg);
      toast(okMsg);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  function downloadJSON() {
    const { rows } = collectRows();
    const blob = new Blob([JSON.stringify(rows.map((a) => ({ ...a, accountId: a.account_id, identityId: a.identity_id, topAffiliate: a.top_affiliate })), null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = u; el.download = "accounts.json"; el.click();
    URL.revokeObjectURL(u);
  }

  function downloadCSV() {
    const { rows } = collectRows();
    const byName = new Map(accounts.map((a: any) => [String(a.name ?? "").trim(), a.updated_at ?? ""]));
    const q = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = ["Account name,Username,Account ID,Ads Identity ID,Note,Active,Live,Top affiliate,Last updated"];
    rows.forEach((a) => {
      lines.push([q(a.name), q(a.username), q(a.account_id), q(a.identity_id), q(a.note),
        a.active ? "TRUE" : "FALSE", a.live ? "TRUE" : "FALSE", a.top_affiliate ? "TRUE" : "FALSE",
        q(byName.get(a.name) ?? "")].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = u; el.download = "accounts.csv"; el.click();
    URL.revokeObjectURL(u);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <span className="flex-1" />
        <button onClick={() => setEditing(!editing)} className={`rounded-lg px-3 py-1.5 text-[13px] ${editing ? "bg-amber-800 hover:bg-amber-700" : "border border-zinc-700 hover:bg-zinc-800"}`}>{editing ? "Done editing" : "Edit"}</button>
      </div>
      <p className="mb-2 text-[12px] text-zinc-400">Names must match the Excel file exactly (username, account ID, identity ID and notes are display-only). Ticking Top/Active moves rows between groups live; drag ⠿ to reorder — Save keeps the shown order.</p>
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
        {[["row_num", "No."], ["name", "Name"], ["username", "@username"], ["account_id", "ID"], ["identity_id", "Ads Identity ID"], ["note", "Note"], ["active", "Active"], ["live", "Live"], ["top_affiliate", "Top"], ["updated_at", "Updated"]].map(([k, label]) => (
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
                  {acctCols.identity_id && <th className="px-1 py-1" title="Ads identity ID — display-only">Ads Identity ID</th>}
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
                        {acctCols.identity_id && <td className="px-1 py-1">{editing ? <input value={a.identity_id ?? ""} onChange={(e) => patch(a._uid, { identity_id: e.target.value })} placeholder="Identity ID (optional)" className="w-32 rounded bg-zinc-900 px-1 py-0.5" /> : <span className="text-zinc-500">{a.identity_id || "—"}</span>}</td>}
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
        {editing && <button onClick={() => { uidRef.current += 1; setAccounts([...accounts, { _uid: uidRef.current, name: "", username: "", account_id: "", identity_id: "", note: "", active: true, live: false, top_affiliate: false }]); }} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">＋ Add account</button>}
        <button onClick={saveAll} disabled={saving} className="rounded bg-emerald-700 px-3 py-1.5 hover:bg-emerald-600 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        <button onClick={downloadJSON} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">Download JSON</button>
        <button onClick={downloadCSV} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">Download CSV</button>
      </div>
    </main>
  );
}
