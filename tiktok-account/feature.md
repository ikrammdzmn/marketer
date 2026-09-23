# TikTok Accounts Dashboard — What It Can Do (User Guide)

No technical knowledge needed. This is a page on your helper's laptop that
shows every video posted by your TikTok accounts — with post dates, views,
likes, comments and shares — all in one place. If you can use Facebook, you
can use this.

## What you get

- **Every account on one page.** Pick any account from the picker at the top.
  A green `linked` tag means ready; red `not linked` means that account needs
  its one-time login; amber `mismatch` means someone linked the wrong TikTok
  login into that slot — tell your helper. A grey `inactive` tag means the
  account is switched off in the accounts list (dimmed, still selectable).
  Each account is linked once, then it just works for months.
- **Every public video, newest first.** Each row shows a small photo
  (thumbnail) next to the title, the exact Malaysia date and time it was
  posted (with "3 days ago" written grey underneath), views, likes, comments,
  shares, plus links to open the video (short clean links, no tracking
  clutter) and its full-size photo.
- **Account snapshot on top.** Followers, following, total likes, video
  count, verified tick, bio — for whichever account is selected.
- **Pick any date range.** Ready-made buttons (Today, Yesterday, Last 7 or
  30 days, 3 / 6 / 12 months), any month, or click days on the calendar:
  one click picks a single day, two clicks pick a range (hovering shows a
  preview first), **Clear** goes back to everything. Days with no videos are
  greyed out so you can never pick an empty range.
- **Speed dial for big accounts.** The Limit box next to Refresh (All, 30,
  50, 100, or any number you type) pulls just the newest videos — 30 takes
  about 2 seconds. Old accounts with thousands of videos no longer choke.
- **Show / hide columns.** Tick boxes above the table for a compact view.
- **One-click Excel.** **Export CSV** downloads exactly what you see on
  screen (same filter, same order, row numbers in the first `#` column)
  and opens directly in Excel for sharing with your team.
- **Daily Google Sheet (automatic table).** The `sync/` helper copies the
  latest videos into one shared spreadsheet every morning (one tab per
  account + a Dashboard tab with totals). Your helper runs it; you just
  open the sheet. Details in `sync/feature.md`.
- **Wrong-login protection.** When linking, the page checks the TikTok
  account you logged in with against the slot and stops you with a clear
  message if they don't match — the wrong account's videos can never
  silently land under the wrong label again.
- **Unlink any time.** Linked accounts show an **Unlink** button that removes
  that account from this laptop. Saved tables stay visible until the next
  Refresh.
- **Official and safe.** Uses TikTok's own system with your own logins.
  Only your own accounts appear; nothing is scraped, so no bans. It can only
  *view* — posting, deleting and passwords are impossible from here.

## Your normal day (3 steps)

1. Your helper starts the page; you open `http://127.0.0.1:8080/`.
2. Pick an account → optionally set dates and/or Limit → press
   **Refresh from TikTok** and watch the popup (page + video count live;
   Hide just tucks it away, the pull keeps running). Big accounts
   take minutes on a full pull; a Limit/range pull takes seconds.
   Under the profile and next to the video count you'll see
   `Last fetch: <date> MYT (<e.g. 2 hours ago>)` — when TikTok was last asked.
3. Filter, then press **Export CSV** → open in Excel.

First time per account only: press **Link / Relink**, log in as that TikTok
account, press **Authorize**. Done for months.

## What you need from your side

- Ability to **log in to each TikTok account** when asked (the one-time Link
  step per account — can be spread over days).
- Nothing to install, nothing to pay.

## If something looks wrong

- **Page says `Relink`** → that account's permission expired; press
  Link / Relink and log in again (one minute).
- **"Wrong account?" page after login** → you logged into a different TikTok
  account than the slot expects. Either go back and log in as the right one,
  or follow its link to the matching slot. Only tick "save anyway" if your
  helper tells you to.
- **Amber `mismatch` tag** → that slot holds a login that doesn't match its
  label; ask your helper to Unlink + relink it correctly.
- **List looks short / missing videos** → private, deleted or under-review
  videos are never returned by TikTok; only public videos appear. (Videos
  deleted long ago can still show in old saved tables until a full refresh.)
- **Numbers shift slightly between downloads** → TikTok updates counts live;
  small changes are normal.
- **Photos show as grey boxes / missing** → cover photos expire after about
  6 hours; press Refresh to get fresh ones. The video link always works.
- **Refresh says `HTTP Error 429`** → TikTok slowed down a big pull; wait a
  minute and press Refresh again (nothing is lost), or set a Limit or a
  smaller date range first.
- **Page looks plain / unstyled** → the wrong helper program owns the
  address; ask your helper to restart the dashboard and reload the page.
