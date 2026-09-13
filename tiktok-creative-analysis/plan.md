# Marketer — xlsx analysis tool + accounts.json

Status: DONE (accounts.json + visualiser built, HTTP smoke test passed)

## 1. Goal
- Process/analyze/extract TikTok Creative xlsx (9217 rows x 24 cols).
- Account allowlist as simple JSON (Option 2).

## 2. Scope
- [x] `data/accounts.json` — 9 names, user spelling (status: done)
- [x] Static tool `index.html` + `app.js` (SheetJS via CDN, Tailwind Play CDN, dark-mode class, 768px breakpoint) (status: done)
  - [x] Upload/drag-drop xlsx + auto-load `source-file/*.xlsx` when served over HTTP
  - [x] Filters: account (from accounts.json), status, creative type, search, min ROI/cost/orders
  - [x] KPIs: total cost, revenue, orders, avg ROI, impressions, clicks
  - [x] Top creatives table (sortable) + per-account summary
  - [x] Export filtered → CSV / JSON (with column picker)
  - [x] Derived CPM (Cost ÷ Impr × 1000): KPI card, both tables, CSV export, sort
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
- [x] Verify over HTTP (`python -m http.server`), smoke test (status: done — index.html/app.js/accounts.json/xlsx all 200)

## 3. accounts.json (Option 2 — exact content)
See `data/accounts.json`. Simple string array, 9 entries, user spelling preserved (user fixes typos/spacing later).

## 4. Known mismatches (user fixes later)
- `Affiliate Dr Samhan 3/4/6` (space) → xlsx uses no-space `Affiliate Dr Samhan3/4/6`
- `Dr Samhan Offcial3` (typo) → xlsx `Dr Samhan Official3` (70 rows)
- `Dr Samhan Official4` (space) → xlsx `DrSamhanOfficial4`
- `Affiliate Dr Samhan1` → 0 rows in xlsx, kept intentionally

## 5. Verify
- [x] JSON parses, 9 entries, UTF-8/LF
- [ ] Re-count rows per account after spelling fix
