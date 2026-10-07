import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { query } from "@/lib/db";
import { fetchGmvMaxBudgetInfo, PROMOTION_TYPES, type PromotionType } from "@/lib/gmv";
import { requireAllowlistedUser } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "same-origin request required" }, { status: 403 });
  }

  let body: { shopNumber?: unknown; campaignId?: unknown; promotionType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const shopNumber = String(body.shopNumber ?? "");
  const campaignId = String(body.campaignId ?? "");
  const promotionType = String(body.promotionType ?? "") as PromotionType;
  const shop = SHOPS[shopNumber];
  if (!shop || !shop.hasGMVCampaigns || !PROMOTION_TYPES.includes(promotionType) || !/^\d{5,32}$/.test(campaignId)) {
    return NextResponse.json({ error: "invalid shop or GMV Max campaign" }, { status: 400 });
  }

  try {
    const existing = await query(
      `SELECT status FROM gmv.gmv_campaigns
       WHERE campaign_id = $1 AND shop_id = $2 AND promotion_type = $3 LIMIT 1`,
      [campaignId, shop.shopId, promotionType]
    );
    if (!existing.rows.length) {
      return NextResponse.json({ error: "campaign not found for this shop/type" }, { status: 404 });
    }
    if (existing.rows[0].status !== "ON") {
      return NextResponse.json({ error: "budget refresh is only available for ON campaigns" }, { status: 409 });
    }

    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });
    const fresh = await fetchGmvMaxBudgetInfo(creds.access_token, shop.advertiserId, campaignId);
    const saved = await query(
      `UPDATE gmv.gmv_campaigns
       SET budget = $1, updated_at = now()
       WHERE campaign_id = $2 AND shop_id = $3 AND promotion_type = $4 AND status = 'ON'
       RETURNING campaign_id`,
      [fresh.budget, campaignId, shop.shopId, promotionType]
    );
    if (!saved.rows.length) {
      return NextResponse.json({ error: "campaign is no longer ON; refresh skipped" }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      campaignId,
      budget: fresh.budget,
      budgetMode: fresh.budgetMode,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[gmv-budget-refresh]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "TikTok budget lookup failed; retry later" }, { status: 502 });
  }
}
