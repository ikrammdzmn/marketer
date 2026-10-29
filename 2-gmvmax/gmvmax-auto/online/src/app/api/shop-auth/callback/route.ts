import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";
import { requireShopTokenAccess } from "@/lib/authz";

// GET /api/shop-auth/callback?code=...&state=... — TikTok redirects the
// owner's browser here after seller login. Validates the signed state
// cookie (CSRF), exchanges the code server-side, fetches the shop cipher,
// and upserts the per-app Neon token row. Returns a small HTML result page
// (lengths-only, never token material). Local shop_auth.py stays fallback.
//
// Creator branch (?role=creator minted links): the approver is the CREATOR on
// their own browser (no admin session possible), so the session gate is
// skipped and the full `app.role.exp.rand.hmac` state travels in the QUERY
// (verified by HMAC + 10-min expiry). TikTok codes are single-use, so a
// replayed link dies at the exchange step. Exchange shape is tolerant —
// the first live creator grant confirms the identity fields.
// Prod landing (register in Partner Center, keep localhost too):
//   https://marketer-hw.vercel.app/api/shop-auth/callback

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

function hmacOk(secret: string, app: string, role: string, exp: string, rand: string, hmac: string): boolean {
  const want = createHmac("sha256", secret).update(`${app}.${role}.${exp}.${rand}`).digest();
  let got: Buffer | null = null;
  try {
    got = Buffer.from(hmac, "hex");
  } catch {
    got = null;
  }
  return !!got && got.length === want.length && timingSafeEqual(got, want);
}

// State sources (newest first):
// 1. query `state` = app.role.exp.rand.hmac (shareable minted links, both roles)
// 2. cookie 5-part (same-browser 302 flow, both roles)
// 3. cookie 4-part legacy (seller only, pre-role format)
function parseState(cookie: string, qs: string):
  | { app: string; role: string; exp: string; rand: string; hmac: string }
  | null {
  const fromQuery = (qs.match(/^[A-Za-z0-9_-]+\.[a-z]+\.\d+\.[0-9a-f]+\.[0-9a-f]+$/) ? qs : "").split(".");
  if (fromQuery.length === 5) {
    return { app: fromQuery[0], role: fromQuery[1], exp: fromQuery[2], rand: fromQuery[3], hmac: fromQuery[4] };
  }
  const m = /(?:^|;\s*)shop_auth_state=([^;]+)/.exec(cookie);
  if (m) {
    const parts = decodeURIComponent(m[1]).split(".");
    if (parts.length === 5) {
      return { app: parts[0], role: parts[1], exp: parts[2], rand: parts[3], hmac: parts[4] };
    }
    if (parts.length === 4) {
      // Legacy: no role segment — always the seller flow.
      return { app: parts[0], role: "seller", exp: parts[1], rand: parts[2], hmac: parts[3] };
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const qsState = searchParams.get("state") ?? "";
  const st = parseState(request.headers.get("cookie") ?? "", qsState);
  if (!code || !st) {
    return page("Shop auth failed", "<p>Missing code or auth state. Start again from the authorize link (same browser for seller, any browser for a minted creator link, within 10 minutes).</p>", 400);
  }
  const { app, role, exp, rand, hmac } = st;
  if ((app !== "orders" && app !== "analytics") || (role !== "seller" && role !== "creator")) {
    return page("Shop auth failed", "<p>Unknown app or role in auth state.</p>", 400);
  }
  if (Number(exp) < Date.now()) {
    return page("Shop auth failed", "<p>Auth state expired (10 min). Generate a fresh link.</p>", 400);
  }
  const { key, secret } = appKeys(app);
  if (!key || !secret) {
    return page("Shop auth failed", "<p>App keypair missing server-side.</p>", 500);
  }
  if (!hmacOk(secret, app, role, exp, rand, hmac)) {
    return page("Shop auth failed", "<p>State signature invalid. Generate a fresh link.</p>", 400);
  }
  if (role === "creator" && qsState && qsState !== rand) {
    // Shareable-link flow needs no further check (HMAC already verified);
    // fall through to the session-free exchange below.
  } else if (role === "creator" && !qsState) {
    return page("Shop auth failed", "<p>Creator flow needs the minted link state. Generate a fresh link.</p>", 400);
  }
  if (role === "seller") {
    // Minted-link flow (full state in query): the admin-minted HMAC link IS
    // the capability (10-min expiry, single-use TikTok code), so the seller
    // may approve on any device with no Marketer session. Legacy cookie-only
    // flow keeps the admin-session binding (CSRF).
    const queryMinted =
      qsState === `${app}.${role}.${exp}.${rand}.${hmac}`;
    if (!queryMinted) {
      if (qsState && qsState !== rand) {
        return page("Shop auth failed", "<p>State mismatch (possible CSRF). Start again.</p>", 400);
      }
      const access = await requireShopTokenAccess();
      if (!access.ok) return access.response;
    }
  }

  // Exchange the code (single-use — validate everything storable first so
  // a missing table never burns a fresh code on a known-missing migration).
  if (app === "analytics" && role === "seller") {
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
  if (role === "creator") {
    try {
      await query(`SELECT shop_id FROM credentials.shop_creator_tokens LIMIT 0`);
    } catch {
      return page(
        "Shop auth blocked",
        "<p>Table <code>credentials.shop_creator_tokens</code> is missing — run migration <code>036_shop_creator_tokens.sql</code> (dev, then prod) before authorizing. Your code was NOT spent if you re-authorize after.</p>",
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

  if (role === "creator") {
    // Creator grant: identity comes from the exchange, NOT the shop list.
    // Known shape (Oct-2026 live grant): open_id + empty seller_name, NO
    // username anywhere — rows show "@?" until TikTok adds a name field.
    // granted_scopes + user_type ARE present: store them as the proof of
    // what each grant unlocks.
    const str = (v: unknown) => String(v ?? "");
    const creatorOpenId = str(
      tok.open_id ?? tok.creator_open_id ?? tok.creator_id ?? tok.user_id ?? tok.author_id ?? ""
    );
    const creatorUser = str(
      tok.user_name ?? tok.creator_user_name ?? tok.username ?? tok.nick_name ?? ""
    ) || null;
    const creatorName = str(
      tok.seller_name ?? tok.creator_name ?? tok.display_name ?? ""
    ) || null;
    const grantedScopes = Array.isArray(tok.granted_scopes)
      ? tok.granted_scopes.map((s: unknown) => String(s)).join(",")
      : str(tok.granted_scopes ?? tok.scopes ?? "");
    const userType = str(tok.user_type ?? "");
    if (!creatorOpenId) {
      console.log(`[shop-auth] creator exchange keys: ${Object.keys(tok).join(",")}`);
      return page(
        "Shop auth needs mapping",
        `<p>Exchange ok (access_token len=${accessToken.length}) but no creator identity found. ` +
        `Response keys: <code>${esc(Object.keys(tok).join(", ")).slice(0, 300)}</code>. ` +
        `Send these key names (not values) to the developer, then re-grant — codes are single-use.</p>`,
        500
      );
    }
    try {
      await query(
        `INSERT INTO credentials.shop_creator_tokens
           (shop_id, creator_open_id, creator_user, creator_name, access_token,
            refresh_token, access_token_expire_in, refresh_token_expire_in, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (shop_id, creator_open_id) DO UPDATE SET
           creator_user = COALESCE(NULLIF(EXCLUDED.creator_user, ''), credentials.shop_creator_tokens.creator_user),
           creator_name = COALESCE(NULLIF(EXCLUDED.creator_name, ''), credentials.shop_creator_tokens.creator_name),
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           access_token_expire_in = EXCLUDED.access_token_expire_in,
           refresh_token_expire_in = EXCLUDED.refresh_token_expire_in,
           updated_at = now()`,
        [
          SHOP1_ID, creatorOpenId, creatorUser, creatorName, accessToken, refreshToken,
          Number(expiresRaw) || 86400, Number(tok.refresh_token_expire_in ?? tok.refresh_expires_in ?? 0) || null,
        ]
      );
      // 037 columns (fail-open pre-037: table exists, columns may not).
      try {
        await query(
          `UPDATE credentials.shop_creator_tokens
           SET granted_scopes = $3, user_type = $4, updated_at = now()
           WHERE shop_id = $1 AND creator_open_id = $2`,
          [SHOP1_ID, creatorOpenId, grantedScopes.slice(0, 500), userType.slice(0, 50)]
        );
      } catch {
        console.error("[shop-auth] creator scopes update skipped (run 037?)");
      }
    } catch (e) {
      console.error("[shop-auth] creator upsert failed", e instanceof Error ? e.message : "failed");
      return page("Shop auth failed", "<p>Token obtained but DB upsert failed — check the 036 migration, then re-authorize.</p>", 500);
    }
    console.log(
      `[shop-auth] creator grant saved: open_id len=${creatorOpenId.length}, ` +
      `token len=${accessToken.length}, refresh len=${(refreshToken ?? "").length}`
    );
    return page(
      "Creator authorized",
      `<p>creator grant saved: access_token len=${accessToken.length}, ` +
      `refresh len=${(refreshToken ?? "").length}.</p>` +
      `<p>Top-level exchange fields (names only): <code>${esc(Object.keys(tok).join(", ")).slice(0, 300)}</code>. ` +
      `If the username above shows "?", send these names to the developer for mapping.</p>` +
      `<p>Next: test one of their AFFILIATE rooms via the Live Room APIs.</p>`
    );
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
