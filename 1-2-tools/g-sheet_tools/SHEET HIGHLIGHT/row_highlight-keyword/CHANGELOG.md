# CHANGELOG - row_highlight-keyword

## 30 Sep 2026 (uncommitted)
- Partial-match cutover: formula `exact` -> `ISNUMBER(SEARCH(...))` (live
  tab's col E holds full titles, rule texts are fragments - exact could never
  fire). Cleanup filter strips both prefixes (no zombie pile-up). Live sheet:
  `ALL INTERNAL CREATIVE DATA`.
