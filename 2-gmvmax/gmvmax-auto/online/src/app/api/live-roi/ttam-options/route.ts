import { NextResponse } from "next/server";
import { listLiveRoiTtamOptions } from "@/lib/live-roi";
import { requireModule } from "@/lib/authz";

// GET /api/live-roi/ttam-options?shopNumber=1&startDate=..&endDate=..
// All TTAM adgroups with window spend + identity passthrough for manual linking.
export async function GET(request: Request) {
  const access = await requireModule("live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await listLiveRoiTtamOptions(shopNumber, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "live-roi ttam-options failed";
    console.error("[live-roi/ttam-options]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
