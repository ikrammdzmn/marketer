# plan.md - aff-notify (Affiliate Collection notifier)

Status: v1 BUILT + live-tested 27 Sep 2026 (`testNotify` email verified by
owner). OPEN: triggers not yet installed; in-sheet F2/F3/F4 still fixed
ranges (see Scope rule).

## Target sheet
- Spreadsheet ID: 44 chars (lengths-only in git - lives with the owner).
- Tab: `Affiliate Collection ` (gid 911439667 - NOTE trailing space in title,
  keep it inside quotes in every formula/range reference).

## Tab layout (verified live 27 Sep 2026)
- Header row 8: B=start | C=USERNAME1 | D=VIDEO LINK | E=VIDEO ID |
  F=checkbox | G=SKU | H=STATUS | I=VIDEO CODE | J=START/KEY IN DATE |
  N=NEXT REVIEW | O=relative age.
- Block 1 rows 9-27 (numbers 1-19), ends with `end` at B28.
- Block 2 rows 32-47 (numbers 1-16, headed BRAND CONSIDERATION),
  ends with second `end` at B48.
- Block 3 row 50+ (NMR/FATIGUE/REJECTED) - OUT OF SCOPE, never scanned.
- Mini-summary rows 2-4, cols D-F: F2 `=COUNTIF(H$8:H$48,"PENDING VID CODE")`
  (=12), F3/F4 same shape for PENDING ADS RUN (=8) / RUNNING (=15).
- `dashboard` tab exists but is EMPTY - not used. All settings live on
  `Affiliate Collection ` itself.
- Col N dates are TEXT in d/m/yy (e.g. 27/9/26), sheet tz GMT+8 KL.

## Scope rule (single source of truth)
- Scan rows 9 through the SECOND `end` marker in col B (currently row 48).
- A helper signpost cell computes that last row from the marker (moves on
  its own when rows are added/removed above it).
- F2/F3/F4 use it via INDIRECT (e.g.
  `=COUNTIF(INDIRECT("H8:H"&helper),"PENDING VID CODE")`) - same count as
  today, self-maintaining. The script reads the same helper cell.
- Blank N = skip quietly. Block 3 excluded even if N is ever filled there.

## Schedule
- One bound Apps Script function, four daily time triggers (MYT):
  9:30am, 11am, 2pm, 4pm (nearMinute precision, ~+/-15 min).

## Digest rules (one combined email per run, silent if all empty)
1. PRIORITY - STATUS = RUNNING and N <= today (today + overdue, no cap,
   listed every run until cleared). Purpose: check ads performance now.
2. REMINDER - STATUS = RUNNING and N == tomorrow. Purpose: due tomorrow.
3. ACTION - F4 (PENDING ADS RUN count) >= 1: "need to run the ads" + count.
- Each digest line: username + video link. Dates live in bucket headers
  (Due today / Overdue), not on rows: `Sun Sep 27 2026 (Today)` style
  (MYT, relative to run day) is kept for the `dateLabel` utility.
- No notifications for PENDING VID CODE / PENDING REVIEW / ADS REVIEW
  (counts only, for now).

## Future-proofing (Telegram: BUILT 27 Sep, see tg_bot/)
- Recipients in one config map: everything to owner today; reserved slot
  routes the pending-scope digest to a SECOND email later (one-line change).
- `tg_bot/telegram.gs` sends the same digest to a group topic
  (`Affiliate Digest`): classic sendMessage + HTML tier, full + condensed
  styles (`TG_STYLE`), Open-sheet button, `testTelegram` sends both for
  comparison, `logThreadId` setup helper. Keys: `BOT_TOKEN`, `GROUP_ID`,
  `TOPIC_ID`, `MY_USER_ID` (stored, not enforced), `TG_STYLE`, `TG_ENABLED`.

## Build order
1. Helper cell + F2/F3/F4 INDIRECT updates (in-sheet, user-tested live).
2. Bound script with log-only dry-run mode (logs instead of emailing).
3. Live email test to owner.
4. Create the 4 triggers.
