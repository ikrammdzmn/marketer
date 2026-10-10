import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/creative-accounts — allowlisted TikTok account allowlist (from Neon).
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const r = await query(
      "SELECT name, username, account_id, note, active, live, top_affiliate, position, updated_at FROM creative.accounts ORDER BY position, name"
    );
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
    }
    await query("BEGIN");
    try {
      const prev = await query("SELECT name, username, account_id, note, active, live, top_affiliate, updated_at FROM creative.accounts");
      const prevByName = new Map<string, any>(prev.rows.map((r: any) => [r.name, r]));
      await query("DELETE FROM creative.accounts");
      let pos = 0;
      for (const a of list) {
        const name = a.name.trim();
        const row = {
          username: String(a.username ?? ""), account_id: String(a.account_id ?? ""),
          note: String(a.note ?? ""), active: a.active !== false,
          live: a.live === true, top_affiliate: a.top_affiliate === true,
        };
        // Changed-only stamping (mirrors the local saver): keep the old stamp
        // when nothing changed, otherwise stamp now.
        const old = prevByName.get(name);
        const same = !!old &&
          (old.username ?? "") === row.username && (old.account_id ?? "") === row.account_id &&
          (old.note ?? "") === row.note && old.active === row.active &&
          old.live === row.live && old.top_affiliate === row.top_affiliate;
        await query(
          "INSERT INTO creative.accounts (name, username, account_id, note, active, live, top_affiliate, position, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,NOW()))",
          [name, row.username, row.account_id, row.note, row.active, row.live, row.top_affiliate, pos++,
            same && old.updated_at ? old.updated_at : null]
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
