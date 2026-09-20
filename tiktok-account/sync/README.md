# sync/ - daily TikTok -> Google Sheets upsert (manual run, local only)

One spreadsheet, 11 sheets: `Dashboard` + first 10 active accounts from
`tiktok-creative-analysis/data/accounts.json`, each tab titled
`@username / Account Name`. Run daily, default 7-day window.

## Daily command (from `marketer/` repo root)

Easiest - right-click `tiktok-account/sync/run-sync.ps1` -> Run with
PowerShell, answer window (1-5) -> scope (A, 1-10, or B=back) -> optional
dry-run preview -> live run. After each run: `R`epeat same, `M`ain menu, or
Enter to exit - the window stays open until you leave it.
First run only, if blocked: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Manual equivalent (or scheduler / forwarded args):
```powershell
$env:SHEET_ID='<see .sheet_id.json>'
uv --directory ../tools/spreadsheet-mcp run python tiktok-account/sync/sheet-sync.py --all --days 7
# launcher also forwards args: .\run-sync.ps1 --all --today --dry-run
```

Other flags: `--account NAME`, `--dry-run` (TikTok pull only, no writes).
Windows (one per run): `--days N` (default 7) | `--today` | `--yesterday` |
`--since YYYY-MM-DD [--until YYYY-MM-DD]` | `--full` (slow, once supervised).
Dashboard always summarizes trailing 7d, whatever the fetch window.

## First-time setup

1. Create the spreadsheet yourself (service-account create is 403 in Workspace).
2. Share -> service-account email -> **Editor**.
3. Save the ID (44 chars) in `sync/.sheet_id.json`:
   `{"spreadsheet_id": "..."}` - gitignored, never committed.
   Or set `$env:SHEET_ID` per shell instead.
4. Run once with `--all --days 7`. Deltas are blank on run 1, live from run 2.

## Columns

- A `Run` (checkbox, tick to mark done) + B `Note` (free text) - yours.
  New videos arrive unticked/blank; stat refreshes never touch A-B.
- C-N automatic (don't edit): Title, Video ID, Posted, Views, Likes,
  Comments, Shares, Link + 4 growth columns (change since last run).
- Adding more left customs later = one-line list edit (`CUSTOM_LEFT`).

## Rules

- Video ID (col D) is the key. Never hand-edit cols C-N.
- A-B are yours; the script only blanks them on brand-new rows.
- Relink expired accounts via the dashboard (`http://127.0.0.1:8080/`); rerun after.
