"use client";

import { useEffect, useState } from "react";
import { SCORE_NAMES } from "@/lib/ttam-scores";

const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";
const thCls = "text-left text-xs uppercase tracking-wide text-zinc-400 font-medium px-2 py-2";
const tdCls = "px-2 py-2";
const numCls = "px-2 py-2 text-right tabular-nums";

export default function PresetsPage() {
  const [presetsList, setPresetsList] = useState<any[]>([]);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMetric, setNewMetric] = useState({ short: "", name: "", k: "", s: "", invert: false });
  const [showExport, setShowExport] = useState(false);
  const [expFields, setExpFields] = useState({ expression: "", format: "numeric", inputs: "", params: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function loadPresetList(selectKey?: string) {
    const r = await fetch(`/api/ttam-presets`);
    if (!r.ok) throw new Error((await r.json()).error ?? "presets failed");
    const body = await r.json();
    const list = body.presets ?? [];
    setPresetsList(list);
    const key = selectKey ?? list.find((p: any) => p.active)?.preset_key ?? list[0]?.preset_key;
    if (key) await loadPreset(key);
  }

  async function loadPreset(key: string) {
    const r = await fetch(`/api/ttam-presets?key=${encodeURIComponent(key)}`);
    if (!r.ok) throw new Error((await r.json()).error ?? "preset failed");
    const body = await r.json();
    const p = body.preset;
    setPresetKey(p.preset_key);
    setDraft({ label: p.label, notes: p.notes ?? "", guardrails: p.guardrails ?? {}, metrics: p.metrics ?? [] });
    setMsg(null);
    setConfirmDelete(null);
  }

  useEffect(() => {
    loadPresetList().catch((e) => setMsg(e instanceof Error ? e.message : "load failed")).finally(() => setLoading(false));
  }, []);

  async function action(action: string, extra?: any) {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/ttam-presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, key: presetKey, ...extra }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "preset action failed");
      setMsg(`${action} ok: ${body.preset?.preset_key ?? ""}`);
      if (action === "delete") {
        setPresetKey(null);
        setDraft(null);
      }
      await loadPresetList(action === "duplicate" ? body.preset?.preset_key : action === "delete" ? undefined : presetKey ?? undefined);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "preset action failed");
    } finally {
      setSaving(false);
    }
  }

  function addMetric() {
    const short = newMetric.short.trim().toUpperCase();
    if (!short) {
      setMsg("new metric needs a short code");
      return;
    }
    if ((draft.metrics ?? []).some((m: any) => String(m.short).toUpperCase() === short)) {
      setMsg(`duplicate metric: ${short}`);
      return;
    }
    const k = Number(newMetric.k);
    const s = Number(newMetric.s);
    if (!Number.isFinite(k) || !Number.isFinite(s)) {
      setMsg("new metric needs numeric K and S");
      return;
    }
    let params: any = {};
    if (expFields.params.trim()) {
      try {
        params = JSON.parse(expFields.params);
      } catch {
        setMsg("export params must be valid JSON");
        return;
      }
    }
    const row: any = {
      id: short.toLowerCase(), short, name: newMetric.name.trim() || short,
      k, s, invert: newMetric.invert, enabled: true, proxy: true,
    };
    if (expFields.expression.trim()) row.expression = expFields.expression.trim();
    if (expFields.format.trim()) row.format = expFields.format.trim();
    if (expFields.inputs.trim()) row.inputs = expFields.inputs.split(",").map((x) => x.trim()).filter(Boolean);
    if (Object.keys(params).length) row.params = params;
    setDraft({ ...draft, metrics: [...(draft.metrics ?? []), row] });
    setNewMetric({ short: "", name: "", k: "", s: "", invert: false });
    setExpFields({ expression: "", format: "numeric", inputs: "", params: "" });
    setShowExport(false);
    setMsg(`added ${short} — press Save to persist`);
  }

  function removeMetric(short: string) {
    setDraft({ ...draft, metrics: (draft.metrics ?? []).filter((m: any) => m.short !== short) });
    setConfirmDelete(null);
    setMsg(`removed ${short} — press Save to persist`);
  }

  async function exportPreset() {
    if (!presetKey) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/ttam-presets?key=${encodeURIComponent(presetKey)}&format=scorer`);
      if (!r.ok) throw new Error((await r.json()).error ?? "export failed");
      const body = await r.json();
      const blob = new Blob([JSON.stringify(body.file, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = body.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg(`exported ${body.fileName} — save into 3-ttam/campaign-performance-analysis/presets/ + add manifest line: ${body.manifestLine}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "export failed");
    } finally {
      setSaving(false);
    }
  }

  const isActive = (presetsList ?? []).find((p: any) => p.preset_key === presetKey)?.active;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <h2 className="mb-3 text-lg font-semibold">TTAM Presets</h2>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : (
          <div className="mb-3 grid gap-3 md:grid-cols-[240px,1fr]">
            <div className={cardCls}>
              <h4 className="mb-2 text-sm font-medium">Presets</h4>
              {(presetsList ?? []).map((p: any) => (
                <button key={p.preset_key} onClick={() => loadPreset(p.preset_key)}
                  className={`mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs ${p.preset_key === presetKey ? "bg-zinc-700 text-zinc-100" : "hover:bg-zinc-800 text-zinc-300"}`}>
                  {p.label}
                  {p.active && <span className="ml-1 rounded-full bg-emerald-900 px-1.5 text-[10px] text-emerald-200">active</span>}
                </button>
              ))}
            </div>
            <div className={`${cardCls} text-sm`}>
              {!draft ? (
                <div className="text-xs text-zinc-500">Select a preset.</div>
              ) : (
                <>
                  <label className="mb-2 block text-xs text-zinc-400">Label
                    <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={`${inputCls} ml-2 w-full max-w-md`} />
                  </label>
                  <div className="mb-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                    {(["min_spend", "min_impressions", "min_days"] as const).map((k) => (
                      <label key={k}>{k}
                        <input type="number" value={draft.guardrails?.[k] ?? ""} onChange={(e) => setDraft({ ...draft, guardrails: { ...draft.guardrails, [k]: Number(e.target.value) } })} className={`${inputCls} ml-2 w-24`} />
                      </label>
                    ))}
                  </div>
                  <div className="mb-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-zinc-400"><th className={thCls}>Metric</th><th className={`${thCls} text-right`}>K (kill)</th><th className={`${thCls} text-right`}>S (scale)</th><th className={thCls}>Invert</th><th className={thCls}>On</th><th className={thCls}></th></tr></thead>
                      <tbody>
                        {(draft.metrics ?? []).map((m: any, i: number) => (
                          <tr key={m.short} className="border-t border-zinc-800">
                            <td className={tdCls}>{m.short} <span className="text-zinc-500">· {m.name ?? SCORE_NAMES[m.short] ?? ""}</span></td>
                            <td className={numCls}><input type="number" step="any" value={m.k} onChange={(e) => { const ms = [...draft.metrics]; ms[i] = { ...m, k: Number(e.target.value) }; setDraft({ ...draft, metrics: ms }); }} className={`${inputCls} w-24 text-right`} /></td>
                            <td className={numCls}><input type="number" step="any" value={m.s} onChange={(e) => { const ms = [...draft.metrics]; ms[i] = { ...m, s: Number(e.target.value) }; setDraft({ ...draft, metrics: ms }); }} className={`${inputCls} w-24 text-right`} /></td>
                            <td className={tdCls}><input type="checkbox" checked={!!m.invert} onChange={(e) => { const ms = [...draft.metrics]; ms[i] = { ...m, invert: e.target.checked }; setDraft({ ...draft, metrics: ms }); }} /></td>
                            <td className={tdCls}><input type="checkbox" checked={m.enabled !== false} onChange={(e) => { const ms = [...draft.metrics]; ms[i] = { ...m, enabled: e.target.checked }; setDraft({ ...draft, metrics: ms }); }} /></td>
                            <td className={tdCls}>
                              {confirmDelete === m.short ? (
                                <span className="inline-flex gap-1">
                                  <button onClick={() => removeMetric(m.short)} className="rounded bg-red-900 px-1.5 text-[11px] text-red-200">yes</button>
                                  <button onClick={() => setConfirmDelete(null)} className="rounded border border-zinc-700 px-1.5 text-[11px]">no</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDelete(m.short)} className="rounded border border-zinc-700 px-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800">✕</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mb-2 rounded-xl border border-zinc-800 p-2">
                    <div className="mb-1 text-xs text-zinc-300">Add metric</div>
                    <div className="flex flex-wrap items-end gap-2 text-xs text-zinc-400">
                      <label>Short
                        <input value={newMetric.short} onChange={(e) => setNewMetric({ ...newMetric, short: e.target.value.toUpperCase() })} placeholder="XYZ" className={`${inputCls} ml-1 w-20`} />
                      </label>
                      <label>Full name
                        <input value={newMetric.name} onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })} placeholder="Full metric name" className={`${inputCls} ml-1 w-52`} />
                      </label>
                      <label>K
                        <input type="number" step="any" value={newMetric.k} onChange={(e) => setNewMetric({ ...newMetric, k: e.target.value })} className={`${inputCls} ml-1 w-24 text-right`} />
                      </label>
                      <label>S
                        <input type="number" step="any" value={newMetric.s} onChange={(e) => setNewMetric({ ...newMetric, s: e.target.value })} className={`${inputCls} ml-1 w-24 text-right`} />
                      </label>
                      <label className="inline-flex items-center gap-1">Invert
                        <input type="checkbox" checked={newMetric.invert} onChange={(e) => setNewMetric({ ...newMetric, invert: e.target.checked })} />
                      </label>
                      <button onClick={addMetric} className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">Add</button>
                    </div>
                    <button onClick={() => setShowExport((v) => !v)} className="mt-1 text-[11px] text-zinc-500">Scorer export fields (optional){showExport ? " ▾" : " ▸"}</button>
                    {showExport && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <label>Expression
                          <input value={expFields.expression} onChange={(e) => setExpFields({ ...expFields, expression: e.target.value })} placeholder="c.spend / c.imp * 100" className={`${inputCls} ml-1 w-56`} />
                        </label>
                        <label>Format
                          <select value={expFields.format} onChange={(e) => setExpFields({ ...expFields, format: e.target.value })} className={`${inputCls} ml-1`}>
                            <option value="numeric">numeric</option>
                            <option value="%">%</option>
                            <option value="RM">RM</option>
                          </select>
                        </label>
                        <label>Inputs (comma)
                          <input value={expFields.inputs} onChange={(e) => setExpFields({ ...expFields, inputs: e.target.value })} placeholder="spend, imp" className={`${inputCls} ml-1 w-40`} />
                        </label>
                        <label>Params (JSON)
                          <input value={expFields.params} onChange={(e) => setExpFields({ ...expFields, params: e.target.value })} placeholder='{"x": 100}' className={`${inputCls} ml-1 w-40`} />
                        </label>
                      </div>
                    )}
                  </div>
                  <label className="mb-2 block text-xs text-zinc-400">Notes (why these lines moved)
                    <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className={`${inputCls} ml-2 w-full max-w-xl`} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={saving} onClick={() => action("update", { label: draft.label, notes: draft.notes, guardrails: draft.guardrails, metrics: draft.metrics })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50">Save</button>
                    <button disabled={saving} onClick={() => action("duplicate", {})} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800 disabled:opacity-50">Duplicate</button>
                    <button disabled={saving} onClick={() => action("activate", {})} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800 disabled:opacity-50">Activate</button>
                    <button disabled={saving || !!isActive} onClick={() => { if (confirmDelete === "__preset") { setConfirmDelete(null); action("delete", {}); } else setConfirmDelete("__preset"); }} className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50">
                      {confirmDelete === "__preset" ? "Confirm delete?" : "Delete"}
                    </button>
                    <button disabled={saving} onClick={exportPreset} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800 disabled:opacity-50">Export scorer JSON</button>
                  </div>
                  {msg && <p className="mt-2 break-all text-[11px] text-zinc-400">{msg}</p>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
