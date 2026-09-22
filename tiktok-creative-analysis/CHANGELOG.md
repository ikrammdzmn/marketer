# Changelog — TikTok Creative Analysis Tool

Newest first, in plain words. `plan.md` is the live checklist; this file is the
release record. The `app.js?v=N` tag is a cache-buster counter (it keeps rising:
v15, v16, …) — the headings below are releases in the order they shipped.

## v47 — 22 Sep 2026 — Dot-only hover on Trend charts (declutter)

The Trend per creative chart (and solo popup) now pop up only when hovering a dot —
overlapping dots show both lines — instead of listing all 10 lines everywhere.
Dots keep their slim look but carry a fat invisible hit zone, so they're easy to
hit. Values, truncation, gap handling and vs-prev moves are unchanged. The 5-line
status chart keeps its all-at-once hover.

## v46 — 22 Sep 2026 — Trend chart hover previews all lines + moves

The Trend per creative chart now previews all 10 lines at the hovered day in one
box, each with its move vs the previous file (videos absent that day stay out of
the box). The enlarged solo popup chart hover shows the value plus its move too.

## v45 — 22 Sep 2026 — Day deltas + rich hover on status-by-day

Each of the 5 status cards now shows its move vs the previous loaded file (green
`+`, red `−`, grey on the first file). Hovering any day on the chart previews all
5 values with their moves in one box.

## v44 — 22 Sep 2026 — Exploration status by day (KPIs + day-by-day chart)

Bottom of the Trend section gains **Exploration status by day**: a Day picker plus
5 headline numbers (Available, Explored, Outstanding, Exploring, Performing) for the
picked file, with a 5-line chart across all loaded files. Each loaded file — single
day or range — counts as one column, never summed. Available follows TikTok's rule
(rows minus Not active / Unavailable / Rejected / Excluded / Authorization needed).

## v43 — 22 Sep 2026 — Exploration guide + clickable 2nd-status pills

Top creatives gains a collapsible **Exploration guide** (all 10 TikTok stages with
plain definitions, next to the Insight guide). Every 2nd-status pill — in the tables,
account popup, guide and preview — now shows its meaning on hover and opens a popup
on click. `Excluded` and `Not active` get their own badges instead of the generic dot.

## v42 — 20 Sep 2026 — Manage accounts CSV export + Last updated column

The Manage accounts popup gains a **Download CSV** button next to Download JSON:
Account name, Username, Account ID, Note, Active / Live / Top affiliate
(TRUE/FALSE) plus the **Last updated** save stamp per row (blank until its first
save). The popup header row now labels the Last updated column too.

## v41 — 19 Sep 2026 — Auto-pick Combine for non-overlapping files

Loading 2+ dated files with no overlap now lands on Combine days automatically
(true period totals in the main tables); overlapping or dateless sets stay on
Latest − Baseline. Manual flips always win until the file set changes, and the
status line announces every auto-switch.

## v40 — 19 Sep 2026 — ROI / CPM / AOV trend metrics

The Trend metric switcher gains ROI, CPM and AOV (per-file values, same chart +
sparklines + sorting). Total sort for these three is recomputed from summed
revenue/cost/orders/impressions — never summed ratios.

## v39 — 19 Sep 2026 — Trend chart legend shows Post IDs

The daily line chart above the Trend table labeled its lines with creative
titles (often identical prefixes, unreadable). Lines are now labeled `Post ID ·
account` — hovering any point still reveals the creative title with the value.

## v38 — 19 Sep 2026 — Click-to-copy Post ID in Top + Compare

Top creatives and Compare Post IDs copy on click, same as Trend (with the same
trailing-digit tooltip) — plus a pointer/hover hint so the affordance is
visible. Rechecked everywhere: Trend table + solo popup already copied; the
account popup has no Post ID column (nothing to copy there); Preview/CSV carry
plain selectable IDs.

## v34 — 19 Sep 2026 — Trend line chart

The Trend section gains a daily line chart above the table: top 10 creatives by
the current sort, current metric on the axis, gaps where a video was absent that
file, legend click toggles lines. Follows the same filters as the table.

## v35 — 19 Sep 2026 — Per-row sparklines

Every trend row carries its own mini daily-shape graph (Shape column, inline
SVG, gaps for absent days, exact values on hover). Per-row scale — compare
shapes within a row, numbers across rows. The top-10 overview chart is
unchanged.

## v36 — 19 Sep 2026 — Trend solo popup

Clicking a trend row's Shape graph opens an enlarged single-creative popup:
bigger daily line (current metric, gaps for absent days) plus Total / Latest /
Δ / Days-present mini cards. Closes via ✕, backdrop click or Escape, same as
the other popups.

## v37 — 19 Sep 2026 — Post ID column in trend

Trend rows lead with a mono Post ID column (right after Move) instead of
title-only — consistent with the Top and Compare tables. Clicking any ID copies
it (pairs with Search's paste-ID mode); the solo popup shows the same copyable
ID line. Footnote warns 19-digit IDs may differ in trailing digits.

## v33 — 19 Sep 2026 — Newest means newest-by-date

The pre-ticked file (and single Load bundled) picked the last filename
alphabetically — lowercase `creative…` sorts after `Creative…`, so the older
bulk file won over newer himcoffee files. Both now use the dataset end-date
from the filename instead.

## v32 — 19 Sep 2026 — Trend per creative

New section for 2–7 files: one row per video with a column per loaded file
(oldest → newest), switchable metric (revenue/orders/cost/impressions), sort by
total/latest-day/Δ, `–` where the video was absent that file, plus a long-format
trend CSV (one row per video per file) for pivoting. Respects the Account /
Campaign / Search filters.

## v31 — 19 Sep 2026 — Product ID from filename

Single-campaign exports carry no Product ID column, so the Product column showed
`–`. Blank product IDs now inherit the `Product {ID}` stated in the filename
(bulk rows keep their own), resolving to the catalog name like everything else.

## v30 — 19 Sep 2026 — Himcoffee folder retagged to campaign ID

The `1. himcoffee` folder was tagged with the product ID (`…298210`) instead of
its campaign ID. Verified against the bulk export (24,560 rows tie that product
to campaign `1858977225474178` = `[HIMCOFFEE MAIN 1]`) and renamed the folder
accordingly; the fallback path follows it. The `Unnamed campaign` note for those
files clears on reload since the campaign is already named in the catalog.

## v29 — 19 Sep 2026 — Hint names the unnamed IDs

Hovering the amber catalog hint now lists the actual unnamed campaign/product
IDs (first 10) in a tooltip, so you know exactly which entries to add instead
of guessing.

## v28 — 19 Sep 2026 — Archived catalog section

`catalog.json` gains an `archived` section: the 2 unused campaigns and 13
deactivated products moved out of the active lists. Lookups check active first,
then archived, so old files showing those IDs keep their friendly names and
the unnamed hint stays quiet for them.

## v27 — 19 Sep 2026 — Product tied to campaign, no bare IDs

Products now carry their campaign tie: a `campaignId` link field in
`catalog.json` (pinned by you; otherwise derived per session from the loaded
files), shown in the product hover title and used to group unnamed products by
campaign in the amber catalog hint. Bare IDs no longer stand alone anywhere —
unnamed campaigns show `Unnamed campaign` and unnamed products
`Unnamed product` (filter, tables, compare, CSV display columns, picker chips);
raw IDs survive only in hover tooltips and CSV ID columns.

## v26 — 19 Sep 2026 — Bundled picker grouped by folder

Choose bundled files now groups files under collapsible folder headers (loose
files under Top level; empty campaign folders shown greyed as-is). Ticking a
folder selects all its files (indeterminate state when partial), the Load
button shows a live `selected · max 7` count, and the newest file's folder
starts open. `/api/files` also reports empty folders.

## v25 — 19 Sep 2026 — Bundled picker via /api/files

The picker no longer depends on the server's HTML directory listing: `server.py`
gains GET /api/files (top-level + one subfolder level as JSON), tried first,
with the HTML listing as fallback for plain `python -m http.server`. If neither
works (e.g. Live Server), the picker says so and points at `python server.py`
instead of silently showing one stale file.

## v24 — 19 Sep 2026 — Fallback file fix

The last-resort bundled fallback still pointed at a top-level file that has
since moved into a campaign subfolder (picker showed one stale file, Load
bundled 404'd when the server listing couldn't be read — usually a cached old
`app.js`). It now points at an existing subfolder file and keeps its folder
path, so the fallback resolves if it is ever needed.

## v23 — 19 Sep 2026 — Source-file subfolders + folder [id] labels

`source-file/` now reads loose xlsx files and one level of campaign subfolders
together (e.g. `himcoffee - [123]/file.xlsx`, `bulk/file.xlsx`). A folder named
`name - [digits]` tags its files with that ID (label only, rows never dropped;
blank Campaign IDs inherit it for display/compare/CSV). The picker and file list
show `folder / file` plus `[id]` chips, and loading only from one `[id]` folder
pre-sets the Campaign facet when that campaign exists.

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
