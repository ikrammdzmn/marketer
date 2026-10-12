import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { requireShopTokenAccess } from "@/lib/authz";

// GET /api/shop-auth/start?app=orders|analytics — admin-only entry to the
// seller authorize flow. Mints a single-use signed state cookie, then 302s
// to TikTok's authorize page (owner logs in as the MY seller there).
// Register the matching Redirect URL in Partner Center:
//   https://marketer-hw.vercel.app/api/shop-auth/callback
// (localhost http://localhost:8082/callback stays for the shop_auth.py fallback.)
const AUTH_PAGE = "https://services.tiktokshop.com/open/authorize";

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
  const { key, secret, envHint } = appKeys(app);
  if (!key || !secret) {
    return NextResponse.json(
      { error: `missing ${envHint} env (set the ${app} app's keypair first)` },
      { status: 500 }
    );
  }
  // service_id override: some apps only authorize by numeric app ID
  // (MARKETER HW), not the alphanumeric App Key.
  const serviceId =
    cleanEnv(app === "analytics" ? process.env.SHOP_ANALYTICS_SERVICE_ID : process.env.SHOP_SERVICE_ID) || key;
  const rand = randomBytes(16).toString("hex");
  const exp = String(Date.now() + 10 * 60 * 1000);
  const hmac = createHmac("sha256", secret).update(`${app}.${exp}.${rand}`).digest("hex");
  const url =
    `${AUTH_PAGE}?service_id=${encodeURIComponent(serviceId)}` +
    `&state=${encodeURIComponent(rand)}`;
  const res = NextResponse.redirect(url);
  res.cookies.set("shop_auth_state", `${app}.${exp}.${rand}.${hmac}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
