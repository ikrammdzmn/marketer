import { query } from "./db";
import { refreshShopToken, shopTokenExpiryMs } from "./shop-credentials";

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
// Auto-refreshes when past expiry-1h (mirrors shop-credentials.ts —
// the missing half that caused 105002 once the 7-day token died).
export async function getShopAnalyticsCredentials(
  shopNumber: string
): Promise<ShopAnalyticsCredentials | null> {
  if (shopNumber !== "1") return null;
  const shopId = "7495609155379170274";
  try {
    const r = await query(
      `SELECT shop_id, shop_number, shop_name, access_token, refresh_token,
              shop_cipher, access_token_expire_in, updated_at
       FROM credentials.shop_analytics_tokens WHERE shop_id = $1`,
      [shopId]
    );
    if (r.rows.length > 0 && r.rows[0].access_token) {
      const row = r.rows[0];
      const ana = getAnalyticsAppKeys();
      let needsRefresh = false;
      if (row.updated_at && ana.key && ana.secret) {
        const expiry = shopTokenExpiryMs(row.updated_at, row.access_token_expire_in ?? 86400);
        if (expiry !== null && Date.now() >= expiry - 3600_000) needsRefresh = true;
      }
      if (needsRefresh && row.refresh_token) {
        const fresh = await refreshShopToken(ana.key, ana.secret, row.refresh_token);
        if (fresh?.access_token) {
          await query(
            `UPDATE credentials.shop_analytics_tokens
             SET access_token = $1, refresh_token = $2,
                 access_token_expire_in = $3, updated_at = now()
             WHERE shop_id = $4`,
            [fresh.access_token, fresh.refresh_token ?? row.refresh_token, fresh.expires_in ?? 86400, shopId]
          );
          row.access_token = fresh.access_token;
          row.refresh_token = fresh.refresh_token ?? row.refresh_token;
        }
      }
      return row as ShopAnalyticsCredentials;
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
