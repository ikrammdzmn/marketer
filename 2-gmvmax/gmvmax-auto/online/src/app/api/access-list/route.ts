import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  isBootstrapAdmin,
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
    emails.unshift({
      email: access.email,
      created_by: "Environment setting",
      created_at: null,
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
    return NextResponse.json({ error: "the bootstrap admin is already included" }, { status: 409 });
  }

  try {
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
    return NextResponse.json({ ok: true, email }, { status: 201 });
  } catch (error) {
    console.error("[access-list:add]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "could not add email" }, { status: 500 });
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
