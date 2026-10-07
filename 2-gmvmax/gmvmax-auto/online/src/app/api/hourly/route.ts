import { NextResponse } from "next/server";
import { getHourlyView } from "@/lib/hourly";
import { requireAllowlistedUser } from "@/lib/authz";

// GET /api/hourly?shopNumber=1&date=YYYY-MM-DD — reads stored hourly rows.
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  try {
    return NextResponse.json(await getHourlyView(shopNumber, date));
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly failed";
    console.error("[hourly]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
