import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { requireModule } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// GET /api/shop-live/hourly-probe?shopNumber=1&date=YYYY-MM-DD&adgroupIds=a,b&campaignId=..&roomId=..
// Read-only test for the hour-range join: can TTAM adgroup spend+impressions
// come back at HOUR grain, and can the GMV Max report return room cost at
// HOUR grain? One date only, capped ids. No DB writes.
export async function GET(request: Request) {
  const access = await requireModule("shop-live", "live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date = searchParams.get("date") ?? "";
  const adgroupIds = (searchParams.get("adgroupIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const campaignId = (searchParams.get("campaignId") ?? "").trim();
  const roomId = (searchParams.get("roomId") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date=YYYY-MM-DD (one day only)" }, { status: 400 });
  }
  const shop = SHOPS[shopNumber];
  if (!shop) return NextResponse.json({ error: "bad shopNumber" }, { status: 400 });
  try {
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });
    const token: string = creds.access_token;
    const want = new Set(adgroupIds);

    async function ttamHour(metrics: string[]) {
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_ADGROUP",
        dimensions: JSON.stringify(["stat_time_hour", "adgroup_id"]),
        metrics: JSON.stringify(metrics),
        start_date: date,
        end_date: date,
        page: "1",
        page_size: "1000",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`,
        { headers: { "Access-Token": token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      if (body.code !== 0) {
        return { metrics, code: body.code, message: String(body.message ?? "").slice(0, 200), rows: 0, sample: null as string | null };
      }
      let rows = 0;
      let sample: string | null = null;
      const perAdgroup: Record<string, Record<string, number>> = {};
      for (const item of body.data?.list ?? []) {
        const id = String(item.dimensions?.adgroup_id ?? "");
        if (!id || (want.size > 0 && !want.has(id))) continue;
        rows++;
        const row: Record<string, number> = {};
        for (const m of metrics) {
          const v = parseFloat(item.metrics?.[m] ?? 0);
          if (Number.isFinite(v)) row[m] = v;
        }
        perAdgroup[id] = row;
        if (sample === null) sample = JSON.stringify(item).slice(0, 600);
      }
      return { metrics, code: 0, message: "OK", rows, totalPages: body.data?.page_info?.total_page ?? 1, sample, perAdgroup };
    }

    async function gmvRoomHour() {
      if (!campaignId || !roomId) return null;
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        store_ids: JSON.stringify([shop.shopId]),
        gmv_max_promotion_type: "LIVE_GMV_MAX",
        dimensions: JSON.stringify(["room_id", "stat_time_hour"]),
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        metrics: JSON.stringify(["cost", "orders", "gross_revenue"]),
        start_date: date,
        end_date: date,
        page: "1",
        page_size: "1000",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
        { headers: { "Access-Token": token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      if (body.code !== 0) {
        return { code: body.code, message: String(body.message ?? "").slice(0, 200), rows: 0, sample: null as string | null };
      }
      let rows = 0;
      let sample: string | null = null;
      for (const item of body.data?.list ?? []) {
        if (String(item.dimensions?.room_id ?? "") !== roomId) continue;
        rows++;
        if (sample === null) sample = JSON.stringify(item).slice(0, 600);
      }
      return { code: 0, message: "OK", rows, totalPages: body.data?.page_info?.total_page ?? 1, sample };
    }

    // Full set first (spend + impressions); singles on failure since one bad
    // metric name fails the whole call.
    const ttamFull = await ttamHour(["spend", "impressions"]);
    await new Promise((r) => setTimeout(r, 500));
    let ttamSingles: Record<string, unknown> | null = null;
    if (ttamFull.code !== 0) {
      ttamSingles = {};
      for (const m of ["spend", "impressions"]) {
        (ttamSingles as Record<string, unknown>)[m] = await ttamHour([m]);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    const gmv = await gmvRoomHour();
    return NextResponse.json({ date, adgroupIds, campaignId: campaignId || null, roomId: roomId || null, ttamHourFull: ttamFull, ttamHourSingles: ttamSingles, gmvRoomHour: gmv });
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly probe failed";
    console.error("[shop-live/hourly-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
