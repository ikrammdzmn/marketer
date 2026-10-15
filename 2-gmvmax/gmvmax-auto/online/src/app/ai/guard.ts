// app/ai/guard.ts — client-safe AI guardrail store (localStorage).
// Analysis-only inputs. Canonical strategy guardrails live in
// 1-knowledge/tiktok-strategy/ (automation obeys those, never these).

export type AiGuardrails = { minNetRoi: number; maxCpa: number; feeRate: number };

export const AI_GUARD_DEFAULTS: AiGuardrails = { minNetRoi: 7.0, maxCpa: 21.18, feeRate: 0.25 };

const KEY = "ai-guardrails";

function clamp(n: number, lo: number, hi: number, fb: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
}

export function sanitizeGuardrails(raw: Partial<AiGuardrails>): AiGuardrails {
  return {
    minNetRoi: clamp(Number(raw.minNetRoi), 1, 30, AI_GUARD_DEFAULTS.minNetRoi),
    maxCpa: clamp(Number(raw.maxCpa), 1, 500, AI_GUARD_DEFAULTS.maxCpa),
    feeRate: clamp(Number(raw.feeRate), 0, 0.6, AI_GUARD_DEFAULTS.feeRate),
  };
}

export function loadGuardrails(): AiGuardrails {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitizeGuardrails(JSON.parse(raw));
  } catch { /* defaults */ }
  return { ...AI_GUARD_DEFAULTS };
}

export function saveGuardrails(g: AiGuardrails): void {
  localStorage.setItem(KEY, JSON.stringify(sanitizeGuardrails(g)));
}
