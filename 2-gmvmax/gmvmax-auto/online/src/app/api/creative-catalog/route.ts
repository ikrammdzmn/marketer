import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAllowlistedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/creative-catalog — friendly campaign/product names (from Neon).
export async function GET() {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  try {
    const c = await query("SELECT campaign_id, label, note, archived FROM creative.catalog_campaigns ORDER BY campaign_id");
    const p = await query("SELECT product_id, name, note, campaign_id, archived FROM creative.catalog_products ORDER BY product_id");
    return NextResponse.json({ campaigns: c.rows, products: p.rows });
  } catch (e) {
    return NextResponse.json({ error: "016_creative_catalog.sql not run yet" }, { status: 503 });
  }
}

// POST /api/creative-catalog {campaigns:[{campaign_id,label,note,archived}], products:[...]}
function writeGuard(request: Request): boolean {
  const want = (process.env.PRESET_WRITE_KEY ?? "").trim();
  if (!want) return false;
  return request.headers.get("authorization") === `Bearer ${want}`;
}

export async function POST(request: Request) {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access.response;
  if (!writeGuard(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const camps = Array.isArray(body.campaigns) ? body.campaigns : [];
    const prods = Array.isArray(body.products) ? body.products : [];
    await query("BEGIN");
    try {
      await query("DELETE FROM creative.catalog_campaigns");
      for (const c of camps) {
        if (!c || !/^\d{5,32}$/.test(String(c.campaign_id ?? ""))) {
          await query("ROLLBACK");
          return NextResponse.json({ error: "campaign_id must be digits" }, { status: 400 });
        }
        await query("INSERT INTO creative.catalog_campaigns (campaign_id, label, note, archived) VALUES ($1,$2,$3,$4)",
          [String(c.campaign_id), String(c.label ?? ""), String(c.note ?? ""), c.archived === true]);
      }
      await query("DELETE FROM creative.catalog_products");
      for (const p of prods) {
        if (!p || !/^\d{5,32}$/.test(String(p.product_id ?? ""))) {
          await query("ROLLBACK");
          return NextResponse.json({ error: "product_id must be digits" }, { status: 400 });
        }
        await query("INSERT INTO creative.catalog_products (product_id, name, note, campaign_id, archived) VALUES ($1,$2,$3,$4,$5)",
          [String(p.product_id), String(p.name ?? ""), String(p.note ?? ""), String(p.campaign_id ?? ""), p.archived === true]);
      }
      await query("COMMIT");
    } catch (e) {
      await query("ROLLBACK");
      throw e;
    }
    return NextResponse.json({ ok: true, campaigns: camps.length, products: prods.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
