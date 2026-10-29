import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { fetchShopLiveSessions } from "@/lib/shop-live";

// GET /api/shop-live/sessions?shopNumber=1&startDateGe=YYYY-MM-DD&endDateLt=YYYY-MM-DD&accountType=MARKETING
// Room picker source for /shop-live. Read-only, paginated (≤5 pages).
// accountType values verified in the Testing Tool: MARKETING (detail
// readable) and AFFILIATE_ACCOUNTS (metadata only — minute detail answers
// 28001022 for those rooms by TikTok design).
// &raw=1: returns the first page of UNFILTERED TikTok rows (debug only —
// reveals fields the picker drops, e.g. a room id distinct from session id).
export async function GET(request: Request) {
  const access = await requireModule("shop-live");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const startDateGe = searchParams.get("startDateGe") ?? "";
  const endDateLt = searchParams.get("endDateLt") ?? "";
  const accountType = searchParams.get("accountType") ?? "MARKETING_ACCOUNTS";
  const currency = (searchParams.get("currency") ?? "LOCAL").toUpperCase();
  if (!startDateGe || !endDateLt) {
    return NextResponse.json(
      { error: "need startDateGe + endDateLt (YYYY-MM-DD, end exclusive)" },
      { status: 400 }
    );
  }
  try {
    const out = await fetchShopLiveSessions(shopNumber, startDateGe, endDateLt, accountType, 5, currency);
    const find = (searchParams.get("find") ?? "").trim();
    if (find) {
      const { findShopLiveSessionRaw } = await import("@/lib/shop-live");
      const hit = await findShopLiveSessionRaw(shopNumber, startDateGe, endDateLt, accountType, find, currency);
      return NextResponse.json(hit);
    }
    if (searchParams.get("scan") === "creators") {
      const { scanAffiliateCreators } = await import("@/lib/shop-live");
      const creators = await scanAffiliateCreators(shopNumber, startDateGe, endDateLt, accountType, currency);
      return NextResponse.json({ creators });
    }
    if (searchParams.get("raw") === "1") {
      const { fetchShopLiveSessionsRaw } = await import("@/lib/shop-live");
      const raw = await fetchShopLiveSessionsRaw(shopNumber, startDateGe, endDateLt, accountType, currency);
      return NextResponse.json(raw);
    }
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "shop-live sessions failed";
    console.error("[shop-live/sessions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
