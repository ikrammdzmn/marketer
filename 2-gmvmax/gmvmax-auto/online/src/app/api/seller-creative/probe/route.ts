import { NextResponse } from "next/server";
import { requireModule } from "@/lib/authz";
import { fetchOrganicDay, fetchOrganicImpSample, fetchOrganicRawSample, shop1Guard } from "@/lib/seller-creative";

export const dynamic = "force-dynamic";

// GET /api/seller-creative/probe?shopNumber=1&date=YYYY-MM-DD
// Read-only: cipher check + one day, first pass only. No DB writes.
export async function GET(request: Request) {
  const access = await requireModule("seller-creative");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const shopNumber = searchParams.get("shopNumber") ?? "1";
  const g = shop1Guard(shopNumber);
  if (g) return NextResponse.json({ error: g }, { status: 400 });
  const date = (searchParams.get("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "need date YYYY-MM-DD" }, { status: 400 });
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const lt = new Date(Date.UTC(+m![1], +m![2] - 1, +m![3]) + 86400000).toISOString().slice(0, 10);
  try {
    const { rows, latestAvailable, pages } = await fetchOrganicDay(date, lt);
    const first = rows[0] ?? null;
    let raw: { keys: string[]; sample: any } | null = null;
    try {
      raw = await fetchOrganicRawSample(date, lt);
    } catch (e) {
      raw = { keys: [], sample: { error: e instanceof Error ? e.message : "raw sample failed" } };
    }
    // One products/performance payload for the top video (imp/clicks
    // shape never verified) — fail-open, never blocks the main probe.
    let impRaw: { keys: string[]; sample: any } | null = null;
    try {
      const top = rows[0]?.video_id;
      if (top) impRaw = await fetchOrganicImpSample(top, date, lt);
    } catch (e) {
      impRaw = { keys: [], sample: { error: e instanceof Error ? e.message : "imp sample failed" } };
    }
    return NextResponse.json({
      date,
      latestAvailable,
      pages,
      videos: rows.length,
      totalViews: rows.reduce((s, r) => s + r.views, 0),
      videosWithGmv: rows.filter((r) => (r.gmv ?? 0) > 0).length,
      firstRowKeys: first ? Object.keys(first) : [],
      firstRow: first,
      rawKeys: raw?.keys ?? [],
      rawSample: raw?.sample ?? null,
      impKeys: impRaw?.keys ?? [],
      impSample: impRaw?.sample ?? null,
      coverage: {
        views: first?.views !== undefined,
        ctr: first?.ctr !== undefined,
        gmv: first?.gmv !== undefined,
        sku_orders: first?.sku_orders !== undefined,
        imp: "separate products/performance call per video-day (sync only)",
        post_time: "metadata pull (sync only)",
        note: "imp NULL = not yet pulled; GMV Max reads ~13% higher — never sum sources",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "seller-creative probe failed";
    console.error("[seller-creative/probe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
