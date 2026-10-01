# AGENTS.md - g-sheet_tools folder conventions

Apps Script tools for the owner's Google Sheets (bound scripts, no server,
no npm, no build). Each tool gets its own subfolder with `plan.md` +
`code.gs` + `DEV_NOTES.md` + `feature.md` + `CHANGELOG.md`.

## Files

- `aff-notify/` - 4x-daily email digest for the Affiliate Collection sheet
  (`code.gs`: RUNNING due/overdue priority, tomorrow reminder, PENDING ADS
  RUN queue action; HTML mail + plain-text fallback) + `tg_bot/` Telegram
  sender (group topic, full/condensed styles). See its `plan.md`.
- `aff-notify/ROW-COL-HIGHLIGHT/` - crosshair highlight helpers for the same
  tab: bound `code.gs` (marker-derived scope 9..2nd `end`, scope-only paint;
  own `DEV_NOTES.md` + `CHANGELOG.md`) + `crosshair.user.js` v1.1
  (Tampermonkey instant lines + draggable ON/OFF pill) + `Tampermonkey.md`
  (13 possible features). Sheet contract + ASCII rules below apply.
- `aff-notify/row_highlight-keyword/` - keyword row highlighter, LIVE on
  spreadsheet `ALL INTERNAL CREATIVE DATA` (do not retire): rules from
  `account info` E34:G (text + painted color + scope), partial
  `SEARCH` match on col E, manual Refresh menu. Own `AGENTS.md` (spec) +
  `DEV_NOTES.MD` + `feature.md` + `CHANGELOG.md`. ASCII rules below apply.
- Future tools root here the same way (one folder per tool).

## Sheet contract (aff-notify)

- Tab title carries a TRAILING SPACE (`Affiliate Collection `) - keep it
  inside quotes in every A1 reference and in `getSheetByName`, or nothing
  matches.
- Scope = data rows 9 through the SECOND `end` marker in col B (two blocks;
  block 3 below is never scanned). Fixed caps like `H$8:H$48` silently drop
  rows once inserts push the marker past the cap - derive the bound from
  the marker, never hardcode it.
- Col N dates are TEXT d/m/yy (sheet tz GMT+8 KL); parse defensively,
  blank N = skip quietly.
- Secrets: sheet ID (44 chars) and any future bot token/chat ID by
  lengths-only in git. Tokens live in Script Properties, never in cells.

## Rules

1. Verify `.gs` via `node --check` on a `.js` temp copy (node rejects the
   `.gs` extension) + ASCII scan (this folder stays pure ASCII).
2. Every notifier ships a manual `testNotify()` that always sends, so the
   owner can verify delivery any time without waiting for a trigger.
3. Triggers install once via an `installTriggers()` fn (with uninstall);
   never duplicate triggers by re-running install blindly.
4. PowerShell 5.1: `;` chaining (no `&&`), `$env:TEMP` (not `%TEMP%`).
5. Commit/push only when asked.
