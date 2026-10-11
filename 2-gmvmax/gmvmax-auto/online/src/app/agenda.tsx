"use client";

import { useEffect, useState } from "react";

type Ev = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link: string | null;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  const tmr = new Date(today.getTime() + 86400000);
  if (sameDay(d, tmr)) return "Tomorrow";
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
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
  let lastDay = "";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="font-medium">Upcoming</div>
      {events.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">Nothing in the next 7 days.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {events.map((e) => {
            const day = dayLabel(e.start);
            const head = day !== lastDay ? ((lastDay = day), true) : false;
            const when = e.allDay ? "All day" : `${fmtTime(e.start)}${e.end ? ` → ${fmtTime(e.end)}` : ""}`;
            return (
              <li key={e.id}>
                {head && <div className="pt-1 text-[11px] uppercase tracking-wide text-zinc-500">{day}</div>}
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="w-28 shrink-0 text-xs text-zinc-400 tabular-nums">{when}</span>
                  {e.link ? (
                    <a href={e.link} target="_blank" rel="noreferrer" className="text-zinc-100 hover:underline">
                      {e.title}
                    </a>
                  ) : (
                    <span>{e.title}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
