import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser } from "@/lib/authz";
import { listProductCampaigns, syncCreativeDay, eachDay } from "@/lib/creative";

export const dynamic = "force-dynamic";

// GET /api/creative-sync?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Reads cached creative.daily_rows (instant).
export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  if (searchParams.get("list") === "campaigns") {
    try {
      const r = await query(
        `SELECT g.campaign_id, g.name, c.label AS catalog_label
         FROM gmv.gmv_campaigns g LEFT JOIN creative.catalog_campaigns c
         ON c.campaign_id = g.campaign_id
         WHERE g.promotion_type = 'PRODUCT_GMV_MAX' ORDER BY g.campaign_id`
      );
      return NextResponse.json({ campaigns: r.rows });
    } catch (e) {
      return NextResponse.json({ error: "campaign cache not synced yet — Fetch dashboard data once" }, { status: 503 });
    }
  }
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? startDate;
  const campaignId = searchParams.get("campaignId") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "need startDate/endDate YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const args: any[] = [startDate, endDate];
    let filter = "";
    if (/^\d{5,32}$/.test(campaignId)) {
      filter = "AND campaign_id = $3";
      args.push(campaignId);
    }
    const r = await query(
      `SELECT date, campaign_id, item_group_id, item_id, title, tt_account, content_type, status,
              cost, orders, gmv, roi, cpo, impressions, clicks, click_rate, conv_rate,
              v2s, v6s, vp25, vp50, vp75, vp100, synced_at
       FROM creative.daily_rows WHERE date >= $1 AND date <= $2 ${filter}
       ORDER BY date DESC, gmv DESC LIMIT 2000`,
      args
    );
    return NextResponse.json({ rows: r.rows });
  } catch (e) {
    return NextResponse.json({ error: "018_creative_daily.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-sync {shopNumber, startDate, endDate} (<=7d, per-day fail-open)
export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want || request.headers.get("authorization") !== `Bearer ${want}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const shopNumber = String(body.shopNumber ?? "1");
    const days = eachDay(String(body.startDate ?? ""), String(body.endDate ?? ""));
    if (days.length === 0 || days.length > 7) {
      return NextResponse.json({ error: "range must be 1–7 days" }, { status: 400 });
    }
    const { ids, accessToken, shop } = await listProductCampaigns(shopNumber);
    const only = String(body.campaignId ?? "");
    const targets = /^\d{5,32}$/.test(only) ? ids.filter((id) => id === only) : ids;
    if (targets.length === 0) {
      return NextResponse.json({ error: "campaign not in PRODUCT cache" }, { status: 400 });
    }
    let rows = 0;
    const skipped: Record<string, string> = {};
    for (const date of days) {
      for (const id of targets) {
        try {
          const r = await syncCreativeDay(accessToken, shop, id, date);
          rows += r.rows;
          if (r.skipped) skipped[`${date}/${id.slice(-4)}`] = r.skipped;
        } catch (e) {
          skipped[`${date}/${id.slice(-4)}`] = e instanceof Error ? e.message.slice(0, 80) : "failed";
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return NextResponse.json({ ok: true, campaigns: targets.length, days: days.length, rows, skipped });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
