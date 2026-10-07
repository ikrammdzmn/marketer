import { NextResponse } from "next/server";
import { getShopReport, PROMOTION_TYPES, type PromotionType } from "@/lib/gmv";
import { requireAllowlistedUser } from "@/lib/authz";

// Access is checked against the live Google email allowlist. Vercel protection
// remains an additional deployment-level gate until OAuth regression tests pass.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
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
    const result = await getShopReport(shopNumber, promotionType as PromotionType, startDate, endDate, true);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "report failed";
    console.error("[gmv-max]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
