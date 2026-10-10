import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { requireAllowlistedUser } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// GET /api/sessions/probe?shopNumber=1&campaignId=...[&roomId=...]
// Two read-only probes (never secrets):
// 1. session/list shape (existing): keys + one truncated sample.
// 2. roomId branch: livestream-level attribute metrics for ONE room
//    (doc-grounded candidates: live_status, live_launched_time,
//    live_duration). Single room + single ID dimension, per the attribute
//    metrics rule; full set first, singles only on failure.
// Access is checked against the live Google email allowlist.
const ROOM_METRIC_CANDIDATES = ["live_status", "live_launched_time", "live_duration", "live_name"];

async function tryRoomMetrics(
  accessToken: string,
  shopId: string,
  advertiserId: string,
  campaignId: string,
  date: string,
  dimensions: string[],
  metrics: string[]
): Promise<{ code: number; message?: string; rows: unknown[] }> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: "LIVE_GMV_MAX",
    dimensions: JSON.stringify(dimensions),
    filtering: JSON.stringify({ campaign_ids: [campaignId] }),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page: "1",
    page_size: "10",
  });
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  return { code: body.code ?? -1, message: String(body.message ?? "").slice(0, 120), rows: body.data?.list ?? [] };
}

export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const campaignId = searchParams.get("campaignId") ?? "";
  const roomId = searchParams.get("roomId") ?? "";
  const shop = SHOPS[shopNumber];
  if (!shop || !shop.hasGMVCampaigns || !/^\d{5,32}$/.test(campaignId)) {
    return NextResponse.json({ error: "need valid shopNumber + campaignId" }, { status: 400 });
  }
  try {
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });
    const date =
      searchParams.get("date") ??
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    let roomProbe: Record<string, unknown> | null = null;
    if (roomId && /^\d{5,32}$/.test(roomId)) {
      // Livestream-level shape: filter by single campaign, group by room.
      // Try bare room_id first, then room_id x day; bisect singles on failure.
      const dimVariants = [["room_id"], ["room_id", "stat_time_day"]];
      let done: Record<string, unknown> | null = null;
      let lastFail = "";
      for (const dims of dimVariants) {
        const full = await tryRoomMetrics(
          creds.access_token, shop.shopId, shop.advertiserId, campaignId, date, dims, [...ROOM_METRIC_CANDIDATES]
        );
        await new Promise((r) => setTimeout(r, 500));
        if (full.code === 0) {
          done = {
            roomId, date, dimensions: dims, full_set: "OK",
            per_metric: Object.fromEntries(ROOM_METRIC_CANDIDATES.map((m) => [m, "OK"])),
            rows: JSON.stringify(full.rows).slice(0, 1500),
          };
          break;
        }
        lastFail = `dims=${dims.join("+")}: FAIL code=${full.code} ${(full.message ?? "").slice(0, 120)}`;
      }
      if (!done) {
        const dims = dimVariants[dimVariants.length - 1];
        const per_metric: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        for (const m of ROOM_METRIC_CANDIDATES) {
          const one = await tryRoomMetrics(creds.access_token, shop.shopId, shop.advertiserId, campaignId, date, dims, [m]);
          per_metric[m] = one.code === 0 ? "OK" : `FAIL code=${one.code} ${one.message ?? ""}`.slice(0, 120);
          if (one.code === 0) values[m] = JSON.stringify(one.rows).slice(0, 800);
          await new Promise((r) => setTimeout(r, 300));
        }
        done = { roomId, date, dimensions: dims, full_set: lastFail, per_metric, values };
      }
      roomProbe = done;
    }
    const params = new URLSearchParams({
      advertiser_id: shop.advertiserId,
      campaign_id: campaignId,
      page_size: "5",
    });
    const res = await fetch(
      `${BASE_URL}/open_api/${API_VERSION}/campaign/gmv_max/session/list/?${params.toString()}`,
      { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
    );
    const body = await res.json();
    const data = body?.data ?? {};
    const list = data.session_list ?? data.list ?? [];
    const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
    return NextResponse.json({
      campaignId,
      code: body?.code ?? -1,
      message: String(body?.message ?? "").slice(0, 120),
      dataKeys: Object.keys(data ?? {}),
      count: Array.isArray(list) ? list.length : 0,
      itemKeys: first ? Object.keys(first) : [],
      sample: first ? JSON.stringify(first).slice(0, 800) : null,
      roomProbe,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "session probe failed";
    console.error("[sessions-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
