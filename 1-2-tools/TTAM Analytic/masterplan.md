# TTAM Analytic — Tampermonkey row highlight (masterplan)

> Local-only browser highlight for TikTok Ads Manager TTAM tables.
> No server, no npm, no build, no secrets. Mirrors the
> `g-sheet_tools/SHEET HIGHLIGHT` pattern (`crosshair.user.js` + `Tampermonkey.md`).

## 1. Goal
Highlight Ads Manager Campaign / Ad group / Ad rows using predefined metric
thresholds, so the owner sees KILL / WATCH / SCALE at a glance in the same
table as the screenshot (Spend, Impressions, CPM, New consideration size,
Cost per consideration, New consideration rate, Cost per assisted new
customer, Assisted new customer rate, Assisted new customers, 6-second
focused views, …).

## 2. Non-goals
- No data fetching (uses only the visible table DOM).
- No writes to TikTok (display wash only, like crosshair lines).
- No secrets (thresholds are plain numbers, pasted from the registry).

## 3. Threshold source (locked)
Paste from `2-gmvmax/gmvmax-auto/ttam-metric-registry.md` (raw OMTM-style
`Kill`/`Scale`, `Watch` implicit middle, costs invert):
- v1 columns: `spend`, `cpm`, `impressions`, `new_consideration_size`,
  `cost_per_consideration`, `new_consideration_rate`, `engaged_view`
  (= 6-second focused views, verified G1 OK).
- Excluded v1: all three `assisted_*` + `engaged_view_rate` (probe FAIL
  40002, UI shows 0 — highlighting them would be noise).
- Later groups (Reach, Shop) = same script, new threshold paste.

## 4. Design
- `@match`: Ads Manager campaign/adgroup/ad report pages (narrow first,
  widen after v1 green).
- Header-name parsing (not column index): match normalized header text
  (`spend`, `cpm`, `new consideration size`, `6-second focused views`, …),
  so column reorder / added columns don't break it.
- Per-row eval: parse cell text (strip `MYR`, `,`, `%`) → number →
  compare vs Kill/Scale + direction → row class
  (`ttam-kill` red wash / `ttam-scale` green wash / `ttam-watch` amber or none).
- Chrome: legend + ON/OFF pill (draggable, persisted like crosshair pill),
  settings popup for threshold paste (localStorage), row-only wash (no cell
  edits, same philosophy as crosshair v1.4).
- Dynamic DOM: `MutationObserver` re-run on sort / page / tab switch
  (Ads Manager re-renders); debounce + disconnect-safe.
- Draft campaigns row (`You have 37 draft campaigns`) skipped (no metrics).

## 5. Files (this folder)
- `masterplan.md` (this file — locked decisions).
- `plan.md` — build checklist (v1 steps, per-change verify).
- `ttam-highlight.user.js` — the userscript (v1).
- `thresholds.json` — pasted registry Kill/Scale (v1 values + date).
- `DEV_NOTES.md` — session handoff.
- `feature.md` — owner user guide (non-technical).
- `CHANGELOG.md` — releases.

## 6. Verify (per change)
1. Load script on the screenshot's Campaign table: washes appear on data rows only.
2. Sort + page + switch Campaign/Ad group/Ad: washes re-apply, no console errors.
3. Change a threshold in popup: affected rows re-tint without reload.
4. `git status` clean of secrets (thresholds are plain numbers — fine).

## 7. Phases
- P0: v1 script + thresholds.json (Brand columns) + pill/legend, owner-tested on live table.
- P1: Reach + Shop threshold packs (same script, new paste).
- P2: per-metric reason tooltip (which metric fired KILL/SCALE), CSV grab of flagged rows (mirrors Tampermonkey.md #11).
