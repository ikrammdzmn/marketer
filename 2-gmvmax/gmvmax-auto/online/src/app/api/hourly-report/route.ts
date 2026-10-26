import { NextResponse } from "next/server";
import { getHourlyReport } from "@/lib/hourly-report";
import { requireModule } from "@/lib/authz";

// GET /api/hourly-report?shopNumber=1&promotion_type=LIVE_GMV_MAX|PRODUCT_GMV_MAX&startDate=&endDate=[&accountSource=]
// DB-first GMV Max report (Stage 6): aggregates the hourly cache, zero TikTok
// calls. Same shape as /api/gmv-max plus cached/partial/pulledAt flags.
// Signed-in users only; the Fetch button keeps hitting the live endpoint.
export async function GET(request: Request) {
  const access = await requireModule("gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const promotionType = searchParams.get("promotion_type") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const accountSource = searchParams.get("accountSource") === "api" ? "api" : "bracket";
  if (promotionType !== "LIVE_GMV_MAX" && promotionType !== "PRODUCT_GMV_MAX") {
    return NextResponse.json(
      { error: "need promotion_type=LIVE_GMV_MAX|PRODUCT_GMV_MAX" },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getHourlyReport(shopNumber, promotionType, startDate, endDate, accountSource));
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly report failed";
    console.error("[hourly-report]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
