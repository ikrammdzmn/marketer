# DEV_NOTES.md - sync/ session handoff (20 Sep 2026, morning MYT)

## Vibe

Owner confirmed plan fast ("ok", "ok good, it fast", "ok go") then pasted the
real Sheet ID + SA email and asked "need to allow access yes?" - Editor share,
verified in 2 calls. Short replies, one action per message held.

## Facts

- Sheet (44-char ID, human-created `ALL ACCOUNT DATA`) shared SA -> Editor.
  Read GREEN, write-probe GREEN (Z999 write->read->clear).
- `sync/sheet-sync.py` (~345 lines): reuses dashboard pull/cache/auth by path
  import; runs under `uv --directory ../tools/spreadsheet-mcp` (google libs).
- First `--all --days 7`: 5/10 synced then `ConnectionResetError` (WinError 10054) killed run on 6th account - no retry on Sheets calls. Fixed with `X()`
  (6 tries, reset/timeout/SSL/429/5xx, exp backoff) + dry-run skips
  `ensure_sheets`. Rerun: 10/10 GREEN, Dashboard 10 rows.
- Data proof: 11 sheets, header A-L, newest-first inserts, video-only Links,
  relink-free (all 10 tokens valid). Deltas populate only when metrics move.
- Secrets: ID + SA email lengths-only everywhere. `.sheet_id.json` gitignored
  (+ parent .gitignore lines). No ID/email values in any doc.

## Bugs/lessons

1. **No-retry Sheets writes.** TikTok side had retry; Sheets side had none -
   one reset aborted 5 accounts + skipped Dashboard. LESSON: wrap every
   `.execute()` in retry from day one (now `X()`).
2. **Bare `.execute()` newline.** `...})\n.execute()` is a SyntaxError (implicit
   join only inside brackets) - parenthesize the chain.
3. **Dry-run created sheets.** `ensure_sheets` ran even in dry-run. LESSON:
   gate all mutations on dry flag.

## Open

`--full` backfill + Task Scheduler not yet requested.

## 20 Sep 2026 - closeout (morning session end)

- All settled except the marketer commit (`sync/` untracked + `.gitignore`
  modified - owner commits when ready). Sheet live and verified 11/11.
- Next session: confirm commit, then routine daily runs. Later-if-asked:
  Task Scheduler, supervised `--full`, status summary, history sheet.
- Cross-repo docs created in tools/: MASTER-AGENTS / MASTER-PLAN /
  MASTER-CHANGELOG. This folder's docs are current through v13.

## 20 Sep 2026 - v13 BOM crash (same morning)

- Owner pasted the launcher's first real error (pause-on-exit worked):
  JSONDecodeError "Unexpected UTF-8 BOM" on `.sheet_id.json`. Cause: file
  writers emit BOM; `json.load(encoding="utf-8")` chokes. Fixed both sides:
  stripped file to ASCII AND reader uses `utf-8-sig`. LESSON: always read
  local JSON with `utf-8-sig` (Notepad-edited files re-add BOM silently).

## 20 Sep 2026 - v12 menu loop-back + mojibake cleanup (same morning)

- Owner: how to restart / back one step with window open -> launcher loops:
  end prompt Repeat-same / Main-menu / exit; scope step takes B=back;
  cancels return to menu. Verified syntax + forward-path regression.
- Pipeline mojibake found beyond ps1: all sync .md + .py carried mangled
  em-dashes/arrows (61 + 34 + 6). Global replace to ASCII, 0 non-ASCII left,
  py recompiles, ps1 re-parses. LESSON: never emit non-ASCII into this
  folder, any file type.

## 20 Sep 2026 - v11 friendly footer (same morning)

- Owner: "add the note, like your bottom line" -> `print_summary()` after the
  per-account lines (posted/total/videos, refresh/new, quiet + relink names,
  quiet-day callout, dry/live footer; ASCII-only for cp1252). Verified live
  on `--all --today --dry-run`. Self-caught: first edit draft replaced the
  dashboard-write call it was meant to follow + left dead `if False` logic -
  repaired by re-reading the tail before finalizing. LESSON: compare
  oldString/newString boundaries; every dropped line is a deletion.

## 20 Sep 2026 - v10 vanishing window (same morning)

- Owner: after answering dry-run "y", Explorer window disappeared. Root
  causes: (a) every `exit` skipped the closing pause, (b) bare `uv` may miss
  from Explorer shells, (c) SHEET_ID unset outside my shells. Fixed with
  `Stop-WithPause` on all exits + script-scope `trap`, `Get-UvExe` (PATH then
  WinGet package fallback with a clear install message), and saved the
  user-pasted ID into gitignored `.sheet_id.json` (verified: launcher runs
  with no env). New lesson: keep ps1 pure ASCII - emitted em-dashes arrive
  as U+00E2/U+20AC/U+201D mojibake and the U+201D inside a "..." string breaks
  the 5.1 parser (cascade of missing-`}` errors); fixed by global replace.

## 20 Sep 2026 - v9 launcher (same morning)

- Owner: right-click run + "terminal asks which one" + "show what it's doing"
  -> `run-sync.ps1` (window menu -> scope menu -> dry-run preview -> live run,
  choices echoed + exact command printed + live per-account lines + Enter to
  close). Two ps1 bugs fixed: (1) `param()` must precede ALL statements
  ($ErrorActionPreference first = CommandNotFound); (2) `$x = Invoke-Engine`
  swallows native stdout into the variable - call bare, read $LASTEXITCODE
  after, and no `return` in the callee (leaks a stray 0). Forward-args +
  non-interactive fallback verified live.

## 20 Sep 2026 - v8 window presets (same morning)

- Owner wanted today / yesterday / last7 / all-time as separate runs ->
  `--today` (=days 1), `--yesterday` (00:00-23:59:59, needs until_ts threaded
  through pull_and_cache), `--since/--until` inclusive MYT (until-alone =
  trailing 7d ending that day), `--full` kept. One-window validation + bad-date
  guard. Dashboard locked to trailing-7d summaries regardless of preset.
  Dry-verified per preset on 1 account (today found 1 genuinely new video).

## 20 Sep 2026 - v7 dashboard footer (same morning)

- Owner: blank row after last account + timestamp below the Updated label ->
  blank/label/time rows; blank as explicit ""s (empty-list rows don't clear
  via API - would have left the stale B12 timestamp). Verified A10:F15.

## 20 Sep 2026 - v6 Sheet col merged (same morning)

- Owner: col G redundant with Account link -> merged: 6-col Dashboard, link
  text = tab title, G cleared. Caught USER_ENTERED date-serial display bug
  (dates showed as 46285.44) -> explicit DATE_TIME format on date cells.

## 20 Sep 2026 - v5 clickable Dashboard (same morning)

- Owner: click account name -> jump to tab? -> `HYPERLINK("#gid=")` in Account
  col + write mode RAW->USER_ENTERED. gids from ensure_sheets cache; dry-run
  plain text. Formula render verified.

## 20 Sep 2026 - v4 tab colors (same morning)

- Owner asked tabs different colours (words-only feasibility -> "go") ->
  fixed palette by account order + gray Dashboard, folded into the freeze
  pass. Live `--all` + API verify: 11/11 distinct.

## 20 Sep 2026 - v3 tab titles (same morning)

- Owner: tabs as `@username / account name` -> `tab_title()`, rename-once
  migration, 11/11 verified. Dry-run found: reads on missing tabs 400
  ("Unable to parse range") - `read_block` now returns [] + pre-rename
  fallback. Live `--all`: 3 genuinely new videos inserted (today's posts),
  rest updated.

## 20 Sep 2026 - v2 left customs (same morning)

- Owner: "Run checkbox col A, Note col B, ok? will add more later" -> offset
  design `CUSTOM_LEFT`, system C-N, migration + checkbox validation built same
  session. `migrated`-in-dry-run bug (all-inserted preview) caught by dry-run
  itself, fixed before touching live sheets. Live `--all`: 10/10 MIGRATED,
  0 inserted (dedup held), deltas refreshed. Verified header A-N + FALSE/
  blank A-B + validation on all 10 sheets (Dashboard untouched).

## 20 Sep 2026 - v14 single-account Dashboard clobber (afternoon MYT)

- Owner screenshot: after `--account HIMCoffee`, Dashboard row 4-5 showed
  "Updated (MYT) | 3492 | 25 | 101721" + timestamp with stale B-F numbers,
  old rows below. Root causes: (1) single run rewrote Dashboard with 1
  summary row; (2) footer wrote 1-col rows so Sheets kept old B-F values;
  (3) rows below the short rewrite never cleared.
- Fixed in `sheet-sync.py`: `write_dashboard(..., merge=)` - single runs
  read `Dashboard!A1:F100`, keep other rows (match HYPERLINK label), drop
  footer-like rows even with stale B-F, rebuild padded 6-col footer, clear
  `A{new+1}:F100`. `--all` unchanged (full rewrite + same clear).
  Verified: py_compile, ASCII 0, fake-grid merge test (corrupted -> 2 clean
  rows + padded footer + leftover clear). Owner to live-rerun single.

## 20 Sep 2026 - v15 hyperlink strip (same afternoon)

- Owner: merge works but Account column links gone. Cause: Dashboard read
  used default FORMATTED_VALUE, so `=HYPERLINK` came back as plain label
  text and got written back delinked.
- Fixed: `_read_dashboard_grid` requests `valueRenderOption=FORMULA`;
  merge re-links plain labels via `_link_cell`/`sheet_id_of` fallback, so
  the already-delinked sheet heals on the next single run. Verified:
  py_compile, ASCII 0, fake-grid link test (formula kept, plain relinked).

## 20 Sep 2026 - v16 stray 46285.618 + 7-account Dashboard (same afternoon)

- Owner: stray `46285.618` under the accounts; only 7 accounts listed.
- Stray = my v15 bug: single FORMULA read returns old timestamp cells as
  date serials, which the merge kept as an "account" row. Fixed with a
  dual read (formatted values for data + FORMULA for col A only) and
  serial-number footer detection. Verified: py_compile, ASCII 0, fake-grid
  test on the owner's layout (stray dropped, 7/7 relinked, footer padded).
- 7 not 10 = old damage, not a bug: the pre-merge v14 rewrite overwrote
  rows 3-5 (Dr Samhan, Official3, Dr. Samhan), merge preserves what exists.
  Next `--all` run restores all 10 rows.

## 20 Sep 2026 - v17 Dashboard v2: Yesterday Videos + Yesterday Ticked (evening MYT)

- Owner: wants Google Sheet Dashboard tab to show yesterday's posted count
  and how many of those have Run checkbox ticked (col A per account tab).
- Plan: extend Dashboard header 6->8 cols (add "Yesterday Videos",
  "Yesterday Ticked"); batch-read all account tabs A2:E (Run + Posted MYT)
  after sync; filter MYT yesterday (00:00-23:59); count total + TRUE
  checkboxes; write into new cols G-H. Dry-run previews, merge path works.
- `sheet-sync.py` changes: `_pad8`, `_get_yesterday_run_stats` (batchGet),
  `summarize` + `_summary_row` extended, `write_dashboard` uses 8 cols,
  clear range A{new+1}:H100, footer padded to 8. Merge logic uses _pad8.
  Hardened batchGet with missing-tab tolerance (dry-run on fresh account).
  Removed `G1:G20` clear (col G is now live Yesterday Videos data).
- Verified: py_compile, ASCII 0, fake-grid 8-col test (old 6-col rows heal
  to 8 + relink, stray dropped, footer padded, write A1:H + clear H100),
  ystats test (3 yesterday videos, 1 TRUE counted; bad dates skipped).
- Owner runs `--all --days 7` live next: Dashboard gains cols G-H.

## 21 Sep 2026 - v18 refresh-ticks mode + version footer (morning MYT)

- Owner: (1) single run should refresh all accounts' G-H; advised low risk
  with per-tab fallback + never-fail guard. Owner pivoted: explicit fast
  refresh command instead. (2) version number below the update timestamp.
- `--refresh-ticks`: standalone mode, no TikTok pull, no tab writes.
  Summaries from local cache (`maybe_migrate_cache`), G-H from tabs,
  full rewrite (`--all`) or merge (`--account`). Window flags rejected.
  Stats failure warns + writes zeros, never blocks. Launcher menu 6.
- Footer 4th row `sheet-sync v18` (`SYNC_VERSION`); merge drops stale
  version rows; `n_dash` now len(rows)-5; date-format range unchanged.
- Verified: py_compile, ASCII 0, ps1 parses (0 errors), `--help` lists
  flag, conflict guard errors cleanly, fake-grid version test (row
  written, stale v17 dropped, 8-col footer, write A1:H6).
- Launcher shows `run-sync.ps1 | sheet-sync v18` banner under the menu
  title, read live from engine `SYNC_VERSION` (`Get-EngineVersion`,
  `?` fallback). ps1 parses, ASCII 0.

## 21 Sep 2026 - security review + AnyDesk incident (separate thread)

- Full login/auth review: no highs. Lows: Drive scope over-broad,
  `--spreadsheet-id` process-list echo, OneDrive scope unchecked.
- Night incident: 00:27 incoming AnyDesk session (Android, unattended,
  ~25s) + 01:46 self-launch/01:48 dial-out on awake office PC, owner
  absent both ends. Forensics (scheduler/Run/RustDesk/Parsec/logs) done.
- All discussion moved to root `marketer/SECURITY.md` (threat model,
  inventory, registers, timeline, containment, pending checks).
