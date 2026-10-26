import { NextResponse } from "next/server";
import { syncTtamDaily } from "@/lib/ttam-sync";
import { alertCronFailure } from "@/lib/cron-alert";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// GET /api/cron/ttam-sync?shopNumber=1&date=YYYY-MM-DD
// TTAM campaign-grain cache writer (shop 1 only, day grain refreshed hourly).
// Meant for an external hourly pinger (Hobby-safe). Same CRON_SECRET guard.
export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  try {
    return NextResponse.json({ ok: true, ...(await syncTtamDaily(shopNumber, date)) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam sync failed";
    console.error("[ttam-sync]", message);
    await alertCronFailure("ttam-sync", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
