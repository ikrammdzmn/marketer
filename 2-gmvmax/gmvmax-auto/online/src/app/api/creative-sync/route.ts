import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireModule } from "@/lib/authz";
import { listProductCampaigns, syncCreativeDay, eachDay, enrichItemMeta } from "@/lib/creative";

export const dynamic = "force-dynamic";

async function hasItemMeta(): Promise<boolean> {
  try {
    await query("SELECT creative.item_meta.item_id FROM creative.item_meta LIMIT 0");
    return true;
  } catch {
    return false;
  }
}

// GET /api/creative-sync?shopNumber=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Reads cached creative.daily_rows (instant).
export async function GET(request: Request) {
  const access = await requireModule("creative");
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
  const status = searchParams.get("status") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "need startDate/endDate YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const hasMeta = await hasItemMeta();
    const args: any[] = [startDate, endDate];
    let filter = "";
    if (/^\d{5,32}$/.test(campaignId)) {
      filter = "AND campaign_id = $3";
      args.push(campaignId);
    }
    // Shared totals filter (campaign + optional status), also used by
    // ?totalsOnly=1 (lightweight aggregates, no rows — for vs-previous).
    const tArgs: any[] = [startDate, endDate];
    let tFilter = "";
    if (/^\d{5,32}$/.test(campaignId)) {
      tFilter = "AND campaign_id = $3";
      tArgs.push(campaignId);
    }
    if (status && status !== "ALL" && /^[A-Za-z0-9 _-]{1,32}$/.test(status)) {
      tFilter += ` AND status = $${tArgs.length + 1}`;
      tArgs.push(status);
    }
    const totalsQuery = `SELECT SUM(cost)::float AS cost, SUM(gmv)::float AS gmv,
              SUM(orders)::float AS orders, SUM(impressions)::float AS imp,
              COUNT(*)::int AS n
       FROM creative.daily_rows WHERE date >= $1 AND date <= $2 ${tFilter}`;
    if (searchParams.get("totalsOnly") === "1") {
      const t = await query(totalsQuery, tArgs);
      return NextResponse.json({ totals: t.rows[0] ?? null });
    }
    const r = await query(
      hasMeta
        ? `SELECT d.date, d.campaign_id, d.item_group_id, d.item_id, d.title,
               CASE WHEN d.tt_account IS NULL OR d.tt_account IN ('', '0') THEN 'Product card' ELSE d.tt_account END AS tt_account,
               d.content_type, d.status,
               d.cost, d.orders, d.gmv, d.roi, d.cpo, d.impressions, d.clicks, d.click_rate, d.conv_rate,
               d.v2s, d.v6s, d.vp25, d.vp50, d.vp75, d.vp100, d.synced_at,
               m.posted_at AS posted_at, m.source AS posted_source
        FROM creative.daily_rows d LEFT JOIN creative.item_meta m ON m.item_id = d.item_id
        WHERE d.date >= $1 AND d.date <= $2 ${filter.replaceAll("campaign_id", "d.campaign_id")}
        ORDER BY d.date DESC, d.gmv DESC LIMIT 2000`
        : `SELECT date, campaign_id, item_group_id, item_id, title,
              CASE WHEN tt_account IS NULL OR tt_account IN ('', '0') THEN 'Product card' ELSE tt_account END AS tt_account,
              content_type, status,
              cost, orders, gmv, roi, cpo, impressions, clicks, click_rate, conv_rate,
              v2s, v6s, vp25, vp50, vp75, vp100, synced_at
       FROM creative.daily_rows WHERE date >= $1 AND date <= $2 ${filter}
       ORDER BY date DESC, gmv DESC LIMIT 2000`,
      args
    );
    // Range totals over the FULL set (no limit): KPI cards must never be
    // computed on the truncated display rows above (B117: LIMIT-2000 cut
    // the tail and understated a 3-day range by ~28%). Optional ?status=
    // scopes the totals to the active filter (rows stay client-filtered).
    const t = await query(totalsQuery, tArgs);
    return NextResponse.json({ rows: r.rows, totals: t.rows[0] ?? null, totalsStatus: status || "ALL" });
  } catch (e) {
    return NextResponse.json({ error: "018_creative_daily.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-sync {shopNumber, startDate, endDate} (<=7d, per-day fail-open)
export async function POST(request: Request) {
  const access = await requireModule("creative");
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
    // True TikTok Time posted enrichment (fail-open, capped for Hobby 60s).
    // Manual Sync always retries recent misses (force); the 7d gate stays
    // for any future automatic caller.
    let metaOut = { found: 0, missed: 0, skipped: null as string | null, debug: {} as Record<string, string> };
    try {
      const force = (body as any).metaForce === true;
      const meta = await enrichItemMeta(accessToken, shop, targets, 200, force);
      metaOut = meta;
      if (meta.skipped) skipped["item_meta"] = meta.skipped;
      if (meta.found > 0 || meta.missed > 0) skipped["item_meta_mapped"] = `${meta.found} posted, ${meta.missed} unknown`;
    } catch (e) {
      skipped["item_meta"] = e instanceof Error ? e.message.slice(0, 80) : "meta failed";
    }
    return NextResponse.json({ ok: true, campaigns: targets.length, days: days.length, rows, skipped, meta: metaOut });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
