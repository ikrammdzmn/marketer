import { NextResponse } from "next/server";
import { getTtamAds } from "@/lib/ttam";

// GET /api/ttam-ads?shopNumber=1&adgroupId=...&startDate=..&endDate=..
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const adgroupId = searchParams.get("adgroupId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!adgroupId || !startDate || !endDate) {
    return NextResponse.json({ error: "need adgroupId + startDate + endDate" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getTtamAds(shopNumber, adgroupId, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam-ads failed";
    console.error("[ttam-ads]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
