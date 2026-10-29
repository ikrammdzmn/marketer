import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { fetchLiveRoomBundleAsCreator } from "@/lib/shop-live";

// GET /api/shop-live/room-detail?shopNumber=1&roomId=...&creatorUser=...
// AFFILIATE room detail via the labeled creator grant (Live Data v202502:
// core + traffic sources + GMV trend + products). Module-gated like the
// other shop-live reads; grant lookup is by admin-set username label
// (open_ids differ across TikTok surfaces for the same human).
export async function GET(request: Request) {
  const access = await requireModule("shop-live");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const roomId = (searchParams.get("roomId") ?? "").trim();
  const creatorUser = (searchParams.get("creatorUser") ?? "").trim();
  if (shopNumber !== "1" || !roomId || !creatorUser) {
    return NextResponse.json(
      { error: "need roomId + creatorUser (affiliate row creator.user_name)" },
      { status: 400 }
    );
  }
  try {
    const out = await fetchLiveRoomBundleAsCreator(creatorUser, roomId);
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "room detail failed";
    console.error("[shop-live/room-detail]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
