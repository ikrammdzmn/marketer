---
name: tiktok-ads-analysis
description: Analyze TTAM campaigns/adgroups/ads for performance (performing vs underperforming, kill/scale/watch). Use whenever user mentions TTAM, Brand Consideration, Video Views, Reach, engaged views, EV, CPEV, custom columns, preset columns, or asks which campaign/adgroup/ad is good/bad. Always uses Ads Manager UI metric names, never raw API field names.
---

# TikTok Ads analysis (UI-terms only)

Repo-local analysis skill. API is for fetching, UI is for talking.

## Source of truth

- Sheet `TTAM METRICS` (`1j4n8sQrXEpiorixAVFArxm_hKbn3kmtEqiXeJIyAz4k`)
- Tab `Metric Group - TTAM` = UI column names per objective. Sheet wins over API names and over this file whenever they disagree.
- Verdict numbers live elsewhere, do not duplicate:
  - `skills/ttam-metrics/verdicts.md` — Kill/Scale/Watch constants
  - `SOP - Verdict Rules` + `Guardrails` tabs — rule text
  - `1-knowledge/tiktok-strategy/` — owner guardrails ROI >= 7.0, CPA <= RM21.18

Related skills (cross-load, do not duplicate):
- `skills/tiktok-api/` — API shapes, grains, quirks. Load before API work.
- `skills/tiktok-shop/` — Shop sync, MYT bucketing.
- `skills/tiktok-ads/` — audit flow.

## Rule 1: UI terms only in output

Never output raw API field names (`engaged_view`, `video_play_actions`, `spend`, `cpm` lowercase). Always output UI names from `Metric Group - TTAM`:

| API (fetch only) | UI (say this) |
|---|---|
| `spend` | `Spend` |
| `impressions` | `Impressions` |
| `cpm` | `CPM` |
| `reach` | `Reach` |
| `clicks` | `Clicks (destination)` or `Clicks (all)` — state which |
| `ctr` | `CTR (destination)` or `CTR (all)` — state which |
| `video_play_actions` | `Video views` |
| `engaged_view` | `6-second focused views` |
| `likes` | `Paid likes` (in Brand Consideration / VV groups) |
| `comments` | `Paid comments` |
| `shares` | `Paid shares` |
| `new_consideration_size` | `New consideration size` |
| `cost_per_consideration` | `Cost per consideration` |
| `new_consideration_rate` | `New consideration rate` |

If UI has singular/plural variants (`Impression` vs `Impressions`), use the variant from the objective group you are reporting on.

## Rule 2: Computed metrics and PIC benchmark

- `Focused view 6-second view rate (impression)` = `6-second focused views / Impressions`. Say full UI name, not EVR.
- `Cost per focused view` = `Spend / 6-second focused views`. Computed, no UI column. Say formula every time. Never present as a native column.
- Legacy short forms (`EV`, `EVR`, `CPEV`) are banned in output. Use only when quoting user.
- PIC `Cost per consideration` (TikTok PIC, 30d window): `Cost per consideration = Total consideration ads investment / total consideration size` = `Spend / New consideration size`. Size scales with Spend, so judge on cost, not size. More Spend = more audience; more effective creative = more audience at same Spend.
- Internal band (`Brand consideration ` campaign 1872737142142146, 30d 2026-10-12 to 2026-11-10 calibrated): Performing `Cost per consideration` <= 0.20 | Watch 0.21-0.40 | Underperforming > 0.40. Always with `Spend >= RM50` gate. Current: campaign 0.04, group 1 0.04, group 2 0.05 — all Performing.
- Affiliate band (`AFFILIATE - Brand consideration ` campaign 1877542598201505, 30d n=16 `Spend`>=50: min 0.34, p25 0.67, median 1.12, p75 1.43, mean 1.23, overall 0.88): Performing <= 0.50 | Watch 0.51-0.90 | Underperforming > 0.90. Always with `Spend >= RM50` gate. PIC RM0.20-0.40 fails 15/16 here, so do not use PIC for affiliate.
- PIC band RM0.20-0.40 is Watch guidance for internal, not hard Kill and not for affiliate.

## Rule 3: Use the right group for the objective

- `Consideration / Brand Consideration` (16 cols): `Spend, Impressions, CPM, New consideration size, Cost per consideration, New consideration rate, Cost per assisted new customer, Assisted new customer rate, Assisted new customers, 6-second focused views, Focused view 6-second view rate (impression), Clicks (destination), Paid likes, Paid shares, Paid comments, Paid follows`.
- `Consideration / Video views (6-second)` (11 cols): `Spend, CPM, Cost per result, 6-second focused views, Result rate, 6-second focused views (paid views), Focused view 6-second view rate (impression), New consideration size, Cost per consideration, New consideration rate, Impressions`.
- Do not mix Reach cols (`Cost per 1,000 people reached`, `Frequency`) into Brand Consideration reports.

## Procedure

1. Confirm objective + date window + timezone (API UTC, MYT = UTC+8, nightly yesterday is truth, TikTok restates intraday).
2. Pull `AUCTION_CAMPAIGN` then `AUCTION_ADGROUP` then `AUCTION_AD` via `report_integrated_get`, `order_field: spend`, `order_type: DESC`.
3. Score within same age cohort only (e.g. Batch 1 vs Batch 1). No verdict before Spend RM50. VV needs 48h / 3 full days + 1,000+ impressions per ad. Sales needs 7-day rolling.
4. Rank by cost efficiency (`Spend / 6-second focused views`) + hook (`Focused view 6-second view rate`), not raw views.
5. Report in UI names with full IDs, spend, and formulas shown.

## Where columns live (tell user this, not API paths)

- `Campaign page > Campaign / Ad group / Ad tab > Columns > Custom Columns` — search `Focused` / `Engaged` to add `6-second focused views`.
- `Dashboard > Analytics > Custom Reports > Create` — left panel is the complete preset list.
- Docs: `https://ads.tiktok.com/help/article/view-data`, `https://ads.tiktok.com/resources/help/article/all-metrics?lang=en`, `https://ads.tiktok.com/resources/help/article/video-play?lang=en`.

## Boundaries

- Keep every account change as draft until owner approves. Reads via MCP are fine; creates are Ads Manager (writes gated per-advertiser).
- Repo guardrails win over TikTok benchmarks.
- Count metrics never kill standalone — always pair with `Spend >= RM50`.
