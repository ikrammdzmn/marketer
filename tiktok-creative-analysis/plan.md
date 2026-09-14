# Marketer — xlsx analysis tool + accounts.json

Status: DONE (accounts.json + visualiser built, HTTP smoke test passed)

## 1. Goal
- Process/analyze/extract TikTok Creative xlsx (≈9.2k rows × 24 cols; TikTok swaps
  the file weekly — the loader auto-picks the newest in `source-file/`).
- Account allowlist as JSON objects {name, username, note} (Option 2).

## 2. Scope
- [x] `data/accounts.json` — 9 entries {name, username, note}, user spelling (status: done; `Affiliate Dr Samhan1` removed by user, `Dr Samhan Official4` kept with username)
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
  - [x] Allowlist coverage notes (webpage only): 0-row accounts flagged with did-you-mean hints, collapsible (default collapsed)
  - [x] Exploration secondary status: column + filter + CSV export
  - [x] 1000+ impressions tick (green ✓ in Impr. cell) + "Only 1000+ impressions" filter
  - [x] Account dropdown grouped: Allowlisted (9) / Other accounts in file optgroups
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
See `data/accounts.json`. Array of 9 `{name, username, note}` objects, user spelling
preserved. Matching is exact on `name`; `username`/`note` are display-only.

## 4. Spelling history (all resolved by user)
- `Affiliate Dr Samhan 3/4` (space) → fixed to no-space `Affiliate Dr Samhan3/4`
- `Dr Samhan Offcial3` (typo) → fixed to `Dr Samhan Official3`
- `Affiliate Dr Samhan 6` (space) → fixed to no-space `Affiliate Dr Samhan6`
- `Affiliate Dr Samhan1` → removed by user (was 0 rows, kept intentionally before)
- `Dr Samhan Official4` → kept intentionally (0 exact rows; xlsx twin
  `DrSamhanOfficial4` has 23 rows/0 orders; coverage hints bridge it)

## 5. Verify
- [x] JSON parses, 9 entries, UTF-8/LF
- [x] Re-count rows per account after spelling fix (bundled file 2026-09-06–13, rows/orders): DrSamhanWellness 74/2; HIMCoffee 85/6; Dr Samhan 38/0; Affiliate Dr Samhan3 72/0; Affiliate Dr Samhan4 59/1; Affiliate Dr Samhan6 76/0; Dr Samhan Official 82/1; Dr Samhan Official3 70/3; Affiliate Dr Samhan1 0/0; Dr Samhan Official4 0/0 (xlsx twin DrSamhanOfficial4: 23 rows/0 orders)
