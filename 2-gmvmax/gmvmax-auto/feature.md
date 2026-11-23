# GMV Max Auto — what it does (plain words)

> Internal team tool for our 1 Malaysia TikTok Shop. Runs on your own laptop.
> Right now: **watch-only**. It does NOT change your ads by itself.

## Online version (Vercel, `marketer-hw.vercel.app`, Google sign-in)

- The left sidebar is the whole navigation: Menu (Dashboard home, AI Analyst, Calendar month view, All Creative menu board), TikTok Ads views (Total, collapsible Live GMV Max with its campaign + Live Dashboard, collapsible Product GMV Max with its campaign + creative, TTAM campaign, ROAS, Hourly Ads), TikTok Shops views (Shop GMV, Hourly Shop, Shop Cost, Live ROI, Seller Creative), and a collapsible Settings at the bottom (Presets, AI guardrails, collapsible Accounts with its Live board, Catalog, Calendar filters, Access). Section headers collapse too (tap to hide a whole section, your choice is remembered). Your name and Sign out sit pinned at the very bottom of the sidebar. Every tab is a shareable link — opening it loads that exact view, and the browser back button works between tabs. The sidebar folds to icons on desktop and becomes a slide-in menu on phones.
- The Dashboard home page shows cards to every board plus your next 7 days from the shared Google Calendar (Upcoming agenda).
- The Total board opens a Performance Dashboard: Total GMV, Total Orders (with average order value), Total Ad Spend (with cost per order), and Blended ROI with Net underneath. Below, Channel Contribution splits LIVE Stream vs Product/Showcase — each with its GMV/orders/cost share and its own ROI, plus a split bar on top.
- Each campaign row shows a green ON / grey OFF pill (from TikTok) plus delivery state: 🟢 Active when a live room is ongoing right now (checked automatically after Fetch, top spenders first) or TikTok reports Active; other flags show grey on rows that spent, ⛔ only when nothing spent — spend proves delivery. Account rows roll up the same way: ON if anything inside is ON, 🟢 Active if any room inside is ongoing now.
- Sessions button sits on each LIVE campaign. Tap it and that campaign's rooms open **directly underneath it** (tap again to hide, one row per room with spend/sales summed across the days you picked, biggest sales first). Each room shows its live title (e.g. PROMO OCTOBER) plus its current 🟢 ONGOING / ⚪ END pill, with `started … MYT · duration` underneath. Rooms TikTok never titled just show `room {id}` — that's TikTok's data, not a bug. Other campaigns stay untouched.
- Account names come from the first `[brackets]` in the campaign name — rename campaigns in Ads Manager to regroup them, then press **Sync names** (next to Fetch Data) and Fetch again. The board reads saved names, so Fetch alone never shows a rename.
- LIVE groups can switch between **Bracket** and **TT account** (toggle in the LIVE section header, remembered): TT account groups by the TikTok account actually behind the campaign (name + `@username`, bracket shown as hint). Names fill in the background in small batches — Fetch a few times until the notice clears. A few accounts TikTok never names (affiliate/unauthorized ones) stay under `[Bracket]` with a grey note — that's expected, not missing data.
- Budget `% used` (one-day view only) is color-coded: under 70% plain, 70–79% yellow, 80–89% red text, 90–100% white-on-red pill that gently pulses, over 100% a brighter bold red pill (spent more than the daily budget).
- Numbers can move slightly during the day (TikTok settles sales figures over hours while spend stays fixed). If a number looks off versus an hour ago, press Fetch Data again — newest wins, nothing is lost. Total, LIVE and Product open instantly from saved numbers (amber `cached · synced Xm ago` pill): under 5 minutes old it stays put, older or partial hours quietly swap in live TikTok numbers seconds later (green `live` pill) — no more blank waiting on open or tab switch. Snapshots older than an hour say so and refresh themselves.
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
- Reads saved daily rows (instant); **Refresh daily cache** re-pulls the range live when numbers look stale (long ranges refresh automatically in pieces behind the scenes, then the full chart redraws).

## Shop Live (sidebar → Shop Live, shop 1)

- Three tabs under a slim top bar: pick a date range, press **Load rooms** (or **Load more rooms** for older pages), pick a room from the creator-grouped list (filter box + Copy ID included), then work one question per tab. **Shop room**: one fetch button only — **Fetch overview** for MARKETING rooms, **Fetch room detail** for AFFILIATE rooms whose creator approved (look for `(creator ✓)`). Rooms come in two kinds: MARKETING rooms show full numbers; AFFILIATE rooms list fine, and rooms with a creator grant show full room detail (sales, traffic sources, products, 15-minute sales trend) while ungranted ones show metadata only with a clear note. A **Compare list grain** toggle shows the backup list numbers; **Admin / debug** holds the shape probe and the authorize link.
- **Ads & blended**: press **Load ads + TTAM** once, tick the suggested TTAM adgroups (only ones with real spend get pre-ticked — the rest wait for you), set **Fee %**, press **Blend selected**. One combined row answers it: GMV Max cost · TTAM cost · total ad cost · attributed sales · blended gross ROI · blended net ROI. Per-campaign and per-adgroup tables sit below; full-window TTAM spend counts in full on every room it fed (said on screen). If a room has no ad cost, TTAM spend still lists but no ROI is calculated. Live rooms carry a **Partial** badge (TikTok restates today's numbers).
- **Hour slice**: pick a date and hours (e.g. 9–11) and press **Fetch hour range** — same blend but only for those hours, plus a per-hour table and per-adgroup spend + impressions.
- Summary cards: sales, SKU orders, views/impressions, click rates, order rates, average order value, sales per hour, peak viewers. Impressions show `n/a` on affiliate rooms (TikTok doesn't send that number for affiliates — only its own dashboard has it); missing numbers always show `n/a`, never a fake 0. Numbers lag about 2 days behind real life (watch the "Latest data" line) and sales include returns/refunds — that's TikTok's counting. Ongoing lives show a "live now" note because the saved list lags behind the live room.
- First-time setup is a one-tap **Authorize analytics app** button (administrator + seller login). Affiliate creators approve separately: the administrator sends them a link (Settings → Shop grants), they approve while logged into their own TikTok, and the administrator names the row so rooms match. Token details never show on screen.

## AI Analyst (sidebar → AI Analyst, shop 1)

- Tick which areas the AI may look at — GMV (campaigns + hours + top videos), TTAM (preset + live campaign scores), Shop (shop-truth days + affiliate counts) — pick any combo, pick 3/7/14 days, pick EN/MS, press **Analyze**. You get a short written report in 4 parts: performance summary (this week vs last week with % changes), key wins (best campaigns by name), critical leaks (falling or wasteful campaigns by name), and 3 immediate actions (each naming the campaign + which tab to check). Terms are spelled out on first use (e.g. week-over-week (WoW)). TTAM takes ~10 seconds (it reads TikTok live); repeats come from a 15-minute memory. Weeks compare closed days only — today's partial numbers never skew the comparison.
- A text box under the answer takes follow-up questions about the same numbers ("why is campaign X critical?"). It cannot change budgets or anything else — words only, always.
- **AI guardrails** (Settings → AI guardrails, yours only, saved in this browser): minimum net ROI, maximum CPA in RM, and the fee rate the AI uses to turn gross figures into net. Defaults match the house rules (7.0 / 21.18 / 25%). These steer the AI's words only — the automatic rules follow the strategy playbook, never this page.

## Creative analysis (Creative tab, shop 1)

- No more Excel exports: per-video rows pulled straight from TikTok (PRODUCT campaigns) — title, account, status, cost, orders, sales, ROI, views and view-rate bars. Pick a campaign (himcoffee first), pick dates, **Sync from TikTok**, then read. **Sync from TikTok** follows the calendar range (it syncs in chunks behind the scenes); both buttons drive a small progress box (how far, how long, Cancel for long runs).
- Four columns can't come from TikTok (posted time, creative source, second-level exploration verdicts) — those are recomputed or labelled, never faked. Posted time has one exception: **Import posted times** (under the Sync row) takes `Post ID,Time posted` lines pasted from the TikTok export and fills the same Posted/Age columns — empties only, never overwrites.
- **Kill list** sits under the rows: every video summed across your dates with a KILL (red) / WATCH (amber) / SCALE (green) verdict, the hero's share of spend, and wasted-spend total. Tick boxes (or **Select KILL**) then **Copy draft** to get the post IDs for removal in Ads Manager — the system only drafts, it never deletes by itself. A **Post ID box** filters both tables as you type (or Enter = Find everywhere in Neon across all dates, with a Load-that-range shortcut capped at 31 days), plus a status filter (All / DELIVERING / …) with counts, a verdict filter (SCALE / WATCH / KILL / FATIGUE), an **Insight** filter (Catalogue / Template / Review / Boost / Learning / Hook weak / Drops / Small basket — auto benchmarks from your current rows, shown live above the table, boost-hunting rule noted), a global account-kind filter (Internal / Top affiliate / Affiliate / Inactive, matched against your Accounts page — unregistered names count as affiliates, unattributed spend shows as Product card with no label; it moves every card, table, graph and the CSV, not just this list), an **Exclude Product Card** tick (hides catalogue rows everywhere, exact in every total), a Spend/GMV rank toggle, and a **Columns…** picker (show/hide any column, resets on reload) drive the table, `#` numbers every row, Post ID copies on click, and **Export ▾** downloads exactly the columns you tick (or everything), with a **Preview** button that opens the same list in a new tab for selecting and copying. Picking Verdict SCALE adds a **Top** picker (All / 10 / 20 / 30 / Custom number) that keeps only the top rows in your current Spend/GMV order — counts, table, and CSV all follow it. **Daily ▸** expands per-day columns + Total for the picked metric (hidden by default). Each row opens hook/hold diagnostics (2s hook, quartile hold, CTR/CVR) with a per-post trend sparkline and an enlarged popup (total / latest / change / days present). Inactive accounts that still spend show red with a warning banner.
- **Accounts page** holds your TikTok accounts (grouped: Internal / Top Affiliate / Inactive) with @username (type with or without @, it saves the same), Account ID, Ads Identity ID and notes, plus SOP targets. All buttons live on top: Edit, Save (saves and returns to view), Cancel (throws away unsaved changes), ＋ Add (while editing), and a collapsed Export menu for JSON/CSV. Each Live-ticked row also has a **Live note** dropdown (Internal Acc / External Acc / AI / Relive — or type your own, it becomes a choice next time and gets its own board card). **Live board** (preview on top of Accounts, full page under Settings → Live board) groups live accounts one card per type, blank ones under Unlabeled. **Catalog page** holds friendly campaign/product names the same way.
- The date range uses the same 📅 calendar as the other boards (presets including Last 3/6/12 months, two-month grid) — hover any preset to preview it on the grid — long ranges sync automatically in pieces, so any range works.
- **Top 5 video**: five ranked lists above the kill list — Gross Revenue, Product Ad Click Rate, Ad Conversion Rate, 25% Video View Rate, Untung selepas ads (= sales×0.35 − ad cost) — each with its entry rule, videos shared across lists tagged Juga #N, and a Tiada-pertindihan mode that fills gaps from the next rank. Tap a card to play the video inline with the full analysis: Kenapa kuat bullets, Hook 3-tier (kuat/sederhana/lemah vs the loaded range), stay curve with biggest drop, win signals in fixed order, and the honesty limits. Every number carries a **?** bubble explaining its math — tap it.
- **Top 10 accounts by revenue** cards with revenue-share bars, plus a collapsible per-account summary (posts, sales, cost, ROI, orders) with internal/affiliate/inactive subtotals.
- **ROI colors, same everywhere**: 10+ shows green with a ✓, 7.5–10 green, 5–7.5 yellow, 4–5 red, below 4 red with ⚠. No spend shows plain 0.00 (no color — no spend means no judgment). The cutoffs live in Settings → Presets → **General** tab and can be changed (with a live preview); every table shows the current scale in a one-line legend.
- **Daily trend**: tickable Cost / Revenue / Orders / CPO / ROI cards with vs-previous changes, a multi-line chart (tick up to 2 to draw, missing days break the line), and a day table.
- **Trend per creative**: top-10 chart, per-video day columns (`=` = absent that day), solo popups, CSV export.
- The 2000-row raw table hides behind **Show all rows** at the page bottom.
- Every save anywhere in the system pops a small confirmation (green = saved, red = what went wrong) — you never have to guess whether a press worked.
- Data freshness: the boards now read the saved database first (instant), with a collapsed **Data Freshness & Sync** pill showing when each part last updated — tap to expand for per-part stamps and refetch buttons. **Fetch Data** re-pulls live TikTok whenever you want ground truth. Newest hour is always marked partial (TikTok revises intraday).

## All Creative (sidebar → Menu → All Creative, shop 1)

- Menu board: one card each for Product GMV Max, Live Dashboard, TikTok Ads Manager, Evergreen, and Seller Center — past-7-closed-days numbers plus each card's top video, each card opening its dedicated page. Ads Manager and Evergreen are placeholders for now (pull parked, rule unapproved). **Refresh ↻** re-reads the saved numbers (instant); fresh TikTok data still comes from each page's own Sync.

## Seller Creative (sidebar → TikTok Shops → Seller Creative, shop 1)

- Five tabs mirroring the Creative Analisis dashboard: **Seller Center** (organic video numbers from TikTok Shop — views, sales, orders per video per day, with account class and video age), **Product GMV Max** (link to /creative), **Live** (link to /shop-live), **Ads Manager** (boost rows — not yet pulled, table ready), **Evergreen** (Top-5 videos by Untung with a Kuat badge for videos selling 3 months straight, plus a box explaining why they last).
- Seller tab opens with the **past 7 closed days** already loaded from the database (opens instantly; today/yesterday are usually empty because TikTok lags ~2 days — the note under the buttons says so). **Sync from Shop** pulls fresh TikTok data (and fills product views for big/selling videos first — `—` means not yet pulled, later runs backfill). Class filter (Internal / Top Affiliate / Affiliate / Inactive, from the /accounts list) and GMV/Views/Orders sort. **Probe Shop API** checks the connection without saving anything.
- One rule: Shop sales and ad-attributed sales never add together (the ad system reads ~13% higher for the same video) — the page always shows them side by side.
- **Top 5 video**: one GMV-sorted card list with rank, account-class + verdict pills, GMV/Order/Views, and video IDs. Tapping a card (or any table row) opens the TikTok player plus the full analysis: Kenapa kuat bullets with group averages, win signals, Untung = GMV×0.35 − ad cost (with its own columns in the table), and the honesty limits. Every number carries a **?** bubble explaining its math — tap it.
- Seller tab extras: per-class summary cards (with top account), a **Dalam GMV Max Ya/Tidak** column (whether the same video also sold through ads — compare, never added), Winner/Baik/Sampel-kecil status pills with filter, orders-per-1k-views, and a **Fill product views** button that backfills product-page views/clicks for big and selling videos in small batches (`—` = not yet pulled).
- Overnight robot: a nightly laptop job backfills organic + imp/clicks at 12:30am (before the 1am shutdown) and reports to Telegram — morning numbers arrive filled.

## Calendar agenda (Dashboard home)

- The home page shows your next 7 days from the team's shared Google Calendar (times in MYT, recurring events included). Multi-day events repeat on every day they touch (`RUN … [day 2 of 7]`), so a sale never looks finished mid-way. **Today** is highlighted green, tomorrow full-size, later days compact. Write **`#event`** anywhere in a title (any capitals) to mark a sale — it shows with an amber marker and the tag hides itself. Write **`#task`** to mark a high-priority task — red marker, `Task` badge, and it floats above the rest that day.
- **Affiliates card** (under Upcoming): same three watches as the 4x-daily sheet robot — videos to review now (today + overdue, oldest first), due tomorrow, and how many wait for ads run. `All clear` when nothing needs you. Reads your Affiliate Collection sheet live; needs the sheet shared with the robot email once.
- **Calendar settings page**: hide events by keyword — one per line (`Daily To Do`, `#lowpriority`), matched inside titles regardless of capitals. Plus a health panel in plain words (key present, table ready, event count, last error) so an empty agenda tells you exactly which switch to flip.
- **Calendar page** (sidebar → Calendar): this month big, last and next month smaller below. Today is green, tomorrow outlined. Hover (or tap on phones) any day for the full list with links that open the event — days with only task notes open too, showing the notes under a Task notes heading. A Today/Tomorrow panel sits on top on phones and on the right on computers — long sales show `RUN … [day 8 of 10]` on the title plus `Day 8/10 · Ends in 2 days` underneath so you know where a sale stands without reading the grid. The top bar also carries a small pill with today's count that opens this page — it cycles through today's titles one by one (tap ▾ to see the full list), with a red dot when tasks are due and amber for sales. Today's undone task notes appear in the pill too (up to 3 overdue ones tagged overdue), and the pill refreshes within a second when you tick, add, edit, or delete a note — no reload needed.
- **Task notes** (bottom of the Calendar page, shared with the agent): dated reminders with TTAM / GMV / General kinds — add, edit, tick done, or delete; notes you add show `by owner`, notes the agent adds show `by agent`. Ticking or editing pops a small confirmation bottom-right. Notes also appear in the Today/Tomorrow panel on their day (done ones struck through) and as dots on the month grid (sky = TTAM). Used for review dates like kill/scale calls.

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
- The date boxes became one calendar button (`start – end 📅`, single days show one date with `(Today)` when it's today): ready-made ranges
  (Today, Yesterday, Last 3 days, This week, Last week, This month, Last month, Last 7 days, Past 7 days, Last 14/30 days, Last 3/6/12 months — weeks start Sunday, matching TikTok) or tap two days on the two-month calendar. Hovering a preset lights it up on the grid with its exact range.
  Max 31 days per fetch on the creative/shop/live boards. The ads boards (GMV, TTAM, ROAS, Shop GMV, Shop Cost) take up to 12 months — long pulls run in pieces with a small progress popup (slice count, seconds elapsed, time left, Cancel) that stays a few seconds after finishing so you can see the total time. Future days are greyed out. Month/year jump is two dropdowns above the grids. The popup opens right under
  the button, shows your picked dates plus day count at the bottom, and stays shut
  with Esc/outside-click. On phones it shows one month with wrapping preset chips.
- After every Fetch the button rests ~15 seconds (countdown shown) so TikTok never
  rate-limits us. A spinner shows while loading.
- Top tabs: Dashboard and Presets; **Access** appears for the fixed administrator.
- Google access is limited to individual email addresses, not everyone at a company domain. A fixed administrator opens **Access** in the top bar to add or remove emails, and to set each person's **scope**: full access, or only chosen modules (for example accounts-only, so someone sees just Accounts + Live board and nothing else). Without a granted module a page redirects home and its data stays denied. There can be more than one fixed administrator (addresses set privately in Vercel, comma-separated); none of them can be removed from that page.
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
