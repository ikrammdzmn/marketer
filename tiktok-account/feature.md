# TikTok Accounts Dashboard — What It Can Do (User Guide)

No technical knowledge needed. This is your laptop page that shows every video
posted by your TikTok accounts, with post times and view/like/comment/share
counts, all in one place.

## What this system can do

- **All 10 accounts in one page** — pick an account from the dropdown (green
  `linked` pill = ready, red `not linked` = needs one login). No repeated
  logins: each account is linked once, then it just works for months.
- **Every public video, newest first** — title, Video ID, post time shown as
  "3 days ago" (exact Malaysia time on hover), views, likes, comments, shares,
  plus link to open the video and its cover image.
- **Account profile on top** — followers, following, total likes, video count,
  verified tick, bio.
- **Calendar date filter** — presets (Today, Yesterday, Last 7 / 30 days,
  3 / 6 / 12 months), any month, or click start + end days on the calendar.
  Days with no videos are greyed out so you can't pick an empty range.
- **Show / hide columns** — tick boxes above the table (e.g. hide covers for
  a compact view). The `All` box hides everything except Video ID.
- **Export to Excel** — downloads exactly what you see (respects the filter),
  opens directly in Excel for sharing with your team.
- **Official + safe** — uses TikTok's own system with your logins. Only your
  own accounts, nothing scraped, no bans. Posting, deleting, passwords — the
  system cannot touch any of that, viewing only.

## How to use it (daily)

1. Your helper starts the page on his laptop; you open
   `http://127.0.0.1:8080/`.
2. Pick an account → press **Refresh from TikTok** (locks + spins while
   loading) → the table fills.
3. Filter by date if needed → press **Export CSV** → open in Excel.
4. First time per account only: press **Link / Relink**, log in as that
   TikTok account, press **Authorize**. Done for months — relink only if the
   page ever says `Relink` (about yearly, or after a password change).

## What you need from your side

- Ability to **log in to each TikTok account** when asked (the one-time Link
  step per account — 10 logins total, can be spread over days).
- Nothing to install. Weekly refresh = press Refresh, no new logins.

## If something looks wrong

- **Page says `Relink`** → that account's permission expired; press
  Link / Relink and log in again (one minute).
- **Login shows the wrong account name** → TikTok logs in whoever is already
  signed in that browser; use Switch account (or log out first) and pick the
  matching one, or the wrong account's videos land under the wrong label.
- **List looks short / missing videos** → private, deleted or under-review
  videos are never returned by TikTok; only public videos appear.
- **Numbers shift slightly between downloads** → TikTok updates counts live;
  small changes are normal.
- **Cover image link expired** → cover links last ~6 hours; press Refresh to
  get fresh ones. The video link always works.
- **Page looks plain / unstyled** → the wrong helper program owns the address;
  ask your helper to restart the dashboard and reload the page.
