"use client";

import { useState } from "react";
import { toast } from "../../toast";
import { AI_GUARD_DEFAULTS, loadGuardrails, saveGuardrails, type AiGuardrails } from "../guard";

// /ai/guardrail — AI analysis guardrails (per-user, localStorage).
// Steers AI text only. Canonical strategy guardrails live in
// 1-knowledge/tiktok-strategy/ (automation obeys those, never these).
const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 w-32";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

export default function AiGuardrailPage() {
  const [g, setG] = useState<AiGuardrails>(() => loadGuardrails());

  const set = (k: keyof AiGuardrails, v: string) =>
    setG((p) => ({ ...p, [k]: Number(v) }));

  function onSave() {
    try {
      saveGuardrails(g);
      toast("AI guardrails saved.");
    } catch {
      toast("Save failed (private mode?).", "err");
    }
  }

  function onReset() {
    setG({ ...AI_GUARD_DEFAULTS });
    try {
      saveGuardrails({ ...AI_GUARD_DEFAULTS });
      toast("Reset to defaults.");
    } catch {
      toast("Reset failed (private mode?).", "err");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">AI guardrails</h2>
        <p className="text-xs text-zinc-500">
          Analysis-only inputs for the AI Analyst page. The AI converts gross
          ROAS/ROI to net with the fee rate below, then compares against these
          numbers. Automation rules do not read this page.
        </p>
      </div>
      <div className="max-w-md px-4 pb-16 pt-4">
        <div className={`${cardCls} flex flex-col gap-3 text-sm`}>
          <label className="flex items-center justify-between gap-2">
            <span>Min net ROI <span className="text-zinc-500">(gross × (1 − fee))</span></span>
            <input type="number" step="0.1" min={1} max={30} value={g.minNetRoi}
              onChange={(e) => set("minNetRoi", e.target.value)} className={inputCls} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Max CPA <span className="text-zinc-500">(RM)</span></span>
            <input type="number" step="0.01" min={1} max={500} value={g.maxCpa}
              onChange={(e) => set("maxCpa", e.target.value)} className={inputCls} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Fee rate <span className="text-zinc-500">(0.25 = 25%)</span></span>
            <input type="number" step="0.01" min={0} max={0.6} value={g.feeRate}
              onChange={(e) => set("feeRate", e.target.value)} className={inputCls} />
          </label>
          <div className="mt-1 flex gap-2">
            <button onClick={onSave}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">
              Save
            </button>
            <button onClick={onReset}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
              Reset defaults
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">
          Defaults {AI_GUARD_DEFAULTS.minNetRoi} / RM{AI_GUARD_DEFAULTS.maxCpa} / {AI_GUARD_DEFAULTS.feeRate} match the strategy knowledge base.
        </p>
      </div>
    </div>
  );
}
