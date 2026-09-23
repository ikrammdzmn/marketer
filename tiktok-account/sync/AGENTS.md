# AGENTS.md - tiktok-account/sync folder conventions

Manual-run bridge between `dashboard/` (TikTok fetch + tokens) and 1 Google
spreadsheet (10 account sheets + Dashboard). Local only, stdlib + the
spreadsheet-mcp venv (google client libs). No npm, no build, no server.

## Files

- `sheet-sync.py` - the only code. Imports `../dashboard/dashboard.py` by path
  (reuses `pull_and_cache`, `ensure_access`, `to_myt`, `clean_share`).
  Never duplicate dashboard logic here; never edit `dashboard/` from here.
- `.sheet_id.json` - local spreadsheet ID store, gitignored. Env `SHEET_ID` wins.
- `run-sync.ps1` - the human entry point (menus + dry-run preview + live
  run, then Repeat/Main-menu/Exit loop). Forwards explicit args to the engine;
  non-interactive shells get the safe default. Never put engine logic here -
  flags only. Cancels loop back to the window menu (never strand the user).
- `logs/` - gitignored runtime logs.
- `README.md` / `plan.md` / `feature.md` / `DEV_NOTES.md` / `CHANGELOG.md` - docs.

## Sheet contract

- 11 sheets: `Dashboard` + one tab per account titled
  `@username / Account Name` (`tab_title()`; renames bare-name tabs once).
  Fixed per-tab colors (`ACCOUNT_COLORS`, Dashboard gray), re-applied each run.
  Extra personal tabs (e.g. Notes) are ignored by the engine and survive runs
  - except: never name one `Sheet1` (auto-renamed to Dashboard if empty),
  never reuse an account name, and never store notes in Dashboard cols G-H
  (rewritten every run as Yesterday Videos / Yesterday Ticked).
- Header Row 1 frozen: `Run | Note | Creative age | Video ID | Title |
  Posted (MYT) |
  Views | Likes | Comments | Shares | Links | ViewsD | LikesD | CommentsD |
  SharesD` (A-O). Left customs come from `CUSTOM_LEFT` (`Run`, `Note`,
  `Creative age` user formula); appending a name
  shifts the system block right with no other code change.
- Video ID is the upsert key (at `OFF`, col D). Cols A-C are user-owned: never
  written - except the header row, blank A-C on new rows, and
  CHECKBOX validation re-applied to col A each run. Col A (Run) stores
  real booleans: the API reads ticks back as `"TRUE"`/`"FALSE"` strings,
  but writing those strings back as TEXT trips strict BOOLEAN validation
  (red error triangles on every cell - 23 Sep incident). Pass every col-A
  value through `_checkbox_bool()` on any whole-row rewrite (migration,
  re-sort). Col A (Run) is read
  once per run to count yesterday's ticks for Dashboard cols G-H.
- New videos insert at row 2, newest first. Existing rows update the system
  block only when metrics move (unchanged rows skipped; deltas mean
  "change at last movement"). Old A-L layouts migrate once automatically
  (`MIGRATED_A_B`: shift right, blank customs, apply checkboxes). Pre-swap
  C-D layouts migrate once automatically (`MIGRATED_C_D`: swap C<->D,
  A-B ticks/notes untouched). Pre-insert-C widths migrate once automatically
  (`MIGRATED_INSERT_C`: blank C for every row, A-B untouched). Backfill inserts that predate tracked rows
  trigger a whole-tab newest-first re-sort (`RESORT_NEWEST_FIRST`).
- `Dashboard!A1:H` rewritten every run as `USER_ENTERED`: Account column is
  `HYPERLINK("#gid=...")` jump links labeled with the tab title; cols G-H
  are Yesterday Videos / Yesterday Ticked (MYT yesterday counts from the
  account tabs: total posted + Run-checkbox TRUE); footer is blank +
  `Updated (MYT)` + timestamp + `sheet-sync vNN` version row; date cols
  formatted `yyyy-mm-dd hh:mm:ss`. Plain text in dry-run.
- `--refresh-ticks` recomputes Dashboard cols G-H only: no TikTok pull,
  no account-tab writes (summaries from local cache). Takes no window
  flag; works with `--all` / `--account` / `--dry-run`.

## Rules

1. Secrets never in git/chat: spreadsheet ID (44 chars) and SA email (51 chars)
   by lengths-only. Real values live in `.sheet_id.json` / env only.
   Read local JSON with `utf-8-sig` (BOM-proof).
2. Run via the spreadsheet-mcp uv env (see README) - system python lacks google libs.
3. All Sheets calls go through `X()` retry (transient reset/429/5xx, 6 tries backoff).
4. Dry-run still pulls TikTok (cache merge) but performs zero sheet mutations
   (no sheet creation either).
5. Every file in this folder stays pure ASCII (no em-dashes/arrows/curly
   quotes): emitted Unicode arrives as mojibake, and U+201D inside a ps1
   string breaks the 5.1 parser. Write `-` and `->`.
6. All exits funnel through `Stop-WithPause`; all Sheets-adjacent lookups
   (`uv`, sheet reads) degrade with a message, never a vanishing window.
