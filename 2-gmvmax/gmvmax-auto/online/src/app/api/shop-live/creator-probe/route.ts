import { NextResponse } from "next/server";
import { requireShopTokenAccess } from "@/lib/authz";
import {
  fetchLiveRoomAsCreator,
  LIVE_ROOM_ENDPOINTS,
} from "@/lib/shop-live";

// GET /api/shop-live/creator-probe?creatorOpenId=...&roomId=...[&endpoint=...]
// Admin-only temp probe: calls the 202309 live_rooms family with the CREATOR
// token (Live Data scope) on an AFFILIATE room. The seller token 28001022-denies
// these rooms by design; this decides whether the creator grant unlocks them.
// Default tries core_stats + traffic/gmv/product in one round trip; each
// attempt reports code + request_id verbatim for scope mapping.
// &endpoint=<one> narrows to a single endpoint.
export async function GET(request: Request) {
  const access = await requireShopTokenAccess();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const creatorOpenId = (searchParams.get("creatorOpenId") ?? "").trim();
  const roomId = (searchParams.get("roomId") ?? "").trim();
  const only = (searchParams.get("endpoint") ?? "").trim();
  const withCipher = searchParams.get("cipher") === "1";
  if (!creatorOpenId || !roomId) {
    return NextResponse.json(
      { error: "need creatorOpenId (see /shop-auth/grant status) + roomId (affiliate live_id from the AFFILIATE list)" },
      { status: 400 }
    );
  }
  const endpoints = only
    ? [only]
    : [...LIVE_ROOM_ENDPOINTS];
  const attempts: Array<{
    endpoint: string;
    ok: boolean;
    code?: string;
    statKeys?: string[];
    stats?: any;
  }> = [];
  for (const ep of endpoints) {
    try {
      const out = await fetchLiveRoomAsCreator(creatorOpenId, roomId, ep, { withCipher });
      const keys = out.data && typeof out.data === "object" ? Object.keys(out.data) : [];
      attempts.push({ endpoint: ep + (withCipher ? "+cipher" : ""), ok: true, statKeys: keys, stats: out.data });
    } catch (e) {
      attempts.push({ endpoint: ep + (withCipher ? "+cipher" : ""), ok: false, code: e instanceof Error ? e.message : "failed" });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return NextResponse.json({ roomId, attempts });
}
