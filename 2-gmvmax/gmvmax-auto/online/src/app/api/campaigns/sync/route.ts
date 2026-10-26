import { NextResponse } from "next/server";
import { syncShopCampaigns } from "@/lib/gmv";
import { requireModule } from "@/lib/authz";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// Manual trigger (Vercel cron calls this nightly too once wired).
// Auth: Authorization: Bearer <CRON_SECRET>. Secret stays server-side.
export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  try {
    const result = await syncShopCampaigns(shopNumber);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    console.error("[campaigns/sync]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// User-triggered name/account refresh (GMV Max board "Sync names").
// TikTok campaign renames (the [Account] bracket + campaign title) only land
// in gmv.gmv_campaigns via syncShopCampaigns — the board reads that cache,
// so without this Fetch keeps showing the old group/row labels.
// Allowlisted session auth + same-origin (same pattern as /api/gmv-max/budget).
export async function POST(request: Request) {
  const access = await requireModule("gmv-max");
  if (!access.ok) return access.response;

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "same-origin request required" }, { status: 403 });
  }

  let body: { shopNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const shopNumber = String((body.shopNumber ?? "1") || "1");
  try {
    const result = await syncShopCampaigns(shopNumber);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    console.error("[campaigns/sync POST]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
