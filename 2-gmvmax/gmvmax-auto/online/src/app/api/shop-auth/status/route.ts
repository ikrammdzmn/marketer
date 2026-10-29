import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireShopTokenAccess } from "@/lib/authz";

// GET /api/shop-auth/status — admin-only grant inventory for the temp
// /shop-auth/grant page. Lengths-only: IDs are routing identifiers (not
// secrets); token material never leaves the server.
export async function GET() {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;
  let analytics: { updatedAt: string | null; tokenLen: number; cipherLen: number } | null = null;
  try {
    const r = await query(
      `SELECT access_token, shop_cipher, updated_at
       FROM credentials.shop_analytics_tokens WHERE shop_id = $1`,
      ["7495609155379170274"]
    );
    if (r.rows.length > 0) {
      analytics = {
        updatedAt: r.rows[0].updated_at ?? null,
        tokenLen: String(r.rows[0].access_token ?? "").length,
        cipherLen: String(r.rows[0].shop_cipher ?? "").length,
      };
    }
  } catch {
    return NextResponse.json(
      { error: "analytics table unreadable (run 025?)" },
      { status: 500 }
    );
  }
  let creators: Array<{
    creator_open_id: string;
    creator_user: string | null;
    creator_name: string | null;
    tokenLen: number;
    updatedAt: string | null;
    grantedScopes: string;
    userType: string;
  }> = [];
  let creatorsReady = true;
  try {
    const r = await query(
      `SELECT creator_open_id, creator_user, creator_name, access_token, updated_at
       FROM credentials.shop_creator_tokens WHERE shop_id = $1
       ORDER BY updated_at DESC`,
      ["7495609155379170274"]
    );
    creators = r.rows.map((row: any) => ({
      creator_open_id: String(row.creator_open_id ?? ""),
      creator_user: row.creator_user ?? null,
      creator_name: row.creator_name ?? null,
      tokenLen: String(row.access_token ?? "").length,
      updatedAt: row.updated_at ?? null,
      grantedScopes: "",
      userType: "",
    }));
    // 037 columns (fail-open pre-037).
    try {
      const s = await query(
        `SELECT creator_open_id, granted_scopes, user_type
         FROM credentials.shop_creator_tokens WHERE shop_id = $1`,
        ["7495609155379170274"]
      );
      const byId = new Map(
        s.rows.map((row: any) => [String(row.creator_open_id ?? ""), row])
      );
      creators = creators.map((c) => ({
        ...c,
        grantedScopes: String(byId.get(c.creator_open_id)?.granted_scopes ?? ""),
        userType: String(byId.get(c.creator_open_id)?.user_type ?? ""),
      }));
    } catch {
      // Pre-037 DB: scopes stay empty until the owner runs 037.
    }
  } catch {
    creatorsReady = false;
  }
  return NextResponse.json({ analytics, creators, creatorsReady });
}
