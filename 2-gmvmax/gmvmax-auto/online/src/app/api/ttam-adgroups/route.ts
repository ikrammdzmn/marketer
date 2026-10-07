import { NextResponse } from "next/server";
import { getTtamAdgroups } from "@/lib/ttam";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/ttam-adgroups?shopNumber=1&campaignId=...&startDate=..&endDate=..
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const campaignId = searchParams.get("campaignId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!campaignId || !startDate || !endDate) {
    return NextResponse.json({ error: "need campaignId + startDate + endDate" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getTtamAdgroups(shopNumber, campaignId, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam-adgroups failed";
    console.error("[ttam-adgroups]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
