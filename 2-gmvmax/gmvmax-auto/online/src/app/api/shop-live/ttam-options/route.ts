import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { listLiveRoiTtamOptions } from "@/lib/live-roi";

// GET /api/shop-live/ttam-options?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// TTAM feeder candidates for the selected Shop LIVE room window. Same leg as
// /live-roi/ttam-options; the picker stays manual (suggest, never auto-add).
export async function GET(request: Request) {
  const access = await requireModule("shop-live", "live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD, from the ads panel)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await listLiveRoiTtamOptions(shopNumber, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam options failed";
    console.error("[shop-live/ttam-options]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
