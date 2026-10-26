import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

const KINDS = ["ttam", "gmv", "general"] as const;
const BY = ["owner", "agent"] as const;

// GET /api/task-notes?days=60 — shared dated notes (owner + agent channel).
// Window: past 30d through today+days. Signed-in users only.
export async function GET(request: Request) {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "60", 10) || 60, 1), 365);
  try {
    const r = await query(
      `SELECT id, date::text AS date, title, body, kind, done, created_by,
              created_at, updated_at
       FROM gmv.task_notes
       WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
         AND date <= (CURRENT_DATE + ($1 || ' days')::interval)
       ORDER BY date, id`,
      [String(days)]
    );
    return NextResponse.json({ ok: true, notes: r.rows });
  } catch (e) {
    // Pre-034 DBs: empty list, panel shows "no notes yet" instead of 500.
    return NextResponse.json({ ok: true, notes: [], premigration: true });
  }
}

// POST /api/task-notes {date, title, kind?, body?, created_by?} — add a note.
export async function POST(request: Request) {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const date = String(body.date ?? "");
  const title = String(body.title ?? "").trim().slice(0, 200);
  const kind = String(body.kind ?? "general");
  const text = String(body.body ?? "").trim().slice(0, 2000);
  const by = String(body.created_by ?? "owner");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: "need title" }, { status: 400 });
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: "kind must be ttam|gmv|general" }, { status: 400 });
  }
  if (!(BY as readonly string[]).includes(by)) {
    return NextResponse.json({ error: "created_by must be owner|agent" }, { status: 400 });
  }
  try {
    const r = await query(
      `INSERT INTO gmv.task_notes (date, title, body, kind, created_by)
       VALUES ($1::date, $2, $3, $4, $5)
       RETURNING id, date::text AS date, title, body, kind, done, created_by`,
      [date, title, text, kind, by]
    );
    return NextResponse.json({ ok: true, note: r.rows[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "insert failed";
    console.error("[task-notes]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/task-notes {id, done?, title?, body?, date?, kind?} — tick a note
// or edit its fields. One row at a time, validated like POST.
export async function PATCH(request: Request) {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "need numeric id" }, { status: 400 });
  }
  const patch: string[] = [];
  const params: unknown[] = [];
  if (typeof body.done === "boolean") {
    params.push(body.done);
    patch.push(`done = $${params.length}`);
  }
  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    params.push(title);
    patch.push(`title = $${params.length}`);
  }
  if (body.body !== undefined) {
    params.push(String(body.body).trim().slice(0, 2000));
    patch.push(`body = $${params.length}`);
  }
  if (body.date !== undefined) {
    const date = String(body.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    params.push(date);
    patch.push(`date = $${params.length}::date`);
  }
  if (body.kind !== undefined) {
    const kind = String(body.kind);
    if (!["ttam", "gmv", "general"].includes(kind)) {
      return NextResponse.json({ error: "kind must be ttam|gmv|general" }, { status: 400 });
    }
    params.push(kind);
    patch.push(`kind = $${params.length}`);
  }
  if (patch.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  try {
    params.push(id);
    const r = await query(
      `UPDATE gmv.task_notes SET ${patch.join(", ")}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING id, date::text AS date, title, body, kind, done, created_by`,
      params
    );
    if (r.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, note: r.rows[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update failed";
    console.error("[task-notes]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/task-notes?id=1 — remove a note. No undelete; the done-flag is
// the soft alternative for anything you might want back.
export async function DELETE(request: Request) {
  const access = await requireModule("calendar");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "need numeric id" }, { status: 400 });
  }
  try {
    const r = await query(`DELETE FROM gmv.task_notes WHERE id = $1 RETURNING id`, [id]);
    if (r.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "delete failed";
    console.error("[task-notes]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
