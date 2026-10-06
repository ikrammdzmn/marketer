import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Scorer file shape (from vol2-focused-v3 preset). DB remains the source for
// bands/enabled/guardrails/notes; expressions/formats are static per metric.
const SCORER_SHAPE: Record<string, {
  name: string; format: string; inputs: string[]; expression: string; params: any;
}> = {
  ERRI: { name: "Enter Room Rate Impression", format: "%", inputs: ["live", "imp"], expression: "imp ? live / imp * 100 : 0", params: {} },
  HPS: { name: "HOOK POWER SCORE", format: "%", inputs: ["sfv", "imp"], expression: "HR * 100", params: {} },
  ACS: { name: "ATTENTION COST SCORE", format: "RM", inputs: ["spend", "sfv"], expression: "ACS", params: {} },
  CES: { name: "CONSIDERATION EFFICIENCY SCORE", format: "numeric", inputs: ["sfv", "imp", "prof", "sh", "com", "fol", "likes", "spend"], expression: "ACS && ACS !== 999 ? cesX * HR * PVR * EDSraw / ACS : 0", params: { cesX: 10000 } },
  EDS: { name: "ENGAGEMENT DEPTH SCORE", format: "%", inputs: ["sh", "com", "fol", "likes"], expression: "EDSraw * 100", params: {} },
  VVES: { name: "VIDEO VIEW EFFICIENCY SCORE", format: "numeric", inputs: ["sfv", "imp", "awt", "spend"], expression: "ACS && ACS !== 999 ? (HR * awt) / ACS : 0", params: {} },
  RVS: { name: "RETENTION VALUE SCORE", format: "numeric", inputs: ["awt", "spend", "sfv"], expression: "ACS && ACS !== 999 ? awt / ACS : 0", params: {} },
  HRQ: { name: "HOOK REACH QUALITY", format: "%", inputs: ["sfv", "reach"], expression: "reach ? sfv / reach * 100 : 0", params: {} },
  RES: { name: "REACH EFFICIENCY SCORE", format: "numeric", inputs: ["sfv", "reach", "spend"], expression: "reach && spend ? ((sfv / reach) * resX) / (spend / reach) : 0", params: { resX: 10 } },
  LQS: { name: "LIVE QUALITY SCORE", format: "numeric", inputs: ["live10", "spend"], expression: "spend ? live10 / spend * 100 : 0", params: {} },
  BCE: { name: "BC EFFICIENCY", format: "numeric", inputs: ["sfv", "imp", "prof", "spend"], expression: "ACS && ACS !== 999 ? bcX * HR * PVR / ACS : 0", params: { bcX: 1000 } },
};

function toScorerFile(p: any) {
  const metrics = (p.metrics ?? []).map((m: any) => {
    // DB-stored expression wins (custom metrics); else the static map.
    const shape = m.expression
      ? { name: m.name ?? m.short, format: m.format ?? "numeric", inputs: m.inputs ?? [], expression: m.expression, params: m.params ?? {} }
      : SCORER_SHAPE[m.short] ?? {
        name: m.name ?? m.short, format: "numeric", inputs: [], expression: "0", params: {},
      };
    return {
      id: m.id ?? String(m.short ?? "").toLowerCase(),
      name: shape.name, short: m.short, format: shape.format,
      inputs: shape.inputs, expression: shape.expression,
      invert: !!m.invert, enabled: m.enabled !== false,
      params: shape.params, band: { k: m.k, s: m.s },
    };
  });
  const file = {
    preset: p.preset_key, label: p.label,
    updatedAt: new Date().toLocaleDateString("en-CA"),
    note: p.notes ?? "", metrics,
  };
  return {
    fileName: `${p.preset_key}.json`,
    file,
    manifestLine: `{ "id": "${p.preset_key}", "file": "${p.preset_key}.json", "label": "${p.label}" }`,
  };
}

// GET /api/ttam-presets → list; ?key=K → full row; ?key=K&format=scorer → export shape
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const format = searchParams.get("format") ?? "";
  try {
    if (!key) {
      const r = await query(
        `SELECT id, preset_key, label, active, notes, updated_at FROM ttam.presets ORDER BY active DESC, updated_at DESC`
      );
      return NextResponse.json({ presets: r.rows });
    }
    const r = await query(`SELECT * FROM ttam.presets WHERE preset_key = $1`, [key]);
    if (!r.rows.length) return NextResponse.json({ error: "preset not found" }, { status: 404 });
    const p = r.rows[0];
    if (format === "scorer") return NextResponse.json(toScorerFile(p));
    return NextResponse.json({ preset: p });
  } catch (e) {
    const message = e instanceof Error ? e.message : "presets failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/ttam-presets {action:update|duplicate|activate|delete, ...}
// Write guard: Bearer PRESET_WRITE_KEY (dedicated key, NOT the cron secret).
// The browser page sends it via NEXT_PUBLIC_PRESET_WRITE_KEY — visible to
// logged-in viewers by design, so this is a tripwire (drive-by curl, accidents,
// CSRF), not a vault. The Vercel wall stays the real gate. Fail-closed: no key
// configured → writes refuse.
export async function POST(request: Request) {
  try {
    const writeKey = (process.env.PRESET_WRITE_KEY ?? "").trim();
    if (!writeKey) return NextResponse.json({ error: "writes disabled (no key)" }, { status: 503 });
    if (request.headers.get("authorization") !== `Bearer ${writeKey}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const action = body.action ?? "";
    if (action === "activate") {
      const key = String(body.key ?? "");
      if (!key) return NextResponse.json({ error: "need key" }, { status: 400 });
      await query(`UPDATE ttam.presets SET active = false, updated_at = now()`);
      const r = await query(
        `UPDATE ttam.presets SET active = true, updated_at = now() WHERE preset_key = $1 RETURNING preset_key, label, active`,
        [key]
      );
      if (!r.rows.length) return NextResponse.json({ error: "preset not found" }, { status: 404 });
      return NextResponse.json({ ok: true, preset: r.rows[0] });
    }
    if (action === "duplicate") {
      const key = String(body.key ?? "");
      if (!key) return NextResponse.json({ error: "need key" }, { status: 400 });
      const src = await query(`SELECT * FROM ttam.presets WHERE preset_key = $1`, [key]);
      if (!src.rows.length) return NextResponse.json({ error: "preset not found" }, { status: 404 });
      const s = src.rows[0];
      const newKey = String(body.newKey ?? `${s.preset_key}-copy`).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const r = await query(
        `INSERT INTO ttam.presets (preset_key, label, metrics, guardrails, notes, active)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING preset_key, label, active`,
        [newKey, String(body.newLabel ?? `${s.label} copy`), JSON.stringify(s.metrics), JSON.stringify(s.guardrails), s.notes ?? ""]
      ).catch(() => null);
      if (!r) return NextResponse.json({ error: "duplicate failed (key taken?)" }, { status: 400 });
      return NextResponse.json({ ok: true, preset: r.rows[0] });
    }
    if (action === "delete") {
      const key = String(body.key ?? "");
      if (!key) return NextResponse.json({ error: "need key" }, { status: 400 });
      const cur = await query(`SELECT active FROM ttam.presets WHERE preset_key = $1`, [key]);
      if (!cur.rows.length) return NextResponse.json({ error: "preset not found" }, { status: 404 });
      if (cur.rows[0].active) return NextResponse.json({ error: "cannot delete the active preset" }, { status: 400 });
      await query(`DELETE FROM ttam.presets WHERE preset_key = $1`, [key]);
      return NextResponse.json({ ok: true });
    }
    if (action === "update") {
      const key = String(body.key ?? "");
      if (!key) return NextResponse.json({ error: "need key" }, { status: 400 });
      const metrics = body.metrics;
      if (!Array.isArray(metrics) || !metrics.length) {
        return NextResponse.json({ error: "metrics must be a non-empty array" }, { status: 400 });
      }
      const seen = new Set<string>();
      for (const m of metrics) {
        if (!m?.short || !Number.isFinite(m.k) || !Number.isFinite(m.s)) {
          return NextResponse.json({ error: `bad metric row: ${JSON.stringify(m).slice(0, 80)}` }, { status: 400 });
        }
        const up = String(m.short).toUpperCase();
        if (seen.has(up)) return NextResponse.json({ error: `duplicate metric: ${up}` }, { status: 400 });
        seen.add(up);
      }
      const g = body.guardrails ?? {};
      const guardrails = {
        min_spend: Math.max(0, Number(g.min_spend ?? 30)),
        min_impressions: Math.max(0, Number(g.min_impressions ?? 1000)),
        min_days: Math.max(1, Number(g.min_days ?? 3)),
      };
      if (![guardrails.min_spend, guardrails.min_impressions, guardrails.min_days].every(Number.isFinite)) {
        return NextResponse.json({ error: "bad guardrails" }, { status: 400 });
      }
      const label = String(body.label ?? "").trim();
      if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });
      const r = await query(
        `UPDATE ttam.presets SET label = $2, metrics = $3, guardrails = $4, notes = $5, updated_at = now()
         WHERE preset_key = $1 RETURNING preset_key, label, active, updated_at`,
        [key, label, JSON.stringify(metrics.map((m: any) => ({
          id: m.id ?? String(m.short).toLowerCase(), short: String(m.short).toUpperCase(),
          name: m.name ?? m.short,
          k: m.k, s: m.s, invert: !!m.invert, enabled: m.enabled !== false, proxy: !!m.proxy,
          ...(m.expression ? { expression: String(m.expression) } : {}),
          ...(m.format ? { format: String(m.format) } : {}),
          ...(Array.isArray(m.inputs) ? { inputs: m.inputs.map(String) } : {}),
          ...(m.params && typeof m.params === "object" ? { params: m.params } : {}),
        }))), JSON.stringify(guardrails), String(body.notes ?? "")]
      );
      if (!r.rows.length) return NextResponse.json({ error: "preset not found" }, { status: 404 });
      return NextResponse.json({ ok: true, preset: r.rows[0] });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "presets failed";
    console.error("[ttam-presets]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
