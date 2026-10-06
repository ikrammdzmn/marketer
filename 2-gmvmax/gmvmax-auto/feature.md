# GMV Max Auto — what it does (plain words)

> Internal team tool for our 1 Malaysia TikTok Shop. Runs on your own laptop.
> Right now: **watch-only**. It does NOT change your ads by itself.

## Online version (Vercel, `marketer-hw.vercel.app`, login required)

- Shop / Metric / Date / Fetch Data: Total (LIVE + Product split in two tables), LIVE, Product, TTAM (manual spend only), ROAS (with SST+WHT actual), **Hourly** (per-campaign hour tables + trend graphs), Shop GMV (shop-order truth, needs shop login — otherwise shows the locked reference).
- Each campaign row shows a green ON / grey OFF pill (from TikTok) plus what TikTok says about delivery (🟢 Active, ⛔ Asset unavailable, …). Closed account rows roll up: ON if anything inside is ON, plus any delivery warnings. A Sessions button shows live rooms x day, on demand.
- Account names come from the first `[brackets]` in the campaign name — rename campaigns in Ads Manager to regroup them, then resync.
- Numbers can move slightly during the day (TikTok settles sales figures over hours while spend stays fixed). If a number looks off versus an hour ago, press Fetch Data again — newest wins, nothing is lost.

## Hourly watch (Metric = Hourly, shop 1)

- Two trend lines (money spent vs money earned across today's hours) + bars for the newest hour, LIVE and Product separately.
- Tables show each campaign's hour vs previous hour: absolute change + % change. % only appears when the previous hour is big enough (spend ≥ RM50 / sales ≥ RM200) — tiny hours show numbers only, so RM5→RM30 never screams "+500%".
- Newest hour is tagged **partial** — TikTok is still counting it. Decide off older closed hours, never the live edge.

## Telegram reports (group topic, every hour)

- **Three messages per hour:** 📹 LIVE, 📦 Product, and Total (LIVE + Product in one table). Each opens with a verdict line (🔥 biggest sales jump · ⚠️ stuck spenders, or ▪ steady hour), then the movers table, steady ones collapsed (`N steady — tap to expand`), earlier-hours history collapsed the same way.
- Table rows show the day so far: money spent then vs now, sales then vs now, ROI this hour vs whole day, orders, and % of daily budget used.
- Chart buttons sit under each table (top movers + dashboard link) — tap one to open that campaign's hour-by-hour chart.
- 🔥 = biggest sales jump that hour (only when sales actually grew). ⚠️ = spent ≥ RM5 with zero sales back. 🔛 = spending normally.
- Messages show ON campaigns only (dashboard keeps everything). Footnote says how many OFF are excluded.
- Type **`/fetch_hourly`** for the latest hour, **`/fetch`** for the whole day so far — tables arrive in ~10–30s. Hourly rhythm continues on its own.
- Type **`/start`** any time to check the system is healthy. It answers with: the current time, database OK (or a clear UNREACHABLE warning), the newest hour of data it has, and the newest day of data. **If the newest hour is many hours old, the auto-collector on the other PC has stopped** — that one line is the first thing to check whenever numbers look frozen. Typing any other `/command` gets a short hint listing these three — plain chat messages are always ignored, so the topic never gets spammed.

## What you get today (P0 local, live numbers)
- **One screen** (`http://127.0.0.1:8082/`) with two tables:
  - **Live per-campaign** (amber UNLAGGED badge): all 5 GMV Max campaigns —
    1 LIVE + 4 Product — with 7-day and today spend, net sales, net ROI,
    orders, budget. Refreshed by hand (`live_view.py`). Newest possible data
    (TikTok itself still lags minutes to ~2 hours — freshest, not real-time).
  - **30-min history**: closed-window snapshots every 30 minutes (2 hours
    behind on purpose — finished numbers only), with freshness stamp.
- **Net ROI everywhere** — sales minus ~25% fees (affiliates, coupons,
  platform) before ROI is computed. What you see is what you keep.
- **Branch badge** — PROD means real TikTok data. Works offline too (shows
  the last saved copy).
- **Safety rules visible** — ROI ≥ 7.0, CPA ≤ RM21.18, max scale 20–25%/day,
  no changes 4:00–5:30pm, quiet hours 2:00–6:00am. They govern every future
  auto-suggestion; today they're shown so everyone learns them.
- **Future buttons, greyed out** — rules editor and Approve/Edit/Reject queue
  are visible but disabled. They turn on in later phases.

## Online dashboard redesign (06 Oct)

- New dark look: sticky top bar (Shop / Metric / date range / Status / Fetch),
  summary cards on top, tables in cards. Works on phones (tables scroll sideways).
- Status dropdown: All, ON (plus new unknowns), or OFF only. ON rows always float
  to the top; charts still rank by money.
- The date boxes became one calendar button (`start – end 📅`): ready-made ranges
  (Today, Yesterday, Last 7/14/30 days) or tap two days on the two-month calendar.
  Max 31 days per fetch. Future days are greyed out.
- After every Fetch the button rests ~15 seconds (countdown shown) so TikTok never
  rate-limits us. A spinner shows while loading.
- Top tabs: Dashboard and Presets.
- Access is limited by Vercel Authentication to signed-in members of the Vercel team. This is currently the login system; next session is planned to evaluate Google OAuth.
- Preset saves use an additional write check. It is defense-in-depth only: the browser-visible key is not a secret, so Vercel's login wall is the actual access boundary.

## TTAM manual campaigns (Metric = TTAM, shop 1)

- One row per manual (non-GMV) campaign: name, ON/OFF pill, spend, verdict chip,
  impressions, and 11 grades (EDS, ERRI, HPS, ACS, CES, VVES, RVS, HRQ, RES, BCE, LQS).
  Hover any short grade for its full name.
- Click a campaign to see its ad groups; click an ad group to see its ads —
  each level carries the same grades and verdicts. Nothing loads until you click,
  so it stays fast.
- Verdicts: green SCALE (spend more), yellow WATCH, red KILL (with the reason if
  you hover), blue LEARNING (too new/small to judge — needs RM30 spend and
  1,000 impressions first). Ranges under 3 days show grades but no verdicts.
- Grades with `~` use best-guess inputs (plain 6-second views stand in for
  6-second focused views). EDS and ERRI are exact TikTok numbers.
- Score switches hide grades you don't care about (hidden grades also leave the
  verdict). Verdict dropdown + search box filter the tree.
- Preset dropdown (appears with 2+ presets) repaints all flags instantly —
  no re-fetch needed. The `/presets` tab edits bands, minimums, and notes, and
  exports a file the scorer tool can read.

## How to use it
1. Start the dashboard: `python gmvmax-auto/dashboard/dashboard.py`, open
   `http://127.0.0.1:8082/` in your browser.
2. Read the Live table (LIVE campaign first, then Product). Numbers are net.
3. For fresh numbers, run `python gmvmax-auto/live_view.py`, then Refresh.
4. The 30-min table fills itself (laptop must be on). No button here changes
   your TikTok budget in this version.

## Adding a campaign
New GMV Max campaign IDs go in `gmvmax-auto/.local_secrets.json` under
`TIKTOK_GMV_CAMPAIGNS` → `PRODUCT` or `LIVE` group (`"id": "label"`), then
rerun `live_view.py`. (TikTok has no list for GMV campaigns, so IDs come
from Ads Manager or the bulk export.)

## What it does NOT do (yet)
- No automatic budget changes. No Approve/Reject queue live. No Telegram actions beyond hourly reports.
- Telegram newest-hour numbers are partial (still counting) — decisions go off closed hours.
- No monthly cap enforcement, no email alerts, no 50-day charts (placeholder only).
- Session list for LIVE shows nothing until max-delivery sessions are created
  in TikTok (campaign numbers are unaffected).

## Coming next (P1/P2, plain words)
- **P1:** computer drafts suggestions but only logs them + sends you a Telegram message.
- **P2:** small changes happen automatically, big ones wait for your Approve / Edit / Reject.
- Monthly spend cap + night quiet-hours handling + email backup alerts.
