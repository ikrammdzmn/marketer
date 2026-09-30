# DEV_NOTES — tiktok-shop-hourly handoff (30 Sep 2026, night MYT)

> Next self: read this first. It carries the vibe, not just the facts.

## Vibe / headspace
Long single session, owner visibly tired by the end — keep everything short
and working. Rhythm all day: one-line confirms ("ok", "ok good", "go"),
then a hard pivot ("move on, focus on different topic"), then deep
collaboration. They deputised sparring-partner mode explicitly (challenge
assumptions, truth over agreement) AND a "don't generate until I allow" gate
— respect both: analyse + ask, then build on "go". They test live fast
(owner found the hourly API endpoints themselves, pasted schema, ran the
userscript, downloaded 8 days in-session) and report in one line
("0 day(s) loaded · FAILED: Failed to fetch"). Match that: short replies,
working artifacts, verify everything yourself, never ask for credentials
(offered login — declined per secrets rule).

## Facts
- Feed: `temp-marketplace.vercel.app/api/tiktok/shop-metrics/hourly?date=&shopNumber=`
  (1 = Himclinic Official live; 2 = Himclinic parked). Auth = owner browser
  session; server-side fetch returns app shell only. Secrets never in git/chat.
- Verified quirks (2026-09-30 shop-1 + 8-day 09-22..09-29 export, 192 rows):
  flat hourly roas (daily total stamped — recomputed everywhere), allocated
  hourly spend (constant gmv/spend — shape-only, decisions off totals),
  trailing zeros = future/missing, promo spike 09-24 (RM67.8k/391 orders,
  owner-confirmed promo). 8-day avgs: ROAS 3.51, AOV 158.68.
- Scorecard truth (8-day): DEAD = 02-05; GOLDEN = 09/11/12/15/22;
  WATCH = 00 (CPA 50.10, borderline trip) + 18 (54.75, real outlier).
  vs playbook: dead zone 1 confirmed; 07-08 alive (probe, don't suppress);
  lunch rush ends 13:00; evening spike starts 20:00, not 18:00.
- Guardrails obeyed, never re-derived: ROI >= 7.0, CPA <= 21.18, scale
  <= 20-25%/24h, no changes 16:00-17:30 / after 23:00. Stamped in scorecard
  header + feature.md.
- Stack: static IIFE (`app.js?v=4`), Tailwind + Chart.js 4.4.1 CDN, MAX_DAYS
  cap, busy lock; userscript fetcher same-origin. No server.py.
- CSV files load directly now (multi-day per file, overwrite dedup, `csv`
  honesty badge). Headless harness: node + DOM stubs drove the real CSV
  through the real parser (8d/192 rows/24 score rows, tags match python audit).

## Bugs / lessons
1. **CORS blocks standalone fetch** (`Failed to fetch`, no status — browser
   refuses pre-HTTP). LESSON: third-party feeds need same-origin runners;
   built `shop-hourly.user.js` v1 instead of fighting headers.
2. **Python 3.14 `http.server` needs `-b 127.0.0.1`** (positional bind
   rejected — smoke tests failed twice before spotting it).
3. **Non-ASCII `·` in userscript** caught by scan. LESSON: scan every new
   file, this folder stays ASCII.
4. **Stale `loadJsonFiles` rename** — grep after every rename (rule 4 anchor
   lesson, again). Grep was clean.
5. **`app.js?v=` bump on every app.js change** — v1..v4 this session, no
   build step to hash it.

## Open next
- Owner golden check in logged-in browser (fetch 2026-09-30, expect
  13126.32/80/3645.06). Shop 2 + All-Shops merge parked. Browser cache
  (IndexedDB) parked. WATCH-threshold tuning offered, owner said "nvm".
- Mood: upbeat, momentum-heavy, owner tired — next window: confirm-then-build,
  keep replies short.
