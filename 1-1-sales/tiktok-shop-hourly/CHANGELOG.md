# CHANGELOG — tiktok-shop-hourly

## v4 (30 Sep 2026, uncommitted)
- CSV loading in the viewer (exported hourly CSVs load directly, multi-day per
  file, overwrite dedup, `csv` badge since no footer gate runs; ROAS still
  recomputed). Headless-verified with the owner's 8-day file.

## v3 (30 Sep 2026, uncommitted)
- Hour scorecard section (avg GMV/orders per hour across loaded days,
  DEAD <2 orders/day / GOLDEN top-5 / WATCH CPA>RM50 tags + scorecard CSV).
  Verified against the 8-day export before shipping.

## v2 (30 Sep 2026, uncommitted)
- CORS fix: standalone page fetch blocked cross-origin (`Failed to fetch`) —
  new same-origin Tampermonkey fetcher (`shop-hourly.user.js`, draggable panel,
  shop + From/To, sequential + gap, same gate/merge rules, direct CSV download).

## v1 (30 Sep 2026, uncommitted)
- New track: shop-1 hourly reporting page (`index.html` + `app.js` + `style.css`).
  Single/range fetch day-by-day (max 31, sequential + gap, per-day fail isolation,
  401/403 login-expired stop), saved-JSON fallback, sums-vs-footer gate with
  overwrite dedup, recomputed ROAS, missing-vs-zero statuses, as-of stamp,
  totals strip + hourly table + Chart.js lines + combined CSV export.
  Golden check vs 2026-09-30 pending owner session.
