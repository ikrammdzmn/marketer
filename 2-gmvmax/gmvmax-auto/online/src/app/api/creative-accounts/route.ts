import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// 022 adds creative.accounts.identity_id, 030 adds live_note — tolerate
// pre-migration DBs until the owner runs them (same fail-open pattern as
// the gmv budget/delivery columns).
async function hasIdentityCol(): Promise<boolean> {
  try {
    await query("SELECT creative.accounts.identity_id FROM creative.accounts LIMIT 0");
    return true;
  } catch {
    return false;
  }
}

async function hasLiveNoteCol(): Promise<boolean> {
  try {
    await query("SELECT creative.accounts.live_note FROM creative.accounts LIMIT 0");
    return true;
  } catch {
    return false;
  }
}

// GET /api/creative-accounts — allowlisted TikTok account allowlist (from Neon).
export async function GET() {
  const access = await requireModule("accounts");
  if (!access.ok) return access.response;
  try {
    const withId = await hasIdentityCol();
    const withLiveNote = await hasLiveNoteCol();
    const cols = ["name", "username", "account_id"];
    if (withId) cols.push("identity_id");
    cols.push("note", "active", "live");
    if (withLiveNote) cols.push("live_note");
    cols.push("top_affiliate", "position", "updated_at");
    const r = await query(
      `SELECT ${cols.map((c) => `creative.accounts.${c}`).join(", ")} FROM creative.accounts ORDER BY position, name`
    );
    if (!withId) for (const row of r.rows) row.identity_id = "";
    if (!withLiveNote) for (const row of r.rows) row.live_note = "";
    return NextResponse.json({ accounts: r.rows });
  } catch (e) {
    return NextResponse.json({ error: "016_creative_catalog.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-accounts {accounts:[{name, username, account_id, note, active, live, live_note, top_affiliate}]}
function writeGuard(request: Request): boolean {
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want) return false;
  return request.headers.get("authorization") === `Bearer ${want}`;
}

export async function POST(request: Request) {
  const access = await requireModule("accounts");
  if (!access.ok) return access.response;
  if (!writeGuard(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const list = Array.isArray(body.accounts) ? body.accounts : [];
    if (list.length > 100) return NextResponse.json({ error: "max 100 accounts" }, { status: 400 });
    for (const a of list) {
      if (!a || typeof a.name !== "string" || !a.name.trim() || a.name.length > 120) {
        return NextResponse.json({ error: "each account needs a name (<=120)" }, { status: 400 });
      }
      if (a.identity_id !== undefined && a.identity_id !== null && String(a.identity_id).length > 64) {
        return NextResponse.json({ error: "identity_id must be <= 64 chars" }, { status: 400 });
      }
    }
    // Duplicate names would violate accounts_pkey mid-save (after the DELETE,
    // wiping the table) — reject up front naming the culprit.
    {
      const seen = new Set<string>();
      for (const a of list) {
        const name = a.name.trim();
        if (seen.has(name)) {
          return NextResponse.json({ error: `duplicate account name: ${name}` }, { status: 400 });
        }
        seen.add(name);
      }
    }
    await query("BEGIN");
    try {
      const withId = await hasIdentityCol();
      const withLiveNote = await hasLiveNoteCol();
      const prevCols = ["name", "username", "account_id"];
      if (withId) prevCols.push("identity_id");
      prevCols.push("note", "active", "live");
      if (withLiveNote) prevCols.push("live_note");
      prevCols.push("top_affiliate", "updated_at");
      const prev = await query(
        `SELECT ${prevCols.map((c) => `creative.accounts.${c}`).join(", ")} FROM creative.accounts`
      );
      const prevByName = new Map<string, any>(prev.rows.map((r: any) => [r.name, r]));
      await query("DELETE FROM creative.accounts");
      let pos = 0;
      for (const a of list) {
        const name = a.name.trim();
        const row = {
          username: String(a.username ?? ""), account_id: String(a.account_id ?? ""),
          identity_id: String(a.identity_id ?? "").trim(),
          note: String(a.note ?? ""), active: a.active !== false,
          live: a.live === true, live_note: String(a.live_note ?? ""),
          top_affiliate: a.top_affiliate === true,
        };
        // Changed-only stamping (mirrors the local saver): keep the old stamp
        // when nothing changed, otherwise stamp now.
        const old = prevByName.get(name);
        const same = !!old &&
          (old.username ?? "") === row.username && (old.account_id ?? "") === row.account_id &&
          (withId ? (old.identity_id ?? "") === row.identity_id : true) &&
          (old.note ?? "") === row.note && old.active === row.active &&
          old.live === row.live &&
          (withLiveNote ? (old.live_note ?? "") === row.live_note : true) &&
          old.top_affiliate === row.top_affiliate;
        const insCols = ["name", "username", "account_id"];
        if (withId) insCols.push("identity_id");
        insCols.push("note", "active", "live");
        if (withLiveNote) insCols.push("live_note");
        insCols.push("top_affiliate", "position", "updated_at");
        const vals: any[] = [name, row.username, row.account_id];
        if (withId) vals.push(row.identity_id);
        vals.push(row.note, row.active, row.live);
        if (withLiveNote) vals.push(row.live_note);
        vals.push(row.top_affiliate, pos++, same && old.updated_at ? old.updated_at : null);
        const placeholders = vals.map((_, i) => (i === vals.length - 1 ? "COALESCE($" + (i + 1) + ",NOW())" : "$" + (i + 1))).join(",");
        await query(
          `INSERT INTO creative.accounts (${insCols.join(", ")}) VALUES (${placeholders})`,
          vals
        );
      }
      await query("COMMIT");
    } catch (e) {
      await query("ROLLBACK");
      throw e;
    }
    return NextResponse.json({ ok: true, count: list.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
