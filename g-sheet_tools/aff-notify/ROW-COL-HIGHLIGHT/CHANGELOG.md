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
- `crosshair.user.js` v1.2: works on ALL Google Sheets (removed
  `Affiliate Collection` tab gate); renamed to `Google Sheets Crosshair`.
- `crosshair.user.js` v1.3: SET popup (5 color swatches + thickness slider
  2-16px, persisted) + row-only mode toggle.
- `crosshair.user.js` v1.4: FREEZE button + hotkey (default `Alt+R`,
  remappable in SET popup, Alt/Shift combos only) pins the horizontal line.
- `Tampermonkey.md` (NEW): built list + 13 possible features + will-not-do.
