import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  getDisplayNameMap,
  isBootstrapAdmin,
  normalizeDisplayName,
  normalizeEmail,
  validEmail,
} from "@/lib/allowlist-store";
import { requireAllowlistAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  try {
    const result = await query(
      `SELECT email, created_by, created_at
       FROM core.access_allowlist ORDER BY email`
    );
    const emails = result.rows
      .filter((row) => row.email !== access.email)
      .map((row) => ({ ...row, isBootstrapAdmin: false }));
    const names = await getDisplayNameMap();
    for (const entry of emails) {
      entry.display_name = names[entry.email] ?? null;
    }
    emails.unshift({
      email: access.email,
      created_by: "Environment setting",
      created_at: null,
      display_name: names[access.email] ?? null,
      isBootstrapAdmin: true,
    });
    return NextResponse.json({ emails });
  } catch (error) {
    console.error("[access-list:get]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "could not load access list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  let body: { email?: unknown; display_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!validEmail(email)) {
    return NextResponse.json({ error: "enter a valid email address" }, { status: 400 });
  }
  if (isBootstrapAdmin(email)) {
    return NextResponse.json({ error: "the bootstrap admin is already included" }, { status: 409 });
  }
  const displayName = normalizeDisplayName(body.display_name);

  try {
    try {
      const result = await query(
        `WITH added AS (
           INSERT INTO core.access_allowlist (email, created_by, display_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO NOTHING
           RETURNING email
         )
         INSERT INTO core.audit (actor, action, detail)
         SELECT $2, 'access_allowlist.add', jsonb_build_object('email', email)
         FROM added
         RETURNING detail`,
        [email, access.email, displayName]
      );
      if (result.rowCount !== 1) {
        return NextResponse.json({ error: "that email is already allowed" }, { status: 409 });
      }
    } catch (error) {
      // Pre-026 database without the display_name column: retry without it.
      if (!(error instanceof Error && "code" in error && (error as { code?: string }).code === "42703")) {
        throw error;
      }
      const result = await query(
        `WITH added AS (
           INSERT INTO core.access_allowlist (email, created_by)
           VALUES ($1, $2)
           ON CONFLICT (email) DO NOTHING
           RETURNING email
         )
         INSERT INTO core.audit (actor, action, detail)
         SELECT $2, 'access_allowlist.add', jsonb_build_object('email', email)
         FROM added
         RETURNING detail`,
        [email, access.email]
      );
      if (result.rowCount !== 1) {
        return NextResponse.json({ error: "that email is already allowed" }, { status: 409 });
      }
      return NextResponse.json({ ok: true, email, ...(displayName !== null ? { needsMigration026: true } : {}) }, { status: 201 });
    }
    return NextResponse.json({ ok: true, email }, { status: 201 });
  } catch (error) {
    console.error("[access-list:add]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "could not add email" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  let body: { email?: unknown; display_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!validEmail(email)) {
    return NextResponse.json({ error: "enter a valid email address" }, { status: 400 });
  }
  const displayName = normalizeDisplayName(body.display_name);

  try {
    if (isBootstrapAdmin(email)) {
      // The bootstrap admin has no allowlist row; keep the name on one without changing access.
      await query(
        `INSERT INTO core.access_allowlist (email, created_by, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [email, access.email, displayName]
      );
    } else {
      const result = await query(
        `UPDATE core.access_allowlist SET display_name = $2 WHERE email = $1`,
        [email, displayName]
      );
      if (result.rowCount !== 1) {
        return NextResponse.json({ error: "email is not on the allowlist" }, { status: 404 });
      }
    }
    try {
      await query(
        `INSERT INTO core.audit (actor, action, detail)
         VALUES ($1, 'access_allowlist.rename', jsonb_build_object('email', $2))`,
        [access.email, email]
      );
    } catch {
      // Audit logging must never sink the rename itself.
    }
    return NextResponse.json({ ok: true, email, display_name: displayName });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "42703") {
      return NextResponse.json(
        { error: "run migration 026_allowlist_display_name.sql on this database first" },
        { status: 409 }
      );
    }
    console.error("[access-list:rename]", error instanceof Error ? error.message : "failed");
    // Admin-only route: include the DB code so the real failure is diagnosable.
    const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "unknown";
    const detail = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: `could not save display name (${code}: ${detail})` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!validEmail(email)) {
    return NextResponse.json({ error: "enter a valid email address" }, { status: 400 });
  }
  if (isBootstrapAdmin(email)) {
    return NextResponse.json({ error: "the bootstrap admin cannot be removed here" }, { status: 400 });
  }

  try {
    const result = await query(
      `WITH removed AS (
         DELETE FROM core.access_allowlist WHERE email = $1
         RETURNING email
       )
       INSERT INTO core.audit (actor, action, detail)
       SELECT $2, 'access_allowlist.remove', jsonb_build_object('email', email)
       FROM removed
       RETURNING detail`,
      [email, access.email]
    );
    if (result.rowCount !== 1) {
      return NextResponse.json({ error: "email is not on the allowlist" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    console.error("[access-list:remove]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "could not remove email" }, { status: 500 });
  }
}
