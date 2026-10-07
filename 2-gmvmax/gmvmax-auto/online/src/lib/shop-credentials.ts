import { query } from "./db";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

export interface ShopCredentials {
  shop_id: string;
  shop_number: number;
  shop_name: string | null;
  access_token: string;
  refresh_token: string | null;
  shop_cipher: string | null;
}

// Shop 1 only. DB-first with auto-refresh (expiry-1h), env fallback.
// Pattern mirrors temp-marketplace tiktok-shop-credentials.ts (proven).
export async function getShopCredentials(
  shopNumber: string
): Promise<ShopCredentials | null> {
  const { SHOPS } = await import("./shops");
  const shop = SHOPS[shopNumber];
  if (!shop || shopNumber !== "1") return null;

  const appKey = cleanEnv(process.env.SHOP_APP_KEY);
  const appSecret = cleanEnv(process.env.SHOP_APP_SECRET);

  try {
    const r = await query(
      `SELECT shop_id, shop_number, shop_name, access_token, refresh_token,
              shop_cipher, access_token_expire_in, updated_at
       FROM credentials.shop_tokens WHERE shop_id = $1`,
      [shop.shopId]
    );
    if (r.rows.length > 0 && r.rows[0].access_token) {
      const row = r.rows[0];
      // Auto-refresh when past expiry-1h (default 24h window).
      let needsRefresh = false;
      if (row.updated_at && appKey && appSecret) {
        const expiry = shopTokenExpiryMs(row.updated_at, row.access_token_expire_in ?? 86400);
        if (expiry !== null && Date.now() >= expiry - 3600_000) needsRefresh = true;
      }
      if (needsRefresh && row.refresh_token) {
        const fresh = await refreshShopToken(
          appKey, appSecret, row.refresh_token
        );
        if (fresh?.access_token) {
          await query(
            `UPDATE credentials.shop_tokens
             SET access_token = $1, refresh_token = $2,
                 access_token_expire_in = $3, updated_at = now()
             WHERE shop_id = $4`,
            [
              fresh.access_token,
              fresh.refresh_token ?? row.refresh_token,
              fresh.expires_in ?? 86400,
              shop.shopId,
            ]
          );
          row.access_token = fresh.access_token;
          row.refresh_token = fresh.refresh_token ?? row.refresh_token;
        }
      }
      return row as ShopCredentials;
    }
  } catch {
    console.error("[shop-credentials] db lookup failed, trying env fallback");
  }

  const tok = cleanEnv(process.env.TIKTOK_SHOP1_ACCESS_TOKEN);
  if (tok) {
    return {
      shop_id: shop.shopId,
      shop_number: 1,
      shop_name: shop.name,
      access_token: tok,
      refresh_token: cleanEnv(process.env.TIKTOK_SHOP1_REFRESH_TOKEN) || null,
      shop_cipher: cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER) || null,
    };
  }
  return null;
}

// TikTok Shop v2 returns access_token_expire_in as an absolute epoch
// (seconds), not a duration — a duration-only read would place expiry in
// 2083 and silently disable auto-refresh. Normalize both shapes here.
export function shopTokenExpiryMs(updatedAt: unknown, expireIn: unknown): number | null {
  const base = new Date(updatedAt as string).getTime();
  const v = Number(expireIn);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v > 1e12) return v; // ms epoch
  if (v > 3e7) return v * 1000; // sec epoch (~past 1970+1y)
  if (!Number.isFinite(base)) return null;
  return base + v * 1000; // duration seconds
}

// GET https://auth.tiktok-shops.com/api/v2/token/refresh (proven pattern).
export async function refreshShopToken(
  appKey: string,
  appSecret: string,
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  if (!appKey || !appSecret || !refreshToken) return null;
  try {
    const url =
      `https://auth.tiktok-shops.com/api/v2/token/refresh` +
      `?app_key=${encodeURIComponent(appKey)}` +
      `&app_secret=${encodeURIComponent(appSecret)}` +
      `&grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
    const res = await fetch(url);
    const body = await res.json();
    const data = body.data ?? body;
    if (!data?.access_token) {
      console.error("[shop-credentials] refresh failed");
      return null;
    }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? data.access_token_expire_in ?? 86400,
    };
  } catch {
    console.error("[shop-credentials] refresh error");
    return null;
  }
}
