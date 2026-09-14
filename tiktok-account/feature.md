# TikTok Account Video List — What It Can Do (User Guide)

No technical knowledge needed. This explains the system that lists every video
posted by your TikTok accounts, with post times, in bulk.

## What this system can do

- **List all videos per account, in bulk** — give it your TikTok account
  (e.g. `@drsamhanwellness`) and get back every public video: video link,
  caption, and **post time**, newest first.
- **Covers all 10 managed accounts** — repeat the same login step once per
  account; each account's list stays separate.
- **Post time included** — each video shows when it was posted (date + time),
  so you can see posting frequency and match videos to sales weeks.
- **Export to Excel** — the list downloads as CSV, which opens directly in Excel
  for filtering and sharing with your team.
- **Official + safe** — uses TikTok's own Display API with your login. Only
  your own accounts, nothing scraped, no bans.

## How to use it (once set up)

1. **Approve the TikTok app** — your tech helper submits the app form (Terms and
   Privacy pages are already published). Wait for TikTok's approval.
2. **Log in once per account** — open the login link your helper gives you,
   log in as the TikTok account (e.g. `@himcoffeedrsamhan`), and press
   **Authorize**. Repeat for each of the 10 accounts.
3. **Get the list** — your helper runs the download and gives you one Excel file
   per account (or one combined file), each row = one video with its post time.
4. **Re-run anytime** — to refresh (e.g. weekly), just ask for a new pull; login
   is only needed again if TikTok expired the permission.

## What you need from your side

- Ability to **log in to each TikTok account** when asked (for the one-time
  authorize step).
- The TikTok app's **Client Key** (your helper handles the secret parts).

## If something looks wrong

- **Login page fails** → check you are logging in as the right TikTok account;
  each account must authorize separately.
- **List looks short / missing videos** → private, deleted or under-review videos
  are not returned by TikTok; only public videos appear.
- **Post times look off by hours** → TikTok returns UTC time; your helper
  converts it to Malaysia time (UTC+8) in the Excel file — ask if unsure.
- **Authorize button expired** → permissions expire; just log in and authorize
  that account again.
