import { query } from "./db";
import { getRangeEvents, type CalEvent } from "./calendar";
import { sendTelegramFull } from "./telegram";

const DAY = 86400000;
const MYT_OFFSET = 8 * 3600 * 1000;
const MAX = 3900; // under Telegram's 4096 cap (same as hourly/daily)
const DASHBOARD_CALENDAR_URL = "https://marketer-hw.vercel.app/calendar";

export interface ReminderNote {
  id: number;
  date: string;
  title: string;
  body: string | null;
  kind: string;
  done: boolean;
  created_by: string;
}

export interface ReminderResult {
  ok: boolean;
  date: string;
  tomorrow: string;
  todayEvents: number;
  tomorrowEvents: number;
  notes: number;
  calendarWarning: string | null;
  telegram: string;
  pulledAt: string;
}

// ---- MYT day helpers ( mirrors page.tsx mytMidnight ) ----
function todayKL(override?: string): string {
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

function addDaysKL(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split("T")[0];
}

function mytMidnightMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - MYT_OFFSET;
}

function edgeMs(s: string, allDay: boolean, isEnd: boolean): number {
  if (allDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - MYT_OFFSET;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  return isEnd ? Infinity : -Infinity;
}

function overlapsDay(e: CalEvent, dayStart: number): boolean {
  const s = edgeMs(e.start, e.allDay, false);
  const en = Math.max(edgeMs(e.end || e.start, e.allDay, true), s + 1);
  return s < dayStart + DAY && en > dayStart;
}

function fmtTime(e: CalEvent): string {
  if (e.allDay) return "All day";
  const s = edgeMs(e.start, e.allDay, false);
  const en = edgeMs(e.end || e.start, e.allDay, true);
  if (!Number.isFinite(s)) return "—";
  const f = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  if (!Number.isFinite(en) || en <= s) return f(s);
  return `${f(s)} → ${f(en)}`;
}

function fmtDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function eventLine(e: CalEvent): string {
  const mark = e.task ? "❗ " : e.promo ? "🏷 " : e.audience ? "🎯 " : "";
  return `${mark}${e.title} <i>(${esc(fmtTime(e))})</i>`;
}

// Shared builder: Today + Tomorrow cards from the same sources the
// /calendar month view reads (Google range + open task-notes). Fail-open:
// calendar errors degrade to a warning line, notes errors to an empty list —
// the morning ping itself never goes silent because of one source.
export async function buildCalendarReminder(dateOverride?: string) {
  const date = todayKL(dateOverride);
  const tomorrow = addDaysKL(date, 1);
  const t0 = mytMidnightMs(date);

  let events: CalEvent[] = [];
  let calendarWarning: string | null = null;
  try {
    const res = await getRangeEvents(t0, t0 + 2 * DAY);
    if ("events" in res) events = res.events;
    else calendarWarning = res.needsConnect;
  } catch (e) {
    calendarWarning = e instanceof Error ? e.message.slice(0, 160) : "calendar failed";
  }

  let notes: ReminderNote[] = [];
  try {
    const r = await query(
      `SELECT id, date::text AS date, title, body, kind, done, created_by
       FROM gmv.task_notes
       WHERE date::text IN ($1, $2) AND done = false
       ORDER BY date, id
       LIMIT 60`,
      [date, tomorrow]
    );
    notes = r.rows as ReminderNote[];
  } catch {
    notes = []; // pre-migration DBs: notes section degrades to empty
  }

  const todayEv = events.filter((e) => overlapsDay(e, t0)).slice(0, 15);
  const tomorrowEv = events.filter((e) => overlapsDay(e, t0 + DAY)).slice(0, 15);
  const todayNotes = notes.filter((n) => n.date === date).slice(0, 15);
  const tomorrowNotes = notes.filter((n) => n.date === tomorrow).slice(0, 15);

  const pulledMYT = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sec = (
    label: string,
    dayEv: CalEvent[],
    dayNotes: ReminderNote[]
  ) => {
    const evLines =
      dayEv.length > 0 ? dayEv.map((e) => `• ${eventLine(e)}`) : [`<i>no events</i>`];
    const noteLines = dayNotes.map(
      (n) => `• [${esc(n.kind)}] ${esc(n.title)} <i>· ${esc(n.created_by)}</i>`
    );
    return (
      `<b>${label}</b>\n` +
      evLines.join("\n") +
      (noteLines.length > 0 ? `\nTask notes:\n${noteLines.join("\n")}` : "")
    );
  };

  let legacy =
    `<b>📅 Calendar — ${esc(fmtDayLabel(date))}</b>\n` +
    `pulled ${pulledMYT} MYT\n` +
    sec(`Today (${fmtDayLabel(date)})`, todayEv, todayNotes) +
    `\n` +
    sec(`Tomorrow (${fmtDayLabel(tomorrow)})`, tomorrowEv, tomorrowNotes);
  if (calendarWarning) legacy += `\n<i>Calendar: ${esc(calendarWarning).slice(0, 200)}</i>`;
  legacy += `\n<a href="${DASHBOARD_CALENDAR_URL}">📅 Open calendar</a>`;
  if (legacy.length > MAX) {
    legacy =
      legacy.slice(0, MAX - 60) + `\n<i>…trimmed (open calendar for full list)</i>`;
  }

  // Rich blocks mirror the legacy sections (probe-verified shapes only:
  // heading / paragraph / table / buttons — same as hourly.ts).
  const rich = (s: string) => ({ type: "bold", text: s });
  const cell = (s: string, header = false) => ({
    ...(header ? { is_header: true } : {}),
    text: rich(s),
  });
  const nameCell = (s: string) => ({ text: s });
  const evTable = (dayEv: CalEvent[]) => ({
    type: "table",
    is_striped: true,
    is_compact: true,
    cells: [
      [cell("Time", true), cell("Event", true)],
      ...dayEv.map((e) => [
        nameCell(fmtTime(e)),
        nameCell(`${e.task ? "❗ " : e.promo ? "🏷 " : e.audience ? "🎯 " : ""}${e.title}`.slice(0, 120)),
      ]),
    ],
  });
  const noteTable = (dayNotes: ReminderNote[]) => ({
    type: "table",
    is_striped: true,
    is_compact: true,
    cells: [
      [cell("Kind", true), cell("Note", true)],
      ...dayNotes.map((n) => [
        nameCell(n.kind),
        nameCell(`${n.title} · ${n.created_by}`.slice(0, 120)),
      ]),
    ],
  });
  const blocks: unknown[] = [
    { type: "heading", text: `📅 Calendar — ${fmtDayLabel(date)}`, size: 1 },
    { type: "paragraph", text: { type: "marked", text: `pulled ${pulledMYT} MYT` } },
    { type: "paragraph", text: rich(`Today (${fmtDayLabel(date)})`) },
    ...(todayEv.length > 0
      ? [evTable(todayEv)]
      : [{ type: "paragraph", text: "no events" }]),
    ...(todayNotes.length > 0 ? [noteTable(todayNotes)] : []),
    { type: "paragraph", text: rich(`Tomorrow (${fmtDayLabel(tomorrow)})`) },
    ...(tomorrowEv.length > 0
      ? [evTable(tomorrowEv)]
      : [{ type: "paragraph", text: "no events" }]),
    ...(tomorrowNotes.length > 0 ? [noteTable(tomorrowNotes)] : []),
    ...(calendarWarning
      ? [{ type: "paragraph", text: `Calendar: ${calendarWarning.slice(0, 200)}` }]
      : []),
    {
      type: "buttons",
      buttons: [{ text: "📅 Open calendar", url: DASHBOARD_CALENDAR_URL }],
    },
  ];

  return {
    date,
    tomorrow,
    legacy,
    blocks,
    calendarWarning,
    counts: {
      todayEvents: todayEv.length,
      tomorrowEvents: tomorrowEv.length,
      notes: notes.length,
    },
  };
}

// Cron entry-point: build + send to the configured chat/thread. Never throws
// for a single-source failure — worst case the ping carries a warning line.
export async function sendCalendarReminder(
  dateOverride?: string
): Promise<ReminderResult> {
  const b = await buildCalendarReminder(dateOverride);
  const r = await sendTelegramFull(b.legacy, true, b.blocks);
  return {
    ok: r.ok,
    date: b.date,
    tomorrow: b.tomorrow,
    todayEvents: b.counts.todayEvents,
    tomorrowEvents: b.counts.tomorrowEvents,
    notes: b.counts.notes,
    calendarWarning: b.calendarWarning,
    telegram: r.ok ? r.mode : `failed:${r.error ?? "?"}`,
    pulledAt: new Date().toISOString(),
  };
}
