// Shared live-board grouping for /accounts preview + /accounts/live.
// PURE — zero imports (client/server import wall: "use client" pages may only
// import from pure modules like ttam-scores or this file).
export const LIVE_ORDER = ["Internal Acc", "External Acc", "AI", "Relive"];

export function normalizeLiveType(v: any): string {
  const t = String(v ?? "").trim().toLowerCase();
  for (const p of LIVE_ORDER) {
    if (t === p.toLowerCase()) return p;
  }
  return String(v ?? "").trim();
}

export type LiveGroups = {
  cols: { key: string; title: string; rows: any[] }[];
  total: number;
  revisedAt: string | null;
};

export function groupLiveAccounts(accounts: any[]): LiveGroups {
  const live = (accounts ?? []).filter((a: any) => a.live === true);
  const buckets = new Map<string, any[]>();
  for (const p of LIVE_ORDER) buckets.set(p, []);
  const other: any[] = [];
  for (const a of live) {
    const norm = normalizeLiveType(a.live_note);
    if (buckets.has(norm)) buckets.get(norm)!.push(a);
    else if (norm) other.push(a);
    else other.push(a);
  }
  for (const rows of buckets.values()) {
    rows.sort((x: any, y: any) => String(x.name ?? "").localeCompare(String(y.name ?? "")));
  }
  other.sort((x: any, y: any) => String(x.name ?? "").localeCompare(String(y.name ?? "")));
  const cols = LIVE_ORDER.map((p) => ({ key: p, title: p, rows: buckets.get(p) ?? [] }));
  if (other.length > 0) cols.push({ key: "Other", title: "Other", rows: other });
  let revisedAt: string | null = null;
  for (const a of live) {
    const u = a.updated_at ? String(a.updated_at) : "";
    if (u && (!revisedAt || u > revisedAt)) revisedAt = u;
  }
  return { cols, total: live.length, revisedAt };
}
