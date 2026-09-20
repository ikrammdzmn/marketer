# feature.md - daily TikTok Sheets sync (user guide)

**What it does:** every morning, your 10 TikTok accounts' latest videos appear
at the top of their own sheet tabs, with views/likes/comments/shares refreshed
and growth (+numbers) shown. Sheet 1 (`Dashboard`) shows per-account totals.

**Daily use (2 minutes):**
1. Right-click `tiktok-account/sync/run-sync.ps1` -> Run with PowerShell
   (first time only, if blocked: `Set-ExecutionPolicy -Scope CurrentUser
   RemoteSigned`).
2. Pick a window: today / yesterday / last 7 days / custom dates / all-time.
3. Pick all accounts or one (type B to go back a step).
4. Say Y to the preview, read the plain-words summary, say Y to run live.
5. After each run: R repeats the same, M returns to the menu, Enter exits.
6. Open the spreadsheet - new videos are on top, `Dashboard` has today's
   totals (click any account name to jump to its tab).

**Columns:**
- A `Run` - tick the checkbox when a video is handled.
- B `Note` - your free text (boosted, reviewed, pending...).
- C-N automatic (don't edit): Title, Video ID, Posted date, Views, Likes,
  Comments, Shares, video Link, then 4 growth columns (change since last run).

**Columns:**
- A `Run` - tick the checkbox when a video is handled.
- B `Note` - your free text (booosted, reviewed, pending...).
- C-N automatic (don't edit): Title, Video ID, Posted date, Views, Likes,
  Comments, Shares, video Link, then 4 growth columns (change since last run).

New videos arrive with empty Run/Note. Your ticks and notes are never erased
by the daily run. You may add a personal `Notes` tab after Dashboard (any
name except `Sheet1`); the script ignores it.

**First run:** growth columns are empty (nothing to compare yet). They fill in
from the second run onward.

**If an account says "relink needed":** open the TikTok dashboard
(`http://127.0.0.1:8080/`), press Link/Relink for that account, then rerun.
