# Changelog — TikTok Creative Analysis Tool

Newest first, in plain words. `plan.md` is the live checklist; this file is the
release record. The `app.js?v=N` tag is a cache-buster counter (it keeps rising:
v15, v16, …) — the headings below are releases in the order they shipped.

## v14 — 17 Sep 2026 — Picker filename chips

The bundled file picker reads more from file names, still without opening any file:
one-day files show a single date (`2026-09-13`), ranges show `from → to · N days`,
single files carry their product name (`SKU HIMCOFFEE`), and bulk files are badged
from the name. 1-day bulk shows as `2026-09-13 · bulk`.

## v13 — 17 Sep 2026 — Insight verdict filter

New Insight dropdown in the filter card: show only 🚀 Boost videos, only 🛑 Review,
and so on — across KPIs, tables, popup, preview and exports. `?insight=Boost` links
now filter to those videos too (open link, load your file, you're looking at them).

## v12 — 17 Sep 2026 — Unknown-account split

Videos with no account name are no longer all lumped as Product Card. True catalogue
rows stay `Product Card`; real videos with a blank account get their own
`Unknown account` row with normal verdicts. In the bulk file this unveiled 2,708
videos (63 orders, RM6,988 revenue) that were hiding under Product Card — including
live Exploring videos previously mislabelled 📇 Catalogue. Single-file behaviour
unchanged.

## v11 — 17 Sep 2026 — N/A products tied to their campaign

Rows with Product ID `N/A` now show as `Product Card - {campaign}` (e.g.
`Product Card - [Kombo]`) in tables, preview and exports, instead of a bare `N/A`.
The amber "unnamed" note no longer counts `N/A`.

## v10 — 17 Sep 2026 — Insight guide, popup, deep-link

Collapsible Insight guide under the benchmark bar lists every verdict with the
current file's live thresholds. Clicking any verdict chip opens that video's
explanation with its own numbers. `index.html?insight=Boost` links straight to a
verdict's rule.

## v9 — 17 Sep 2026 — Hide Ineligible tick

New default-on tick drops dead `Ineligible` rows (no views, no cost, no orders —
including deactivated SKUs) from every number, table and export, plus the compare
table. Videos that moved status stay visible.

## v8 — 15 Sep 2026 — Multi-file compare, bulk dialect, catalog

Load up to 7 files: baseline→latest change table (NEW/LOST/KEPT) plus a
Combine-days sum mode. Bulk product-campaign exports work (Campaign filter/column,
derived ROI, `~`-hours periods, bundled checkbox picker). `data/catalog.json` gives
campaigns and products friendly names you maintain yourself.

## v0–v7 — early builds, 13–14 Sep 2026 (grouped; unversioned at the time)

- Initial tool: drag-drop xlsx, filters, KPI cards, top creatives + per-account
  tables, chart, CSV/JSON export, 10-account allowlist, local server + saver, dark mode.
- Manage accounts popup, saver self-diagnosis, double-click launcher, bundled file
  loader, period display.
- Product Card normalisation, Posted date + age filter, insight verdicts, SOP target
  bars, exploration status badges.
- Preview tab, derived CPM/AOV, usernames/notes display, allowlist coverage hints,
  1000+ impressions tick, grouped account dropdown, search suggestions, Post-ID
  search, account detail popup, general notes.
