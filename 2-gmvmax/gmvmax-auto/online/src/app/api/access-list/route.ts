import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  getDisplayNameMap,
  isBootstrapAdmin,
  MODULES,
  normalizeDisplayName,
  normalizeEmail,
  normalizeModules,
  validEmail,
} from "@/lib/allowlist-store";
import { requireAllowlistAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  try {
    let rows: any[];
    try {
      const result = await query(
        `SELECT email, created_by, created_at, modules
         FROM core.access_allowlist ORDER BY email`
      );
      rows = result.rows;
    } catch (error) {
      // Pre-031 database: fall back to no modules column (all = full access).
      if (!(error instanceof Error && "code" in error && (error as { code?: string }).code === "42703")) throw error;
      const result = await query(
        `SELECT email, created_by, created_at
         FROM core.access_allowlist ORDER BY email`
      );
      rows = result.rows.map((r: any) => ({ ...r, modules: "all" }));
    }
    const emails = rows
      .filter((row) => row.email !== access.email)
      .map((row) => ({ ...row, modules: normalizeModules(row.modules), isBootstrapAdmin: false }));
    const names = await getDisplayNameMap();
    for (const entry of emails) {
      entry.display_name = names[entry.email] ?? null;
    }
    emails.unshift({
      email: access.email,
      created_by: "Environment setting",
      created_at: null,
      display_name: names[access.email] ?? null,
      modules: ["all"],
      isBootstrapAdmin: true,
    });
    return NextResponse.json({ emails, modules: MODULES });
  } catch (error) {
    console.error("[access-list:get]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "could not load access list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAllowlistAdmin();
  if (!access.ok) return access.response;

  let body: { email?: unknown; display_name?: unknown; modules?: unknown };
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
  // modules: undefined = full access ('all'); array or comma string = scoped.
  let modules = "all";
  if (body.modules !== undefined) {
    const raw = Array.isArray(body.modules) ? body.modules.join(",") : String(body.modules);
    const parsed = normalizeModules(raw);
    if (parsed.length === 0) {
      return NextResponse.json({ error: `unknown module (valid: all, ${(MODULES as readonly string[]).join(", ")})` }, { status: 400 });
    }
    modules = parsed.includes("all") ? "all" : parsed.join(",");
  }

  try {
    try {
      const result = await query(
        `WITH added AS (
           INSERT INTO core.access_allowlist (email, created_by, display_name, modules)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING
           RETURNING email
         )
         INSERT INTO core.audit (actor, action, detail)
         SELECT $2, 'access_allowlist.add', jsonb_build_object('email', email, 'modules', $4)
         FROM added
         RETURNING detail`,
        [email, access.email, displayName, modules]
      );
      if (result.rowCount !== 1) {
        return NextResponse.json({ error: "that email is already allowed" }, { status: 409 });
      }
    } catch (error) {
      // Pre-031 (or pre-026) database without the new columns: retry bare.
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
      return NextResponse.json({ ok: true, email, needsMigration031: true }, { status: 201 });
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

  let body: { email?: unknown; display_name?: unknown; modules?: unknown };
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
  // modules: undefined = leave unchanged; otherwise array/comma string/'all'.
  let modules: string | null = null;
  if (body.modules !== undefined) {
    const raw = Array.isArray(body.modules) ? body.modules.join(",") : String(body.modules);
    const parsed = normalizeModules(raw);
    if (parsed.length === 0) {
      return NextResponse.json({ error: `unknown module (valid: all, ${(MODULES as readonly string[]).join(", ")})` }, { status: 400 });
    }
    modules = parsed.includes("all") ? "all" : parsed.join(",");
  }

  try {
    // Capture the old scope first so scope changes get their own audit entry.
    let oldModules: string | null = null;
    try {
      const prev = await query(`SELECT modules FROM core.access_allowlist WHERE email = $1`, [email]);
      if (prev.rowCount === 1) oldModules = String(prev.rows[0]?.modules ?? "all");
    } catch {
      // Pre-031 database: no modules column to compare.
    }
    if (isBootstrapAdmin(email)) {
      // The bootstrap admin is always full access; keep the name only.
      await query(
        `INSERT INTO core.access_allowlist (email, created_by, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [email, access.email, displayName]
      );
    } else {
      const result = await query(
        modules === null
          ? `UPDATE core.access_allowlist SET display_name = $2 WHERE email = $1`
          : `UPDATE core.access_allowlist SET display_name = $2, modules = $3 WHERE email = $1`,
        modules === null ? [email, displayName] : [email, displayName, modules]
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
    // Scope changes get a distinct entry (old → new) so privilege grants
    // are distinguishable from display-name renames.
    if (modules !== null && !isBootstrapAdmin(email) && oldModules !== null && normalizeModules(oldModules).join(",") !== normalizeModules(modules).join(",")) {
      try {
        await query(
          `INSERT INTO core.audit (actor, action, detail)
           VALUES ($1, 'access_allowlist.scope', jsonb_build_object('email', $2, 'old', $3, 'new', $4))`,
          [access.email, email, oldModules, modules]
        );
      } catch {
        // Audit logging must never sink the scope save itself.
      }
    }
    return NextResponse.json({ ok: true, email, display_name: displayName, ...(modules !== null ? { modules: normalizeModules(modules) } : {}) });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "42703") {
      return NextResponse.json(
        { error: "run migration 031_access_modules.sql on this database first" },
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
