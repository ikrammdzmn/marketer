# TikTok Creative Analysis Tool — User Guide

A simple webpage that reads your TikTok Creative Excel file and shows which videos and
accounts make money. No installation, no uploads — everything stays on your own computer.

## How to open it

1. Double-click **`start-server.bat`** in the `tiktok-creative-analysis` folder
   (it opens your browser by itself; keep its black window open while you work).
   No IDE or Live Server needed. Alternative: run `python server.py` yourself.
2. Open your browser and go to: `http://localhost:8000`
3. Click **Load bundled file** (picks the newest Excel in `source-file/` by itself)
   or drag your Excel file into the dotted box.

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
and whether it is one of your 9 managed accounts (shown as `Name (@username)`). **Click any row** to open a popup
with that account's videos, its own mini-totals, and a **Show more** button to see all
of them (50 at a time so the page stays fast).

**Top creatives table** — the actual videos, best first. First 200 shown; use Export
for the full list.

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
  type a @username), then pick from the dropdown. Your 9 managed accounts are grouped
  at the top as `Name (@username)` — a few carry a `no orders yet` note; all other
  accounts are grouped below. `Product Card` is TikTok's default catalogue promo
  (no creative, no account) — it appears as its own row.
- **Search creative / Post ID** — type words to find video captions, or **paste full
  Post ID numbers** (one or many, even a whole column copied from Excel) to jump
  straight to those videos.
- **Status / 2nd status / Type** — narrow by video status. Tip: 2nd status
  `Performing` or `Outstanding`, sorted by ROI, surfaces winners.
- **Min ROI / Min orders / Only 1000+ impressions / Exclude Product Card / Only
  allowlist accounts** — tick or fill to cut the noise. Tick **Exclude Product Card**
  to keep every number creative-only (catalogue sales vanish from totals and exports).
- **Allowlist coverage** (collapsed line under the account table) — click to expand and
  see which of your 9 managed accounts have no data in the loaded file, with
  suggestions when the name looks like a typo.

## Managing your accounts

Click **Manage accounts** (top right) to edit the list: fix a name, add a @username
or a note, remove an old account, or add a new one with **＋ Add account**. **Save**
writes it to the file (a dated backup is kept next to it) and the page reloads the
list straight away. Names must match the Excel file exactly, or that account's rows
won't be recognised — usernames and notes are just labels. If saving ever fails,
use **Download JSON** instead.

## Saving results

**Export CSV** opens in Excel. **Export JSON** is for technical use. Both contain
exactly what your filters show, including AOV. **Preview** opens the same list as a
table in a new browser tab — drag a column edge to widen it, click any cell to read
its full text, or tick **Wrap all cells**. Nothing is uploaded, it never leaves
your computer.

## Everyday workflows

- *Which video should I boost?* → 2nd status `Performing`, sort ROI ↓, look for ✓.
- *How are my 9 accounts doing?* → tick **Only allowlist accounts**, compare the
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
