import { NextResponse } from "next/server";
import { getHourlyShopView, refreshShopHourly } from "@/lib/hourly-shop";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// POST /api/hourly-shop/refresh {shopNumber, date} — day-pull orders/search,
// bucket by MYT hour into the 015 cache, then return the fresh view.
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const shopNumber = String(body.shopNumber ?? "1");
  const date = String(body.date ?? "");
  if (shopNumber !== "1") {
    return NextResponse.json({ error: "hourly shop is shop-1-only for now" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const refreshed = await refreshShopHourly(shopNumber, date);
    const view = await getHourlyShopView(shopNumber, date);
    return NextResponse.json({ ...view, refreshed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly shop refresh failed";
    console.error("[hourly-shop-refresh]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
