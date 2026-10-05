# AGENTS.md — Sales Performance Analysis System

Static sales analysis tool (plan only, no code yet). Pure HTML/CSS/vanilla JS when built — **no npm, no build, no framework**. Keep it that way.

## Files (planned)

- `plan.md` — status checklist (DRAFT 05 Oct, 1–5 Oct Him.DrSamhan). Owner-moved here from `sales-performance-analysis/plan.md`. User reads this file.
- `DEV_NOTES.md` — private handoff (vibe + facts + bugs 1–6 + lessons).
- `feature.md` — non-technical guide (TTAM = reach, GMV Max = sales, ROI 7.0).
- `CHANGELOG.md` — release record, newest first (v0 plan only).
- `source-file/` (future) — input xlsx, read-only. Never hand-edit.
- Distinct from `3. TTAM/campaign-performance-analysis/` (Metric Scorer, 11 OMTM, :8123) — do not merge unasked.

## Data quirks (do not re-derive)

- TTAM report has NO sales columns — judge on CPM/Impr/CTR/CPC only; `Conversions` col is traffic, mark 0 sales explicitly.
- `Total of N results` row is a cross-check total — exclude from sums (double-count trap).
- `ExportAds_V2_*` is config-only (163 cols, no spend/GMV) — never load as performance.
- Attribution gap: GMV Max GMV (61,515) > shop GMV (58,839); LIVE cost 4,001 vs 4,007 — flag, never subtract to fake TTAM ROAS.
- Guardrails owned by `tiktok-strategy/` (ROI ≥7.0). Obey, never re-derive.

## Rules

1. Never invent campaign/account names — exact TikTok spelling, full names in tables/CSV.
2. Static + localhost (`127.0.0.1`) only. Secrets never in git/chat.
3. Short replies; code only on explicit go. Plan stays ticked; commit/push only when asked.
