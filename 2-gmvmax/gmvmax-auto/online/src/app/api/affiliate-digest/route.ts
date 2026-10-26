import { NextResponse } from "next/server";
import { getAffiliateDigest } from "@/lib/affiliates";
import { requireModule } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/affiliate-digest — Affiliate Collection buckets (due today,
// overdue, due tomorrow, pending queue) or {needsConnect}.
export async function GET() {
  const access = await requireModule("dashboard");
  if (!access.ok) return access.response;
  try {
    return NextResponse.json(await getAffiliateDigest());
  } catch (e) {
    const message = e instanceof Error ? e.message : "affiliates failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
