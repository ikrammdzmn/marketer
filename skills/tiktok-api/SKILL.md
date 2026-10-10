---
name: tiktok-api
description: Verified TikTok API shapes for this repo (GMV Max reports, creative grain, identity, quirks). Load before any TikTok API work. Only verified shapes live here — guesses stay in probes.
---

# TikTok API skill (repo-local, verified-only)

Every shape below earned its place via a signed-in probe or a green deploy.
Unverified names stay OUT — probe them first (`/api/creative-probe`,
`/api/sessions/probe`, `/api/ttam-probe` pattern: full set, then singles).

## 1. GMV Max `report/get` — grains that work (shop 1)

Base params always: `advertiser_id` + `store_ids: [shopId]` (+ `gmv_max_promotion_type`).

| Grain | `dimensions` | `filtering` | Notes |
|---|---|---|---|
| Campaign × day | `["campaign_id","stat_time_day"]` | — | Dashboard main pull. Metrics: `cost/orders/gross_revenue/roi` (+`cost_per_order`,`net_cost`). |
| Campaign × hour | `["campaign_id","stat_time_hour"]` | — | 1-day span max. Returns full-day grid incl. future zero slots — detect edge by activity, never store future (B23). Slots are MYT. |
| Room × day | `["room_id","stat_time_day"]` | `campaign_ids: [ONE]` | Sessions drill. Single-ID only; multi-ID 40002. |
| Room meta | `["room_id"]` | `campaign_ids: [ONE]` | `live_status/live_launched_time/live_duration/live_name`. Status = CURRENT TikTok state, launched UTC → MYT +8. `live_name` may be `""` (valid, fallback to `room {id}`). |
| **Creative (`item_id` = Post ID)** | `["item_id"]` | `campaign_ids: [ONE]` **+** `item_group_ids: [...]` | Dual filter REQUIRED — campaign-only fails (`must have at least 1 campaign ID and 1 item group ID`). Discover groups first via product grain (`["item_group_id"]`, campaign filter). |
| Product | `["item_group_id"]` | `campaign_ids: [ONE]` | SPU list per campaign. |
| Day detail | `["item_id","stat_time_day"]` | dual filter | Delivery metrics OK. `item_id "-1"` = unattributed bucket row. |

Attribute metrics (`title/item_id/tt_account_name/shop_content_type/...`) need
**single campaign ID + ONE ID dimension** — never multi-ID or multi-ID-dims.

### Creative-level metric sets (PRODUCT, verified round 6)

Attributes: `title` (Creative), `item_id` (Post ID), `tt_account_name`,
`shop_content_type` (≈type), `tt_account_profile_image_url`.
Delivery: `creative_delivery_status` (Status), `orders` (SKU), `gross_revenue`,
`cost`, `roi`, `cost_per_order` (docs omit these three at creative level —
they WORK, round 6 green), `product_impressions/clicks/click_rate`,
`ad_click_rate`, `ad_conversion_rate`, `ad_video_view_rate_2s/6s/p25/p50/p75/p100`.

### Status taxonomy (delivery axis — API-side, 9 values)

`IN_QUEUE / LEARNING / DELIVERING / NOT_DELIVERING / AUTHORIZATION_NEEDED /
EXCLUDED / UNAVAILABLE / REJECTED / NOT_ACTIVE` — filter
`creative_delivery_statuses`, pairs with campaign/item-group filters.
≈ local stages (Exploring queue→Exploring→Performing→Underperforming + 5
exclusion states verbatim). **Secondary axis (Outstanding etc.) has NO API
field — re-derive from benchmarks, never fetch-chase it.**

## 2. Integrated BASIC `report/integrated/get` — ad grain

Valid `data_level`: `AUCTION_ADVERTISER/AUCTION_CAMPAIGN/AUCTION_ADGROUP/AUCTION_AD`
(`AUCTION_VIDEO` invalid). Parent+child dimension combos 40002 — pull child
grain alone, filter client-side (B37). **Parent filter uses `filters`
(typed array), NOT `filtering`:** `[{field_name:"campaign_ids",
filter_type:"IN", filter_value:[...]}]` — `filtering` object fails
(`Not a valid list`).
Creative metrics OK: `spend/impressions/clicks/ctr/conversion/
video_play_actions/video_watched_2s/6s/average_video_play/likes/comments/
shares/conversion_rate/video_views_p25/p50/p75/p100`.
RED at ad grain: `orders/gross_revenue/roi/cost_per_order`,
`onsite_shopping/total_onsite_shopping_value/cost_per_onsite_shopping/
onsite_shopping_roas` (doc-grounded names, probe says no).

## 3. Identity (`ad/get` + URL tail)

`ad/get` `filtering: {campaign_ids:[...]}` or `{ad_ids:[...]}`.
Keys that matter: `tiktok_item_id`, `ad_name` (= TikTok URL, tail is Post ID),
`ad_text` (Creative), `app_name` (account), `create_time` (Time posted),
`video_id` (often null for GMV — use URL tail instead).
GMV campaigns may own ~zero auction ads; report rows still exist. No universal
Time-posted at creative grain.

## 4. Quirks log (don't relitigate)

- `campaign/get` minimal shape (`advertiser_id + filtering + page`) works;
  `store_ids`/`dimensions` demands drift per call — campaign IDs come from the
  Neon cache, never re-prove the endpoint (creative-sync).
- `item_id "-1"` = unattributed bucket row (keep, label it).
- `40001` = wrong token, not no access (per-advertiser credentials, never
  substitute). `40002` = shape error — bisect singles, read the message
  (it names the fix, e.g. dual-filter).
- Full-set-first, singles-on-failure; fail-open enrichment; rewrite-on-revise
  (TikTok restates intraday — cost revises too, not just GMV).
- Shop token v2 `access_token_expire_in` is absolute epoch (normalize).
- Skip `"-"` placeholder rows. Hobby kills at 60s — batch writes (500/chunk),
  chunk syncs (≤7d), external pinger for hourly.
- Chart.js `order`: higher = BEHIND. PowerShell: `;` chaining, no unix pipes.

## 5. Unprobed candidates (from Buer2333/tiktok-ads-mcp diff, 10 Oct 2026)

- `gmv_max/video/get/` — per-store GMV video library (needs `store_id`).
- `creative/report/get/` (`VIDEO_INSIGHT`) — creative-level video insights.
- `file/video/ad/info/` — asset details incl. `create_time` (Time-posted
  candidate), ≤100 video IDs/req. Note: GMV `item_id`s are post IDs —
  may not resolve here.
- Their patterns worth borrowing: `-` row skip, lag-tolerance completeness
  check, `tenacity`-style retry on rate-limit (ours uses fixed sleeps).
- The fork itself is NOT a dependency — reference only, no second credential path.

## 6. Evidence index

Rounds 1–6: `/api/creative-probe` + Creative tab pastebacks (Oct 2026).
Sessions/live: Checkpoint 20 (DEV_NOTES). TTAM 27-metric map:
`ttam-api-metrics-plan.md`. Session bugs B57–B69: gmvmax-auto `DEV_NOTES.md`.
