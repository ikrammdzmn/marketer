---
name: ttam-metrics
description: TTAM metric glossary + kill/scale/watch verdicts for the TTAM METRICS workbook. Load before any TikTok metrics, verdict, band, or OMTM work.
---

# TTAM metrics glossary (repo-local)

Authoritative metric reference: Google Sheet `TTAM METRICS`
(`1j4n8sQrXEpiorixAVFArxm_hKbn3kmtEqiXeJIyAz4k`).
Tabs: `READ ME` (how-to + CPL/quartile slots) | `All Metrics`
(143 native deduped + 11 custom OMTM) | `Guardrails` (owner rules).
Service account `gsheet-mcp@mcp-tools-509106.iam.gserviceaccount.com`
needs Editor share (human creates + shares).

Related repo-local skills (do not duplicate, cross-load):
- `skills/tiktok-api/` — verified TikTok API shapes. Load before API work.
- `skills/tiktok-shop/` — Shop orders sync, token refresh, MYT bucketing.
- `3-ttam/campaign-performance-analysis/` — Metric Scorer (11 OMTM engine,
  quartile-calibrated v3 bands, `:8123`). OMTM specs live in `metric.md`.
- `1-knowledge/tiktok-strategy/` — guardrails owner (ROI >= 7.0,
  CPA <= RM21.18). Automation obeys, never re-derives.

## Procedure

1. Read this skill's `verdicts.md` (numbers) + `links.md` (official sources).
2. For row-level work, read the sheet first (`All Metrics`, `Guardrails`,
   `READ ME`) — the sheet is newer than this file whenever they disagree;
   then propose a skill update.
3. Count metrics never kill standalone — always pair with
   `Spend >= RM50 + 0 sales`.
4. Bands from export quartiles, never theory. Drop `Total of N` rows before
   any calibration math.
5. Keep junk rows (`Other` x4) as `--`; never score them.

## Boundaries

- Repo guardrails win over TikTok generic benchmarks:
  ROI >= 7.0, CPA <= RM21.18 (`1-knowledge/tiktok-strategy/`).
- CPL has no cap until the owner sets the lead close rate:
  `Max CPL = 21.18 x close rate`. Never silently reuse CPA as CPL.
- OMTM rows are computed (Count `0 (computed)`), not TikTok-native.
  ACS is inverted (lower is better); flip Kill/Scale for it.
- Keep every account change as a draft until the owner approves.
