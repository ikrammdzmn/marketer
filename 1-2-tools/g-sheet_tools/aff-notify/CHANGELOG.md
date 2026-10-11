# CHANGELOG.md - aff-notify

## 2026-10-11 - v4: rename + F4 hardening + Telegram delete-before-send
- Local layout renamed: `EMAIL/EMAIL_NOTIFY.gs` (was `code.gs`),
  `tg_bot/TG_NOTIFY.gs` (was `tg_bot/telegram.gs`). Both paste into the SAME
  bound Apps Script project; old code kept at
  `tg_bot/TG_NOTIFY(without delete).gs` (storage only, never paste).
- F4 read hardened: `readF4(sh)` reads `sh.getRange('F4')` off the opened
  sheet instead of the quoted `'Affiliate Collection '!F4` A1 string, so tab
  renames can't silently zero the ADS queue count. `TAB` aligned to
  `'Affiliate Collection'` (no trailing space) in both files.
- Telegram delete-before-send: scheduled `runTelegram` deletes `LAST_MSG_ID`
  (Script Properties, fail-open) before sending and stores the new
  `message_id`; `testTelegram` never deletes nor overwrites it; silent runs
  return before delete so the last digest stays up.
- Live-verified: `testNotify` sends P6 R0 ADS0 (F4 `Range not found` warning
  gone); `testTelegram` returns HTTP 200 `ok:true` with `message_id`.
- Same-bot verdict: gmvmax-auto webhook does NOT block aff-notify sends
  (`sendMessage` unaffected); it only makes `getUpdates`/`logThreadId`
  come back empty while the webhook is set.

## 2026-09-27 - v3: two-bucket priority (email + Telegram)
- Priority split into Due-today / Overdue-oldest-first buckets (shared
  `splitBuckets` helper); dates live in bucket headers, rows slimmed to
  username + link on all surfaces (email tables lose the Due column,
  Telegram full + condensed bucketed the same way).

## 2026-09-27 - v2: Telegram sender (group + topic)
- `tg_bot/telegram.gs` (same Apps Script project, `code.gs` untouched -
  reuses its `findScopeEnd`/`dayKeys`/`parseSheetDate`/`dateLabel`/`readF4`
  globals): same scope + rules, classic sendMessage + HTML tier, full and
  condensed styles (`TG_STYLE`; `testTelegram` sends full),
  Open-sheet inline button, silent-if-empty, `logThreadId` setup helper,
  own trigger installer. Keys: `BOT_TOKEN`, `GROUP_ID`, `TOPIC_ID`,
  `MY_USER_ID` (stored, not enforced), `TG_STYLE`, `TG_ENABLED`.
- Every Telegram message opens with a megaphone mention of `MY_USER_ID`
  (`tg://user?id=` link) so the ping fires.
- Solo-member group + single `Affiliate Digest` topic (topics can't be bot-
  created in private chats; user ID can't replace chat ID for sending).
- OPEN: user comparing full vs condensed; triggers (email + Telegram)
  install after the pick.

## 2026-09-27 - v1: 4x-daily digest born
- `code.gs` (bound Apps Script): scope auto-derived from the 2nd `end`
  marker in col B (blocks 1-2 scanned, block-3 archive never touched);
  blank NEXT REVIEW skipped.
- One combined digest per run (9:30am/11am/2pm/4pm MYT via
  `installTriggers`, silent-if-empty): PRIORITY (RUNNING, N<=today incl.
  uncapped overdue), REMINDER (RUNNING, N==tomorrow), ACTION (F4 ads
  queue >= 1).
- Styled HTML mail (red/blue/green banners, clickable video links) +
  plain-text fallback; dates as `Sun Sep 27 2026 (Today)` style (MYT).
- `runCheck()` (trigger + manual), `testNotify()` (always sends, with
  scope diagnostics) - owner live-tested email same session: works.
- Recipients map reserves 2nd-email slot (pending-scope later); Telegram
  sender hook reserved (Script Properties).
- OPEN: email + Telegram triggers not yet installed; in-sheet F2/F3/F4
  still fixed `H$8:H$48` (script side is marker-derived - align next touch).
