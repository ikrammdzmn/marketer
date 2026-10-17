# TTAM Analytic — plan (v1 sample-13)

## Goal
Tampermonkey wash on the Ads Manager table for the 13 sample metrics
(`thresholds.json` v1-sample-13). Proof it parses + tints before wider packs.

## Sample set (all probe-OK, no FAIL keys)
Spend, Impressions, Reach, 6-second focused views (`engaged_view`),
6-second video views (`video_watched_6s`), Paid profile visits, Paid likes,
Paid shares, Paid comments, Paid follows, Avg play per view, LIVE views,
10-second LIVE views (`live_effective_views` PRESUMED).

## Checklist
- [x] masterplan.md locked
- [x] thresholds.json v1-sample-13 (only `impressions` pre-filled from `ttam-basic-v1`; rest null)
- [ ] Owner fills Kill/Scale for the 13 (or gives first 2–3 rules to hardcode)
- [ ] `ttam-highlight.user.js` v1 (header-name parse + wash + pill + MutationObserver)
- [ ] Eyeball on live Campaign table (sort/page re-tint, no console errors)
- [ ] `feature.md` + `DEV_NOTES.md` + `CHANGELOG.md`

## Verify (per change)
ASCII only; US-ASCII scan. No secrets (plain numbers).
`git status` must show no tokens.
