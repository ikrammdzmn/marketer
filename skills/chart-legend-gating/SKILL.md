---
name: chart-legend-gating
description: Multi-series Chart.js chart with legend-gated lines + synced KPI cards. Load before building or changing any chart with optional series.
---

# Chart legend-gating skill (repo-local, verified-only)

Lineage: creative-analysis v44 status-by-day chart, v45 deltas + rich
hover, v48 7 hidden stages. Copy behavior, not bugs.

## Layout (section scaffold)

- Header row: title + count subtitle (`— date (N rows)`) + Day/preset
  picker defaulting to newest (`renderSecDay`, `app.js:1655`).
- KPI card row: always-on series only. Second card row (`#secDayMore`)
  starts `display:none`; whole row hides when no extra series is on.
- Canvas in `.chart-wrap`; caption below stating column grain, delta
  polarity, and "click any legend entry to show or hide."
  (`index.html:330-355`).

## Series definition

- One `SECDAY_SERIES` array (`app.js:1616`): `{key, label, color}` per
  line; optional lines add `ext: true, id: '<CardSuffix>'`.
- One column per data file, oldest→newest, never summed across files
  (ranges count as one). Counting function respects slicer facets but
  deliberately bypasses the facet that would filter the breakdown away
  (here: Status/2nd-status/Type/Insight/Hide-Ineligible bypassed —
  else the stages filter themselves out; `app.js:1581-1586`).

## Interaction (the gating pattern)

- Extra lines start `hidden` unless `state.secExt[key]` is on
  (`app.js:1703`); legend shows them struck-through until clicked.
- Custom `legend.onClick` (`app.js:1710`): toggles dataset visibility,
  records `state.secExt[key] = vis` for `ext` series, `ch.update()`,
  then `syncSecCards(ch)`.
- `syncSecCards` (`app.js:1633`): each extra card (`secDayCard<ID>`)
  shows only while its legend entry is visible; second row hides when
  none are on. Visibility is in-memory only — reload resets to the
  default set, never persisted.
- Hover: `interaction` + `tooltip` both `mode: 'index'`
  (`app.js:1707-1727`) — one hover previews all visible values, each
  with its inline vs-prev move (`(+N)`). First column shows no move.

## Deltas (absolute variant)

- `setSecDelta` (`app.js:1645`): `+N / −N / ±0 vs prev`, grey
  `– first file` on the first column. Normal polarity (up = green,
  down = red); pass `bad=true` for bad-news series (a rise is negative
  → colours flip). Absolute counts here — for the % variant see
  `calendar-picker` (shop-calendar cards).

## Reuse checklist (per new usage)

1. Series table with `ext` flags + card IDs — defaults die without it.
2. Decide the bypass set: which facets the breakdown must ignore.
3. Legend `onClick` writes visibility state AND calls card sync —
   never one without the other. 4. Second card row starts hidden.
5. `state.secExt`-equivalent stays in-memory (document if a page ever
   needs persistence — none does today).

## Evidence index

creative-analysis `app.js:1576-1734` (`statusByDay`/`SECDAY_SERIES`/
`syncSecCards`/`setSecDelta`/`renderSecDay`), `index.html:330-355`,
`plan.md` (v44 status-by-day, v48 hidden stages), `CHANGELOG.md`
(v44/v45/v48), `AGENTS.md` (status-by-day rule).
