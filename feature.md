# feature.md - what the marketer system does (plain words)

One private toolkit on your own laptop. Everything runs at home on your
PC (`127.0.0.1` only) - nothing is published, logins and keys never
leave your machine.

## The pieces

- **Creative analysis** (`http://127.0.0.1:8000/`) - study your
  advertising creatives: compare files, trends per creative, ROI/CPM
  numbers, insight verdicts, manager exports. Static spare copy of your
  10 accounts lives in its accounts list.
- **TikTok dashboard** (`http://127.0.0.1:8080/`) - all 10 TikTok
  accounts on one page. Link each account once (TikTok login +
  Authorize), then Refresh pulls every public video with post time,
  views, likes, comments, shares. Grey `inactive` tag = account switched
  off in the list. Export any view to CSV.
- **Google Sheets sync** - every morning's videos land in one
  spreadsheet (Dashboard + one tab per account, newest on top). Tick the
  `Run` checkbox on handled videos, write notes freely, add your `Age`
  column formula once - the daily run never touches your columns. Right-click
  `tiktok-account/sync/run-sync.ps1` -> Run, preview first, then go live.
- **Strategy playbook** - the house rules (ROI, CPA, timing windows).
  Read-only reference; the auto-tools obey it.
- **Event board** - internal campaign planning board.
- **GMV Max auto** (`http://127.0.0.1:8082/`) - advertising budget
  watcher (read-only): collects reports every 30 minutes, shows net ROI.

## Daily routine (5 minutes)

1. Dashboard: Refresh any account that posted.
2. Sheets: run the sync, say Y to preview, Y to go live.
3. Tick `Run` on handled videos directly in the sheet.

## Keys and logins (your responsibility)

TikTok logins, Google access, and passwords live in ignored files on
your PC only - never in chat, email, or screenshots. New PC = copy them
over USB (see `tiktok-account/otherdevice.md`) or relink each account
once (~10 minutes). If TikTok asks you to log in again, that is normal
(about once a year, or after password changes).
