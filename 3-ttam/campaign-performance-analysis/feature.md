# Metric Scorer — what it does and how to use it

Your TikTok ad report card. Upload the campaign file, and every ad group gets
marked **KILL** (stop spending), **WATCH** (keep running, check again) or
**SCALE** (winners — put more budget behind them).

## How to use (3 steps)

1. **Open it.** Double-click `start-server.bat`. Your browser opens the scorer.
   (Keep the black window open while you use it; closing it stops the tool.
   Everything runs on your own computer — no files leave your machine.)
2. **Load your file.** Click `Load TEST COLUMN file`, or drag your
   TikTok campaign-report Excel into the dotted box. Use the same columns as
   always: Spend, Impressions, Reach, 6-second focused views, profile visits,
   likes, shares, comments, follows, average play time, LIVE views,
   10-second LIVE views.
3. **Read the colours.** Green = SCALE, yellow = WATCH, red = KILL.
   - `Scored` view: all 11 scores per ad group + one OVERALL verdict + why.
   - `Kill list` view: pick 50%, 30% or 20% — it tells you exactly which ad
     groups to pause, in order, to save that much. Start from the top.
   - `Raw` view: your original numbers, for double-checking.
   - `Export CSV` downloads whatever you are looking at.

## The 11 scores (plain words)

- **Enter Room (ERRI)** — how many ad viewers walked into your LIVE.
- **Hook Power (HPS)** — how many stopped scrolling in the first 6 seconds.
- **Attention Cost (ACS)** — what you pay for each 6-second view (lower better).
- **Consideration (CES)** — the main score: hook × profile visits × engagement,
  divided by cost. If this is red, kill.
- **Engagement Depth (EDS)** — comments/shares/follows versus likes.
- **View Efficiency (VVES)** — hook × watch time per ringgit.
- **Retention (RVS)** — watch time per ringgit.
- **Reach Quality (HRQ)** — 6-second views out of people reached.
- **Reach Efficiency (RES)** — reach quality per ringgit.
- **Live Quality (LQS)** — 10-second LIVE views per ringgit.
- **Brand Consideration (BCE)** — hook × profile visits per ringgit.

Rule of thumb: never SCALE an ad whose Hook or Attention Cost is red,
even if the rest looks green.

## Other campaigns

Use the `Preset` dropdown: VOL2 Focused v3 (current, tuned to your October data)
or Theory v2 (the original table). New campaign = new preset file (ask your
dev); the tool never mixes them up.

## Metric settings

Section `3. Metrics registry`: untick any score to hide it everywhere
(table, verdict, export). Edit K/S numbers and `Save preset` to retune.
`Add metric` lets you define a new score from the raw columns.
