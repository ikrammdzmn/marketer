# AGENTS.md — tiktok-shop-hourly folder conventions

Static shop-hourly reporting tool (third-party TikTok shop API, shop 1 first).
Pure HTML/CSS/vanilla JS — **no npm, no build, no framework**. Keep it that way.

## Files

- `index.html` — UI markup + CDN scripts (Tailwind Play `darkMode: 'class'`, Chart.js
  4.4.1). Anti-flash dark-mode script in `<head>`.
- `app.js` — all logic, single vanilla IIFE. No modules, no transpiling.
- `shop-hourly.user.js` — same-origin Tampermonkey fetcher (runs on the
  marketplace site itself: draggable panel, shop + From/To, sequential fetch,
  same gate/merge rules, direct CSV download). ASCII only.
- `style.css` — extras only; layout via Tailwind classes.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `feature.md` — end-user guide (non-technical). Update it when UI behavior changes.
- `DEV_NOTES.md` — private handoff notes between sessions.

## Data contract (verified 2026-09-30, shop 1)

- Feed: `GET {API}/api/tiktok/shop-metrics/hourly?date=YYYY-MM-DD&shopNumber=N`
  (auth = owner's logged-in browser session; nothing secret in git).
- Row: `{hour "HH:00", gmv, orders, spend, roas}` x24 + footer
  `{totalGMV, totalOrders, totalSpend}`. Day is GMT+8 calendar.
- Quirks (rules, not footnotes-to-forget):
  1. Hourly `roas` is the daily total stamped flat — always recompute
     `roas = gmv/spend` (null when spend = 0). Never average ratios.
  2. Hourly `spend` is proportionally allocated (constant `gmv/spend`) —
     hourly spend/ROAS is shape-only; decisions off totals.
  3. Trailing all-zero hours on today = future/missing (blank, excluded);
     explicit mid-day zeros stay 0.

## Rules

1. Merge key is `date + hour` (+ `shop` when shop 2 lands). Re-fetch overwrites
   the same date, never duplicates.
2. Per-day gate before keep: sums vs footer within cents; fail = day marked
   failed, others kept, single-day retry allowed.
3. Range cap 31 days/run (`MAX_DAYS`), sequential fetch with a small gap.
4. Replies: short. Code only on explicit "proceed/go/build".
5. Verify: `node --check app.js` + HTTP smoke test on a fresh port; stop servers.
