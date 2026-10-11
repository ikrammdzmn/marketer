import { createSign } from "crypto";

// Affiliate digest reader: the owner's private `Affiliate Collection ` sheet,
// read with the same service-account robot as the calendar (share the sheet
// with the robot email as Viewer; key JSON lives in GOOGLE_CALENDAR_SA_JSON).
// Read-only: spreadsheets.readonly scope, one values.get, no writes.
//
// Sheet contract (see 1-2-tools/g-sheet_tools/aff-notify/plan.md):
// - Tab title carries a TRAILING SPACE: `Affiliate Collection `.
// - Scan rows 9 through the SECOND `end` marker in col B (block 3 excluded).
// - Col H = STATUS, col C = username, col D = video link, col N = NEXT REVIEW
//   as TEXT d/m/yy (sheet tz GMT+8). Blank N = skip quietly.

const SHEET_ID = (process.env.AFFILIATE_SHEET_ID ?? "").trim();
// Tab is resolved live from the workbook (trimmed match) so a renamed tab —
// e.g. trailing space dropped — heals itself instead of 400ing.
const TAB_MATCH = "Affiliate Collection";
const CACHE_MS = 15 * 60 * 1000;

export interface AffRow {
  username: string;
  link: string | null;
  review: string;
  overdue: boolean;
}

export interface AffDigest {
  dueToday: AffRow[];
  overdue: AffRow[];
  dueTomorrow: AffRow[];
  pendingQueue: number;
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
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

// MYT calendar day (sheet tz GMT+8) as UTC ms of its midnight.
function mytDay(offsetDays: number): number {
  const t = new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - 8 * 3600 * 1000;
}

// Col N TEXT d/m/yy -> MYT-midnight ms, or null when blank/unparseable.
function parseReview(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*$/.exec(s);
  if (!m) return null;
  const d = +m[1], mo = +m[2] - 1, y = 2000 + +m[3];
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return Date.UTC(y, mo, d) - 8 * 3600 * 1000;
}

// Google error text only (never tokens/keys) for the hint line.
async function errDetail(res: Response): Promise<string> {
  try {
    const eb = await res.json();
    if (typeof eb?.error?.message === "string") return eb.error.message;
  } catch { /* body unreadable — keep status only */ }
  return "";
}

let digestCache: { at: number; digest: AffDigest } | null = null;

export async function getAffiliateDigest(): Promise<
  { digest: AffDigest } | { needsConnect: string }
> {
  if (!SHEET_ID) {
    return { needsConnect: "Affiliate sheet not connected yet — set AFFILIATE_SHEET_ID in Vercel and share the sheet with the robot email as Viewer." };
  }
  if (digestCache && Date.now() - digestCache.at < CACHE_MS) {
    return { digest: digestCache.digest };
  }
  let token = await saAccess();
  if (!token) {
    if (!saKey()) {
      return { needsConnect: "Affiliate sheet not connected yet — add the service-account key in Vercel (GOOGLE_CALENDAR_SA_JSON) and share the sheet with its email as Viewer." };
    }
    return { needsConnect: "Affiliate robot key unreadable — check GOOGLE_CALENDAR_SA_JSON in Vercel." };
  }
  const authz = () => ({ Authorization: `Bearer ${token}` });
  const fail = (detail: string) => ({
    needsConnect: `Affiliate sheet unreadable${detail ? ` (Google said: ${detail})` : ""} — check the robot email has Viewer access and Google Sheets API is enabled.`,
  });
  // Resolve the tab live (trimmed match) so a renamed tab heals itself.
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`;
  let mres = await fetch(metaUrl, { headers: authz() });
  if (!mres.ok) {
    const retry = await saAccess(true);
    if (!retry) return fail("no-token");
    token = retry;
    mres = await fetch(metaUrl, { headers: authz() });
  }
  if (!mres.ok) return fail((await errDetail(mres)) || `HTTP ${mres.status}`);
  const meta = await mres.json();
  const titles = ((meta.sheets ?? []) as any[])
    .map((s) => s?.properties?.title)
    .filter((t): t is string => typeof t === "string");
  const tab = titles.find((t) => t.trim() === TAB_MATCH) ?? null;
  if (!tab) {
    return { needsConnect: `Affiliate tab not found (tabs: ${titles.join(", ") || "(none)"}) — rename it to Affiliate Collection.` };
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`'${tab}'`)}!B9:N100?majorDimension=ROWS`;
  let res = await fetch(url, { headers: authz() });
  if (!res.ok) {
    token = await saAccess(true);
    if (!token) { lastApiStatus = "no-token"; }
    else {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) lastApiStatus = `HTTP ${res.status}`;
    }
    if (!res.ok) {
      // Surface Google's own error text (range vs permission vs ID) to
      // allowlisted eyes only — never tokens, status bodies only.
      const detail = (await errDetail(res)) || lastApiStatus || `HTTP ${res.status}`;
      return fail(detail);
    }
  }
  const body = await res.json();
  const values = (body.values ?? []) as unknown[][];
  const today = mytDay(0);
  const tomorrow = mytDay(1);
  const digest: AffDigest = { dueToday: [], overdue: [], dueTomorrow: [], pendingQueue: 0 };
  let ends = 0;
  for (const row of values) {
    const b = String(row[0] ?? "").trim().toLowerCase();
    if (b === "end") {
      ends++;
      if (ends >= 2) break; // block 3 (NMR/FATIGUE archive) is never scanned
      continue;
    }
    const status = String(row[6] ?? "").trim().toUpperCase();
    if (status === "PENDING ADS RUN") digest.pendingQueue++;
    if (status !== "RUNNING") continue;
    const rev = parseReview(row[12]);
    if (rev === null) continue; // blank/unparseable N = skip quietly
    const item: AffRow = {
      username: String(row[1] ?? "(no name)").trim() || "(no name)",
      link: typeof row[2] === "string" && row[2].trim() ? row[2].trim() : null,
      review: String(row[12]).trim(),
      overdue: rev < today,
    };
    if (rev < today) digest.overdue.push(item);
    else if (rev === today) digest.dueToday.push(item);
    else if (rev === tomorrow) digest.dueTomorrow.push(item);
  }
  digest.overdue.sort((a, b) => a.review.localeCompare(b.review));
  digestCache = { at: Date.now(), digest };
  return { digest };
}
