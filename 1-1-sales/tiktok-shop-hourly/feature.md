# Shop Hourly Report — user guide

Local-only reporting page for the TikTok shop hourly feed (shop 1 first).
Runs in your browser while you are logged in to the marketplace site.

## How to use (recommended: Tampermonkey)

**Where:** the Tampermonkey script runs on the marketplace site itself
(`temp-marketplace.vercel.app`) while you are logged in — that is what lets
it fetch the hourly feed with your session. It does nothing anywhere else.

**Setup (once):**
1. Install the Tampermonkey browser extension (Chrome/Edge store, free).
2. Click its icon → Create a new script → delete the template content.
3. Open `tiktok-shop-hourly/shop-hourly.user.js` from this repo, copy all,
   paste into the editor, press Ctrl+S. Leave it enabled.
4. (Optional, same steps for the instant crosshair lines:
   `g-sheet_tools/aff-notify/ROW-COL-HIGHLIGHT/crosshair.user.js` — works on
   Google Sheets pages.)

**Each use:**
1. Open the marketplace site, log in as usual.
2. A draggable **Shop Hourly Fetch** panel appears (bottom-right).
3. Set Shop #, From (+To for a range, max 31 days), press **Fetch + CSV**.
4. Watch the status line (`fetching i/N`); a combined CSV downloads when done.
5. Failed days are named in the status — retry just those dates.
6. Load the CSV into the viewer page below for table, chart, and scorecard.

## Fallback: standalone page
1. Or load saved files with the picker — JSON exports or hourly CSVs
   (one CSV may hold many days; re-loading overwrites, never duplicates).
   CSV-loaded days carry a `csv` badge (totals = sums, no footer gate ran).
2. Check the totals strip: each day shows a green `ok` badge when hourly sums
   tie to the API totals. Red means that day failed validation — retry it.
3. Read the hourly table and chart. Blank future hours are `missing`, not zero.
4. Press **Export combined CSV** for one file covering all loaded days.
5. Section 4 scores each hour across loaded days (DEAD/GOLDEN/WATCH) with its
   own scorecard CSV export.

## Important notes (read once)

- Hourly ROAS is recomputed (`GMV / spend`). The feed repeats the daily total
  on every hour — ignore the feed's own ROAS column.
- Hourly spend is split proportionally to GMV by the feed, so hourly
  spend/ROAS shows shape only. Real decisions use the daily totals row.
- Today's trailing blank hours are the future, not a failure.
- If fetching stops with "login expired", log in again in another tab and retry.
