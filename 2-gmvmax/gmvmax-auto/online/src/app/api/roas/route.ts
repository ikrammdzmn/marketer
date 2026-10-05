import { NextResponse } from "next/server";
import { getShopROAS } from "@/lib/gmv";

// GET /api/roas?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Auth: Vercel Authentication (project login) is the gate for reads.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "need startDate + endDate (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getShopROAS(shopNumber, startDate, endDate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "roas failed";
    console.error("[roas]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
