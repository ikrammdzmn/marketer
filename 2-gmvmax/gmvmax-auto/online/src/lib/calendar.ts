import { createSign } from "crypto";
import { query } from "./db";

// Dashboard agenda source: the team's shared Google Calendar.
//
// Primary: service-account API read (calendar stays private — share it with
// the robot email as Viewer; key JSON lives in GOOGLE_CALENDAR_SA_JSON).
// Fallback: public iCal feed (works if the calendar is ever made public).
// Either way the widget sees the same {events} shape.

const CAL_ID =
  "0fd3eb32b1d6271eded66bcec40d4e60bc632a8df7356abfb0c9e5ec0b393e28@group.calendar.google.com";
const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CAL_ID)}/public/basic.ics`;
const CACHE_MS = 15 * 60 * 1000;
const WINDOW_MS = 7 * 86400000;

export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link: string | null;
}

function saKey(): { email: string; key: string } | null {
  try {
    const raw = (process.env.GOOGLE_CALENDAR_SA_JSON ?? "").trim();
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j.client_email || !j.private_key) return null;
    return { email: String(j.client_email), key: String(j.private_key) };
  } catch {
    return null;
  }
}

let tokenCache: { token: string; exp: number } | null = null;
// Last Google refusal (status only, never bodies/tokens) for the hint line.
let lastApiStatus = "";

async function saAccess(force = false): Promise<string | null> {
  const sa = saKey();
  if (!sa) return null;
  if (!force && tokenCache && tokenCache.exp - Date.now() > 5 * 60 * 1000) return tokenCache.token;
  try {
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const input = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
      iss: sa.email,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })}`;
    const signer = createSign("RSA-SHA256");
    signer.update(input);
    signer.end();
    const jwt = `${input}.${signer.sign(sa.key).toString("base64url")}`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });
    const body = await res.json();
    if (!res.ok || !body.access_token) { tokenCache = null; return null; }
    tokenCache = { token: String(body.access_token), exp: Date.now() + Number(body.expires_in ?? 3600) * 1000 };
    return tokenCache.token;
  } catch {
    tokenCache = null;
    return null;
  }
}

async function viaApi(): Promise<CalEvent[] | null> {
  let token = await saAccess();
  if (!token) return null;
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + WINDOW_MS).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "40",
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL_ID)}/events?${params.toString()}`;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    // Token or sharing problem — one forced refresh, then give up to fallback.
    token = await saAccess(true);
    if (!token) { lastApiStatus = "no-token"; return null; }
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { lastApiStatus = `HTTP ${res.status}`; return null; }
  }
  const body = await res.json();
  return ((body.items ?? []) as any[])
    .filter((e) => e?.status !== "cancelled")
    .map((e) => {
      const allDay = !!e?.start?.date;
      return {
        id: String(e?.id ?? Math.random()),
        title: String(e?.summary ?? "(no title)"),
        start: String(e?.start?.dateTime ?? e?.start?.date ?? ""),
        end: String(e?.end?.dateTime ?? e?.end?.date ?? ""),
        allDay,
        link: typeof e?.htmlLink === "string" ? e.htmlLink : null,
      };
    });
}

let icsCache: { at: number; text: string } | null = null;

async function viaIcs(): Promise<CalEvent[] | null> {
  let text: string | null = null;
  if (icsCache && Date.now() - icsCache.at < CACHE_MS) text = icsCache.text;
  else {
    try {
      const res = await fetch(ICS_URL, { headers: { "User-Agent": "marketer-dashboard" } });
      if (!res.ok) return null;
      const t = await res.text();
      if (!t.includes("BEGIN:VEVENT")) return null;
      icsCache = { at: Date.now(), text: t };
      text = t;
    } catch {
      return null;
    }
  }
  const from = Date.now();
  const to = from + WINDOW_MS;
  const events: CalEvent[] = [];
  for (const e of parseIcs(text)) {
    for (const occ of expand(e, from, to)) {
      events.push({
        id: `${e.uid}@${occ.start}`,
        title: e.title,
        start: new Date(occ.start).toISOString(),
        end: new Date(occ.end).toISOString(),
        allDay: e.allDay,
        link: e.link,
      });
    }
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return events.slice(0, 40);
}

export async function getUpcomingEvents(): Promise<
  { events: CalEvent[] } | { needsConnect: string }
> {
  const api = await viaApi();
  const raw = api ?? await viaIcs();
  if (raw) return { events: await applyHidden(raw) };
  if (!saKey()) {
    return { needsConnect: "Calendar not connected yet — add the service-account key in Vercel (GOOGLE_CALENDAR_SA_JSON) and share the calendar with its email as Viewer." };
  }
  const why = lastApiStatus ? ` (Google said ${lastApiStatus})` : "";
  return { needsConnect: `Shared calendar unreadable${why} — check the robot email has Viewer access to it, and that Google Calendar API is enabled in the Cloud project.` };
}

// Exclude-keyword filter (024, edited on /calendar-settings). Substring,
// case-insensitive: "Daily To Do" or "#tag" hides any title containing it.
let hiddenCache: { at: number; list: string[] } | null = null;

export async function loadHidden(): Promise<string[]> {
  if (hiddenCache && Date.now() - hiddenCache.at < 5 * 60 * 1000) return hiddenCache.list;
  try {
    const r = await query(`SELECT hidden FROM core.calendar_settings WHERE id = 1`);
    const raw = r.rows[0]?.hidden ?? "[]";
    const list = (JSON.parse(typeof raw === "string" ? raw : "[]") as unknown[])
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 100);
    hiddenCache = { at: Date.now(), list };
    return list;
  } catch {
    return [];
  }
}

async function applyHidden(events: CalEvent[]): Promise<CalEvent[]> {
  const hidden = await loadHidden();
  if (!hidden.length) return events;
  return events.filter((e) => !hidden.some((h) => e.title.toLowerCase().includes(h)));
}

export async function saveHidden(list: string[]): Promise<void> {
  await query(
    `INSERT INTO core.calendar_settings (id, hidden, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET hidden = EXCLUDED.hidden, updated_at = now()`,
    [JSON.stringify(list)]
  );
}

// Settings-page health: connection facts only, never token material.
export async function calendarHealth(): Promise<{
  keyPresent: boolean; tableReady: boolean; robotEmail: string | null;
  eventCount: number | null; error: string | null;
}> {
  let robotEmail: string | null = null;
  try {
    const raw = (process.env.GOOGLE_CALENDAR_SA_JSON ?? "").trim();
    if (raw) robotEmail = String(JSON.parse(raw).client_email ?? "") || null;
  } catch { /* key unreadable — keyPresent stays false */ }
  let tableReady = true;
  try {
    await query("SELECT 1 FROM core.calendar_settings LIMIT 0");
  } catch {
    tableReady = false;
  }
  const res = await getUpcomingEvents();
  if ("events" in res) {
    return { keyPresent: !!saKey(), tableReady, robotEmail, eventCount: res.events.length, error: null };
  }
  return { keyPresent: !!saKey(), tableReady, robotEmail, eventCount: null, error: res.needsConnect };
}

// ---- minimal iCal fallback (timed + all-day + daily/weekly recurrence) ----

function parseDates(val: string, isDate: boolean): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/.exec(val);
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  if (isDate || !m[4]) return Date.UTC(y, mo, d) - 8 * 3600 * 1000; // MYT midnight
  const hh = +m[4], mm = +m[5], ss = +m[6];
  if (m[7] === "Z") return Date.UTC(y, mo, d, hh, mm, ss);
  return Date.UTC(y, mo, d, hh, mm, ss) - 8 * 3600 * 1000; // TZID wall time treated as MYT
}

interface Raw { uid: string; title: string; start: number; end: number; allDay: boolean; link: string | null; rrule: string | null }

function prop(body: string, key: string): { params: string; val: string } | null {
  for (const line of body.split("\n")) {
    if (line === key || line.startsWith(key + ";") || line.startsWith(key + ":")) {
      const rest = line.slice(key.length);
      if (rest.startsWith(";")) {
        const ci = rest.indexOf(":");
        if (ci < 0) return null;
        return { params: rest.slice(0, ci), val: rest.slice(ci + 1).trim() };
      }
      if (rest.startsWith(":")) return { params: "", val: rest.slice(1).trim() };
    }
  }
  return null;
}

function parseIcs(text: string): Raw[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: Raw[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT")) {
    const body = block.split("END:VEVENT")[0];
    if (!body || !body.includes("DTSTART")) continue;
    const ds = prop(body, "DTSTART");
    if (!ds) continue;
    const allDay = /VALUE=DATE(?!-TIME)/.test(ds.params) || /^\d{8}$/.test(ds.val);
    const start = parseDates(ds.val, allDay);
    if (start === null) continue;
    const de = prop(body, "DTEND");
    const end = de ? parseDates(de.val, allDay) ?? start : start;
    const sum = prop(body, "SUMMARY");
    const uid = prop(body, "UID");
    const url = prop(body, "URL");
    const status = prop(body, "STATUS");
    if (status && status.val.toUpperCase() === "CANCELLED") continue;
    const rr = prop(body, "RRULE");
    out.push({
      uid: uid?.val ?? `${start}-${sum?.val ?? ""}`,
      title: (sum?.val ?? "(no title)").replace(/\\(.)/g, "$1"),
      start, end: end ?? start, allDay,
      link: url?.val ?? null,
      rrule: rr?.val ?? null,
    });
  }
  return out;
}

const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expand(e: Raw, from: number, to: number): { start: number; end: number }[] {
  const dur = Math.max(0, e.end - e.start);
  if (!e.rrule) return e.end >= from && e.start <= to ? [{ start: e.start, end: e.end }] : [];
  const parts = Object.fromEntries(e.rrule.split(";").map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i).toUpperCase(), kv.slice(i + 1)];
  }));
  const freq = (parts.FREQ ?? "").toUpperCase();
  if (freq !== "DAILY" && freq !== "WEEKLY") {
    return e.end >= from && e.start <= to ? [{ start: e.start, end: e.end }] : [];
  }
  const interval = Math.max(1, parseInt(parts.INTERVAL ?? "1", 10) || 1);
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : Infinity;
  const until = parts.UNTIL ? parseDates(parts.UNTIL, /^\d{8}$/.test(parts.UNTIL)) ?? Infinity : Infinity;
  const days = freq === "WEEKLY" && parts.BYDAY
    ? parts.BYDAY.split(",").map((d) => DOW[d.trim().toUpperCase()]).filter((d) => d !== undefined)
    : null;
  const hits: { start: number; end: number }[] = [];
  if (days) {
    const t0 = new Date(e.start);
    const midnight = Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth(), t0.getUTCDate());
    const tod = e.start - midnight; // time-of-day preserved across occurrences
    let n = 0;
    for (let w = 0; w < 500 && n < count; w += interval) {
      let weekPast = false;
      for (const dow of [...days].sort((a, b) => a - b)) {
        const baseDow = new Date(midnight).getUTCDay();
        const occ = midnight + (((dow - baseDow + 7) % 7) + w * 7) * 86400000 + tod;
        if (occ < e.start) continue;
        if (occ > until || occ > to) { weekPast = occ > to; continue; }
        n++;
        if (n > count) break;
        if (occ + dur >= from) hits.push({ start: occ, end: occ + dur });
        if (hits.length > 60) return hits;
      }
      if (weekPast || midnight + w * 7 * 86400000 > to) break;
    }
  } else {
    const step = (freq === "DAILY" ? 86400000 : 7 * 86400000) * interval;
    for (let occ = e.start, i = 0; occ <= to && i < count && i < 500; occ += step, i++) {
      if (occ > until) break;
      if (occ + dur >= from) hits.push({ start: occ, end: occ + dur });
      if (hits.length > 60) break;
    }
  }
  return hits;
}
