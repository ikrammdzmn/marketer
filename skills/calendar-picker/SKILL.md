---
name: calendar-picker
description: Date-range picker pattern (preset rail, two-month grid, caps, day states). Load before building or changing any date picker.
---

# Calendar picker skill (repo-local, verified-only)

Lineage: v51-port `DateRangePicker.tsx` (dashboard) + v52 single-click fix
+ v51 shop-calendar rebuild (creative-analysis). Copy behavior, not bugs.

## Layout

- Left preset rail: Today / Yesterday / Last 3 / This week / Last week /
  This month / Last month / Last 7 / Past 7 / Last 14 / 30d, plus
  Last 3 / 6 / 12m (90/180/365d) on long pages only,
  anchored to latest data date (never wall-clock alone).
- Two-month grid side by side; « ‹ ✕ › » nav clamped to data months
  (disabled bounds at edges); month-jump input.
- Per-page day cap via `maxDays` prop (default 31; long pages 365) +
  `showLong` for the 3/6/12m presets; labels read the prop.

## Interaction

- Two-click range + hover preview (second click confirms, hover shows
  candidate range). Pending pick clears on popup open/close so one click
  always lands a single day (v52).
- Preset hover preview (Nov 2026): hovering a preset highlights its dates
  on the visible grid + footer shows its range — never jumps the month
  view. Two-click anchor flow wins while picking.
- Future dates disabled, no-data dates dim. Day cells as table buttons
  with dim/disabled/selected/in-range states + hover preview.
- ≥2-files-in-window enable rule for presets (fewer = disabled preset).

## Cards + deltas (shop-calendar variant)

- KPI cards with top-right checkbox, MYR suffix, teal selected border.
- vs-previous % deltas, period-over-period; cost-down-good polarity;
  partial-day note; `—` fallback. Same-unit metrics share one axis;
  theme-aware grid.

## Reuse checklist (per new usage)

1. Anchor source (latest file? today MYT? Neon max date?) — presets die
   without it. 2. `maxDays` prop + labels + footer read it. 3. Enable rules per
   preset. 4. Dark-mode chip classes match host page. 5. Single-click
   clears pending range.

## Marketer HW lessons (Oct 2026, verified)

- Stacking: Shell bar is `z-30`, picker panel must be `z-50` with a
  transparent `z-40` click-catcher. Never nest the panel `absolute`
  inside a `z-10` page header — the parent stacking context pins it
  behind the Shell bar. Keep it `fixed` at root, positioned from the
  button `getBoundingClientRect()` + viewport clamp.
- Anchored popover, not centered modal: pin under the Range button
  (`top: rect.bottom+8, left: rect.left`), clamp off right/bottom
  edges; Esc / outside-click closes; stays `fixed` so page scroll
  doesn't detach it.
- Mobile: single month only (`right` month wrapped `hidden md:block`),
  preset rail becomes wrapping chips (`flex-wrap`), panel
  `w-[calc(100vw-1rem)] max-w-[340px] max-h-[85vh] overflow-y-auto`;
  on narrow screens force `left:8/right:8`.
- Presets include Last 3 days between Yesterday and Last 7
  (`applyPreset` handles all `days:N` entries generically).
- One shared `DateRangePicker.tsx` serves every online page (gmv-max,
  shop-live, creative import it) — edit once, all pickers sync. Caps
  diverge per page via `maxDays` + `showLong` props (gmv-max + shop-cost
  take 365; rest stay 31).
- Week presets (Nov 2026, TikTok parity): This week (Sun→today), Last
  week (prior Sun→Sat). Sunday-first via a MYT-aware weekday helper
  (UTC+8 math) — server-local `Date` math shifts week edges on UTC
  clocks. Dual Last-7: "Last 7 days" = today−7→today (8 dates, TikTok
  match), "Past 7 days" = today−7→yesterday (7 closed) via a generic
  `days:N` branch plus one closed-range special. All fit their caps;
  year boundaries fall out of `isoMonth`/`isoAdd` overflow.
- Range buttons render `rangeLabel` (pure, lives in ttam-scores so client
  files may import it): single day → one `dd-mm-yyyy` + ` (Today)` /
  ` (Yesterday)`; multi-day → `dd-mm-yyyy – dd-mm-yyyy`.
- Never use native `<input type="month">` for month-jump: its
  dropdown is browser chrome, unthemeable, and silently dead on some
  browsers/schemes. Use month-name + year `<select>`s on the same
  `YYYY-MM` state, clamped to `[MIN_MONTH, maxMonth]`, out-of-range
  months `disabled` per selected year.
- Footer shows live selection in `dd-mm-yyyy`: preset-hover range first
  (`01-11-2026 – 07-11-2026 · 7 days · Last week`), then
  `anchor · pick end date…` after first click, `lo – hi · N days`
  hover preview; max-cap warning overrides.

## Evidence index

v51/v52 (dashboard), v51 shop rebuild + v52/v53/v54 (creative-analysis
`plan.md`, `CHANGELOG.md`).
