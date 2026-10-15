import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { requireAllowlistedUser } from "@/lib/authz";
import { query } from "@/lib/db";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GET /api/live-account-probe?shopNumber=1[&date=YYYY-MM-DD][&campaignId=...]
// Read-only: where does the TT account behind a LIVE GMV Max campaign live?
// A. full gmv_max/campaign/get object for one LIVE campaign (keys + values).
// B. gmv_max/report/get LIVE with tt_account-ish metrics across grains.
// C. ad/get app_name for the same LIVE campaign (membership check).
// D. full campaign/gmv_max/info object (identity/author keys?).
// E. rooms for this campaign (room_id grain, cost metrics).
// F. doc-exact retry (Metrics doc :4750): dims ["campaign_id","stat_time_day"],
//    metrics campaign_id/campaign_name/tt_account_name/identity_id/cost/orders/
//    gross_revenue, filter gmv_max_promotion_types ["LIVE"], over the last 7
//    days to catch a spending row (zero-spend rows return "0" by design).
const TT_CANDIDATES = ["tt_account_name", "tt_account_profile_image_url", "title", "shop_content_type"];

async function reportTry(
  accessToken: string, shopId: string, advertiserId: string,
  dimensions: string[], metrics: string[], date: string, campaignId?: string
) {
  const filtering = campaignId ? JSON.stringify({ campaign_ids: [campaignId] }) : undefined;
  const params: Record<string, string> = {
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: "LIVE_GMV_MAX",
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page_size: "5",
  };
  if (filtering) params.filtering = filtering;
  const res = await fetch(
    `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${new URLSearchParams(params).toString()}`,
    { headers: { "Access-Token": accessToken, "Content-Type": "application/json" } }
  );
  const body = await res.json();
  const list = body.data?.list ?? [];
  return {
    code: body.code ?? -1,
    message: String(body.message ?? "").slice(0, 120),
    rows: list.length,
    sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 1000) : null,
  };
}

export async function GET(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date =
    searchParams.get("date") ??
    (() => {
      const d = new Date(Date.now() - 86400000);
      return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    })();
  try {
    const shop = SHOPS[shopNumber];
    if (!shop || !shop.hasGMVCampaigns) return NextResponse.json({ error: "invalid shopNumber" }, { status: 400 });
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });

    // Pick 1-2 LIVE campaigns: explicit param wins, else top-spend cached IDs.
    let campaignIds: string[] = [];
    const want = searchParams.get("campaignId") ?? "";
    if (/^\d{5,32}$/.test(want)) {
      campaignIds = [want];
    } else {
      try {
        const r = await query(
          `SELECT campaign_id FROM gmv.gmv_campaigns WHERE shop_id = $1 AND promotion_type = 'LIVE_GMV_MAX' ORDER BY campaign_id LIMIT 2`,
          [shop.shopId]
        );
        campaignIds = r.rows.map((x: any) => String(x.campaign_id)).filter(Boolean);
      } catch {
        campaignIds = [];
      }
    }
    if (campaignIds.length === 0) return NextResponse.json({ error: "no LIVE campaigns cached — Fetch once first" }, { status: 404 });
    const campaignId = campaignIds[0];

    // A. full campaign/get object (one LIVE campaign's raw shape).
    let campaignObj: Record<string, unknown> = {};
    try {
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        filtering: JSON.stringify({ gmv_max_promotion_types: ["LIVE_GMV_MAX"] }),
        page: "1",
        page_size: "100",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/gmv_max/campaign/get/?${params.toString()}`,
        { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      const list = body.data?.list ?? [];
      const match = list.find((c: any) => String(c.campaign_id) === campaignId) ?? list[0];
      campaignObj = {
        code: body.code ?? -1,
        message: String(body.message ?? "").slice(0, 120),
        count: list.length,
        keys: match ? Object.keys(match) : [],
        // Values truncated; token-ish keys redacted by name.
        sample: match
          ? JSON.stringify(match, (k, v) => (/token|secret|key/i.test(k) ? "[redacted]" : v)).slice(0, 2000)
          : null,
      };
    } catch (e) {
      campaignObj = { error: e instanceof Error ? e.message : "campaign/get failed" };
    }
    await sleep(400);

    // B. tt_account-ish metrics across LIVE grains (full set, then singles).
    const grainVariants: { label: string; dims: string[]; filtered: boolean }[] = [
      { label: "campaign_id", dims: ["campaign_id"], filtered: false },
      { label: "campaign_id+day|1id", dims: ["campaign_id", "stat_time_day"], filtered: true },
      { label: "room_id|1id", dims: ["room_id"], filtered: true },
      { label: "room_id+day|1id", dims: ["room_id", "stat_time_day"], filtered: true },
    ];
    const grains: Record<string, unknown> = {};
    for (const g of grainVariants) {
      const full = await reportTry(
        creds.access_token, shop.shopId, shop.advertiserId,
        g.dims, [...TT_CANDIDATES], date, g.filtered ? campaignId : undefined
      );
      await sleep(400);
      if (full.code === 0) {
        grains[g.label] = { full_set: `OK, ${full.rows} rows`, sample: full.sample };
      } else {
        const per_metric: Record<string, string> = {};
        const per_sample: Record<string, unknown> = {};
        for (const m of TT_CANDIDATES) {
          const one = await reportTry(
            creds.access_token, shop.shopId, shop.advertiserId,
            g.dims, [m], date, g.filtered ? campaignId : undefined
          );
          per_metric[m] = one.code === 0 ? `OK (${one.rows} rows)` : `FAIL code=${one.code}`.slice(0, 80);
          if (one.code === 0) per_sample[m] = one.sample;
          await sleep(300);
        }
        grains[g.label] = { full_set: `FAIL code=${full.code} ${full.message ?? ""}`.slice(0, 140), per_metric, per_sample };
      }
    }

    // C. ad/get app_name for this LIVE campaign (GMV campaigns may own ~zero ads).
    let adDetail: Record<string, unknown> = {};
    try {
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        page: "1",
        page_size: "2",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/ad/get/?${params.toString()}`,
        { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      const list = body.data?.list ?? [];
      const first = list.length > 0 ? list[0] : null;
      adDetail = {
        code: body.code ?? -1,
        message: String(body.message ?? "").slice(0, 120),
        count: list.length,
        app_name: first ? String(first.app_name ?? "").slice(0, 120) || null : null,
        itemKeys: first ? Object.keys(first).slice(0, 60) : [],
      };
    } catch (e) {
      adDetail = { error: e instanceof Error ? e.message : "ad/get failed" };
    }
    await sleep(400);

    // D. full campaign/gmv_max/info object (we read only budget today —
    // the object may carry identity/live-author keys).
    let infoObj: Record<string, unknown> = {};
    try {
      const params = new URLSearchParams({ advertiser_id: shop.advertiserId, campaign_id: campaignId });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/campaign/gmv_max/info/?${params.toString()}`,
        { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      const data = body.data ?? null;
      infoObj = {
        code: body.code ?? -1,
        message: String(body.message ?? "").slice(0, 120),
        keys: data && typeof data === "object" ? Object.keys(data).slice(0, 60) : [],
        sample: data
          ? JSON.stringify(data, (k, v) => (/token|secret|key/i.test(k) ? "[redacted]" : v)).slice(0, 2000)
          : null,
      };
    } catch (e) {
      infoObj = { error: e instanceof Error ? e.message : "gmv_max/info failed" };
    }
    await sleep(400);

    // E. rooms for this campaign + shop-live owner cross-check.
    // GMV room_id grain (cost metrics work) gives the room list; shop-live
    // list gives creator per session. IDs may differ — report both raw.
    let rooms: Record<string, unknown> = {};
    try {
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        store_ids: JSON.stringify([shop.shopId]),
        gmv_max_promotion_type: "LIVE_GMV_MAX",
        dimensions: JSON.stringify(["room_id"]),
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        metrics: JSON.stringify(["cost", "gross_revenue"]),
        start_date: date,
        end_date: date,
        page_size: "10",
      });
      const res = await fetch(
        `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
        { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
      );
      const body = await res.json();
      const list = body.data?.list ?? [];
      rooms = {
        code: body.code ?? -1,
        message: String(body.message ?? "").slice(0, 120),
        room_ids: list.map((r: any) => String(r.dimensions?.room_id ?? "")).filter(Boolean).slice(0, 10),
        sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 500) : null,
      };
    } catch (e) {
      rooms = { error: e instanceof Error ? e.message : "rooms failed" };
    }
    await sleep(400);

    // F. doc-exact retry over the last 7 days (spend-day hunt).
    const docMetrics = ["campaign_id", "campaign_name", "tt_account_name", "identity_id", "cost", "orders", "gross_revenue"];
    const days: string[] = [];
    {
      const base = new Date(date + "T00:00:00");
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
    }
    const docExact: Record<string, unknown> = {};
    for (const day of days) {
      try {
        const params = new URLSearchParams({
          advertiser_id: shop.advertiserId,
          store_ids: JSON.stringify([shop.shopId]),
          gmv_max_promotion_type: "LIVE_GMV_MAX",
          dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
          filtering: JSON.stringify({ gmv_max_promotion_types: ["LIVE"] }),
          metrics: JSON.stringify(docMetrics),
          start_date: day,
          end_date: day,
          page_size: "100",
        });
        const res = await fetch(
          `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`,
          { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        const list = body.data?.list ?? [];
        if (body.code !== 0) {
          docExact[day] = { code: body.code, message: String(body.message ?? "").slice(0, 100) };
        } else {
          const nonZero = list.filter((r: any) => String(r.metrics?.tt_account_name ?? "0") !== "0" && String(r.metrics?.tt_account_name ?? "") !== "");
          const withSpend = list.filter((r: any) => Number(r.metrics?.cost ?? 0) > 0);
          docExact[day] = {
            code: 0,
            rows: list.length,
            with_spend: withSpend.length,
            named: nonZero.length,
            named_sample: nonZero.length > 0 ? JSON.stringify(nonZero[0]).slice(0, 600) : null,
            first_sample: list.length > 0 ? JSON.stringify(list[0]).slice(0, 600) : null,
          };
          if (nonZero.length > 0) break;
        }
      } catch (e) {
        docExact[day] = { error: e instanceof Error ? e.message : "failed" };
      }
      await sleep(400);
    }

    // G. identity resolution: gmv_max/info gave identity_list with a real
    // identity_id (BC_AUTH_TT) even though report tt_account_name is "0".
    // gmv_max/identity/get exists; last round it asked for
    // store_authorized_bc_id (from info: 7420347515893071888 for shop 1).
    const identityId = "fcba7163-a432-51da-bb40-8aa784dee21a";
    const storeId = shop.shopId;
    const storeBcId = "7420347515893071888";
    const identityProbe: Record<string, unknown> = {};
    const idAttempts: { label: string; path: string; params: Record<string, string> }[] = [
      { label: "bc_id", path: "/open_api/v1.3/gmv_max/identity/get/", params: { advertiser_id: shop.advertiserId, store_id: storeId, store_authorized_bc_id: storeBcId } },
      { label: "bc_id+paging", path: "/open_api/v1.3/gmv_max/identity/get/", params: { advertiser_id: shop.advertiserId, store_id: storeId, store_authorized_bc_id: storeBcId, page: "1", page_size: "100" } },
      { label: "bc_id+live-filter", path: "/open_api/v1.3/gmv_max/identity/get/", params: { advertiser_id: shop.advertiserId, store_id: storeId, store_authorized_bc_id: storeBcId, page: "1", page_size: "100", filtering: JSON.stringify({ gmv_max_promotion_types: ["LIVE"] }) } },
    ];
    for (const a of idAttempts) {
      try {
        const res = await fetch(
          `${BASE_URL}${a.path}?${new URLSearchParams(a.params).toString()}`,
          { headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" } }
        );
        const body = await res.json();
        const data = body.data ?? {};
        const list = data.list ?? data.identities ?? data.identity_list ?? [];
        const items = Array.isArray(list) ? list : [];
        const match = items.find((it: any) => String(it.identity_id ?? it.id ?? "") === identityId) ?? items[0] ?? null;
        identityProbe[a.label] = {
          code: body.code ?? -1,
          message: String(body.message ?? "").slice(0, 120),
          count: items.length,
          data_keys: data && typeof data === "object" ? Object.keys(data).slice(0, 20) : [],
          page_info: (data as any).page_info ?? null,
          has_want: items.some((it: any) => String(it.identity_id ?? it.id ?? "") === identityId),
          keys: match && typeof match === "object" ? Object.keys(match).slice(0, 40) : [],
          sample: match
            ? JSON.stringify(match, (k, v) => (/token|secret|key/i.test(k) ? "[redacted]" : v)).slice(0, 1000)
            : JSON.stringify(data).slice(0, 500),
        };
        if (identityProbe[a.label] && (identityProbe[a.label] as any).has_want) break;
      } catch (e) {
        identityProbe[a.label] = { error: e instanceof Error ? e.message : "failed" };
      }
      await sleep(400);
    }

    return NextResponse.json({ shop: shop.name, date, campaignId, campaign_get: campaignObj, live_grains: grains, ad_detail: adDetail, gmv_max_info: infoObj, rooms, doc_exact: docExact, identity_probe: identityProbe });
  } catch (e) {
    const message = e instanceof Error ? e.message : "live account probe failed";
    console.error("[live-account-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
