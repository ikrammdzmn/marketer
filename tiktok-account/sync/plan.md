# plan.md - sync/ status checklist

- [x] `sheet-sync.py` - upsert by Video ID (update A-H + deltas I-L, insert new at row 2)
- [x] `Dashboard` sheet v1 - Account | Followers | Videos 7d | Views 7d | ViewsD 7d | Last post MYT
- [x] Retry wrapper on all Sheets calls (found + fixed 20 Sep: transient reset mid-run)
- [x] First `--all --days 7` sync - 10/10 sheets live (242 videos total)
- [x] `.gitignore` - `sync/.sheet_id.json`, `sync/logs/`, `sync/__pycache__/`
- [x] Left customs A-B (`Run` checkbox + `Note`) - offset design, one-time
  migration 10/10 sheets, zero duplicates, checkboxes validated
- [x] Tab titles `@username / Account Name` - one-time rename 11/11,
  Dashboard Sheet column matches
- [x] Per-tab colors (fixed palette, Dashboard gray) - 11/11 verified
- [x] Dashboard Account column = clickable jump links to tabs (`#gid`)
- [x] Dashboard footer: blank row + stacked Updated timestamp below label
- [x] Window presets: `--today` / `--yesterday` / `--since/--until` (+ `--full`
  kept); one-window validation; dashboard stays trailing-7d
- [x] `run-sync.ps1` launcher: window menu -> scope menu -> dry-run preview ->
  live run; forwards args; non-interactive default `--all --days 7`
- [x] Launcher loop-back: Repeat same / Main menu / Exit after each run,
  B=back at scope step (window never closes mid-session)
- [x] Launcher hardening: pause-on-exit, uv auto-resolve, `.sheet_id.json`
  saved (no env needed), ASCII-only ps1
- [x] `--- What this means ---` footer (posted/total/videos, refresh/new,
  quiet names, relink names, quiet-day callout, dry/live footer)
- [x] Dashboard v2: "Yesterday Videos" + "Yesterday Ticked" columns (read
  Run checkbox col A from account tabs for MYT yesterday) - 8-col Dashboard
- [x] `--refresh-ticks` mode: recompute Dashboard cols G-H with no TikTok
  pull (launcher menu 6); version footer row (`sheet-sync v18`)
- [ ] Name any further custom columns (append to `CUSTOM_LEFT`, rerun migrates)
- [ ] `--full` backfill for stats older than 7d (optional; daily window is enough)
- [ ] Windows Task Scheduler daily job (same file, when manual gets boring)
- [ ] History sheet for vs-any-date growth charts (only if light deltas prove insufficient)
