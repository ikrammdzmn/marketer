# plan.md — tiktok-shop-hourly

Status: v1 BUILT 30 Sep 2026 (uncommitted, golden check needs owner's session).

## Scope
- [x] Shop-1 hourly fetch (single day + range day-by-day, max 31, sequential + gap)
- [x] JSON file fallback (saved API exports, multi-pick)
- [x] Per-day gate (sums vs footer, cents) + overwrite dedup on `date + hour`
- [x] Recomputed ROAS, missing-vs-zero statuses, as-of stamp, allocation warning
- [x] Totals strip + hourly table + Chart.js lines + combined CSV export
- [x] Hour scorecard (v3): per-hour avgs across loaded days, DEAD/GOLDEN/WATCH
  tags + scorecard CSV (verified vs 8-day export: DEAD = 02-05,
  GOLDEN = 09/11/12/15/22, WATCH = 00/18)
- [x] CSV loading (v4): exported hourly CSVs load directly (multi-day per file,
  overwrite dedup, `csv` honesty badge); headless-tested with the owner's
  8-day file: 8 days / 192 rows / 24 score rows, tags match python audit
- [ ] Golden check vs 2026-09-30 (owner session): sums 13126.32/80/3645.06, 12:00 = 3203.86, 15:00+ blank
- [ ] Shop 2 + All-Shops merge (sum bases, never average ratios) — parked
- [ ] Browser cache (IndexedDB) — parked

## Verify
- [x] `node --check app.js` + `node --check shop-hourly.user.js`
- [x] HTTP smoke test (fresh port, 200s)
- [x] CORS lesson: standalone page is cross-origin (Failed to fetch) -> v2
  same-origin Tampermonkey fetcher (`shop-hourly.user.js`)
- [ ] Owner golden check: install userscript, fetch 2026-09-30, expect
  sums 13126.32/80/3645.06, 12:00 = 3203.86, 15:00+ missing
