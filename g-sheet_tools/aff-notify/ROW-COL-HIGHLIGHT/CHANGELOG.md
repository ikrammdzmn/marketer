# CHANGELOG - ROW-COL-HIGHLIGHT

## 30 Sep 2026 (uncommitted)
- `code.gs` DEPRECATED (owner uses `crosshair.user.js` only - Apps Script
  round-trip lags; kept as fallback, do not extend).
- `code.gs`: dynamic scope (rows 9..2nd `end` in col B, was hardcoded
  `A8:O47`) + scope-only paint + same-cell skip + per-key property cleanup
  (was `deleteAllProperties`, would wipe `tg_bot` keys) + stale-geometry
  fallback in restore.
- `crosshair.user.js` v1.0 (NEW): instant cursor lines on Sheets pages
  (`LINE_PX`, tab-gated).
- `crosshair.user.js` v1.1: thicker lines (`8px`) + draggable ON/OFF pill
  with persisted state/position.
- `Tampermonkey.md` (NEW): built list + 13 possible features + will-not-do.
