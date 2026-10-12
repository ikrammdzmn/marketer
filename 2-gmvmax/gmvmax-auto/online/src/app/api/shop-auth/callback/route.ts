import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";
import { requireShopTokenAccess } from "@/lib/authz";

// GET /api/shop-auth/callback?code=...&state=... — TikTok redirects the
// owner's browser here after seller login. Validates the signed state
// cookie (CSRF), exchanges the code server-side, fetches the shop cipher,
// and upserts the per-app Neon token row. Returns a small HTML result page
// (lengths-only, never token material). Local shop_auth.py stays fallback.

// @ts-ignore — no bundled types, same as shop-orders.ts usage.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tiktokShop = require("tiktok-shop");

const TOKEN_URL = "https://auth.tiktok-shops.com/api/v2/token/get";
const SHOP_BASE = "https://open-api.tiktokglobalshop.com";
const SHOPS_ENDPOINT = "/authorization/202309/shops";
const SHOP1_ID = "7495609155379170274";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function appKeys(app: string): { key: string; secret: string } {
  if (app === "analytics") {
    return {
      key: cleanEnv(process.env.SHOP_ANALYTICS_APP_KEY),
      secret: cleanEnv(process.env.SHOP_ANALYTICS_APP_SECRET),
    };
  }
  return {
    key: cleanEnv(process.env.SHOP_APP_KEY),
    secret: cleanEnv(process.env.SHOP_APP_SECRET),
  };
}

function page(title: string, body: string, status = 200): NextResponse {
  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(title)}</title></head>` +
    `<body style="background:#09090b;color:#e4e4e7;font-family:system-ui,sans-serif;padding:24px">` +
    `<h2 style="font-size:15px">${esc(title)}</h2>${body}` +
    `</body></html>`;
  const res = new NextResponse(html, { status });
  res.headers.set("Content-Type", "text/html; charset=utf-8");
  // Single-use state either way.
  res.cookies.set("shop_auth_state", "", { maxAge: 0, path: "/" });
  return res;
}

export async function GET(request: Request) {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state") ?? "";
  const cookie = request.headers.get("cookie") ?? "";
  const m = /(?:^|;\s*)shop_auth_state=([^;]+)/.exec(cookie);
  if (!code || !state || !m) {
    return page("Shop auth failed", "<p>Missing code, state, or auth cookie. Start again from the authorize link (same browser, within 10 minutes).</p>", 400);
  }
  const parts = decodeURIComponent(m[1]).split(".");
  if (parts.length !== 4) {
    return page("Shop auth failed", "<p>Bad auth cookie. Start again.</p>", 400);
  }
  const [app, exp, rand, hmac] = parts;
  if (app !== "orders" && app !== "analytics") {
    return page("Shop auth failed", "<p>Unknown app in auth cookie.</p>", 400);
  }
  if (Number(exp) < Date.now()) {
    return page("Shop auth failed", "<p>Auth state expired (10 min). Start again.</p>", 400);
  }
  if (state !== rand) {
    return page("Shop auth failed", "<p>State mismatch (possible CSRF). Start again.</p>", 400);
  }
  const { key, secret } = appKeys(app);
  if (!key || !secret) {
    return page("Shop auth failed", "<p>App keypair missing server-side.</p>", 500);
  }
  const want = createHmac("sha256", secret).update(`${app}.${exp}.${rand}`).digest();
  let got: Buffer | null = null;
  try {
    got = Buffer.from(hmac, "hex");
  } catch {
    got = null;
  }
  if (!got || got.length !== want.length || !timingSafeEqual(got, want)) {
    return page("Shop auth failed", "<p> State signature invalid. Start again.</p>", 400);
  }

  // Exchange the code (single-use — validate everything storable first on
  // the analytics path so a missing 025 table never burns a fresh code).
  if (app === "analytics") {
    try {
      await query(`SELECT shop_id FROM credentials.shop_analytics_tokens LIMIT 0`);
    } catch {
      return page(
        "Shop auth blocked",
        "<p>Table <code>credentials.shop_analytics_tokens</code> is missing — run migration <code>025_shop_analytics_tokens.sql</code> (dev, then prod) before authorizing. Your code was NOT spent if you re-authorize after.</p>",
        500
      );
    }
  }
  let tok: any;
  try {
    const params = new URLSearchParams({
      app_key: key,
      app_secret: secret,
      auth_code: code,
      grant_type: "authorized_code",
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    const body = await res.json();
    if (!body || body.code !== 0) {
      return page("Shop auth failed", `<p>Exchange error: ${esc(String(body?.message ?? body?.code ?? "failed")).slice(0, 300)}</p>`, 500);
    }
    tok = body.data ?? {};
  } catch (e) {
    return page("Shop auth failed", `<p>Exchange request failed: ${esc(e instanceof Error ? e.message : "failed")}</p>`, 500);
  }
  const accessToken = String(tok.access_token ?? "");
  const refreshToken = String(tok.refresh_token ?? "") || null;
  const expiresRaw = tok.access_token_expire_in ?? tok.expires_in ?? 86400;
  if (!accessToken) {
    return page("Shop auth failed", "<p>Exchange returned no access_token.</p>", 500);
  }

  // Cipher comes from Get Authorization Shops, NOT the token response.
  let cipher = "";
  let shopId = "";
  try {
    const qp: Record<string, string> = { app_key: key };
    const urlForSign =
      `${SHOP_BASE}${SHOPS_ENDPOINT}?` +
      Object.keys(qp).sort().map((k) => `${k}=${encodeURIComponent(qp[k])}`).join("&");
    const sig = tiktokShop.signByUrl(urlForSign, secret, {});
    if (sig instanceof Error) throw new Error(`sign failed: ${sig.message}`);
    const finalParams: Record<string, string> = {
      ...qp,
      sign: String(sig.signature),
      timestamp: String(sig.timestamp),
    };
    const qs = Object.keys(finalParams)
      .sort().map((k) => `${k}=${encodeURIComponent(finalParams[k])}`).join("&");
    const res = await fetch(`${SHOP_BASE}${SHOPS_ENDPOINT}?${qs}`, {
      headers: { "x-tts-access-token": accessToken, "content-type": "application/json" },
    });
    const body = await res.json();
    const shops = body?.data?.shops ?? [];
    if (Array.isArray(shops)) {
      for (const s of shops) {
        if (s && typeof s === "object" && (String(s.id ?? "") === SHOP1_ID || !shopId)) {
          shopId = String(s.id ?? "");
          cipher = String(s.cipher ?? s.shop_cipher ?? "");
        }
      }
    }
  } catch (e) {
    console.error("[shop-auth] shops lookup failed", e instanceof Error ? e.message : "failed");
  }
  if (!shopId) shopId = SHOP1_ID;

  try {
    if (app === "analytics") {
      await query(
        `INSERT INTO credentials.shop_analytics_tokens
           (shop_id, shop_number, shop_name, access_token, refresh_token,
            shop_cipher, access_token_expire_in, updated_at)
         VALUES ($1, 1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (shop_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           shop_cipher = EXCLUDED.shop_cipher,
           access_token_expire_in = EXCLUDED.access_token_expire_in,
           updated_at = now()`,
        [shopId, "Him.DrSamhan", accessToken, refreshToken, cipher || null, Number(expiresRaw) || 86400]
      );
    } else {
      await query(
        `INSERT INTO credentials.shop_tokens
           (shop_id, shop_number, shop_name, access_token, refresh_token,
            shop_cipher, access_token_expire_in, updated_at)
         VALUES ($1, 1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (shop_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           shop_cipher = EXCLUDED.shop_cipher,
           access_token_expire_in = EXCLUDED.access_token_expire_in,
           updated_at = now()`,
        [shopId, "Him.DrSamhan", accessToken, refreshToken, cipher || null, Number(expiresRaw) || 86400]
      );
    }
  } catch (e) {
    console.error("[shop-auth] upsert failed", e instanceof Error ? e.message : "failed");
    return page("Shop auth failed", "<p>Token obtained but DB upsert failed — check the migration for this app table, then re-authorize.</p>", 500);
  }

  console.log(
    `[shop-auth] ${app} grant saved: shop len=${shopId.length}, ` +
    `token len=${accessToken.length}, refresh len=${(refreshToken ?? "").length}, cipher len=${cipher.length}`
  );
  return page(
    "Shop authorized",
    `<p>${esc(app)} grant saved: access_token len=${accessToken.length}, ` +
    `refresh len=${(refreshToken ?? "").length}, cipher len=${cipher.length}.</p>` +
    `<p>Next: ${app === "analytics"
      ? `open <a style="color:#6ee7b7" href="/shop-live">/shop-live</a> and Probe shape.`
      : `tokens refresh automatically; nothing further needed.`}</p>`
  );
}
