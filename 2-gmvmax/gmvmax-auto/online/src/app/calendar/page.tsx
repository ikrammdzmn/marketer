"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuleRedirect } from "../module-gate";

// /calendar — dedicated month view (look-only), separate from /calendar-settings
// (exclude keywords + connection health). Big current month on top, prev + next
// smaller below. Data: GET /api/calendar-events?from=&to= (MYT edges).

type CalEv = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link: string | null;
  promo: boolean;
};

type TaskNote = {
  id: number;
  date: string;
  title: string;
  body: string;
  kind: "ttam" | "gmv" | "general";
  done: boolean;
  created_by: "owner" | "agent";
};

const KIND_DOT: Record<string, string> = {
  ttam: "bg-sky-400",
  gmv: "bg-emerald-500",
  general: "bg-zinc-500",
};

const DAY = 86400000;
const MYT = 8 * 3600 * 1000;

// MYT calendar-day ISO for a cell / day-index (notes match on this string).
const p2 = (n: number) => String(n).padStart(2, "0");
function isoOfCell(y: number, m: number, d: number): string {
  return `${y}-${p2(m + 1)}-${p2(d)}`;
}
function isoOfIdx(idx: number): string {
  return new Date(idx * DAY).toISOString().slice(0, 10);
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function mytMidnight(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d) - MYT;
}

function edgeMs(s: string, allDay: boolean, isEnd: boolean): number {
  if (allDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - MYT;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  return isEnd ? Infinity : -Infinity;
}

function evSpan(e: CalEv): { s: number; en: number } {
  const s = edgeMs(e.start, e.allDay, false);
  const raw = edgeMs(e.end || e.start, e.allDay, true);
  return { s, en: raw > s ? raw : s + 1 };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function monthCells(y: number, m: number): (number | null)[][] {
  // Monday-first weeks; null = padding cell.
  const firstDow = (new Date(mytMidnight(y, m, 1) + 12 * 3600 * 1000).getUTCDay() + 6) % 7;
  const total = daysInMonth(y, m);
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function eventsOnDay(events: { e: CalEv; s: number; en: number }[], y: number, m: number, d: number): CalEv[] {
  const ds = mytMidnight(y, m, d);
  const de = ds + DAY;
  return events.filter(({ s, en }) => s < de && en > ds).map(({ e }) => e);
}

function dayIdx(ms: number): number {
  return Math.floor((ms + MYT) / DAY);
}

// Full-span day range in MYT days (inclusive). All-day ends are exclusive
// Google dates; timed ends touching midnight belong to the previous day.
function spanRange(e: CalEv): { first: number; last: number } {
  const s = edgeMs(e.start, e.allDay, false);
  const raw = edgeMs(e.end || e.start, e.allDay, true);
  const first = dayIdx(s);
  let last: number;
  if (raw <= s) last = first;
  else if ((raw + MYT) % DAY === 0) last = dayIdx(raw) - 1;
  else last = dayIdx(raw);
  if (last < first) last = first;
  return { first, last };
}

function fmtHM(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function SidePanel({ spans, notes }: { spans: { e: CalEv; s: number; en: number }[]; notes: TaskNote[] }) {
  const today = dayIdx(Date.now());
  const collect = (idx: number) => {
    const ds = idx * DAY - MYT;
    const de = ds + DAY;
    return spans
      .filter(({ s, en }) => s < de && en > ds)
      .map(({ e, s, en }) => ({ e, s, en, range: spanRange(e) }))
      .sort((a, b) => a.s - b.s);
  };
  const row = (idx: number, r: { e: CalEv; s: number; en: number; range: { first: number; last: number } }) => {
    const total = r.range.last - r.range.first + 1;
    const pos = idx - r.range.first + 1;
    const endsIn = r.range.last - today;
    const endLabel = endsIn <= 0 ? "Ends today" : endsIn === 1 ? "Ends tomorrow" : `Ends in ${endsIn} days`;
    return (
      <li key={`${r.e.id}@${idx}`}>
        <div className="text-xs text-zinc-400">
          {r.e.allDay ? "All day" : `${fmtHM(r.s)} → ${fmtHM(r.en)}`}
        </div>
        <div className={`text-sm leading-snug ${r.e.promo ? "text-amber-200" : "text-zinc-100"}`}>
          {r.e.link ? <a href={r.e.link} target="_blank" rel="noreferrer" className="hover:underline">{r.e.title}</a> : r.e.title}
        </div>
        {total > 1 && (
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {pos === 1 ? `Started ${idx === today ? "today" : "tomorrow"} · ` : ""}Day {pos}/{total} · {endLabel}
          </div>
        )}
      </li>
    );
  };
  const card = (idx: number, label: string, highlight: boolean) => {
    const rows = collect(idx);
    const dayNotes = (notes ?? []).filter((n) => n.date === isoOfIdx(idx));
    return (
      <section className={highlight ? "rounded-lg border-l-2 border-emerald-500 bg-emerald-950/40 px-3 py-2" : ""}>
        <div className={`text-[11px] font-semibold uppercase tracking-wide ${highlight ? "text-white" : "text-zinc-200"}`}>{label}</div>
        {rows.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">Nothing {label.toLowerCase()}.</p>
        ) : (
          <ul className="mt-1.5 space-y-2.5">{rows.map((r) => row(idx, r))}</ul>
        )}
        {dayNotes.length > 0 && (
          <ul className="mt-2 space-y-1.5 border-t border-zinc-800 pt-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Task notes</div>
            {dayNotes.map((n) => (
              <li key={`note-${n.id}`} className="flex flex-wrap items-start gap-1.5 text-xs">
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${KIND_DOT[n.kind] ?? "bg-zinc-500"} ${n.done ? "opacity-40" : ""}`} title={n.kind} />
                <span className={n.done ? "text-zinc-500 line-through" : "text-zinc-100"}>{n.title}</span>
                <span className="text-[10px] text-zinc-500">· {n.created_by}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };
  return (
    <aside className="order-first lg:order-last">
      <div className="space-y-4 lg:sticky lg:top-20">
        {card(today, "Today", true)}
        {card(today + 1, "Tomorrow", false)}
      </div>
    </aside>
  );
}

function MonthGrid({ y, m, spans, large, notes }: { y: number; m: number; spans: { e: CalEv; s: number; en: number }[]; large: boolean; notes: TaskNote[] }) {
  const now = Date.now();
  const todayStart = Math.floor((now + MYT) / DAY) * DAY - MYT;
  const isToday = (d: number) => mytMidnight(y, m, d) === todayStart;
  const isTomorrow = (d: number) => mytMidnight(y, m, d) === todayStart + DAY;
  const weeks = monthCells(y, m);
  // Popup day (hover on desktop, tap-toggle on touch). Handlers sit on the
  // cell wrapper so moving onto the popup itself keeps it open.
  const [openDay, setOpenDay] = useState<number | null>(null);
  const dayEvents = (d: number) => eventsOnDay(spans, y, m, d);
  return (
    <section className={large ? "" : "mt-8"}>
      <h2 className={large ? "text-xl font-semibold" : "text-sm font-semibold text-zinc-300"}>
        {MONTHS[m]} {y}
      </h2>
      <div className={`mt-3 grid grid-cols-7 gap-1 ${large ? "md:gap-1.5" : ""}`}>
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] uppercase tracking-wide text-zinc-500">{d}</div>
        ))}
        {weeks.map((week, wi) => week.map((d, ci) => {
          if (d === null) {
            return <div key={`p${wi}-${ci}`} className={large ? "min-h-16 md:min-h-24" : "min-h-10"} />;
          }
          const evs = dayEvents(d);
          const open = evs.length > 0 && openDay === d;
          const dayIso = isoOfCell(y, m, d);
          const dayNotes = (notes ?? []).filter((n) => n.date === dayIso);
          return (
            <div
              key={d}
              onMouseEnter={() => { if (evs.length > 0) setOpenDay(d); }}
              onMouseLeave={() => { if (openDay === d) setOpenDay(null); }}
              onClick={() => { if (evs.length > 0) setOpenDay(openDay === d ? null : d); }}
              className={`relative rounded-lg border p-1 md:p-1.5 ${
                large ? "min-h-16 md:min-h-24" : "min-h-10"
              } ${isToday(d) ? "border-emerald-600 bg-emerald-950/30" : isTomorrow(d) ? "border-zinc-500 bg-zinc-800/70" : "border-zinc-800 bg-zinc-900"}`}
            >
              <div className={`text-[11px] ${isToday(d) ? "font-bold text-emerald-300" : isTomorrow(d) ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{d}</div>
              {large ? (
                <ul className="mt-0.5 space-y-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <li key={e.id} className={`truncate text-[11px] leading-tight md:text-xs ${e.promo ? "text-amber-300" : "text-zinc-200"}`} title={e.title}>
                      {e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="hover:underline">{e.title}</a> : e.title}
                    </li>
                  ))}
                  {evs.length > 3 && (
                    <li className="text-[11px] text-zinc-500">+{evs.length - 3} more</li>
                  )}
                  {dayNotes.length > 0 && (
                    <li className="flex flex-wrap items-center gap-1 pt-0.5">
                      {dayNotes.slice(0, 6).map((n) => (
                        <span key={`n-${n.id}`} title={`${n.title} (${n.created_by}${n.done ? ", done" : ""})`} className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[n.kind] ?? "bg-zinc-500"} ${n.done ? "opacity-40" : ""}`} />
                      ))}
                    </li>
                  )}
                </ul>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {evs.slice(0, 6).map((e) => (
                    <span
                      key={e.id}
                      title={e.title}
                      className={`h-1.5 w-1.5 rounded-full ${e.promo ? "bg-amber-400" : "bg-emerald-500"}`}
                    />
                  ))}
                  {dayNotes.slice(0, 6).map((n) => (
                    <span
                      key={`n-${n.id}`}
                      title={`${n.title} (${n.created_by}${n.done ? ", done" : ""})`}
                      className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[n.kind] ?? "bg-zinc-500"} ${n.done ? "opacity-40" : ""}`}
                    />
                  ))}
                  {evs.length > 6 && (
                    <span className="text-[10px] leading-none text-zinc-500">+{evs.length - 6}</span>
                  )}
                </div>
              )}
              {open && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute z-30 w-60 max-w-[70vw] rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl ${
                    ci >= 5 ? "right-0" : "left-0"
                  } ${wi === weeks.length - 1 ? "bottom-full mb-1" : "top-full mt-1"}`}
                >
                  <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {d} {MONTHS[m]} {y}
                  </div>
                  <ul className="space-y-1.5">
                    {evs.map((e) => (
                      <li key={e.id} className={`rounded-lg px-2 py-1 text-xs leading-snug ${e.promo ? "bg-amber-950/50 text-amber-200" : "bg-zinc-800 text-zinc-100"}`}>
                        {e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="hover:underline">{e.title}</a> : e.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </section>
  );
}

// Task notes (Stage 7): shared dated channel both owner (this UI) and the
// agent (local script, created_by=agent) write to. Rendered here next to the
// Google month grids — one dated view, two sources.
function TaskNotes({ onChanged }: { onChanged?: () => void }) {
  const [notes, setNotes] = useState<TaskNote[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fDate, setFDate] = useState("");
  const [fKind, setFKind] = useState("ttam");
  const [fTitle, setFTitle] = useState("");
  const [fBody, setFBody] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [eDate, setEDate] = useState("");
  const [eKind, setEKind] = useState("ttam");
  const [eTitle, setETitle] = useState("");
  const [eBody, setEBody] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/task-notes?days=90", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "notes failed");
      setNotes(b.notes ?? []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "notes failed");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    if (saving || !fDate || !fTitle.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/task-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: fDate, title: fTitle.trim(), kind: fKind, body: fBody.trim() }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "add failed");
      setFTitle("");
      setFBody("");
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "add failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(n: TaskNote) {
    try {
      const r = await fetch("/api/task-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id, done: !n.done }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "update failed");
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "update failed");
    }
  }

  function startEdit(n: TaskNote) {
    setEditId(n.id);
    setEDate(n.date);
    setEKind(n.kind);
    setETitle(n.title);
    setEBody(n.body ?? "");
    setErr(null);
  }

  async function saveEdit() {
    if (editId === null || saving || !eDate || !eTitle.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/task-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, date: eDate, title: eTitle.trim(), kind: eKind, body: eBody.trim() }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "save failed");
      setEditId(null);
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(n: TaskNote) {
    if (typeof window !== "undefined" && !window.confirm(`Delete note "${n.title}" (${n.date})? No undelete.`)) return;
    try {
      const r = await fetch(`/api/task-notes?id=${n.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error ?? "delete failed");
      if (editId === n.id) setEditId(null);
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "delete failed");
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Task notes</h2>
        <span className="text-[11px] text-zinc-500">shared owner + agent channel · TTAM dates live here</span>
        <button onClick={() => void load()} className="ml-auto rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800">Refresh</button>
      </div>
      {err && <p role="status" className="mt-2 text-xs text-red-300">{err}</p>}
      <div className="mt-2">
        {notes === null ? (
          <p className="text-xs text-zinc-500">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-zinc-500">No notes yet — add the first one below.</p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((n) => (
              editId === n.id ? (
                <li key={n.id} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs">
                  <div className="grid gap-1.5 md:grid-cols-[130px_110px_minmax(0,1fr)_auto]">
                    <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
                    <select value={eKind} onChange={(e) => setEKind(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs">
                      <option value="ttam">TTAM</option>
                      <option value="gmv">GMV</option>
                      <option value="general">General</option>
                    </select>
                    <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
                    <div className="flex gap-1">
                      <button onClick={() => void saveEdit()} disabled={saving || !eDate || !eTitle.trim()} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-medium hover:bg-emerald-500 disabled:opacity-50">Save</button>
                      <button onClick={() => setEditId(null)} className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] hover:bg-zinc-800">Cancel</button>
                    </div>
                  </div>
                  <input value={eBody} onChange={(e) => setEBody(e.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
                </li>
              ) : (
              <li key={n.id} className={`flex flex-wrap items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs ${n.done ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={n.done} onChange={() => void toggle(n)} className="mt-0.5" aria-label={`mark ${n.title} ${n.done ? "open" : "done"}`} />
                <span className={`mt-1 h-2 w-2 rounded-full ${KIND_DOT[n.kind] ?? "bg-zinc-500"}`} title={n.kind} />
                <span className="font-mono text-zinc-400">{n.date}</span>
                <span className={`font-medium ${n.done ? "line-through" : ""}`}>{n.title}</span>
                <span className="text-[10px] text-zinc-500">· {n.created_by}</span>
                <span className="ml-auto flex gap-1">
                  <button onClick={() => startEdit(n)} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800">Edit</button>
                  <button onClick={() => void removeNote(n)} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-zinc-800">Delete</button>
                </span>
                {n.body && <span className="basis-full text-zinc-400">{n.body}</span>}
              </li>
              )
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[130px_110px_minmax(0,1fr)_auto]">
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs" />
        <select value={fKind} onChange={(e) => setFKind(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs">
          <option value="ttam">TTAM</option>
          <option value="gmv">GMV</option>
          <option value="general">General</option>
        </select>
        <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Title — e.g. L6 day-7 review" className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs" />
        <button onClick={() => void add()} disabled={saving || !fDate || !fTitle.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50">{saving ? "Adding…" : "Add"}</button>
      </div>
      <input value={fBody} onChange={(e) => setFBody(e.target.value)} placeholder="Details (optional) — e.g. keep if ACS ≤ 0.06" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs" />
    </section>
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState<CalEv[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);

  const reloadTaskNotes = useCallback(async () => {
    try {
      const tr = await fetch("/api/task-notes?days=90", { cache: "no-store" });
      const tb = await tr.json();
      if (tr.ok) setTaskNotes(tb.notes ?? []);
    } catch {
      // panel + dots degrade to Google-only; the Task notes section retries itself
    }
  }, []);

  const load = useCallback(async (y: number, m: number) => {
    setEvents(null);
    setNote(null);
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    const from = new Date(mytMidnight(py, pm, 1)).toISOString();
    // to = first day of the month after next (Date.UTC overflows months cleanly).
    const afterNext = new Date(Date.UTC(y, m + 2, 1) - MYT).toISOString();
    try {
      const r = await fetch(`/api/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(afterNext)}`, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "calendar failed");
      if (body.needsConnect) setNote(String(body.needsConnect));
      else setEvents(body.events ?? []);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "calendar failed");
    }
    void reloadTaskNotes();
  }, [reloadTaskNotes]);

  useEffect(() => {
    load(view.y, view.m);
  }, [view, load]);

  const shift = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };
  const goToday = () => {
    const n = new Date();
    setView({ y: n.getFullYear(), m: n.getMonth() });
  };

  const prev = { y: view.m === 0 ? view.y - 1 : view.y, m: view.m === 0 ? 11 : view.m - 1 };
  const next = { y: view.m === 11 ? view.y + 1 : view.y, m: view.m === 11 ? 0 : view.m + 1 };
  const spans = (events ?? []).map((e) => ({ e, ...evSpan(e) }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <ModuleRedirect module="calendar" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Calendar</p>
          <h1 className="mt-2 text-2xl font-semibold">Month view</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900">← Prev</button>
          <button onClick={goToday} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900">Today</button>
          <button onClick={() => shift(1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900">Next →</button>
        </div>
      </div>

      {note ? (
        <p role="status" className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">{note}</p>
      ) : !events ? (
        <p className="mt-6 text-sm text-zinc-400">Loading calendar…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <MonthGrid y={view.y} m={view.m} spans={spans} large notes={taskNotes} />
            <SidePanel spans={spans} notes={taskNotes} />
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <MonthGrid y={prev.y} m={prev.m} spans={spans} large={false} notes={taskNotes} />
            <MonthGrid y={next.y} m={next.m} spans={spans} large={false} notes={taskNotes} />
          </div>
          <TaskNotes onChanged={() => void reloadTaskNotes()} />
        </>
      )}
    </main>
  );
}
