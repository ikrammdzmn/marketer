"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "../toast";
import { ModuleRedirect } from "../module-gate";

const CAL_ID =
  "0fd3eb32b1d6271eded66bcec40d4e60bc632a8df7356abfb0c9e5ec0b393e28@group.calendar.google.com";

// /calendar-settings — agenda exclude list + connection health.
export default function CalendarSettingsPage() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<any>(null);

  const authHeader = { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PRESET_WRITE_KEY ?? ""}` };
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  async function load() {
    setMsg("");
    try {
      const r = await fetch("/api/calendar-settings");
      const body = await r.json();
      if (!r.ok) { setMsg(body.error ?? `HTTP ${r.status}`); return; }
      setText((body.hidden ?? []).join("\n"));
      setHealth(body.health ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const hidden = text.split("\n").map((s) => s.trim()).filter(Boolean);
      const r = await fetch("/api/calendar-settings", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ hidden }),
      });
      const body = await r.json();
      if (!r.ok) { setMsg(body.error ?? `HTTP ${r.status}`); toast(body.error ?? "save failed", "err"); return; }
      const m = `Saved ${body.count} hidden keyword(s).`;
      setMsg(m);
      toast(m);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 text-sm">
      <ModuleRedirect module="calendar" />
      <h2 className="mb-1 text-lg font-semibold">Calendar settings</h2>
      <p className="mb-3 text-[12px] text-zinc-400">
        One keyword per line. Any event whose title contains it (case-insensitive) is hidden from the agenda — e.g. <span className="text-zinc-200">Daily To Do</span> or <span className="text-zinc-200">#lowpriority</span>.
      </p>
      {msg && <p className="mb-2 text-[12px] text-zinc-400">{msg}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"Daily To Do\n#lowpriority"}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
      />
      <div className="mt-2">
        <button onClick={save} disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 hover:bg-emerald-600 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <h3 className="mb-1 mt-6 font-medium">Connection health</h3>
      {!health ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-[13px]">
          <div className="text-zinc-400">Service-account key</div>
          <div>{health.keyPresent ? "present" : "missing (GOOGLE_CALENDAR_SA_JSON)"}</div>
          <div className="text-zinc-400">Settings table (024)</div>
          <div>{health.tableReady ? "ready" : "not run yet — run migration 024"}</div>
          <div className="text-zinc-400">Robot email</div>
          <div className="break-all">{health.robotEmail ?? "—"}</div>
          <div className="text-zinc-400">Events in next 7 days</div>
          <div>{health.eventCount === null || health.eventCount === undefined ? "—" : health.eventCount}</div>
          {health.error && (
            <>
              <div className="text-zinc-400">Last error</div>
              <div className="text-red-300">{health.error}</div>
            </>
          )}
          <div className="text-zinc-400">Calendar ID</div>
          <div className="break-all text-xs">{CAL_ID}</div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-zinc-500">
        Robot email must stay shared on the calendar as Viewer, and Google Calendar API must stay enabled in the Cloud project. Removing either flips the agenda to its hint message.
      </p>
    </main>
  );
}
