"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";

// /catalog — friendly campaign/product names. Split out of the /creative
// Manage modal so the team edits here directly.
export default function CatalogPage() {
  const [catalog, setCatalog] = useState<{ campaigns: any[]; products: any[] }>({ campaigns: [], products: [] });
  const [catMsg, setCatMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catCols, setCatCols] = useState<Record<string, boolean>>(() => {
    try { return { id: true, label: true, note: true, archived: true, campaign: true, ...JSON.parse(localStorage.getItem("creative-cat-cols") ?? "{}") }; }
    catch { return { id: true, label: true, note: true, archived: true, campaign: true }; }
  });

  const authHeader = { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` };
  const loadedRef = useRef(false);
  // Stable row identity (same bug family as accounts): index keys make typed
  // text jump rows after a delete. Loaded rows keep c-index/p-index uids;
  // added rows take fresh ones from the ref.
  const uidRef = useRef(0);
  const withCid = (rows: any[], tag: string) => (rows ?? []).map((x: any, i: number) => ({ ...x, _uid: x._uid ?? `${tag}${i}` }));
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCatalog();
  }, []);

  function toggleCatCol(k: string) {
    setCatCols((p) => {
      const n = { ...p, [k]: !p[k] };
      try { localStorage.setItem("creative-cat-cols", JSON.stringify(n)); } catch { /* private mode */ }
      return n;
    });
  }

  async function loadCatalog() {
    setCatMsg("");
    try {
      const c = await fetch("/api/creative-catalog").then((r) => r.json());
      if (c.campaigns) setCatalog({ campaigns: withCid(c.campaigns, "c"), products: withCid(c.products, "p") });
      else { setCatMsg(c.error ?? "catalog failed"); toast(c.error ?? "catalog failed", "err"); }
    } catch (e) {
      const m = e instanceof Error ? e.message : "load failed";
      setCatMsg(m);
      toast(m, "err");
    }
  }

  async function saveCatalog() {
    setSaving(true);
    setCatMsg("Saving…");
    try {
      const r = await fetch("/api/creative-catalog", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(catalog),
      });
      const body = await r.json();
      const m = r.ok ? `Saved ${body.campaigns} campaigns + ${body.products} products.` : (body.error ?? `HTTP ${r.status}`);
      setCatMsg(m);
      toast(m, r.ok ? "ok" : "err");
      if (r.ok) loadCatalog();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 text-sm">
      <ModuleRedirect module="catalog" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Catalog</h2>
        <span className="flex-1" />
        <button onClick={() => setEditing(!editing)} className={`rounded-lg px-3 py-1.5 text-[13px] ${editing ? "bg-amber-800 hover:bg-amber-700" : "border border-zinc-700 hover:bg-zinc-800"}`}>{editing ? "Done editing" : "Edit"}</button>
      </div>
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
              <tr key={c._uid ?? `c${i}`} className="border-t border-zinc-800 first:border-t-0">
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
      {editing && <button onClick={() => setCatalog({ ...catalog, campaigns: [...catalog.campaigns, { _uid: `cnew${uidRef.current++}`, campaign_id: "", label: "", note: "", archived: false }] })} className="mb-3 rounded border border-zinc-700 px-2 py-1 text-[12px] hover:bg-zinc-800">+ Add campaign</button>}
      <div className="mb-1 text-[13px] font-semibold">Products ({catalog.products.length})</div>
      <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-[12px]">
          <tbody>
            {catalog.products.map((p: any, i: number) => (
              <tr key={p._uid ?? `p${i}`} className="border-t border-zinc-800 first:border-t-0">
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
        {editing && <button onClick={() => setCatalog({ ...catalog, products: [...catalog.products, { _uid: `pnew${uidRef.current++}`, product_id: "", name: "", note: "", campaign_id: "", archived: false }] })} className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800">+ Add product</button>}
        <button onClick={saveCatalog} disabled={saving} className="rounded bg-emerald-700 px-3 py-1 hover:bg-emerald-600 disabled:opacity-50">{saving ? "Saving…" : "Save catalog"}</button>
      </div>
    </main>
  );
}
