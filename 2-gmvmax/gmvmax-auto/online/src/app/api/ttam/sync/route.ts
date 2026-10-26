import { NextResponse } from "next/server";
import { syncTtamDaily } from "@/lib/ttam-sync";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// POST /api/ttam/sync {shopNumber, date} — dashboard Refresh now (silent).
// Live TTAM campaign pull for one day, then returns the fresh cache summary.
export async function POST(request: Request) {
  const access = await requireModule("gmv-max");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const shopNumber = String(body.shopNumber ?? "1");
  const date = String(body.date ?? "");
  if (shopNumber !== "1") {
    return NextResponse.json({ error: "ttam sync is shop-1-only for now" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const synced = await syncTtamDaily(shopNumber, date);
    return NextResponse.json({ kind: "ttam-sync", synced });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ttam sync failed";
    console.error("[ttam-sync]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
