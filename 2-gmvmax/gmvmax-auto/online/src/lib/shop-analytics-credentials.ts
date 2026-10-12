import { query } from "./db";

// Second Shop Custom app (Analytics & Reporting category: LIVE minute
// performance). Dual-key model: orders keep SHOP_APP_KEY/SECRET +
// credentials.shop_tokens (007/008); analytics uses SHOP_ANALYTICS_* +
// credentials.shop_analytics_tokens (025). Server-only.

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

export function getAnalyticsAppKeys(): { key: string; secret: string } {
  return {
    key: cleanEnv(process.env.SHOP_ANALYTICS_APP_KEY),
    secret: cleanEnv(process.env.SHOP_ANALYTICS_APP_SECRET),
  };
}

export interface ShopAnalyticsCredentials {
  shop_id: string;
  shop_number: number;
  shop_name: string | null;
  access_token: string;
  refresh_token: string | null;
  shop_cipher: string | null;
}

// DB-first, env fallback. Tolerates pre-025 DBs (missing table → env).
export async function getShopAnalyticsCredentials(
  shopNumber: string
): Promise<ShopAnalyticsCredentials | null> {
  if (shopNumber !== "1") return null;
  const shopId = "7495609155379170274";
  try {
    const r = await query(
      `SELECT shop_id, shop_number, shop_name, access_token, refresh_token,
              shop_cipher
       FROM credentials.shop_analytics_tokens WHERE shop_id = $1`,
      [shopId]
    );
    if (r.rows.length > 0 && r.rows[0].access_token) {
      return r.rows[0] as ShopAnalyticsCredentials;
    }
  } catch {
    console.error("[shop-analytics] db lookup failed (run 025 migration?), trying env fallback");
  }
  const tok = cleanEnv(process.env.TIKTOK_SHOP1_ANALYTICS_ACCESS_TOKEN);
  if (tok) {
    return {
      shop_id: shopId,
      shop_number: 1,
      shop_name: "Him.DrSamhan",
      access_token: tok,
      refresh_token: cleanEnv(process.env.TIKTOK_SHOP1_ANALYTICS_REFRESH_TOKEN) || null,
      shop_cipher: cleanEnv(process.env.TIKTOK_SHOP1_ANALYTICS_SHOP_CIPHER) || null,
    };
  }
  return null;
}
