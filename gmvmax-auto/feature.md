# GMV Max Auto — what it does (plain words)

> Internal team tool for our 1 Malaysia TikTok Shop. Runs on your own laptop.
> Right now: **watch-only**. It does NOT change your ads by itself.

## What you get today (P0)
- **One screen** showing your LIVE and Product GMV Max campaigns, every 30 minutes
  and hourly — spend, sales (GMV), and ROI in one table.
- **Freshness stamp** — tells you exactly how old the numbers are (TikTok reports lag
  15 min–2 hours, so we never show the newest shaky slot; we show the last closed one).
- **Branch badge** — shows whether you're looking at test data (DEV), real setup (PROD),
  or offline file copy (LOCAL-FILE). Works even with no internet (shows saved copy).
- **Safety rules visible** — ROI ≥ 7.0, CPA ≤ RM21.18, max scale 20–25%/day, no changes
  4:00–5:30pm, quiet hours 2:00–6:00am. These guardrails will govern every future
  auto-suggestion; today they're shown so everyone learns them.
- **Future buttons, greyed out** — rules editor and Approve/Edit/Reject queue are visible
  but disabled. They turn on in later phases.

## How to use it
1. On your laptop, start the dashboard (IT gives you the command). Open
   `http://127.0.0.1:8082/` in your browser.
2. Pick a campaign (LIVE or PRODUCT) from the dropdown → click **Refresh**.
3. Read the table: newest closed 30-min slot on top, with spend / GMV / ROI.
4. Check the top-right: branch badge + "freshness" time. If it says "no snapshots yet",
   the collector hasn't run — ask IT to run it.
5. That's it. No buttons change your TikTok budget in this version.

## What it does NOT do (yet)
- No automatic budget changes. No Approve/Reject queue live. No Telegram actions.
- No monthly cap enforcement, no email alerts, no 50-day charts (placeholder only).
- Real TikTok numbers appear after the TikTok app approval finishes (currently pending).
  Until then the table shows test rows so you can learn the screen.

## Waiting on (nothing for you to do)
- TikTok Business app approval (submitted, pending). Sandbox test account unlocks after.
- Shop app is already linked. Database (Singapore) is already live with test/dev split.

## Coming next (P1/P2, plain words)
- **P1:** computer drafts suggestions but only logs them + sends you a Telegram message.
- **P2:** small changes happen automatically, big ones wait for your Approve / Edit / Reject.
- Monthly spend cap + night quiet-hours handling + email backup alerts.
