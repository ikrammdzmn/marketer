# GMV Max Auto — what it does (plain words)

> Internal team tool for our 1 Malaysia TikTok Shop. Runs on your own laptop.
> Right now: **watch-only**. It does NOT change your ads by itself.

## Online version (Vercel, `marketer-hw.vercel.app`, Google sign-in)

- The left sidebar is the whole navigation: Dashboard (home), AI Analyst, Calendar month view, your shop, TikTok Ads views (Total, LIVE, Product, TTAM, ROAS, Hourly Ads), TikTok Shops views (Hourly Shop, Shop GMV), Shop Live and Shop Cost pages, and a collapsible Settings at the bottom (Presets, AI guardrails, Creative, Accounts, Catalog, Calendar filters, Access). Your name and Sign out sit pinned at the very bottom of the sidebar. Every tab is a shareable link — opening it loads that exact view, and the browser back button works between tabs. The sidebar folds to icons on desktop and becomes a slide-in menu on phones.
- The Dashboard home page shows cards to every board plus your next 7 days from the shared Google Calendar (Upcoming agenda).
- The Total board opens a Performance Dashboard: Total GMV, Total Orders (with average order value), Total Ad Spend (with cost per order), and Blended ROI with Net underneath. Below, Channel Contribution splits LIVE Stream vs Product/Showcase — each with its GMV/orders/cost share and its own ROI, plus a split bar on top.
- Each campaign row shows a green ON / grey OFF pill (from TikTok) plus delivery state: 🟢 Active when a live room is ongoing right now (checked automatically after Fetch, top spenders first) or TikTok reports Active; other flags show grey on rows that spent, ⛔ only when nothing spent — spend proves delivery. Account rows roll up the same way: ON if anything inside is ON, 🟢 Active if any room inside is ongoing now.
- Sessions button sits on each LIVE campaign. Tap it and that campaign's rooms open **directly underneath it** (tap again to hide, one row per room with spend/sales summed across the days you picked, biggest sales first). Each room shows its live title (e.g. PROMO OCTOBER) plus its current 🟢 ONGOING / ⚪ END pill, with `started … MYT · duration` underneath. Rooms TikTok never titled just show `room {id}` — that's TikTok's data, not a bug. Other campaigns stay untouched.
- Account names come from the first `[brackets]` in the campaign name — rename campaigns in Ads Manager to regroup them, then press **Sync names** (next to Fetch Data) and Fetch again. The board reads saved names, so Fetch alone never shows a rename.
- LIVE groups can switch between **Bracket** and **TT account** (toggle in the LIVE section header, remembered): TT account groups by the TikTok account actually behind the campaign (name + `@username`, bracket shown as hint). Names fill in the background in small batches — Fetch a few times until the notice clears. A few accounts TikTok never names (affiliate/unauthorized ones) stay under `[Bracket]` with a grey note — that's expected, not missing data.
- Budget `% used` (one-day view only) is color-coded: under 70% plain, 70–79% yellow, 80–89% red text, 90–100% white-on-red pill that gently pulses, over 100% a brighter bold red pill (spent more than the daily budget).
- Numbers can move slightly during the day (TikTok settles sales figures over hours while spend stays fixed). If a number looks off versus an hour ago, press Fetch Data again — newest wins, nothing is lost. Total, LIVE and Product open instantly from saved numbers (amber `cached · synced Xm ago` pill) and quietly swap in live TikTok numbers seconds later (green `live` pill) — no more blank waiting on open or tab switch. Snapshots older than an hour say so and refresh themselves.
- Sign in with a Google account that the administrator has approved — you stay signed in for 30 days, even with the browser closed. The administrator can give you a display name on the **Access** page so the sidebar shows your name instead of your email. Removing an account blocks its next dashboard-data request.
- If you’re signed out, the main link opens Google sign-in first. Once signed in, it takes you to the dashboard; `/sign-in` is also available directly.

## Hourly watch (Metric = Hourly, shop 1)

- Two trend charts (LIVE and Product): sales bars with spend dashed line + ROI line riding **in front** of the bars. Hover anywhere along the hours for a vertical rule + one tooltip with every number at that hour.
- **Hour picker**: 24 chips for the day. Grey = future hour or no stored data (unclickable). Picking an hour re-points the top-12 bars and filters the campaign table to that hour vs the previous one. Default = newest hour.
- **Hour scorecard**: each hour averaged across the days in your range (future hours excluded). Tags: DEAD (under 2 orders/day), GOLDEN (top-5 average sales), WATCH (cost per order over RM50 — here spend is real ad cost, so it means something). Needs 3+ days of saved data; with less, it tells you how many more days to save instead of guessing.
- **Sync now** button: pulls today live from TikTok when the charts are empty (mornings, before the auto-save runs). Silent — no Telegram spam. Tables show each campaign's hour vs previous hour: absolute change + % change. % only appears when the previous hour is big enough (spend ≥ RM50 / sales ≥ RM200) — tiny hours show numbers only, so RM5→RM30 never screams "+500%".
- Newest hour is tagged **partial** — TikTok is still counting it. Decide off older closed hours, never the live edge.
- Hours save themselves every hour (GitHub auto-pinger, skips 2–6am). If today looks frozen, press Sync now.

## Hourly shop (Metric = Hourly shop, shop 1)

- Same look, real shop sales: your actual orders bucketed by order hour (cancelled/refunded excluded) as bars, plus your ad spend that hour as an optional dashed line (toggle on/off) and TRUE ROI line.
- 24-hour table (future hours blank), All + hour chips to focus one hour (picked bar lights up), same DEAD/GOLDEN/WATCH scorecard across your range (needs 3+ saved days).
- First view of a new range is empty — press **Refresh** once (pulls every day in the range, then redraws). The notice says tied (bucketed hours match the day total) or flags untied days. Saved hours carry an amber `cached · synced Xm ago` pill that turns red with `stale (>60m)` when the auto-save hasn't run for over an hour.

## Shop GMV over days (Metric = Shop GMV, multi-day range)

- Daily Performance chart: bars + spend line + ROI line, with a **Shop truth | Ads attributed** toggle (real orders vs TikTok-attributed sales) and a day-by-day table. Single-day ranges still show the summary cards.
- Reads saved daily rows (instant); **Refresh daily cache** re-pulls the range live when numbers look stale (max 31 days per press).

## Shop Live (sidebar → Shop Live, shop 1)

- Pick a date range, press **Load rooms**, pick a room, then **Probe shape** (checks what TikTok returns), **Fetch overview** (full numbers + hour table, MARKETING rooms) or **Fetch room detail** (AFFILIATE rooms whose creator approved — look for `(creator ✓)` on the room name). Rooms come in two kinds: MARKETING rooms show full numbers; AFFILIATE rooms list fine, and rooms with a creator grant show full room detail (sales, traffic sources, products, 15-minute sales trend) while ungranted ones show metadata only with a clear note.
- Summary cards: sales, SKU orders, views/impressions, click rates, order rates, average order value, sales per hour, peak viewers. Impressions show `n/a` on affiliate rooms (TikTok doesn't send that number for affiliates — only its own dashboard has it); missing numbers always show `n/a`, never a fake 0. Numbers lag about 2 days behind real life (watch the "Latest data" line) and sales include returns/refunds — that's TikTok's counting. Ongoing lives show a "live now" note because the saved list lags behind the live room.
- First-time setup is a one-tap **Authorize analytics app** button (administrator + seller login). Affiliate creators approve separately: the administrator sends them a link (Settings → Shop grants), they approve while logged into their own TikTok, and the administrator names the row so rooms match. Token details never show on screen.

## AI Analyst (sidebar → AI Analyst, shop 1)

- Tick which areas the AI may look at — GMV (campaigns + hours + top videos), TTAM (preset + live campaign scores), Shop (shop-truth days + affiliate counts) — pick any combo, pick 3/7/14 days, pick EN/MS, press **Analyze**. You get a short written report in 4 parts: performance summary (this week vs last week with % changes), key wins (best campaigns by name), critical leaks (falling or wasteful campaigns by name), and 3 immediate actions (each naming the campaign + which tab to check). Terms are spelled out on first use (e.g. week-over-week (WoW)). TTAM takes ~10 seconds (it reads TikTok live); repeats come from a 15-minute memory. Weeks compare closed days only — today's partial numbers never skew the comparison.
- A text box under the answer takes follow-up questions about the same numbers ("why is campaign X critical?"). It cannot change budgets or anything else — words only, always.
- **AI guardrails** (Settings → AI guardrails, yours only, saved in this browser): minimum net ROI, maximum CPA in RM, and the fee rate the AI uses to turn gross figures into net. Defaults match the house rules (7.0 / 21.18 / 25%). These steer the AI's words only — the automatic rules follow the strategy playbook, never this page.

## Creative analysis (Creative tab, shop 1)

- No more Excel exports: per-video rows pulled straight from TikTok (PRODUCT campaigns) — title, account, status, cost, orders, sales, ROI, views and view-rate bars. Pick a campaign (himcoffee first), pick dates, **Sync from TikTok**, then read.
- Four columns can't come from TikTok (posted time, creative source, second-level exploration verdicts) — those are recomputed or labelled, never faked. Posted time has one exception: **Import posted times** (under the Sync row) takes `Post ID,Time posted` lines pasted from the TikTok export and fills the same Posted/Age columns — empties only, never overwrites.
- **Kill list** sits under the rows: every video summed across your dates with a KILL (red) / WATCH (amber) / SCALE (green) verdict, the hero's share of spend, and wasted-spend total. Tick boxes (or **Select KILL**) then **Copy draft** to get the post IDs for removal in Ads Manager — the system only drafts, it never deletes by itself. A status filter (All / DELIVERING / …) with counts, a verdict filter (SCALE / WATCH / KILL / FATIGUE), an account-kind filter (Internal / Top affiliate / Affiliate / Inactive, matched against your Accounts page — unregistered names count as affiliates, unattributed spend shows as Product card with no label), a Spend/GMV rank toggle, and a **Columns…** picker (show/hide any column, resets on reload) drive the table, `#` numbers every row, Post ID copies on click, and CSV exports exactly what you see. **Daily ▸** expands per-day columns + Total for the picked metric (hidden by default). Each row opens hook/hold diagnostics (2s hook, quartile hold, CTR/CVR) with a per-post trend sparkline and an enlarged popup (total / latest / change / days present). Inactive accounts that still spend show red with a warning banner.
- **Accounts page** holds your TikTok accounts (grouped: Internal / Top Affiliate / Inactive) with username, Account ID, Ads Identity ID and notes, plus SOP targets. Tables first, Edit only when you tap it; Save keeps everything. Each Live-ticked row also has a **Live note** dropdown (Internal Acc / External Acc / AI / Relive — or type your own, it becomes a choice next time). **Live board** (preview on top of Accounts, full page under Settings → Live board) groups live accounts into those four columns plus Other when someone types a new value. **Catalog page** holds friendly campaign/product names the same way.
- The date range uses the same 📅 calendar as the other boards (presets, two-month grid, 31-day cap) — synced ranges cap at 7 days per press.
- **Top 10 accounts by revenue** cards with revenue-share bars, plus a collapsible per-account summary (posts, sales, cost, ROI, orders) with internal/affiliate/inactive subtotals.
- **Daily trend**: tickable Cost / Revenue / Orders / CPO / ROI cards with vs-previous changes, a multi-line chart (tick up to 2 to draw, missing days break the line), and a day table.
- **Trend per creative**: top-10 chart, per-video day columns (`=` = absent that day), solo popups, CSV export.
- The 2000-row raw table hides behind **Show all rows** at the page bottom.
- Every save anywhere in the system pops a small confirmation (green = saved, red = what went wrong) — you never have to guess whether a press worked.
- Data freshness: the boards now read the saved database first (instant), with a **Data Freshness & Sync** card showing when each part last updated — **Fetch Data** re-pulls live TikTok whenever you want ground truth. Newest hour is always marked partial (TikTok revises intraday).

## Calendar agenda (Dashboard home)

- The home page shows your next 7 days from the team's shared Google Calendar (times in MYT, recurring events included). Multi-day events repeat on every day they touch (`Day 2/4`), so a sale never looks finished mid-way. **Today** is highlighted green, tomorrow full-size, later days compact. Write **`#event`** anywhere in a title (any capitals) to mark a sale — it shows with an amber marker and the tag hides itself.
- **Affiliates card** (under Upcoming): same three watches as the 4x-daily sheet robot — videos to review now (today + overdue, oldest first), due tomorrow, and how many wait for ads run. `All clear` when nothing needs you. Reads your Affiliate Collection sheet live; needs the sheet shared with the robot email once.
- **Calendar settings page**: hide events by keyword — one per line (`Daily To Do`, `#lowpriority`), matched inside titles regardless of capitals. Plus a health panel in plain words (key present, table ready, event count, last error) so an empty agenda tells you exactly which switch to flip.
- **Calendar page** (sidebar → Calendar): this month big, last and next month smaller below. Today is green, tomorrow outlined. Hover (or tap on phones) any day for the full list with links that open the event. A Today/Tomorrow panel sits on top on phones and on the right on computers — long sales show `Day 8/10 · Ends in 2 days` so you know where a sale stands without reading the grid. The top bar also carries a small pill with today's count that opens this page.
- **Task notes** (bottom of the Calendar page, shared with the agent): dated reminders with TTAM / GMV / General kinds — add, edit, tick done, or delete; notes you add show `by owner`, notes the agent adds show `by agent`. Notes also appear in the Today/Tomorrow panel on their day (done ones struck through) and as dots on the month grid (sky = TTAM). Used for review dates like kill/scale calls.

## Telegram reports (group topic, every hour)

- **Three messages per hour:** 📹 LIVE, 📦 Product, and Total (LIVE + Product in one table). Each opens with a verdict line (🔥 biggest sales jump · ⚠️ stuck spenders, or ▪ steady hour), then the movers table, steady ones collapsed (`N steady — tap to expand`), earlier-hours history collapsed the same way.
- Table rows show the day so far: money spent then vs now, sales then vs now, ROI this hour vs whole day, orders, and % of daily budget used.
- Chart buttons sit under each table (top movers + dashboard link) — tap one to open that campaign's hour-by-hour chart.
- 🔥 = biggest sales jump that hour (only when sales actually grew). ⚠️ = spent ≥ RM5 with zero sales back. 🔛 = spending normally.
- Messages show ON campaigns only (dashboard keeps everything). Footnote says how many OFF are excluded + when campaign statuses were last synced (MYT date + time).
- Type **`/fetch_hourly`** for the latest hour, **`/fetch`** for the whole day so far — tables arrive in ~10–30s. Hourly rhythm continues on its own (near the top of each hour, skips 2–6am).
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
  (Today, Yesterday, Last 3 days, This week, Last week, This month, Last month, Last 7/14/30 days) or tap two days on the two-month calendar.
  Max 31 days per fetch. Future days are greyed out. Month/year jump is two dropdowns above the grids. The popup opens right under
  the button, shows your picked dates plus day count at the bottom, and stays shut
  with Esc/outside-click. On phones it shows one month with wrapping preset chips.
- After every Fetch the button rests ~15 seconds (countdown shown) so TikTok never
  rate-limits us. A spinner shows while loading.
- Top tabs: Dashboard and Presets; **Access** appears for the fixed administrator.
- Google access is limited to individual email addresses, not everyone at a company domain. The fixed administrator opens **Access** in the top bar to add or remove emails, and to set each person's **scope**: full access, or only chosen modules (for example accounts-only, so someone sees just Accounts + Live board and nothing else). Without a granted module a page redirects home and its data stays denied. The administrator address is set privately in Vercel and cannot be removed from that page.
- Campaign tables include a **Budget** column for GMV Max and TTAM. **% used** appears only for a one-day range, based on that day’s spend and the current daily budget. Lifetime, unlimited, and mixed TTAM budgets show no percentage; old-day percentages may differ if the budget has since changed. GMV Max budget details fill in for ON campaigns in small batches; if some show `—`, Fetch again to continue. Account totals sum ON campaigns only (OFF ignored) and say partial when an ON budget is still unknown.
- Each ON GMV Max campaign has a **Refresh budget** button. Use it after changing the budget in TikTok to fetch the latest amount immediately. It only reads from TikTok; it never changes the budget.
- The Shop GMV card shows the shop token expiry for the administrator, with a Refresh shop token button (one tap; first use also stores the token in Neon). The token lasts about a week, so refresh it when the date nears.
- Webhook and scheduled sync routes retain their separate server-side secret checks. Preset saves also retain their extra write check.
- Google sign-in is the app’s access gate. Vercel Deployment Protection is a separate outer gate; when enabled, it may show a Vercel login before Google sign-in for people outside the Vercel team. Its setting is owner-managed. The checklist is in `online/README.md`.

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
- Grades no longer carry `~` — hook scores use true 6-second focused views
  (`engaged_view`, verified 16 Oct). EDS, ERRI and LQS inputs are exact TikTok
  numbers (LQS still presumed: effective views stand in for 10-second views).
- Score switches hide grades you don't care about (hidden grades also leave the
  verdict). Verdict dropdown + search box filter the tree.
- Every ad shows who it is: TikTok account + post ID on the first line, caption
  collapsed to one line (tap ▸ to read it). If the ad was named with its full
  caption, you see it once — no repeats. A search box inside each open ad group
  finds ads by post ID, ad ID, account, or words. **Deep find** (next to the
  campaign search) looks through ad groups you haven't opened yet and jumps you
  to the match.
- Units: ERRI, HPS, EDS, HRQ show as % (e.g. 12.50%); ACS shows as RM
  (e.g. RM 0.0234); the rest are plain numbers. Hover a grade header for its unit.
- Formulas (same words the `/presets` tab shows under each grade):
  ERRI = live views ÷ impressions × 100; HPS = 6s views ÷ impressions × 100;
  ACS = spend ÷ 6s views; EDS = (shares + comments + follows) ÷ likes × 100;
  CES = 10000 × hook × profile-rate × engagement ÷ ACS;
  VVES = hook × avg play ÷ ACS; RVS = avg play ÷ ACS;
  HRQ = 6s views ÷ reach × 100;
  RES = (6s views ÷ reach × 10) ÷ (spend ÷ reach);
  LQS = 10s live views ÷ spend × 100; BCE = 1000 × hook × profile-rate ÷ ACS
  (hook = 6s views ÷ impressions; profile-rate = profile visits ÷ impressions).
- Preset dropdown (appears with 2+ presets) repaints all flags instantly —
  no re-fetch needed. The `/presets` tab edits bands, minimums, and notes, and
  exports a file the scorer tool can read.
- How to decide: online is the radar (hourly watch, alerts, history), TikTok is
  the trigger (confirms SCALE before budget moves). Online KILL means kill.

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

## Shop Cost (sidebar → Shop Cost, shop 1)
- Answers "where does my ad money go": Total ads spend on top with a share bar, then your three streams ranked #1–#3 by spend (LIVE GMV Max, Product GMV Max, TTAM) each with its RM and % of total.
- Below: a trend showing how the mix moves day by day (one-day ranges skip it — nothing to trend), then the exact daily table, then Campaign share: pick a stream tab to see every campaign's spend with % of its stream and % of everything.
- Campaigns that spent nothing are hidden by default; the **Hide 0-spend** button shows the count and reveals them on tap.
- Newest day is still counting (partial) — today's slice will move until tomorrow.
