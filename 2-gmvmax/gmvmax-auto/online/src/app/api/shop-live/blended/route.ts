import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { combineShopLiveBlended } from "@/lib/live-roi";

// GET /api/shop-live/blended?shopNumber=1&roomId=...&startSec=...[&endSec=...]&adgroupIds=a,b&feeRate=25
// Blended ROI for one Shop LIVE room: room-window GMV Max attribution plus
// manually picked TTAM adgroup spend. feeRate is percent (0-90), like /live-roi.
export async function GET(request: Request) {
  const access = await requireModule("shop-live", "live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const roomId = (searchParams.get("roomId") ?? "").trim();
  const startSec = Number(searchParams.get("startSec") ?? "");
  const endRaw = searchParams.get("endSec") ?? "";
  const endSec = endRaw === "" ? null : Number(endRaw);
  const adgroupIds = (searchParams.get("adgroupIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const feeRaw = searchParams.get("feeRate");
  const feeRate = feeRaw === null || feeRaw === "" ? undefined : Number(feeRaw) / 100;
  if (!roomId || !Number.isFinite(startSec) || startSec <= 0) {
    return NextResponse.json({ error: "need roomId + startSec (unix seconds from the selected session)" }, { status: 400 });
  }
  if (endRaw !== "" && (!Number.isFinite(endSec) || (endSec as number) < 0)) {
    return NextResponse.json({ error: "endSec must be unix seconds when present" }, { status: 400 });
  }
  if (feeRate !== undefined && (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.9)) {
    return NextResponse.json({ error: "feeRate must be 0–90 (percent)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await combineShopLiveBlended(shopNumber, roomId, startSec, endSec, adgroupIds, feeRate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "blended join failed";
    console.error("[shop-live/blended]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
