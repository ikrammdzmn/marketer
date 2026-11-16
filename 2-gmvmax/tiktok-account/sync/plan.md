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
- [x] `--refresh-ticks` mode: recompute Dashboard cols G-I with no TikTok
  pull (launcher menu 6); version footer row (`sheet-sync v20`)
- [x] Dashboard col I `Total Ticked`: all-time Run=TRUE count per tab (same
  batchGet as yesterday stats, zero extra API cost)
- [ ] Security follow-ups (see root `SECURITY.md`): Drive scope removal,
  OneDrive scope check, incident containment/recovery
- [x] Name any further custom columns (append to `CUSTOM_LEFT`, rerun migrates)
  - 23 Sep: `Creative age` added (col C), all 10 tabs migrated
- [x] `--full` backfill for stats older than 7d (optional; daily window is enough)
  - 23 Sep: ran for `Dr. Samhan` (22 tracked + 2,521 backfilled, re-sorted)
- [x] Windows Task Scheduler daily job (setup-schedule.ps1, 05 Nov 2026):
  TikTokSync-Morning 08:00 + TikTokSync-Evening 17:00 + TikTokSync-Night 23:00
  (-> run-scheduled.ps1 --all --days 7, logs/sync-YYYY-MM-DD.log) +
  PCShutdown-1AM 01:00 (shutdown /s /f /t 120). Power-ON 07:00 via BIOS
  RTC Alarm (manual step).
- [x] Schedule status view (05 Nov 2026): dashboard /schedule + /api/schedule
  (4 tasks + boot + power cfg + log tail), Sync status link on dashboard,
  TikTokDashboard autostart (schtasks onlogon, Startup .cmd fallback).
- [ ] History sheet for vs-any-date growth charts (only if light deltas prove insufficient)
- [x] v21: Dashboard col A `No` (1-N static, Account shifts to B, 10-col A-J)
- [x] v21: numbered tab titles `N. @user / Name` + canonical tab-strip
  order (Dashboard first, rename + `index` reorder each run, merge
  re-sorts + renumbers)
- [x] v22: `--seed-age` reseeds canonical Creative-age formula into C2
  (clear-first, col-C-only, dry-run safe)
- [x] v23: seed-age clear fixed to `C2:C10000` (read extent undercounts
  trailing formula-blanks -> #REF!)
- [x] v24: launcher menu 7 forwards `--seed-age` (scope + dry-run flow)
- [x] age formula calendar-day fix (01 Oct, owner-confirmed): `TODAY()`-date
  diff + "yesterday" branch (24h truncation read yesterday as "today")
