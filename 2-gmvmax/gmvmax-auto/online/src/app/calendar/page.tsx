"use client";

import { useCallback, useEffect, useState } from "react";

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

const DAY = 86400000;
const MYT = 8 * 3600 * 1000;
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

function SidePanel({ spans }: { spans: { e: CalEv; s: number; en: number }[] }) {
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
    return (
      <section className={highlight ? "rounded-lg border-l-2 border-emerald-500 bg-emerald-950/40 px-3 py-2" : ""}>
        <div className={`text-[11px] font-semibold uppercase tracking-wide ${highlight ? "text-white" : "text-zinc-200"}`}>{label}</div>
        {rows.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">Nothing {label.toLowerCase()}.</p>
        ) : (
          <ul className="mt-1.5 space-y-2.5">{rows.map((r) => row(idx, r))}</ul>
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

function MonthGrid({ y, m, spans, large }: { y: number; m: number; spans: { e: CalEv; s: number; en: number }[]; large: boolean }) {
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

export default function CalendarPage() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState<CalEv[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
  }, []);

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
            <MonthGrid y={view.y} m={view.m} spans={spans} large />
            <SidePanel spans={spans} />
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <MonthGrid y={prev.y} m={prev.m} spans={spans} large={false} />
            <MonthGrid y={next.y} m={next.m} spans={spans} large={false} />
          </div>
        </>
      )}
    </main>
  );
}
