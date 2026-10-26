import { NextResponse } from "next/server";
import { combineLiveRoi } from "@/lib/live-roi";
import { requireModule } from "@/lib/authz";

// GET /api/live-roi/combine?shopNumber=1&campaignId=..&roomId=..&startDate=..&endDate=..&adgroupIds=a,b
// Blended math: session GMV / (GMV Max session cost + picked TTAM spend).
export async function GET(request: Request) {
  const access = await requireModule("live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const campaignId = searchParams.get("campaignId") ?? "";
  const roomId = searchParams.get("roomId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const adgroupIds = (searchParams.get("adgroupIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const feeRaw = searchParams.get("feeRate");
  const feeRate = feeRaw === null || feeRaw === "" ? undefined : Number(feeRaw) / 100;
  if (feeRate !== undefined && (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 90)) {
    return NextResponse.json({ error: "feeRate must be 0–90 (percent)" }, { status: 400 });
  }
  if (!campaignId || !roomId || !startDate || !endDate) {
    return NextResponse.json({ error: "need campaignId + roomId + startDate + endDate" }, { status: 400 });
  }
  try {
    return NextResponse.json(await combineLiveRoi(shopNumber, campaignId, roomId, startDate, endDate, adgroupIds, feeRate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "live-roi combine failed";
    console.error("[live-roi/combine]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
