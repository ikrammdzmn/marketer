---
name: calendar-picker
description: Date-range picker pattern (preset rail, two-month grid, caps, day states). Load before building or changing any date picker.
---

# Calendar picker skill (repo-local, verified-only)

Lineage: v51-port `DateRangePicker.tsx` (dashboard) + v52 single-click fix
+ v51 shop-calendar rebuild (creative-analysis). Copy behavior, not bugs.

## Layout

- Left preset rail: All time / Today / Yesterday / Last 7 / 30d / 3 / 6 / 12m,
  anchored to latest data date (never wall-clock alone).
- Two-month grid side by side; « ‹ ✕ › » nav clamped to data months
  (disabled bounds at edges); month-jump input.
- 31-day cap on ranges (single shared constant, read by labels).

## Interaction

- Two-click range + hover preview (second click confirms, hover shows
  candidate range). Pending pick clears on popup open/close so one click
  always lands a single day (v52).
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
   without it. 2. Cap constant + labels read it. 3. Enable rules per
   preset. 4. Dark-mode chip classes match host page. 5. Single-click
   clears pending range.

## Evidence index

v51/v52 (dashboard), v51 shop rebuild + v52/v53/v54 (creative-analysis
`plan.md`, `CHANGELOG.md`).
