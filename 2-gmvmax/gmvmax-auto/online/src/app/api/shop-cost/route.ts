import { NextResponse } from "next/server";
import { getShopCost } from "@/lib/shop-cost";
import { requireModule } from "@/lib/authz";

// GET /api/shop-cost?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Spend share per stream (LIVE / Product / TTAM), ads spend only. v1: shop 1.
export async function GET(request: Request) {
  const access = await requireModule("shop-cost");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getShopCost(shopNumber, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-cost failed";
    console.error("[shop-cost]", message);
    const status = /shop 1 only|range must be|need startDate/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
