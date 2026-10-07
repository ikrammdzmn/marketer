import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser, requireShopTokenAccess } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";
import { refreshShopToken, shopTokenExpiryMs } from "@/lib/shop-credentials";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// GET /api/shop-token — token status for the Shop GMV card.
// Allowlisted users see expiry info (lengths only, never token values);
// isAdmin tells the UI whether to render the admin-only Refresh button.
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const r = await query(
      `SELECT updated_at, access_token_expire_in, refresh_token_expire_in
       FROM credentials.shop_tokens WHERE shop_id = $1`,
      [SHOPS["1"].shopId]
    );
    const row = r.rows[0];
    const expiry = row
      ? shopTokenExpiryMs(row.updated_at, row.access_token_expire_in ?? 86400)
      : null;
    return NextResponse.json({
      isAdmin: access.isAdmin,
      hasRow: !!row,
      accessExpiresAt: expiry ? new Date(expiry).toISOString() : null,
      updatedAt: row?.updated_at ?? null,
    });
  } catch {
    return NextResponse.json({
      isAdmin: access.isAdmin,
      hasRow: false,
      accessExpiresAt: null,
      updatedAt: null,
    });
  }
}

// POST /api/shop-token — one-tap admin refresh (plus first-time seed from
// env when no DB row exists yet). Returns expiry info only, never tokens.
export async function POST(request: Request) {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "same-origin request required" }, { status: 403 });
  }

  const appKey = cleanEnv(process.env.SHOP_APP_KEY);
  const appSecret = cleanEnv(process.env.SHOP_APP_SECRET);
  if (!appKey || !appSecret) {
    return NextResponse.json({ error: "missing SHOP_APP_KEY/SECRET env" }, { status: 503 });
  }
  const shop = SHOPS["1"];

  try {
    let seeded = false;
    let row: any = null;
    try {
      const r = await query(
        `SELECT shop_id, refresh_token, shop_cipher FROM credentials.shop_tokens WHERE shop_id = $1`,
        [shop.shopId]
      );
      row = r.rows[0] ?? null;
    } catch {
      row = null;
    }
    // First-time seed: tonight's tokens live in Vercel env until the row exists.
    if (!row) {
      const tok = cleanEnv(process.env.TIKTOK_SHOP1_ACCESS_TOKEN);
      const ref = cleanEnv(process.env.TIKTOK_SHOP1_REFRESH_TOKEN);
      const cipher = cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER);
      if (!tok || !ref) {
        return NextResponse.json(
          { error: "no token row and no TIKTOK_SHOP1_* env to seed from" },
          { status: 503 }
        );
      }
      await query(
        `INSERT INTO credentials.shop_tokens
           (shop_id, shop_number, shop_name, access_token, refresh_token, shop_cipher, updated_at)
         VALUES ($1, 1, $2, $3, $4, $5, now())
         ON CONFLICT (shop_id) DO UPDATE SET
           access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token,
           shop_cipher = EXCLUDED.shop_cipher, updated_at = now()`,
        [shop.shopId, shop.name, tok, ref, cipher || null]
      );
      seeded = true;
      row = { refresh_token: ref };
    }
    const fresh = await refreshShopToken(appKey, appSecret, row.refresh_token);
    if (!fresh?.access_token) {
      return NextResponse.json({ error: "TikTok refresh rejected; re-authorize the shop" }, { status: 502 });
    }
    await query(
      `UPDATE credentials.shop_tokens
       SET access_token = $1, refresh_token = $2,
           access_token_expire_in = $3, updated_at = now()
       WHERE shop_id = $4`,
      [fresh.access_token, fresh.refresh_token ?? row.refresh_token, fresh.expires_in ?? 86400, shop.shopId]
    );
    try {
      await query(
        `INSERT INTO core.audit (actor, action, detail)
         VALUES ($1, 'shop_token.refresh', jsonb_build_object('seeded', $2::boolean))`,
        [access.email, seeded]
      );
    } catch {
      // Audit is best-effort; the refresh itself already landed.
    }
    const check = await query(
      `SELECT updated_at, access_token_expire_in FROM credentials.shop_tokens WHERE shop_id = $1`,
      [shop.shopId]
    );
    const crow = check.rows[0];
    const expiry = shopTokenExpiryMs(crow?.updated_at, crow?.access_token_expire_in ?? 86400);
    return NextResponse.json({
      ok: true,
      seeded,
      accessExpiresAt: expiry ? new Date(expiry).toISOString() : null,
      updatedAt: crow?.updated_at ?? null,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[shop-token-refresh]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "shop token refresh failed; retry later" }, { status: 502 });
  }
}
