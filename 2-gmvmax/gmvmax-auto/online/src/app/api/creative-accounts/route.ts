import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// 022 adds creative.accounts.identity_id — tolerate pre-022 DBs until the
// owner runs it (same fail-open pattern as the gmv budget/delivery columns).
async function hasIdentityCol(): Promise<boolean> {
  try {
    await query("SELECT creative.accounts.identity_id FROM creative.accounts LIMIT 0");
    return true;
  } catch {
    return false;
  }
}

// GET /api/creative-accounts — allowlisted TikTok account allowlist (from Neon).
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const withId = await hasIdentityCol();
    const r = await query(
      withId
        ? "SELECT name, username, account_id, identity_id, note, active, live, top_affiliate, position, updated_at FROM creative.accounts ORDER BY position, name"
        : "SELECT name, username, account_id, note, active, live, top_affiliate, position, updated_at FROM creative.accounts ORDER BY position, name"
    );
    if (!withId) for (const row of r.rows) row.identity_id = "";
    return NextResponse.json({ accounts: r.rows });
  } catch (e) {
    return NextResponse.json({ error: "016_creative_catalog.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-accounts {accounts:[{name, username, account_id, note, active, live, top_affiliate}]}
function writeGuard(request: Request): boolean {
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want) return false;
  return request.headers.get("authorization") === `Bearer ${want}`;
}

export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
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
      const prev = await query(
        withId
          ? "SELECT name, username, account_id, identity_id, note, active, live, top_affiliate, updated_at FROM creative.accounts"
          : "SELECT name, username, account_id, note, active, live, top_affiliate, updated_at FROM creative.accounts"
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
          live: a.live === true, top_affiliate: a.top_affiliate === true,
        };
        // Changed-only stamping (mirrors the local saver): keep the old stamp
        // when nothing changed, otherwise stamp now.
        const old = prevByName.get(name);
        const same = !!old &&
          (old.username ?? "") === row.username && (old.account_id ?? "") === row.account_id &&
          (withId ? (old.identity_id ?? "") === row.identity_id : true) &&
          (old.note ?? "") === row.note && old.active === row.active &&
          old.live === row.live && old.top_affiliate === row.top_affiliate;
        if (withId) {
          await query(
            "INSERT INTO creative.accounts (name, username, account_id, identity_id, note, active, live, top_affiliate, position, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,NOW()))",
            [name, row.username, row.account_id, row.identity_id, row.note, row.active, row.live, row.top_affiliate, pos++,
              same && old.updated_at ? old.updated_at : null]
          );
        } else {
          await query(
            "INSERT INTO creative.accounts (name, username, account_id, note, active, live, top_affiliate, position, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,NOW()))",
            [name, row.username, row.account_id, row.note, row.active, row.live, row.top_affiliate, pos++,
              same && old.updated_at ? old.updated_at : null]
          );
        }
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
