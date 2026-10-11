"use client";

import { useEffect, useState } from "react";

type Ev = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link: string | null;
  promo: boolean;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayLabel(d: Date): string {
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  const tmr = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (sameDay(d, tmr)) return "Tomorrow";
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

const DAY = 86400000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

type Row = { ev: Ev; day: Date; pos: number; total: number };

// Option A: multi-day events repeat under every day they touch (clipped to the
// 7-day window). pos/total is against the FULL span so a clipped 10-day sale
// reads Day 8/10, not Day 1/3.
function rowsFor(events: Ev[]): { rows: Row[]; overflow: number } {
  const now = new Date();
  const winStart = startOfDay(now);
  const winEnd = new Date(winStart.getTime() + 7 * DAY);
  const out: Row[] = [];
  for (const ev of events) {
    const full: Date[] = [];
    if (ev.allDay) {
      // All-day end is exclusive (Google date).
      const s = parseDateOnly(ev.start) ?? startOfDay(new Date(ev.start));
      const eRaw = ev.end ? (parseDateOnly(ev.end) ?? startOfDay(new Date(ev.end))) : null;
      const e = eRaw && eRaw.getTime() > s.getTime() ? eRaw : new Date(s.getTime() + DAY);
      for (let d = new Date(s); d.getTime() < e.getTime(); d = new Date(d.getTime() + DAY)) {
        full.push(new Date(d));
      }
    } else {
      const s = new Date(ev.start);
      const en = ev.end ? new Date(ev.end) : new Date(ev.start);
      if (Number.isNaN(s.getTime())) continue;
      const end = Number.isNaN(en.getTime()) ? s : en;
      const sDay = startOfDay(s);
      const enDay = startOfDay(end);
      for (let d = new Date(sDay); d.getTime() <= enDay.getTime(); d = new Date(d.getTime() + DAY)) {
        // End exactly at midnight does not touch that day.
        if (d.getTime() === enDay.getTime() && end.getTime() === enDay.getTime() && end.getTime() > s.getTime()) continue;
        if (d.getTime() + DAY <= s.getTime()) continue;
        full.push(new Date(d));
      }
      if (!full.length) full.push(sDay);
    }
    const total = full.length;
    full.forEach((d, i) => {
      if (d.getTime() >= winStart.getTime() && d.getTime() < winEnd.getTime()) {
        out.push({ ev, day: d, pos: i + 1, total });
      }
    });
  }
  out.sort((a, b) => a.day.getTime() - b.day.getTime() || a.ev.start.localeCompare(b.ev.start));
  const CAP = 60; // a 30-day span clips to 7 rows max; cap guards stacked sales
  return { rows: out.slice(0, CAP), overflow: Math.max(0, out.length - CAP) };
}

// 3-tier glance hierarchy: today (hero) > tomorrow (full) > later (compact).
// Multi-day state becomes a pill + status dot, not a sentence, so the time
// column stays narrow and titles align for scanning.
type Tier = "today" | "tomorrow" | "later";

function tierOf(day: Date, winStart: Date): Tier {
  const t = startOfDay(day).getTime();
  const s = winStart.getTime();
  if (t === s) return "today";
  if (t === s + DAY) return "tomorrow";
  return "later";
}

function timeFor(r: Row): string {
  const { ev, pos, total } = r;
  if (ev.allDay) return "All day";
  if (total <= 1) return `${fmtTime(ev.start)}${ev.end ? ` → ${fmtTime(ev.end)}` : ""}`;
  if (pos === 1) return `${fmtTime(ev.start)} →`;
  if (pos === total) return `→ ${fmtTime(ev.end)}`;
  return "···";
}

function RowItem({ r, compact }: { r: Row; compact?: boolean }) {
  const e = r.ev;
  const multi = r.total > 1;
  const last = r.pos === r.total;
  // Pill slot is always reserved (fixed width) so titles start at the same x
  // on rows with and without a Day pill — one alignment edge per card.
  const pillText = compact
    ? `${r.pos}/${r.total}${last ? " · ends" : ""}`
    : `Day ${r.pos}/${r.total}${last ? " · ends" : ""}`;
  return (
    <div className={`flex items-baseline gap-2 ${compact ? "text-[13px]" : "text-sm"}`}>
      <span
        title={e.promo ? "Sale/campaign period (#event)" : multi ? "Multi-day event" : "One-day event"}
        className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] self-center rounded-full ${e.promo ? "bg-amber-400" : multi ? "bg-emerald-400" : "bg-zinc-600"}`}
      />
      <span className={`shrink-0 tabular-nums ${compact ? "w-20 text-[11px] text-zinc-500" : "w-24 text-xs text-zinc-400"}`}>
        {timeFor(r)}
      </span>
      <span className={`shrink-0 ${compact ? "w-16" : "w-28"}`}>
        {multi && (
          <span
            className={`inline-block whitespace-nowrap rounded-full bg-zinc-800 px-1.5 py-px tabular-nums text-zinc-300 ${compact ? "text-[10px]" : "text-[11px]"}`}
          >
            {pillText}
          </span>
        )}
      </span>
      {e.link ? (
        <a href={e.link} target="_blank" rel="noreferrer" className={`min-w-0 ${compact ? "truncate text-zinc-400" : "text-zinc-100"} hover:underline`}>
          {e.title}
        </a>
      ) : (
        <span className={`min-w-0 ${compact ? "truncate text-zinc-400" : ""}`}>{e.title}</span>
      )}
      {e.promo && (
        <span className="shrink-0 rounded bg-amber-900 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-200">
          Event
        </span>
      )}
    </div>
  );
}

// Dashboard agenda: the signed-in user's next 7 days from Google Calendar.
export default function Agenda() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar-events")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "calendar failed");
        if (body.needsConnect) setNote(String(body.needsConnect));
        else setEvents(body.events ?? []);
      })
      .catch((e) => setNote(e instanceof Error ? e.message : "calendar failed"));
  }, []);

  if (note) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Upcoming</div>
        <p className="mt-1 text-xs text-zinc-400">{note}</p>
      </div>
    );
  }
  if (!events) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Upcoming</div>
        <p className="mt-1 text-xs text-zinc-500">Loading calendar…</p>
      </div>
    );
  }
  const { rows, overflow } = rowsFor(events);
  const winStart = startOfDay(new Date());
  const today = rows.filter((r) => tierOf(r.day, winStart) === "today");
  const tomorrow = rows.filter((r) => tierOf(r.day, winStart) === "tomorrow");
  const later = rows.filter((r) => tierOf(r.day, winStart) === "later");
  let lastLaterDay = 0;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="font-medium">Upcoming</div>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">Nothing in the next 7 days.</p>
      ) : (
        <>
          {today.length > 0 ? (
            <section className="mt-2 rounded-lg border-l-2 border-emerald-500 bg-emerald-950/40 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Today</div>
              <ul className="mt-1 space-y-1">
                {today.map((r) => (
                  <li key={`${r.ev.id}@${r.day.getTime()}`}>
                    <RowItem r={r} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Nothing today.</p>
          )}
          {tomorrow.length > 0 && (
            <section className="mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-200">Tomorrow</div>
              <ul className="mt-1 space-y-1">
                {tomorrow.map((r) => (
                  <li key={`${r.ev.id}@${r.day.getTime()}`}>
                    <RowItem r={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {later.length > 0 && (
            <section className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Later this week</div>
              <ul className="mt-1 space-y-1">
                {later.map((r) => {
                  const head = r.day.getTime() !== lastLaterDay ? ((lastLaterDay = r.day.getTime()), true) : false;
                  return (
                    <li key={`${r.ev.id}@${r.day.getTime()}`}>
                      {head && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] tabular-nums text-zinc-500">
                          <span className="shrink-0">{dayLabel(r.day)}</span>
                          <span className="h-px flex-1 bg-zinc-800" />
                        </div>
                      )}
                      <RowItem r={r} compact />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
      {overflow > 0 && (
        <p className="mt-1 text-xs text-zinc-500">+{overflow} more day(s) in the next 7 days.</p>
      )}
    </div>
  );
}
