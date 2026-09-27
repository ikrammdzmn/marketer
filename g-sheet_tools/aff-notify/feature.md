# feature.md - Affiliate reminders (user guide)

**What it does:** four times a day (9:30am, 11am, 2pm, 4pm), a small robot
inside your Google Sheet checks your affiliate videos and nudges you only
when something needs attention - by email, by Telegram, or both. No news
= no message.

**The three things it watches:**

1. RED - Priority: a RUNNING video whose review date is today or already
   passed. Meaning: check its ads performance now.
2. BLUE - Reminder: a RUNNING video whose review date is tomorrow.
   Meaning: it is due next, be ready.
3. GREEN - Action: the PENDING ADS RUN queue has 1 or more videos waiting.
   Meaning: need to run the ads.

**Reading the messages:** priority rows are grouped under two buckets -
`Due today (N)` and `Overdue, oldest first (M)` - so dates are stated once,
not repeated on every row. Each line shows the username and a link that
opens the video. Overdue videos keep appearing every round until their date
is updated - nothing slips away silently.

**Telegram option:** the same digest can arrive in your Telegram group
topic, with the same three sections in a phone-friendly shape. Every
message starts with a loud mention that pings you, and carries an
`Open sheet` button that jumps straight to the spreadsheet. Two shapes are
available - full (everything, grouped) and condensed (counts + priority
only, one screen). Try both with the test button and keep the one you
prefer.

**Adding or removing rows:** insert new videos ABOVE the `end` row of your
block. The robot finds the `end` marker by itself, so new rows are picked
up automatically and nothing below the second `end` (the old
NMR/FATIGUE archive) is ever touched or counted.

**Review dates:** type them like `27/9/26` in the NEXT REVIEW column. Leave
it empty and the robot skips that row quietly. Dates already passed count
as priority.

**First-time setup (once):** open the spreadsheet, go to Extensions >
Apps Script, paste in `code.gs` (and `telegram.gs` too if you want the
Telegram messages - both files live in the same project). Save. Press
`testNotify` and allow access when Google asks - you will get a test email
straight away; press `testTelegram` for the Telegram version. If they look
right, press `installTriggers` (and `installTelegramTriggers`) once and
the four daily checks start.

**Telegram setup extras:** create a small chat group with just you, turn on
Topics, add one topic for the digest, and add your bot to the group. The
robot needs three codes saved in its settings (bot token, group number,
topic number) - the built-in helper reads them out for you after you say
hi in the topic.

**Later:** the robot can send a separate email about the pending videos -
ask when you want that.
