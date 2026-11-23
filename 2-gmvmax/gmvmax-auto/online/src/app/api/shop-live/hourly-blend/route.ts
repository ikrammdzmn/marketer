import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { getRoomHourAttribution } from "@/lib/live-roi";

// GET /api/shop-live/hourly-blend?shopNumber=1&roomId=..&date=YYYY-MM-DD&fromHour=9&toHour=11&campaignIds=a,b&adgroupIds=c,d&feeRate=25
// Hour-range blend for one Shop LIVE room on one MYT date. Hours are whole
// hours, [fromHour, toHour). feeRate is percent (0-90), like /live-roi.
export async function GET(request: Request) {
  const access = await requireModule("shop-live", "live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const roomId = (searchParams.get("roomId") ?? "").trim();
  const date = (searchParams.get("date") ?? "").trim();
  const fromHour = Number(searchParams.get("fromHour") ?? "");
  const toHour = Number(searchParams.get("toHour") ?? "");
  const campaignIds = (searchParams.get("campaignIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const adgroupIds = (searchParams.get("adgroupIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const feeRaw = searchParams.get("feeRate");
  const feeRate = feeRaw === null || feeRaw === "" ? undefined : Number(feeRaw) / 100;
  if (!roomId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need roomId + date=YYYY-MM-DD" }, { status: 400 });
  }
  if (!Number.isInteger(fromHour) || !Number.isInteger(toHour)) {
    return NextResponse.json({ error: "need fromHour + toHour (whole hours)" }, { status: 400 });
  }
  if (feeRate !== undefined && (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.9)) {
    return NextResponse.json({ error: "feeRate must be 0–90 (percent)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getRoomHourAttribution(shopNumber, roomId, date, fromHour, toHour, campaignIds, adgroupIds, feeRate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly blend failed";
    console.error("[shop-live/hourly-blend]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
