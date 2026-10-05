import { NextResponse } from "next/server";
import { getShopReport, PROMOTION_TYPES, type PromotionType } from "@/lib/gmv";

// Auth: Vercel Authentication (project login) is the gate for reads.
// Bearer <CRON_SECRET> also accepted for terminal checks.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const promotionType = searchParams.get("promotion_type") ?? "LIVE_GMV_MAX";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!PROMOTION_TYPES.includes(promotionType as PromotionType) || !startDate || !endDate) {
    return NextResponse.json(
      { error: "need promotion_type=LIVE_GMV_MAX|PRODUCT_GMV_MAX + startDate + endDate (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  try {
    const result = await getShopReport(shopNumber, promotionType as PromotionType, startDate, endDate);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "report failed";
    console.error("[gmv-max]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
