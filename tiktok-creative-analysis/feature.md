# TikTok Creative Analysis Tool — User Guide

A simple webpage that reads your TikTok Creative Excel file and shows which videos and
accounts make money. No installation, no uploads — everything stays on your own computer.

## How to open it

1. Double-click **`start-server.bat`** in the `tiktok-creative-analysis` folder
   (it opens your browser by itself; keep its black window open while you work).
   No IDE or Live Server needed. Alternative: run `python server.py` yourself.
2. Open your browser and go to: `http://localhost:8000`
3. Click **Load bundled file** (picks the newest Excel in `source-file/` by itself)
   or drag your Excel file into the dotted box. To compare weeks or days, drag
   **several** files at once (up to 7), or click **Choose bundled files…**, tick
   what you want (newest is pre-ticked), then **Load selected**.
    Each file shows below with its date range and type badge — click **remove** to drop one, **Clear** to start over.
    In the picker, one-day files show a single date, ranges show `from → to` plus day
    count, single files carry their product name, and bulk files are badged from the name.

The latest version is also saved on GitHub (`ikrammdzmn/marketer`) so it is never lost.

Under the buttons you'll see the **data period** (e.g. `7 days (06 September 2026 –
13 September 2026)`, read from the file name) and the **file date** — so you always
know which week you're looking at.

> Your data never leaves your computer. The page works offline after the first load
> (it needs internet once to fetch its helper libraries).

## What you see

**Top numbers (KPI cards)** — totals for whatever you filtered:
Rows, Cost (MYR), Revenue (MYR), Orders, Avg ROI, Avg AOV, Impressions, Avg CPM.

- **ROI** = Revenue ÷ Cost. Above 1 means profit. 5.0 means RM5 back for every RM1 spent.
- **AOV** = average order value (Revenue ÷ Orders). Higher means bigger baskets.
- **CPM** = cost for every 1,000 views. Lower is better (cheaper reach).
- **✓** next to a view count means that video reached **1,000+ impressions** (rare —
  only a handful of videos in the file reach this).

**Chart** — top 10 accounts by revenue at a glance.

**Per-account summary** — one row per TikTok account: cost, revenue, orders, ROI, AOV, CPM,
and whether it is one of your 10 managed accounts (shown as `Name (@username)`). **Click any row** to open a popup
with that account's videos, its own mini-totals, and a **Show more** button to see all
of them (50 at a time so the page stays fast).

**Top creatives table** — the actual videos, best first. First 200 shown; use Export
for the full list. Above it sits the **benchmark bar** (e.g. `Top-20 bar: ≥574 impr
(auto) · CPM ≤22.16 (auto)`): the minimum impressions of the top videos and their
median CPM, recomputed from each file. Switch Top 10/15/20/25 to re-bar instantly.
Set your own numbers in Manage accounts (blank = auto); yours are tagged `yours`. The **Posted** column shows when the video was posted and how
many days ago (e.g. `10 Sep · 4d`); a few rows show `–` (no date in the file).
The **Insight** column gives each video one verdict — hover it for the why:

- 🚀 **Boost** — profitable, cheap reach, low spend: your boost candidate.
- 🛑 **Review** — spent money, zero orders: exclusion candidate.
- ⭐ **Template** — top-decile ROI with real revenue: copy its hook and retention.
- 👀 **Learning** — under 1,000 views: too early to judge.
- 🪝 **Hook weak** — opening loses vs the file average: re-shoot it.
- 📉 **Drops @50%** — viewers leave at that point: fix that segment.
- 🧺 **Small basket** — profitable but tiny orders: push bundles.
- 📇 **Catalogue** — TikTok promo, not a creative.

Click any verdict chip to open its explanation for that exact video, with the video's
own numbers shown. The collapsible **Insight guide** line under the benchmark bar lists
all verdicts with the current file's thresholds — link straight to one with
`index.html?insight=Boost` (e.g. `?insight=Hook weak`): the guide opens on that
verdict AND the tables filter to its videos (reload keeps the link — just reload
your file after).

**Compare files table** — when 2+ files are loaded, a new section appears below Top
creatives. It matches each video across the oldest (baseline) and newest (latest)
files and shows the change: `NEW` (only in latest), `LOST` (gone from latest),
`KEPT` (in both), plus the difference in revenue, orders, cost, ROI, views and CPM,
and whether its status moved (e.g. `Exploring → Performing`). Faint grey rows are
tiny wobbles (under RM1), safe to ignore. Use the **Movement** dropdown for NEW /
LOST only, sort by biggest revenue change, and **Export compare CSV** to keep it.
Above the files sits the mode switch: **Latest − Baseline** (for overlapping weeks —
summing those would double-count) or **Combine days** (adds up non-overlapping daily
files into one week total, shown in the normal tables). A warning line tells you which
one fits your files. Mixed file types show a note — campaign is blank for single-campaign files.

## Campaign (bulk files)

Files exported as **product campaigns** (bulk, many campaigns in one file) show an extra
**Campaign** filter and column everywhere: filter the whole page to one campaign
(e.g. `[HIMCOFFEE MAIN 1]`), see each video's campaign in the tables, and spot videos
that moved campaigns in the compare table. Single-campaign files show `–` there —
that is normal, not missing data. A **Product** column sits next to it everywhere,
showing which product each video sold (also nameable in `catalog.json`).

**Naming your campaigns & products:** TikTok's names are cryptic (`[him cocomax]
20260602153651`, bare ID numbers). Open `data/catalog.json` in the folder and type
friendly names next to each ID (`"label": "Cocomax"`, `"name": "HIMCoffee"`). The page
picks them up on reload and shows them in the filter and tables instead of the raw
IDs (hover a cell to still see the original). IDs you haven't named yet are counted
in a small amber note under the Campaign filter — that note disappears once
everything is named. Rows with no product (`N/A`) appear as
`Product Card - {campaign}` (e.g. `Product Card - [Kombo]`), so catalogue promos
stay visibly tied to their campaign.

## General notes (shown on the page)

- Please use the full data file — it is safe to use for checking sales and performance.
- Two files can show a different video count for the same account (e.g. Dr. Samhan).
  This is normal: one file also lists old inactive videos with no views and no cost.
  Your live videos and total sales are the same in both.
- Account names must match exactly. For example, Dr. Samhan and Dr Samhan are
  treated as two different accounts.
- Numbers can shift slightly between downloads because TikTok updates its data.

## Finding things

- **Account** — type in the search box (suggestions appear as you type; you can also
  type a @username), then pick from the dropdown. Your 10 managed accounts are grouped
  at the top as `Name (@username)` — a few carry a `no orders yet` note; all other
   accounts are grouped below. `Product Card` is TikTok's default catalogue promo
   (no creative, no account) — it appears as its own row. Real videos with no
   account name appear as a separate `Unknown account` row, with normal verdicts.
- **Search creative / Post ID** — type words to find video captions, or **paste full
  Post ID numbers** (one or many, even a whole column copied from Excel) to jump
  straight to those videos.
- **Status / 2nd status / Type** — narrow by video status. The 2nd status shows as
  a coloured badge (green ✓ Performing, gold 🏆 Outstanding, grey 🛡
  Underperforming). Tip: 2nd status
  `Performing` or `Outstanding`, sorted by ROI, surfaces winners. Note:
  `Outstanding` means winners *within their own campaign*, not the top videos
  overall — a `Performing` video can out-earn them all, so always sort by ROI.
- **Insight** — show only videos with one verdict (e.g. 🚀 Boost to see every boost
  candidate, 🛑 Review for the kill list). Works together with all other filters.
- **Min ROI / Min orders / Posted within (days) / Only 1000+ impressions / Exclude Product Card / Hide
  Ineligible / Only allowlist accounts** — tick or fill to cut the noise. Tick **Exclude Product Card**
  to keep every number creative-only (catalogue sales vanish from totals and exports). Tick **Hide
  Ineligible** (on by default) to drop dead rows — videos TikTok still lists with no views, no cost
  and no orders, including deactivated SKUs — from every number, table and export (untick to see them again).
  **Posted within** keeps only recent videos (rows without a date are hidden while it is set).
- **Allowlist coverage** (collapsed line under the account table) — click to expand and
  see which of your 10 managed accounts have no data in the loaded file, with
  suggestions when the name looks like a typo.

## Managing your accounts

Click **Manage accounts** (top right) to edit the list: fix a name, add a @username
or a note, remove an old account, or add a new one with **＋ Add account**. The
**SOP targets** box sets your Top-N, minimum impressions, and max CPM (blank =
auto from the file). **Save** writes everything to file (dated backups kept) and
the page reloads straight away. Names must match the Excel file exactly, or that
account's rows won't be recognised — usernames and notes are just labels. If saving
ever fails, use **Download JSON** instead.

## Saving results

**Export CSV** opens in Excel. **Export JSON** is for technical use. Both contain
exactly what your filters show, including AOV. **Preview** opens the same list as a
table in a new browser tab — drag a column edge to widen it, click any cell to read
its full text, or tick **Wrap all cells**. Nothing is uploaded, it never leaves
your computer.

## Everyday workflows

- *Which video should I boost?* → 2nd status `Performing`, sort ROI ↓, look for ✓.
- *What's fresh and working?* → Posted within 30 days, sort ROI ↓.
- *How are my 10 accounts doing?* → tick **Only allowlist accounts**, compare the
  per-account table, click a row for details.
- *Someone sent me Post IDs* → paste them into **Search creative / Post ID**.
- *Cheapest reach?* → sort by **CPM ↑ (cheapest reach)**.

## If something looks wrong

- **"Load bundled file" fails** → you opened the page as a file instead of through
  `http://localhost:8000`. Serve it with `python server.py` first.
- **Save fails in Manage accounts** → you are served by plain `http.server` instead
  of `python server.py`. Switch servers and retry, or use **Download JSON**.
- **An account shows 0 rows** → expand **Allowlist coverage**; the registered name may
  differ slightly (spacing/typo) from the name inside the Excel file.
- **A Post ID's last digits look different** → matching still finds the right video;
  very long ID numbers can't display perfectly in a browser (known limitation).
- **Dark pages hurt your eyes (or don't)** → **Toggle dark** button, top right. The
  page also follows your computer's day/night setting.
