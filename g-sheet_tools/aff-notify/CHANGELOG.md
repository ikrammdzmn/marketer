# CHANGELOG.md - aff-notify

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
- OPEN: triggers not yet installed; in-sheet F2/F3/F4 still fixed
  `H$8:H$48` (script side is marker-derived - align next touch).
