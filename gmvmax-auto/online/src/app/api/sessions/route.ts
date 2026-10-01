import { NextResponse } from "next/server";
import { getCampaignSessions } from "@/lib/gmv";

// GET /api/sessions?shopNumber=1&campaignId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// On-demand live sessions drill (single campaign only).
// Auth: Vercel Authentication (project login) is the gate for reads.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const campaignId = searchParams.get("campaignId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!campaignId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "need campaignId + startDate + endDate (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json(await getCampaignSessions(shopNumber, campaignId, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "sessions failed";
    console.error("[sessions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
