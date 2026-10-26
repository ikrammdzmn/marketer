import { NextResponse } from "next/server";
import { getAdsCredentials } from "@/lib/ads-credentials";
import { requireModule } from "@/lib/authz";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const BASE_URL = "https://business-api.tiktok.com";
const API_VERSION = "v1.3";

// GET /api/live-roi/hourly-probe?shopNumber=1&date=YYYY-MM-DD&adgroupIds=a,b
// Read-only test: can report/integrated/get return TTAM adgroup spend at
// HOUR grain? Tries ["stat_time_hour","adgroup_id"] first, falls back to
// the known-good ["stat_time_day","adgroup_id"] for comparison.
// No DB writes, no Combine changes — capped to 10 adgroups, one date.
export async function GET(request: Request) {
  const access = await requireModule("live-roi", "gmv-max");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const date = searchParams.get("date") ?? "";
  const ids = (searchParams.get("adgroupIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "need date=YYYY-MM-DD" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "need adgroupIds=a,b (up to 10, from the TTAM table)" }, { status: 400 });
  }
  const shop = SHOPS[shopNumber];
  if (!shop) return NextResponse.json({ error: "bad shopNumber" }, { status: 400 });
  try {
    const creds = await getAdsCredentials(shop.advertiserId);
    if (!creds) return NextResponse.json({ error: "no access token for this advertiser" }, { status: 503 });
    const token: string = creds.access_token;
    const want = new Set(ids);

    async function tryDims(dimensions: string[]) {
      const params = new URLSearchParams({
        advertiser_id: shop.advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_ADGROUP",
        dimensions: JSON.stringify(dimensions),
        metrics: JSON.stringify(["spend"]),
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
        return { dimensions, code: body.code, message: String(body.message ?? "").slice(0, 200), rows: 0, sample: null as string | null, perAdgroup: null as Record<string, number> | null };
      }
      const perAdgroup: Record<string, number> = {};
      let rows = 0;
      let sample: string | null = null;
      for (const item of body.data?.list ?? []) {
        const id = String(item.dimensions?.adgroup_id ?? "");
        if (!id || !want.has(id)) continue;
        rows++;
        const v = parseFloat(item.metrics?.spend ?? 0);
        if (Number.isFinite(v)) perAdgroup[id] = (perAdgroup[id] ?? 0) + v;
        if (sample === null) sample = JSON.stringify(item).slice(0, 500);
      }
      return {
        dimensions,
        code: 0,
        message: "OK",
        rows,
        totalPages: body.data?.page_info?.total_page ?? 1,
        sample,
        perAdgroup,
      };
    }

    const hour = await tryDims(["stat_time_hour", "adgroup_id"]);
    await new Promise((r) => setTimeout(r, 500));
    const day = await tryDims(["stat_time_day", "adgroup_id"]);
    return NextResponse.json({ date, adgroupIds: ids, hour, day });
  } catch (e) {
    const message = e instanceof Error ? e.message : "hourly probe failed";
    console.error("[live-roi/hourly-probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
