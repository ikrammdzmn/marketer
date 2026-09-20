# CHANGELOG.md - sync/

## 2026-09-20 - v13: BOM-proof ID file
- `.sheet_id.json` stripped to ASCII; reader uses `utf-8-sig` (survives
  Notepad-added BOMs).

## 2026-09-20 - v12: menu loop-back + ASCII cleanup
- Launcher loops after each run (Repeat same / Main menu / exit); B=back at
  scope; cancels return to menu. Removed all Unicode mojibake (ASCII-only
  rule for the folder).

## 2026-09-20 - v11: friendly footer
- `--- What this means ---` block every run (posted/total/videos, rows
  refreshed/new, quiet + relink names, quiet-day callout, dry/live footer).

## 2026-09-20 - v10: launcher hardening
- Window never vanishes: `Stop-WithPause` on all exits + error `trap`.
- `Get-UvExe` (PATH, then WinGet package fallback). Sheet ID saved to
  gitignored `.sheet_id.json` - no env setup needed. ps1 kept pure ASCII.

## 2026-09-20 - v9: run-sync.ps1 launcher
- Interactive menus (window -> scope -> dry-run preview -> live run), arg
  forwarding, non-interactive safe default. Streams engine output live.

## 2026-09-20 - v8: window presets
- `--today` / `--yesterday` / `--since/--until` (inclusive MYT) alongside
  `--days N` / `--full`; one-window validation, bad-date guard. Dashboard
  always trailing-7d.

## 2026-09-20 - v7: dashboard footer restack
- Blank separator after last account; `Updated (MYT)` label with timestamp in
  the row below (col A). Blank written as explicit empty strings so the old
  B12 timestamp can't linger.

## 2026-09-20 - v6: Sheet column merged into Account link
- Dashboard back to 6 cols (A1:F, G cleared): Account link text is the tab
  title. Fixed USER_ENTERED date-serial display with explicit DATE_TIME
  formatting on the date cells.

## 2026-09-20 - v5: clickable Dashboard accounts
- Account column now `=HYPERLINK("#gid=...")` (USER_ENTERED) - click jumps to
  the tab. gids cached from `ensure_sheets`; dry-run writes plain text.

## 2026-09-20 - v4: per-tab colors
- Fixed palette (`ACCOUNT_COLORS` by account order, gray Dashboard) applied
  in the existing freeze pass. 11/11 verified, re-applied idempotently.

## 2026-09-20 - v3: tab titles `@username / name`
- `tab_title()` from accounts.json; bare-name tabs renamed once in
  `ensure_sheets`. Reads tolerate missing tabs (400 -> empty) with pre-rename
  fallback for dry previews. Dashboard Sheet column shows tab titles.

## 2026-09-20 - v2: left customs (Run + Note)
- System block moved A-L -> C-N under `CUSTOM_LEFT = ["Run", "Note"]`
  (offset-derived ranges/ID lookups; future customs = one-line append).
- One-time migration (`MIGRATED_A_B`): old rows shifted right, A-B blanked,
  CHECKBOX validation applied to col A. 10/10 sheets, zero duplicates.
- Dry-run previews migration counts via shifted view (fixed all-inserted bug:
  `migrated` flag no longer true when nothing was written).

## 2026-09-20 - v1: daily upsert live
- `sheet-sync.py`: 7-day window upsert by Video ID (A-H refresh + I-L deltas,
  row-2 newest-first inserts, customs M+ untouched), Dashboard v1 totals table.
- `X()` retry on all Sheets calls (6 tries, backoff) after a mid-run reset.
- Flags: `--all/--account`, `--days`, `--full`, `--spreadsheet-id`, `--dry-run`.
- First sync: 10/10 sheets (242 videos), Dashboard totals verified.
- Docs: README, plan, AGENTS, feature, DEV_NOTES (lengths-only secrets).
