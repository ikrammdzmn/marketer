import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireShopTokenAccess } from "@/lib/authz";

// PUT /api/shop-auth/creator-label { open_id, name?, username? }
// Admin-only display labels for a creator row (the creator exchange carries
// no username, so rows show "@?" until labeled). Re-grants never wipe
// labels (callback upserts preserve non-empty names).
export async function PUT(request: Request) {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "need JSON { open_id, name?, username? }" }, { status: 400 });
  }
  const openId = String(body.open_id ?? "").trim();
  const name = String(body.name ?? body.label ?? "").trim().slice(0, 80);
  const username = String(body.username ?? "").trim().slice(0, 80).replace(/^@/, "");
  if (!openId || (!name && !username)) {
    return NextResponse.json({ error: "need open_id + name and/or username" }, { status: 400 });
  }
  try {
    const sets: string[] = [];
    const vals: any[] = ["7495609155379170274", openId];
    if (name) {
      vals.push(name);
      sets.push(`creator_name = $${vals.length}`);
    }
    if (username) {
      vals.push(username);
      sets.push(`creator_user = $${vals.length}`);
    }
    sets.push("updated_at = now()");
    const r = await query(
      `UPDATE credentials.shop_creator_tokens
       SET ${sets.join(", ")}
       WHERE shop_id = $1 AND creator_open_id = $2`,
      vals
    );
    if ((r.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "no such creator row" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "creator table unreadable (run 036?)" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
