import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { query } from "@/lib/db";
import { fetchGmvMaxBudgetInfo, fetchGmvIdentityMap, PROMOTION_TYPES, type PromotionType } from "@/lib/gmv";
import { requireModule } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireModule("gmv-max");
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
    // Same info response carries the TT identity — fill the 027 display name
    // alongside the budget (fail-open on pre-027 DBs).
    let resolvedApi: { display: string; user: string } | null = null;
    let resolvedBc: string | null = null;
    if (fresh.identityId && shop.storeBcId) {
      try {
        const idMap = await fetchGmvIdentityMap(creds.access_token, shop.advertiserId, shop.shopId, shop.storeBcId);
        resolvedApi = idMap?.get(fresh.identityId) ?? null;
      } catch { /* display fill stays fail-open */ }
    }
    if (fresh.identityBc) resolvedBc = fresh.identityBc;
    let saved;
    try {
      saved = await query(
        `UPDATE gmv.gmv_campaigns
         SET budget = $1, account_api = COALESCE($2, account_api), account_user = COALESCE($3, account_user), identity_id = COALESCE($4, identity_id), identity_bc = COALESCE($5, identity_bc), enrich_tried_at = now(), enrich_fail = $6, updated_at = now()
         WHERE campaign_id = $7 AND shop_id = $8 AND promotion_type = $9 AND status = 'ON'
         RETURNING campaign_id`,
        [fresh.budget, resolvedApi?.display ?? null, resolvedApi?.user ?? null, fresh.identityId, resolvedBc, resolvedApi ? null : (fresh.identityId ? "identity_unmapped" : null), campaignId, shop.shopId, promotionType]
      );
    } catch {
      try {
        saved = await query(
          `UPDATE gmv.gmv_campaigns
           SET budget = $1, account_api = COALESCE($2, account_api), account_user = COALESCE($3, account_user), identity_id = COALESCE($4, identity_id), updated_at = now()
           WHERE campaign_id = $5 AND shop_id = $6 AND promotion_type = $7 AND status = 'ON'
           RETURNING campaign_id`,
          [fresh.budget, resolvedApi?.display ?? null, resolvedApi?.user ?? null, fresh.identityId, campaignId, shop.shopId, promotionType]
        );
      } catch {
        // Pre-027 DBs lack the new columns: budget-only update.
        saved = await query(
          `UPDATE gmv.gmv_campaigns
           SET budget = $1, updated_at = now()
           WHERE campaign_id = $2 AND shop_id = $3 AND promotion_type = $4 AND status = 'ON'
           RETURNING campaign_id`,
          [fresh.budget, campaignId, shop.shopId, promotionType]
        );
      }
    }
    if (!saved.rows.length) {
      return NextResponse.json({ error: "campaign is no longer ON; refresh skipped" }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      campaignId,
      budget: fresh.budget,
      budgetMode: fresh.budgetMode,
      accountApi: resolvedApi?.display ?? null,
      accountUser: resolvedApi?.user ?? null,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Stamp the attempt so Fetch backoff (028) stops retrying it every round;
    // weekly retries still happen automatically. Best-effort (pre-028: ignore).
    try {
      await query(
        `UPDATE gmv.gmv_campaigns SET enrich_tried_at = now(), enrich_fail = COALESCE(enrich_fail, 'manual_refresh_failed'), updated_at = now() WHERE campaign_id = $1`,
        [campaignId]
      );
    } catch { /* pre-028 DB or read-only: ignore */ }
    console.error("[gmv-budget-refresh]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "TikTok budget lookup failed; retry later" }, { status: 502 });
  }
}
