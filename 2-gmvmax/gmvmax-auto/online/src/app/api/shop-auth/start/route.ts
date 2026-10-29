import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { requireShopTokenAccess } from "@/lib/authz";

// GET /api/shop-auth/start?app=orders|analytics&role=seller|creator[&format=json]
// Admin-only link minting for BOTH grants (seller + creator). Same 10-minute
// HMAC state discipline for both; the link itself is the capability.
// - 302 (default): legacy same-browser flow (sets shop_auth_state cookie,
//   TikTok echoes bare `state=rand`). Seller authorizes on this browser.
// - format=json: returns { url, expiresAt } for sharing (temp /shop-auth/grant
//   page). Full `app.role.exp.rand.hmac` state travels IN the url query so the
//   approver's browser needs no cookie; /callback verifies it statelessly.
// Seller page:  https://services.tiktokshop.com/open/authorize (service_id)
// Creator page: https://shop.tiktok.com/alliance/creator/auth (app_key + state,
//   requires creator.data.live.read.public on the app — empty API list before).
// Register the matching Redirect URL in Partner Center:
//   https://marketer-hw.vercel.app/api/shop-auth/callback
// (localhost http://localhost:8082/callback stays for the shop_auth.py fallback.)
const SELLER_AUTH_PAGE = "https://services.tiktokshop.com/open/authorize";
const CREATOR_AUTH_PAGE = "https://shop.tiktok.com/alliance/creator/auth";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

function appKeys(app: string): { key: string; secret: string; envHint: string } {
  if (app === "analytics") {
    return {
      key: cleanEnv(process.env.SHOP_ANALYTICS_APP_KEY),
      secret: cleanEnv(process.env.SHOP_ANALYTICS_APP_SECRET),
      envHint: "SHOP_ANALYTICS_APP_KEY/SECRET",
    };
  }
  return {
    key: cleanEnv(process.env.SHOP_APP_KEY),
    secret: cleanEnv(process.env.SHOP_APP_SECRET),
    envHint: "SHOP_APP_KEY/SECRET",
  };
}

export async function GET(request: Request) {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const app = searchParams.get("app") === "analytics" ? "analytics" : "orders";
  const role = searchParams.get("role") === "creator" ? "creator" : "seller";
  const asJson = searchParams.get("format") === "json";
  if (role === "creator" && app !== "analytics") {
    return NextResponse.json(
      { error: "creator grants live on the analytics app only (app=analytics)" },
      { status: 400 }
    );
  }
  const { key, secret, envHint } = appKeys(app);
  if (!key || !secret) {
    return NextResponse.json(
      { error: `missing ${envHint} env (set the ${app} app's keypair first)` },
      { status: 500 }
    );
  }
  const rand = randomBytes(16).toString("hex");
  const exp = String(Date.now() + 10 * 60 * 1000);
  const hmac = createHmac("sha256", secret).update(`${app}.${role}.${exp}.${rand}`).digest("hex");
  let url: string;
  if (role === "creator") {
    // Alliance creator flow: app_key + opaque state (echoed back to callback).
    const state = `${app}.${role}.${exp}.${rand}.${hmac}`;
    url = `${CREATOR_AUTH_PAGE}?app_key=${encodeURIComponent(key)}&state=${encodeURIComponent(state)}`;
  } else {
    // service_id override: some apps only authorize by numeric app ID
    // (MARKETER HW), not the alphanumeric App Key.
    const serviceId =
      cleanEnv(app === "analytics" ? process.env.SHOP_ANALYTICS_SERVICE_ID : process.env.SHOP_SERVICE_ID) || key;
    if (asJson) {
      const state = `${app}.${role}.${exp}.${rand}.${hmac}`;
      url = `${SELLER_AUTH_PAGE}?service_id=${encodeURIComponent(serviceId)}` +
        `&state=${encodeURIComponent(state)}`;
    } else {
      url = `${SELLER_AUTH_PAGE}?service_id=${encodeURIComponent(serviceId)}` +
        `&state=${encodeURIComponent(rand)}`;
    }
  }
  if (asJson) {
    return NextResponse.json({
      role,
      app,
      url,
      expiresAt: new Date(Number(exp)).toISOString(),
      note: role === "creator"
        ? "Creator opens this on their own TikTok login; approval binds their account. Prod callback URL must be registered in Partner Center."
        : "Seller opens this (same browser recommended); grant lands in Neon.",
    });
  }
  const res = NextResponse.redirect(url);
  res.cookies.set("shop_auth_state", `${app}.${role}.${exp}.${rand}.${hmac}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
