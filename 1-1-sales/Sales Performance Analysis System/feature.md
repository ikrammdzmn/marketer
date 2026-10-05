# Sales Performance Analysis — what it does (for everyone)

A simple local page that answers three questions for 1–5 Oct (Him.DrSamhan): where did we lose money, what should we stop, what should we push.

## What you put in
1. TTAM campaign report xlsx (Spend, Impressions, CPM, Clicks — no sales inside).
2. GMV Max numbers (GMV, Cost, Orders, ROI per account).
3. Ad total (gross, tax, net, visitors).

## What you get out
- One header: total spend, total sales, blended ROAS vs GMV-Max-only ROAS — so you can see TTAM dragging the average down (75.7% of spend, 0 sales).
- TTAM table with full campaign names: cheapest reach on top (CPM below RM1.20 keeps running), expensive no-click campaigns marked CUT (CPM above RM4, or RM800+ spend with almost zero clicks).
- GMV Max tables (Live + Product): green BOOST for ROI 7.0 and above, yellow WATCH for 6–7, red CUT below 6. Example: `Dr Samhan Official1` BOOST, `Dr Samhan Official3` CUT.
- One button: download the cut/boost list as CSV for Excel.
- Try-this math: tick campaigns off in the kill list and see the new ROAS instantly (example: removing L3 lifts blended 2.42x to about 3.27x — still below 7.0, so more cuts needed).

## Rules it follows
- Runs on your own computer only (localhost), nothing uploaded.
- Campaign and account names are shown exactly as TikTok spells them — nothing renamed.
- ROI 7.0 rule comes from the strategy playbook and is never changed here.
- TTAM is judged on cheap reach (CPM/impressions), GMV Max on sales (ROI) — never mixed.
