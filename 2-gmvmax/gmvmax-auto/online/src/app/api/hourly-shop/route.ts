import { NextResponse } from "next/server";
import { getHourlyShopView } from "@/lib/hourly-shop";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/hourly-shop?shopNumber=1&date=YYYY-MM-DD — cached shop GMV by hour
// + ads spend by hour (TRUE ROAS recomputed). Refresh via POST /refresh.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    searchParams.get("endDate") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const startDate = searchParams.get("startDate") ?? date;
  const endDate = searchParams.get("endDate") ?? date;
  try {
    return NextResponse.json(await getHourlyShopView(shopNumber, date, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly shop failed";
    console.error("[hourly-shop]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
