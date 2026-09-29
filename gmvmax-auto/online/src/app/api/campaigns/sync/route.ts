import { NextResponse } from "next/server";
import { syncShopCampaigns } from "@/lib/gmv";

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
