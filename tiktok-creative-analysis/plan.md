# Marketer — xlsx analysis tool + accounts.json

Status: DONE (accounts.json + visualiser built, HTTP smoke test passed)

## 1. Goal
- Process/analyze/extract TikTok Creative xlsx (≈9.2k rows × 24 cols; TikTok swaps
  the file weekly — the loader auto-picks the newest in `source-file/`).
- Account allowlist as JSON objects {name, username, note} (Option 2).

## 2. Scope
- [x] `data/accounts.json` — 10 entries {name, username, note}, user spelling (status: done; `Affiliate Dr Samhan1` removed by user then `Dr. Samhan` added; `Dr Samhan Official4` kept with username)
- [x] Static tool `index.html` + `app.js` (SheetJS via CDN, Tailwind Play CDN, dark-mode class, 768px breakpoint) (status: done)
  - [x] Upload/drag-drop xlsx + auto-load `source-file/*.xlsx` when served over HTTP
  - [x] Filters: account (from accounts.json), status, creative type, search, min ROI/cost/orders
  - [x] KPIs: total cost, revenue, orders, avg ROI, avg AOV, impressions, avg CPM
  - [x] Top creatives table (sortable) + per-account summary
  - [x] Export filtered → CSV / JSON (with column picker)
  - [x] Preview button: same filtered set as Export, opened as a sheet-like table in a
    new tab (local-only, nothing uploaded) — resizable columns, click-to-expand cells, wrap-all toggle
  - [x] Derived CPM (Cost ÷ Impr × 1000): KPI card, both tables, CSV export, sort
  - [x] Derived AOV (Revenue ÷ Orders): KPI card, both tables, account modal, CSV + JSON export
  - [x] Allowlist usernames + notes: dropdown/suggestions/account table/modal/coverage show `Name (@username)` plus `— no orders yet` where set (matching stays exact on name)
  - [x] Allowlist spelling fix to match xlsx: `Affiliate Dr Samhan3/4` (no space), `Dr Samhan Official3` (typo fixed); `Dr Samhan Official4` kept intentionally (0 rows)
  - [x] Local saver `server.py` (stdlib only, 127.0.0.1): static + POST /api/accounts (validates ≤100 entries, timestamped backup, LF enforced)
  - [x] Manage accounts popup: edit/add/remove name/@username/note, Save (reloads list on success) + Download JSON fallback
  - [x] Saver self-diagnosis: GET /api/version fingerprint + per-cause Save errors (plain server / empty reply / validation), JS cache-buster in index.html
  - [x] `start-server.bat`: double-click launcher (checks python, opens browser, runs server.py; no IDE needed)
  - [x] `.gitignore`: saver backups (`data/accounts.backup-*.json`) + `__pycache__/` never show in git
  - [x] Bundled loader auto-detects the xlsx in source-file/ via server listing (latest by filename; falls back to the bundled constant) — survives weekly file swaps
  - [x] Period parser accepts bare `YYYY-MM-DD - YYYY-MM-DD` filenames (new TikTok naming has no "N days" prefix)
  - [x] Product Card: blank TikTok accounts (`''`/`'0'`/`'-'`) normalised to user-named `Product Card` (default catalogue promo, not a creative); `Exclude Product Card` tick (default off) filters it from KPIs/tables/chart/modal/preview/exports
  - [x] Posting date: `Posted` column (`10 Sep · 4d`, blanks show `–`) in top table, account modal, preview, CSV export; `Posted within (days)` filter (blank dates excluded when active; post date ≠ pool-entry time)
  - [x] Insight engine: file-adaptive benchmarks (median CPM, top-20 min impressions, median 2s rate/AOV, p90 ROI) + per-video verdict chips (Catalogue/Template/Review/Boost/Learning/Hook weak/retention cliff/Small basket) in top table, modal, preview, CSV
  - [x] SOP targets (`data/targets.json` {topN, minImpr, maxCPM}; blank = auto): benchmark strip above Top creatives with Top-N switcher (10/15/20/25), manual bars tagged `yours`, editable in Manage accounts, saved via POST /api/targets
  - [x] Exploration 2nd-status pill badges (✓ Performing, 🏆 Outstanding, 🛡 Underperforming + neutral pills for the rest) in top table, modal, preview
  - [x] Multi-file compare (up to 7 files): multi-pick upload / drag-drop / Load all bundled, baseline→latest Δ table (NEW/LOST/KEPT, ΔRevenue/Orders/Cost/ROI/Impr/CPM + status Δ, noise-greyed), Combine-days sum mode, overlap warning, compare CSV export
  - [x] Bulk product-campaigns dialect: header aliases (Video title→Creative, Video ID→Post ID), Campaign/CampaignID/ProductID carried, ROI derived when column absent, `~`-with-hours period parse, Campaign filter + column (Top/modal/compare/CSV/preview), N/A-ID text-fallback join, bundled checkbox picker (period + type badge, newest pre-ticked) with mixed-type/overlap/size warnings
  - [x] `data/catalog.json`: 4 campaign IDs + 18 product IDs from the 09-08 bulk file (labels blank for user to name); friendly labels in filter/tables/CSV/preview, Product column everywhere, unmapped-ID hint under the Campaign filter
  - [x] Allowlist coverage notes (webpage only): 0-row accounts flagged with did-you-mean hints, collapsible (default collapsed)
  - [x] Exploration secondary status: column + filter + CSV export
  - [x] 1000+ impressions tick (green ✓ in Impr. cell) + "Only 1000+ impressions" filter
  - [x] `Hide Ineligible` tick (default on): hides dead `Ineligible` rows (0 views/cost/orders, incl. deactivated SKUs) from KPIs/tables/chart/modal/preview/exports + compare (status-movers stay visible; picking Status=`Ineligible` explicitly bypasses it)
  - [x] Insight guide + popup + deep-link: collapsible guide under the bench bar (live file-adaptive thresholds per verdict), click any verdict chip for a per-video popup (verdict + numbers), `?insight=Label` expands the guide and jumps to that verdict
  - [x] `N/A` products show as `Product Card - {campaign}` (per-campaign catalogue label via friendly campaign name) in tables/modal/preview/CSV/compare; amber unnamed-count skips `N/A`
  - [x] Blank-account split: true catalogue rows (Product-card type / no video / no campaign) stay `Product Card`; blank-account real videos → user-approved `Unknown account` row with normal verdicts (bulk file: 2,708 videos incl. 63 orders / RM6,988 revenue unveiled; single-file behaviour unchanged)
  - [x] Insight verdict filter: `fInsight` dropdown (All + 8 verdicts) filters KPIs/tables/modal/preview/exports by verdict; `?insight=Label` now also sets the filter so the link shows the videos, not just the rule
  - [x] Picker filename chips (no file read): single date for 1-day files, `from → to · N days` for ranges, product chip from `Product {ID}` (friendly name), instant `bulk` badge from `product campaigns` in the name
  - [x] Account metadata: `accountId` + `Active`/`Live` ticks per account (saver validates + preserves; legacy entries gain defaults); markers in dropdown/suggestions/account table/modal (`🔴 LIVE`, `⏸ inactive`, `· ID xxx`)
  - [x] Manager row numbers + drag-to-reorder (⠿ handle; Save keeps the shown order everywhere)
  - [x] `Top affiliate` tick per account (saver preserves; `⭐ TOP AFFILIATE` marker with the other flags)
  - [x] Manager tick renamed `T-Aff`; account dropdown split into `Internal Account` + `Top Affiliate` sections (tops below internals; hidden when none); suggestions tag tops `top affiliate`
  - [x] Manager modal groups rows under live `Internal Account` / `Top Affiliate` headers (counts shown; ticking T-Aff or dragging across groups moves the row + re-ticks instantly; + Add lands in Internal)
  - [x] Third `Inactive` section at the bottom (unticking Active moves one there live; active state wins grouping; dormant tops keep T-Aff for clean reactivation; filter dropdown unchanged)
  - [x] `Hide inactive` tick (default on): drops rows of Active-unticked accounts from KPIs/tables/modal/preview/exports + compare (non-allowlisted accounts never hidden; untick to audit them)
  - [x] Per-account save stamp: `updatedAt` set by the saver only on changed/new rows (reorder alone doesn't restamp; inbound values ignored); shown as `Last updated: 17/9/26 (45 minutes ago)` in Manager + popup title (`–` until first stamp)
  - [x] Source-file subfolders (v23): loose `source-file/*.xlsx` + one level of campaign folders listed together; `name - [id]` folders tag files with that ID label-only (blank Campaign IDs inherit it; single-`[id]` loads pre-set the Campaign facet)
  - [x] Fallback file fix (v24): last-resort bundled fallback repointed at an existing subfolder file (keeps folder path) after the top-level files moved
  - [x] Bundled picker via /api/files (v25): server.py JSON listing tried first, HTML listing fallback, explicit warning when neither works (e.g. Live Server)
  - [x] Picker grouped by folder (v26): collapsible folder headers, folder tick selects all, live selected-count on Load button, empty folders shown greyed
  - [x] Product–campaign tie + no bare IDs (v27): catalog `campaignId` link field (session-derived fallback), unnamed products grouped by campaign in hint, `Unnamed campaign/product` placeholders everywhere (IDs only in tooltips + CSV)
  - [x] Archived catalog section (v28): unused campaigns/products moved under `archived`; lookups fall through so old files keep names
  - [x] Hint tooltip (v29): hovering the amber catalog hint lists the unnamed campaign/product IDs
  - [x] Himcoffee folder retag (v30): folder `[…298210]` (product ID) renamed to campaign `[HIMCOFFEE MAIN 1]` ID verified from bulk export; fallback path updated
  - [x] Filename product fill (v31): blank Product IDs inherit `Product {ID}` from the filename (single-campaign files); Product column resolves via catalog
  - [x] Trend per creative (v32): day-by-day columns across 2–7 files (metric switcher, total/latest/Δ sort, long-format CSV export)
  - [x] Trend line chart (v34): top-10 daily lines above the trend table (current metric/sort/filters, gaps for absent, legend toggle)
  - [x] Per-row sparklines (v35): Shape column with inline SVG per video (per-row scale, gaps for absent, value tooltips)
  - [x] Trend solo popup (v36): click Shape cell for enlarged single-creative chart + Total/Latest/Δ/Days cards (✕/backdrop/Esc close)
  - [x] Trend Post ID column (v37): mono ID right after Move, click-to-copy (table + popup), trailing-digit footnote
  - [x] Click-to-copy Post ID in Top + Compare (v38): same data-copy handler + tooltip as Trend, hover affordance; rechecked Trend popup (already copied), account popup (no Post ID column), Preview/CSV (plain selectable IDs)
  - [x] Trend chart legend shows Post IDs (v39): lines labeled `Post ID · account` instead of truncated creative titles; hover tooltip keeps the creative title + value
  - [x] ROI / CPM / AOV trend metrics (v40): per-file ratio columns in switcher, chart + sparklines follow; Total sort recomputed from summed base numbers
  - [x] Auto-pick Combine for non-overlapping files (v41): mode chosen on file-set change (dated + disjoint → combine, else diff); manual flip wins until set changes; status line announces switches
  - [x] Date-based newest (v33): pre-tick + single load use dataset end-date, not alphabetical order (lowercase bulk name sorted last)  - [x] Account dropdown grouped: Allowlisted (10) / Other accounts in file optgroups
  - [x] Account search box beside dropdown (narrows options, Enter picks first match)
  - [x] Search suggestions popup (top 8, allowlisted tagged) + "No account found" note
  - [x] Search box: keyword search + pasted Post ID exact match (multi-ID, auto-detect)
  - [ ] Known limitation: 19-digit Post IDs exceed 2^53 — matching is exact via identical
    rounding both sides, but displayed IDs may differ in trailing digits (JS number precision)
  - [x] Account detail modal: click per-account row → popup with mini-KPIs + top creatives (respects filters), numbered rows, Show-more pagination
  - [x] Filter card layout: Account search+dropdown on one row, creative/Post ID search full-width row
  - [x] Dataset period + file date display (7 days + range, DD MMMM YYYY; filename parsed, data fallback)
  - [x] General notes section on page (full file safe to use; Dr. Samhan count diff = inactive rows; exact account names)
- [x] Verify over HTTP (`python server.py`), smoke test (status: done — index.html/app.js/accounts.json/xlsx all 200)

## 3. accounts.json (Option 2 — exact content)
See `data/accounts.json`. Array of 10 `{name, username, note}` objects, user spelling
preserved. Matching is exact on `name`; `username`/`note` are display-only.

## 4. Spelling history (all resolved by user)
- `Affiliate Dr Samhan 3/4` (space) → fixed to no-space `Affiliate Dr Samhan3/4`
- `Dr Samhan Offcial3` (typo) → fixed to `Dr Samhan Official3`
- `Affiliate Dr Samhan 6` (space) → fixed to no-space `Affiliate Dr Samhan6`
- `Affiliate Dr Samhan1` → removed by user (was 0 rows, kept intentionally before)
- `Dr Samhan Official4` → kept intentionally (0 exact rows; xlsx twin
  `DrSamhanOfficial4` has 23 rows/0 orders; coverage hints bridge it)

## 5. Verify
- [x] JSON parses, 10 entries, UTF-8/LF
- [x] Re-count rows per account after spelling fix (bundled file 2026-09-06–13, rows/orders): DrSamhanWellness 74/2; HIMCoffee 85/6; Dr Samhan 38/0; Affiliate Dr Samhan3 72/0; Affiliate Dr Samhan4 59/1; Affiliate Dr Samhan6 76/0; Dr Samhan Official 82/1; Dr Samhan Official3 70/3; Affiliate Dr Samhan1 0/0; Dr Samhan Official4 0/0 (xlsx twin DrSamhanOfficial4: 23 rows/0 orders)

## 6. Backlog (explore next)
- [ ] Exploration exit signals: boosting an inactive video re-enters Exploring
  (pool entry is repeatable — post date is never the clock); whole file is
  catalog-attached, so no per-row yellow-bag flag exists to add
