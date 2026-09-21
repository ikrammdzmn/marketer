# CHANGELOG.md - sync/

## 2026-09-21 - v18: --refresh-ticks mode + version footer
- New `--refresh-ticks` flag: recomputes Dashboard cols G-H from the
  account tabs with no TikTok pull and no tab writes (summaries from local
  cache via `maybe_migrate_cache`). Launcher menu item 6. Takes no window
  flag; works with `--all` / `--account` / `--dry-run`.
- Dashboard footer gains a 4th row `sheet-sync v18` (`SYNC_VERSION`
  constant). Merge drops stale version rows; date-format range unchanged.
- `_get_yesterday_run_stats` hardened: missing tabs read as zeros instead
  of aborting the run; stats failure in refresh mode prints a warning and
  writes zeros rather than blocking.
- Launcher menu shows `run-sync.ps1 | sheet-sync vNN` banner, read live
  from the engine's `SYNC_VERSION` (single source of truth).

## 2026-09-20 - v17: Dashboard v2 - Yesterday Videos + Yesterday Ticked
- Dashboard header extended 6->8 cols: added "Yesterday Videos" (count of
  videos posted MYT yesterday) and "Yesterday Ticked" (count of those with
  Run checkbox = TRUE in col A).
- `_get_yesterday_run_stats()` batch-reads all account tabs A2:E (Run +
  Posted MYT) after sync, filters MYT yesterday (00:00-23:59), counts
  total + TRUE checkboxes.
- `write_dashboard` uses 8 cols, clear range A{new+1}:H100, footer padded
  to 8. Merge path uses `_pad8` for existing rows.
- Dry-run previews new cols; works for `--all` and `--account` runs.

## 2026-09-20 - v16: Dashboard dual-read (stray serial fix)
- Merge reads values (formatted, dates as strings) + col A with FORMULA
  (keeps `=HYPERLINK`). v15's single FORMULA read returned old timestamps
  as date serials (e.g. 46285.618), which the merge then kept as a stray row.
- `_is_dashboard_footer` also drops bare date-serial numbers in col A.
  Next single run removes the stray row and re-links all rows.

## 2026-09-20 - v15: keep Dashboard hyperlinks on merge
- Dashboard read uses `valueRenderOption=FORMULA` (default FORMATTED_VALUE
  returns link labels as plain text, so the merge wrote them back delinked).
- Merge re-links plain-label rows via `sheet_id_of` fallback - heals sheets
  delinked by v14 on the next single run.

## 2026-09-20 - v14: single-account Dashboard merge
- `--account` runs merge that one row into the existing Dashboard instead of
  rewriting it with 1 row. Other account rows kept in place (hyperlinks
  preserved); new accounts appended; footer rebuilt fresh.
- Footer rows padded to 6 cols (old 1-col writes left stale B-F numbers behind
  "Updated (MYT)"/timestamp). Leftover rows below the new footer cleared
  (heals the corrupted 1-row overwrite on next single run).
- Count line fixed: "1 account" / "1 new video" singular.

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
