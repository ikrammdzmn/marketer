import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { query } from "@/lib/db";

// GET /api/shop-live/creator-grants — module-gated grant USERNAME inventory
// for the /shop-live picker (which affiliate rooms have creator detail).
// Usernames only — no open_ids, no token material.
export async function GET() {
  const access = await requireModule("shop-live");
  if (!access.ok) return access.response;
  try {
    const r = await query(
      `SELECT creator_user FROM credentials.shop_creator_tokens WHERE shop_id = $1`,
      ["7495609155379170274"]
    );
    const users = (r.rows ?? [])
      .map((row: any) => String(row.creator_user ?? "").replace(/^@/, "").toLowerCase())
      .filter(Boolean);
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [], creatorsReady: false });
  }
}
