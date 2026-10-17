"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "../toast";
import { loadGuardrails, type AiGuardrails } from "./guard";
import { Md } from "./md";

// /ai — text-only AI analyst. Tick boxes choose which cached modules feed
// the prompt (GMV incl. creative rows, TTAM preset, Shop incl. affiliates).
// Follow-up chat box reuses the same snapshot server-side.
// Client never touches server libs or GEMINI_API_KEY — all via /api/ai.
const MODULES = [
  { id: "gmv", label: "GMV", hint: "campaigns + hourly + top creatives" },
  { id: "ttam", label: "TTAM", hint: "preset + live campaign scores (slower)" },
  { id: "shop", label: "Shop", hint: "shop-truth daily + affiliates" },
];

const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

type Turn = { role: "user" | "ai"; text: string };

export default function AiPage() {
  const [mods, setMods] = useState<string[]>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("m");
      if (q) return q.split(",").filter((s) => MODULES.some((m) => m.id === s));
      const saved = localStorage.getItem("ai-modules");
      if (saved) return JSON.parse(saved).filter((s: string) => MODULES.some((m) => m.id === s));
    } catch { /* defaults */ }
    return ["gmv", "ttam", "shop"];
  });
  const [days, setDays] = useState(7);
  const [lang, setLang] = useState<"en" | "ms">(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q === "ms" || q === "en") return q;
      if (localStorage.getItem("ai-lang") === "ms") return "ms";
    } catch { /* defaults */ }
    return "en";
  });
  const [guard, setGuard] = useState<AiGuardrails>(() => loadGuardrails());
  const [markdown, setMarkdown] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [chatting, setChatting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("ai-modules", JSON.stringify(mods));
      localStorage.setItem("ai-lang", lang);
      const url = new URL(window.location.href);
      url.searchParams.set("m", mods.join(","));
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    } catch { /* private mode */ }
  }, [mods, lang]);

  // Pick up guardrail edits made on /ai/guardrail (full page loads remount).
  useEffect(() => {
    setGuard(loadGuardrails());
  }, []);

  const toggle = (id: string) =>
    setMods((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));

  const guardQs = `minRoi=${guard.minNetRoi}&maxCpa=${guard.maxCpa}&fee=${guard.feeRate}`;

  async function run() {
    if (mods.length === 0) { toast("Tick at least one module.", "err"); return; }
    setLoading(true);
    setMarkdown("");
    setMeta("");
    setTurns([]);
    try {
      const r = await fetch(`/api/ai?modules=${encodeURIComponent(mods.join(","))}&days=${days}&lang=${lang}&${guardQs}`, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setMarkdown(String(body.markdown ?? ""));
      setMeta(`${body.model ?? ""} · ${body.modules?.join("+") ?? ""} · ${body.days ?? days}d · ${lang.toUpperCase()} · ROI≥${guard.minNetRoi} CPA≤${guard.maxCpa} fee ${guard.feeRate} · ${body.cached ? "cached" : "fresh"} · ${String(body.at ?? "").slice(0, 16).replace("T", " ")}`);
      toast(body.cached ? "Loaded from 15m cache." : "Fresh insight ready.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "ai failed";
      toast(m, "err");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const message = draft.trim();
    if (!message || chatting) return;
    if (!markdown) { toast("Run Analyze first — chat needs a snapshot.", "err"); return; }
    setDraft("");
    const next = [...turns, { role: "user" as const, text: message }];
    setTurns(next);
    setChatting(true);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: next.slice(-6),
          modules: mods,
          days,
          lang,
          guardrails: guard,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setTurns([...next, { role: "ai" as const, text: String(body.markdown ?? "") }]);
    } catch (e) {
      const m = e instanceof Error ? e.message : "chat failed";
      toast(m, "err");
      setTurns(next);
    } finally {
      setChatting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">AI Analyst (text-only)</h2>
        <p className="text-xs text-zinc-500">
          Reads Neon cache + compares vs previous period — no TikTok budget changes. Tick modules to include, then Analyze.
          Guardrails ROI≥{guard.minNetRoi} CPA≤{guard.maxCpa} fee {guard.feeRate} ·{" "}
          <Link href="/ai/guardrail" className="underline hover:text-zinc-300">edit guardrails</Link>.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {MODULES.map((m) => (
            <label key={m.id} title={m.hint}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${mods.includes(m.id) ? "border-emerald-700 bg-emerald-950 text-emerald-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>
              <input type="checkbox" checked={mods.includes(m.id)} onChange={() => toggle(m.id)} className="mr-2 accent-emerald-500" />
              {m.label}
            </label>
          ))}
          <label className="ml-1 text-xs text-zinc-400">Range
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="ml-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm">
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </label>
          <div className="ml-1 flex overflow-hidden rounded-lg border border-zinc-700 text-sm" title="Answer language">
            {(["en", "ms"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 ${lang === l ? "bg-emerald-700 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                {l === "en" ? "EN" : "MS"}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>
      <div className="px-4 pb-16 pt-4">
        {meta && <p className="mb-2 text-[11px] text-zinc-500">{meta}</p>}
        {markdown ? (
          <div className={`${cardCls}`}>
            <Md text={markdown} />
          </div>
        ) : (
          <div className={`${cardCls} text-sm text-zinc-500`}>
            {loading ? "Asking Gemini…" : "No insight yet — tick modules and press Analyze."}
          </div>
        )}

        {markdown && (
          <div className="mt-3">
            <div className="flex flex-col gap-2">
              {turns.map((t, i) => (
                <div key={i}
                  className={`rounded-xl border p-3 ${
                    t.role === "user"
                      ? "ml-8 border-zinc-700 bg-zinc-900 text-sm text-zinc-100"
                      : "mr-8 border-emerald-900 bg-emerald-950/40"
                  }`}>
                  {t.role === "user" ? <span className="text-sm">{t.text}</span> : <Md text={t.text} />}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Ask a follow-up about this insight…"
                maxLength={1000}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600" />
              <button onClick={send} disabled={chatting || !draft.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
                {chatting ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-2 text-[11px] text-zinc-600">
          AI text is advisory only — verify numbers on the GMV/TTAM/Shop tabs before acting. Newest hourly slots are partial.
        </p>
      </div>
    </div>
  );
}
