import { query } from "./db";
import { SHOPS } from "./shops";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

export interface AdsCredentials {
  advertiser_id: string;
  label: string | null;
  access_token: string;
  refresh_token: string | null;
}

export async function getAdsCredentials(
  advertiserId: string
): Promise<AdsCredentials | null> {
  try {
    const r = await query(
      `SELECT advertiser_id, label, access_token, refresh_token
       FROM credentials.refresh_ads_tokens WHERE advertiser_id = $1`,
      [advertiserId]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      if (row.access_token) return row as AdsCredentials;
    }
  } catch (e) {
    console.error("[ads-credentials] db lookup failed, trying env fallback");
  }
  // Per-advertiser env fallback (rule 8): NEVER hand another shop's token
  // over — a 40001 (wrong token) looks identical to a permission loss and
  // pages the owner nightly. Only the shop's own accessTokenEnv applies.
  const ownEnv = Object.values(SHOPS).find(
    (s) => s.advertiserId === advertiserId
  )?.accessTokenEnv;
  if (ownEnv) {
    const tok = cleanEnv(process.env[ownEnv]);
    if (tok) return { advertiser_id: advertiserId, label: null, access_token: tok, refresh_token: null };
  }
  return null;
}

// Refreshes a Marketing API token when APP_ID/SECRET + refresh_token exist,
// persists the new pair, and returns it. No-op (returns null) otherwise.
export async function refreshAdsToken(
  advertiserId: string,
  refreshToken: string
): Promise<string | null> {
  const appId = cleanEnv(process.env.TIKTOK_APP_ID);
  const appSecret = cleanEnv(process.env.TIKTOK_APP_SECRET);
  if (!appId || !appSecret || !refreshToken) return null;
  try {
    const params = new URLSearchParams({
      app_id: appId,
      secret: appSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch(
      `https://business-api.tiktok.com/open_api/oauth2/refresh_token/?${params.toString()}`
    );
    const body = await res.json();
    if (body.code !== 0 || !body.data?.access_token) {
      console.error("[ads-credentials] refresh failed code=%s", body.code);
      return null;
    }
    const accessToken: string = body.data.access_token;
    const newRefresh: string = body.data.refresh_token ?? refreshToken;
    await query(
      `UPDATE credentials.refresh_ads_tokens
       SET access_token = $1, refresh_token = $2, updated_at = now()
       WHERE advertiser_id = $3`,
      [accessToken, newRefresh, advertiserId]
    );
    return accessToken;
  } catch (e) {
    console.error("[ads-credentials] refresh error");
    return null;
  }
}
