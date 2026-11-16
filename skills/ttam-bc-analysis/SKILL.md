---
name: ttam-bc-analysis
description: Analyze TTAM Brand Consideration only (internal + affiliate) with 30d Cost per consideration + 7d focused check, plus combined GMV Max sales read by Post ID. Use for any Brand Consideration campaign/adgroup/ad verdict, kill/scale/watch, or consideration-vs-sales conflict.
---

# TTAM Brand Consideration analysis (BC only)

Scope: `Consideration / Brand Consideration` group only. Other TTAM groups (`Video views`, `Reach`) get their own skills — keep them out.

## Source of truth

- Sheet `TTAM METRICS` (`1j4n8sQrXEpiorixAVFArxm_hKbn3kmtEqiXeJIyAz4k`), tab `Metric Group - TTAM`. Sheet wins over this file on column names.
- Related (cross-load, do not duplicate): `tiktok-ads-analysis` (general router), `ttam-metrics` (numbers), `tiktok-api` (shapes, load before API work), `tiktok-shop` (Shop sync).

## Rule 1: UI terms only in output

API is for fetching, UI is for talking. Never output raw fetch names.

| Fetch (only) | Say (UI) |
|---|---|
| `spend` | `Spend` |
| `impressions` | `Impressions` |
| `cpm` | `CPM` |
| `new_consideration_size` | `New consideration size` |
| `cost_per_consideration` | `Cost per consideration` |
| `new_consideration_rate` | `New consideration rate` |
| `engaged_view` | `6-second focused views` |
| `likes` / `comments` / `shares` | `Paid likes` / `Paid comments` / `Paid shares` |

Computed (say formula every time, never present as native):
- `Cost per consideration = Spend / New consideration size`
- `Focused view 6-second view rate (impression) = 6-second focused views / Impressions`
- `Cost per focused view = Spend / 6-second focused views`

## Rule 2: bands + gate + PIC

- Gate: no verdict before `Spend >= RM50`.
- Internal (`Brand consideration`): Performing `Cost per consideration` <= 0.20 | Watch 0.21-0.40 | Underperforming > 0.40.
- Affiliate (`AFFILIATE - Brand consideration`): Performing <= 0.50 | Watch 0.51-0.90 | Underperforming > 0.90.
- PIC `Cost per consideration` RM0.20-0.40 (TikTok person-in-charge, 30d window) is Watch guidance for internal, not hard Kill, never for affiliate (fails 15/16).
- 7d `Focused view 6-second view rate` pacing bar 12%: below = creative fatigue even when cost passes (e.g. B2 8.51%).

## Procedure (30d + 7d)

1. Windows: 30d calibration + 7d fresh check. Nightly yesterday is truth (API UTC, MYT = UTC+8, TikTok restates intraday).
2. Pull `AUCTION_CAMPAIGN` then `AUCTION_ADGROUP` then `AUCTION_AD` via `report_integrated_get`, `order_field: Spend`, `order_type: DESC`. Parent+child ID combos fail — pull child grain alone, filter client-side.
3. Rank within same cohort (B1 / B2 / Aff). Report Ad ID differs from UI Smart+ ID — search UI by post URL (tail = Post ID), never by report Ad ID.
4. Tables live in `3-ttam/analysis/brand-consideration/brand-consideration-analysis.html` (edit in place, keep `No` + `Ad name` columns): Campaign 30d, Adgroup 30d+7d, Ad split B1 / B2 / Aff sorted by `Spend` DESC. Underperformers always with full IDs. Snapshots (`brand-consideration-30d/table`, `affiliate-cpc-band`) + GMV Max xlsx reports (`../campaign-reports/`) sit alongside.
5. `Reach`-for-warning work (e.g. anti-fake) does not belong here — it has no consideration signal by design.

## Combined read (TTAM + GMV Max)

Join key = Post ID (GMV Max `item_id` = tail of TTAM `Ad name`). Windows differ — say each window every time.

- GMV Max side: `Cost / orders / Gross revenue / ROI (>= 7.0) / Cost per order (<= RM21.18)`.
- Both pass = scale. TTAM fail + GMV pass = keep in GMV Max, cap in TTAM (e.g. post `7633006832654634258`: TTAM 1.45 Underperforming, GMV 4d ROI 6.50 + Cost per order 11.39 borderline-keep). TTAM pass + GMV fail = hook works, offer does not. Both fail = pause both.
- Tiny/no-delivery GMV rows (e.g. `7646335771154255125` RM4.37 / 6 orders, `7693111970760789256` all-zero) = no scale call. Note `item_id "-1"` = unattributed bucket row.

## Boundaries

- Draft only until owner approves. Reads via MCP; creates/pauses/budget moves in Ads Manager (writes gated per-advertiser).
- Count metrics never kill alone — always with `Spend >= RM50`.
- Never move losers to a new adgroup to rescue them — pause in place.
