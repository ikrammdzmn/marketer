# Changelog — TikTok Creative Analysis Tool

Newest first, in plain words. `plan.md` is the live checklist; this file is the
release record. The `app.js?v=N` tag is a cache-buster counter (it keeps rising:
v15, v16, …) — the headings below are releases in the order they shipped.

## v22 — 17 Sep 2026 — Hide inactive tick

New default-on tick drops every row from accounts unticked Active in Manage
accounts — KPIs, tables, popup, preview, exports and compare. Non-managed
accounts are never hidden; untick the tick to audit dormant accounts (nothing is
deleted). The Active tick finally does what it says.

## v21 — 17 Sep 2026 — Inactive section

A third Manager section at the bottom: unticking Active moves a row to
**Inactive** live (dragging across re-ticks to match, same as tops). Active state
wins grouping, so a dormant top affiliate sits in Inactive but keeps its T-Aff —
re-ticking Active restores it straight back to Top Affiliate. The filter dropdown
is unchanged (inactive accounts stay selectable, ⏸ flagged).

## v20 — 17 Sep 2026 — Per-account last-updated stamp

Manage accounts rows now show `Last updated: 17/9/26 (45 minutes ago)` (also in
the account popup title). The saver stamps only rows whose content actually
changed — reordering alone doesn't restamp, new rows stamp at creation, and rows
never saved show `–`. Server-local time.

## v19 — 17 Sep 2026 — Manager section headers

Manage accounts now groups rows under live **Internal Account** / **Top Affiliate**
headers (counts shown, Top below Internal — the header you asked for). Ticking
T-Aff moves the row instantly; dragging across groups re-ticks it to match; new
rows land in Internal. Same numbering, same drag, Save keeps everything.

## v18 — 17 Sep 2026 — T-Aff rename + account sections

The Manager tick is now **T-Aff**, and the account dropdown splits managed
accounts into **Internal Account** with **Top Affiliate** below it (ticking T-Aff
moves one there; the section hides when empty). Search suggestions tag tops too.

## v17 — 17 Sep 2026 — Top affiliate tick

One more tick per account in Manage accounts: **Top** marks top affiliates with a
⭐ TOP AFFILIATE flag next to their names everywhere. Saver validates + preserves
it like the other fields.

## v16 — 17 Sep 2026 — Manager row numbers + drag reorder

Manage accounts rows are numbered and can be rearranged by dragging the ⠿
handle — drop on a row's top half to land above it, bottom half for below
(reaching the end of the list), or on empty space to move last; a blue line
marks the landing spot and the dragged row ghosts. Saving keeps the shown order
everywhere (dropdown, tables, file). The
manager modal itself is now wider to fit the extra columns.

## v15 — 17 Sep 2026 — Account ID + Active/Live ticks

Each managed account can now carry an account ID plus **Active** and **Live**
ticks, edited in Manage accounts and preserved by the saver (old files gain
defaults on load). Live accounts show 🔴 LIVE and inactive ones ⏸ inactive next
to their names in the dropdown, suggestions, per-account table and popup; the
popup title also shows the account ID.

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
