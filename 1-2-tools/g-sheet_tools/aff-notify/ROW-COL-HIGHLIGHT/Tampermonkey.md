# Tampermonkey.md - browser-side helpers (local-only, instant)

Scope: page tweaks via Tampermonkey. No server, no email/Telegram, no
trigger changes. Complements `code.gs` (which paints real cells).

## Built

- `crosshair.user.js` v1.4 (PRIMARY - owner uses this only): instant mouse
  crosshair lines on `docs.google.com/spreadsheets/*`, on ALL sheets/tabs
  (tab gate removed in v1.2). SET popup on pill: 5 color swatches +
  thickness slider (2-16px), persisted in localStorage; row-only mode toggle
  (hides vertical line). FREEZE button + hotkey (default `Alt+R`,
  remappable in popup) pins the horizontal line for row comparison.
  Draggable ON/OFF pill (click toggles, drag by
  label, state + position persist). Limit: Sheets grid is canvas, so lines
  follow the cursor; real cell fill would need `code.gs` (deprecated, see
  below).
- `code.gs` (DEPRECATED 30 Sep 2026, fallback only): bound-script crosshair
  with marker-derived scope + scope-only paint. Shelved - Apps Script
  round-trip lags (~1s/click).

## Possible features

### Sheets (Affiliate Collection)
1. Header boost: strengthen active row-number / column-letter highlight.
2. Hide block 3: one-click collapse of NMR/FATIGUE/REJECTED rows.
3. Copy helpers: per-row button to copy username + video link.
4. Status tint: boost PENDING ADS RUN / RUNNING / overdue text contrast.
5. Jump to due: keyboard shortcut to next RUNNING row with N <= today.
6. Row-only fast mode: thinner overlay variant for low-end machines.

### Portals (gmvmax-auto, tiktok-account)
7. Auto-fill: remember and fill repeated campaign fields.
8. Copy IDs: one-click copy of SKU / video ID / campaign ID.
9. ROI flags: tint rows breaching guardrails (ROI, CPA).
10. Declutter: hide unused panels, widen key tables.

### General
11. CSV grab: download visible table as CSV.
12. Shortcuts: custom hotkeys for repetitive clicks.
13. Focus mode: dim everything except the active table.

## Will not do in Tampermonkey

- Sending email/Telegram digests (stays in bound Apps Script).
- Installing/reading Apps Script triggers.
- Anything needing secrets (tokens stay in Script Properties).
