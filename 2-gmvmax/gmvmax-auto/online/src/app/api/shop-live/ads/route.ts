import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { getRoomAdsAttribution } from "@/lib/gmv";

// GET /api/shop-live/ads?shopNumber=1&roomId=...&startSec=...[&endSec=...]
// Room-level GMV Max cost join for one Shop LIVE room. Dates come from the
// selected session's unix start/end (seconds, GMT); the server converts them
// to MYT report days. Missing/future endSec means live now (partial cost).
export async function GET(request: Request) {
  const access = await requireModule("shop-live", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const roomId = (searchParams.get("roomId") ?? "").trim();
  const startSec = Number(searchParams.get("startSec") ?? "");
  const endRaw = searchParams.get("endSec") ?? "";
  const endSec = endRaw === "" ? null : Number(endRaw);
  if (!roomId || !Number.isFinite(startSec) || startSec <= 0) {
    return NextResponse.json(
      { error: "need roomId + startSec (unix seconds from the selected session)" },
      { status: 400 }
    );
  }
  if (endRaw !== "" && (!Number.isFinite(endSec) || (endSec as number) < 0)) {
    return NextResponse.json({ error: "endSec must be unix seconds when present" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getRoomAdsAttribution(shopNumber, roomId, startSec, endSec));
  } catch (e) {
    const message = e instanceof Error ? e.message : "room ads join failed";
    console.error("[shop-live/ads]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
