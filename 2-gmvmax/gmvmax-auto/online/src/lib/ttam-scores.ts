// Pure TTAM flag/verdict helpers — browser-safe (no server imports).
// Ported exact from the scorer's theory v2 engine (app.js).

// Theory bands as the provisional starting point for TTAM manual traffic
// (VOL2 GMV quartiles do NOT transfer — recalibrate from TTAM data later).
export const TTAM_THEORY_BANDS: Record<string, { k: number; s: number; invert?: boolean }> = {
  ERRI: { k: 0.003, s: 0.015 },
  HPS: { k: 25, s: 45 },
  ACS: { k: 0.05, s: 0.01, invert: true },
  CES: { k: 5, s: 30 },
  EDS: { k: 5, s: 20 },
  VVES: { k: 100, s: 400 },
  RVS: { k: 500, s: 1500 },
  HRQ: { k: 2, s: 12 },
  RES: { k: 100, s: 600 },
  LQS: { k: 1, s: 3 },
  BCE: { k: 0.5, s: 2 },
};

// Short → full names (from the vol2-focused-v3 preset) for hover tooltips.
export const SCORE_NAMES: Record<string, string> = {
  ERRI: "Enter Room Rate Impression",
  HPS: "Hook Power Score",
  ACS: "Attention Cost Score",
  CES: "Consideration Efficiency Score",
  EDS: "Engagement Depth Score",
  VVES: "Video View Efficiency Score",
  RVS: "Retention Value Score",
  HRQ: "Hook Reach Quality",
  RES: "Reach Efficiency Score",
  LQS: "Live Quality Score",
  BCE: "BC Efficiency",
};
export function flagScore(v: number, k: number, s: number, invert?: boolean): string {
  if (invert) return v > k ? "KILL" : v < s ? "SCALE" : "WATCH";
  return v < k ? "KILL" : v > s ? "SCALE" : "WATCH";
}

// Flags for one row over the visible score keys. Null/unscored → WATCH
// (same as the scorer's missing-flag default — never kills on no data).
export function flagsForRow(
  scores: Record<string, number | null> | null | undefined,
  vis: Set<string>,
  bands: Record<string, { k: number; s: number; invert?: boolean }> = TTAM_THEORY_BANDS
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of vis) {
    const v = scores?.[k];
    const b = bands[k] ?? TTAM_THEORY_BANDS[k];
    out[k] = v === null || v === undefined || !Number.isFinite(v) || !b
      ? "WATCH"
      : flagScore(v, b.k, b.s, b.invert);
  }
  return out;
}

export function verdictOf(flags: Record<string, string>): { v: string; reason: string } {  const g = (k: string) => flags[k] || "WATCH";
  if (g("CES") === "KILL" || (g("ACS") === "KILL" && (g("HPS") === "KILL" || g("VVES") === "KILL"))) {
    const why: string[] = [];
    if (g("CES") === "KILL") why.push("CES kill");
    if (g("ACS") === "KILL" && g("HPS") === "KILL") why.push("hook+cost kill");
    if (g("ACS") === "KILL" && g("VVES") === "KILL") why.push("cost+view-eff kill");
    return { v: "KILL", reason: why.join("+") || "composite kill" };
  }
  if (g("HPS") !== "KILL" && g("ACS") !== "KILL" && (g("CES") === "SCALE" || g("VVES") === "SCALE") && g("EDS") !== "KILL") {
    return { v: "SCALE", reason: "hook+cost ok, " + (g("CES") === "SCALE" ? "CES scale" : "VVES scale") };
  }
  const blocks = ["HPS", "ACS", "CES", "VVES", "EDS"].filter((k) => g(k) === "KILL");
  return { v: "WATCH", reason: blocks.length ? "watch(" + blocks.join(",") + " kill)" : "watch: no scale signal" };
}

// Bands from a DB preset (metrics array). Unknown/missing shorts fall back
// to theory so a half-edited preset never blanks the flags.
export function bandsFromPreset(preset: any): Record<string, { k: number; s: number; invert?: boolean }> {
  const out: Record<string, { k: number; s: number; invert?: boolean }> = { ...TTAM_THEORY_BANDS };
  for (const m of preset?.metrics ?? []) {
    if (m?.short && Number.isFinite(m.k) && Number.isFinite(m.s)) {
      out[m.short] = { k: m.k, s: m.s, invert: !!m.invert };
    }
  }
  return out;
}

// Scorer input name → raw API metric key (row.metrics).
const INPUT_MAP: Record<string, string> = {
  spend: "spend", imp: "impressions", clicks: "clicks", reach: "reach",
  sfv: "video_watched_6s", prof: "profile_visits",
  likes: "likes", sh: "shares", com: "comments", fol: "follows",
  awt: "average_video_play", live: "live_views", live10: "live_effective_views",
};

// Fill unscored (custom) metrics by evaluating the preset's expression
// against the row's raw API metrics — same ctx shape as the scorer
// (raw inputs + HR/PVR/EDSraw/ACS intermediates + metric params).
// Server-computed scores are never overridden; failures → null.
export function applyCustomScores(
  scores: Record<string, number | null> | null | undefined,
  metrics: Record<string, number> | null | undefined,
  defs: any[]
): Record<string, number | null> {
  const out: Record<string, number | null> = { ...(scores ?? {}) };
  if (!metrics) return out;
  const raw: Record<string, number> = {};
  for (const [k, api] of Object.entries(INPUT_MAP)) raw[k] = Number(metrics[api] ?? 0);
  const HR = raw.imp ? raw.sfv / raw.imp : 0;
  const PVR = raw.imp ? raw.prof / raw.imp : 0;
  const EDSraw = raw.likes ? (raw.sh + raw.com + raw.fol) / raw.likes : 0;
  const ACS = raw.sfv ? raw.spend / raw.sfv : 999;
  for (const d of defs ?? []) {
    if (!d?.short || !d?.expression || out[d.short] !== undefined) continue;
    try {
      const ctx = { ...raw, HR, PVR, EDSraw, ACS, ...((d.params ?? {}) as object) };
      const v = Function("c", "with(c){return (" + d.expression + ")}")(ctx);
      out[d.short] = typeof v === "number" && Number.isFinite(v) ? v : null;
    } catch {
      out[d.short] = null;
    }
  }
  return out;
}

// Display units per score short. Mirrors the static scorer shapes
// (ttam-presets route SCORER_SHAPE); DB preset `format` wins at render.
export const SCORE_FORMATS: Record<string, string> = {
  ERRI: "%", HPS: "%", EDS: "%", HRQ: "%",
  ACS: "RM",
};

// Human-readable formulas per built-in short (transcribed from
// scoreTtamRow in gmv.ts + the static scorer shapes). Custom metrics
// show their own DB `expression` instead.
export const SCORE_EXPRESSIONS: Record<string, string> = {
  ERRI: "imp ? live / imp * 100 : 0",
  HPS: "HR * 100  (HR = sfv / imp)",
  ACS: "sfv ? spend / sfv : 999",
  CES: "cesX * HR * PVR * EDSraw / ACS  (cesX = 10000)",
  EDS: "EDSraw * 100  (EDSraw = (sh + com + fol) / likes)",
  VVES: "(HR * awt) / ACS",
  RVS: "awt / ACS",
  HRQ: "reach ? sfv / reach * 100 : 0",
  RES: "((sfv / reach) * resX) / (spend / reach)  (resX = 10)",
  LQS: "spend ? live10 / spend * 100 : null",
  BCE: "bcX * HR * PVR / ACS  (bcX = 1000)",
};

// Raw input keys usable in custom expressions (INPUT_MAP) plus the
// precomputed intermediates. Shown as a legend in /presets.
export const EXPRESSION_KEYS =
  "spend, imp, clicks, reach, sfv, prof, likes, sh, com, fol, awt, live, live10 + HR, PVR, EDSraw, ACS + preset params";

// One renderer for every score cell: "%" → 12.50%, "RM" → RM 0.0234
// (ACS keeps 4 decimals, other money 2), else plain 2 decimals.
// Non-finite → "–" (same empty glyph the tables already use).
export function formatScore(short: string, format: string | null | undefined, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  if (format === "%") return `${v.toFixed(2)}%`;
  if (format === "RM") return `RM ${v.toFixed(short === "ACS" ? 4 : 2)}`;
  return v.toFixed(2);
}
