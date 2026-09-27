# feature.md - Affiliate email reminders (user guide)

**What it does:** four times a day (9:30am, 11am, 2pm, 4pm), a small robot
inside your Google Sheet checks your affiliate videos and emails you only
when something needs attention. No news = no email.

**The three things it watches:**

1. RED - Priority: a RUNNING video whose review date is today or already
   passed. Meaning: check its ads performance now.
2. BLUE - Reminder: a RUNNING video whose review date is tomorrow.
   Meaning: it is due next, be ready.
3. GREEN - Action: the PENDING ADS RUN queue has 1 or more videos waiting.
   Meaning: need to run the ads.

**Reading the email:** each line shows the username, the due date written
out (for example `Sun Sep 27 2026 (Today)`), and a link that opens the
video. Overdue videos keep appearing every round until their date is
updated - nothing slips away silently.

**Adding or removing rows:** insert new videos ABOVE the `end` row of your
block. The robot finds the `end` marker by itself, so new rows are picked
up automatically and nothing below the second `end` (the old
NMR/FATIGUE archive) is ever touched or counted.

**Review dates:** type them like `27/9/26` in the NEXT REVIEW column. Leave
it empty and the robot skips that row quietly. Dates already passed count
as priority.

**First-time setup (once):** open the spreadsheet, go to Extensions >
Apps Script, paste in `code.gs`, save. Press `testNotify` and allow access
when Google asks - you will get a test email straight away. If it looks
right, press `installTriggers` once and the four daily checks start.

**Later:** the same robot can message you on Telegram and can send a
separate email about the pending videos - ask when you want those.
