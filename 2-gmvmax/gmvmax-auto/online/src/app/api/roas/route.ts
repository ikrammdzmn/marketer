import { NextResponse } from "next/server";
import { getShopROAS } from "@/lib/gmv";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/roas?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Access is checked against the live Google email allowlist.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
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
