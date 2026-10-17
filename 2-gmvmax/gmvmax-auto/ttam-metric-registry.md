# TTAM metric registry (raw thresholds, OMTM-style)

> One row per verified API key. Groups reference keys — no duplication.
> Evidence: `ttam-verified-metrics.md` (§1/§4/§5) + probe `GET /api/ttam-probe?shopNumber=1&group=N`.
> Scoring stays in presets (`ttam.presets`); this file is the raw-metric threshold source.

## Conventions (OMTM-style, per raw metric)
- `Kill` = bad side, `Scale` = good side. Middle = `Watch` (implicit, never stored).
- `Direction`: `high-good` (volume/rate/revenue/ROAS — low=KILL, high=SCALE) or `low-good` (cost — high=KILL, low=SCALE, invert).
- Units: `RM` costs, `%` rates, `x` multiples, `s` seconds, else `count`.
- Empty `Kill/Scale` = TODO owner. Only pre-filled seeds are from `ttam-basic-v1` (`019`).
- FAIL keys are NOT in the registry — see §Do-not-use.

## Registry
| API key | Display | Unit | Direction | Kill | Scale | Groups | Verified | Notes |
|---|---|---|---|---|---|---|---|---|
| spend | Spend | RM | — | — | — | core, brand, reach, shop | OK 06 Oct base | spend-only fallback metric |
| cpc | CPC (destination) | RM | low-good |  |  | core, brand, reach | OK 06 Oct base | destination click cost |
| cpm | CPM | RM | low-good | >30 | <15 | core, reach, shop | OK 06 Oct base | seed from `ttam-basic-v1` (RM) |
| impressions | Impressions | count | high-good | <1000 | >5000 | core, brand, reach | OK 06 Oct base | seed from `ttam-basic-v1` |
| clicks | Clicks (destination) | count | high-good |  |  | core, brand, reach | OK 06 Oct base | = destination (Renta docs) |
| ctr | CTR (destination) | % | high-good |  |  | core, brand, reach | OK 06 Oct base | destination |
| reach | Reach | count | high-good |  |  | core, brand, reach | OK 06 Oct base |  |
| frequency | Frequency | x | — |  |  | core, reach | OK 06 Oct base | avg views per user; no K/S yet |
| conversion | Conversion | count | high-good |  |  | core | OK 06 Oct base |  |
| cost_per_conversion | Cost per conversion | RM | low-good |  |  | core | OK 06 Oct base |  |
| conversion_rate | Conversion rate | % | high-good |  |  | core | OK 06 Oct base |  |
| result | Result | count | high-good |  |  | core | OK 06 Oct base |  |
| cost_per_result | Cost per result | RM | low-good |  |  | core | OK 06 Oct base |  |
| result_rate | Result rate | % | high-good |  |  | core | OK 06 Oct base |  |
| video_play_actions | Video views | count | high-good |  |  | core, brand, reach | OK 06 Oct base |  |
| video_watched_2s | 2s video views | count | high-good |  |  | core, brand, reach | OK 06 Oct base | kept as fallback |
| video_watched_6s | 6s video views (plain) | count | high-good |  |  | core, brand, reach | OK 06 Oct base | fallback only; sfv now `engaged_view` |
| average_video_play | Avg play per view | s | high-good |  |  | core, brand, reach | OK 06 Oct base |  |
| likes | Paid likes | count | high-good |  |  | core, brand | OK 06 Oct base | API is paid-only |
| comments | Paid comments | count | high-good |  |  | core, brand | OK 06 Oct base |  |
| shares | Paid shares | count | high-good |  |  | core, brand | OK 06 Oct base |  |
| follows | Paid follows | count | high-good |  |  | core, brand | OK 06 Oct base |  |
| profile_visits | Profile visits | count | high-good |  |  | core, brand | OK 06 Oct base |  |
| live_views | Live views | count | high-good |  |  | core | OK 06 Oct base |  |
| live_product_clicks | Live product clicks | count | high-good |  |  | core, shop | OK 06 Oct base |  |
| live_effective_views | Live effective views | count | high-good |  |  | core | OK 06 Oct base | LQS input (PRESUMED 10s proxy) |
| live_unique_views | Live unique views | count | high-good |  |  | core | OK 06 Oct re-probe |  |
| new_consideration_size | New consideration size | count | high-good |  |  | brand | OK 16 Oct G1 |  |
| cost_per_consideration | Cost per consideration | RM | low-good |  |  | brand | OK 16 Oct G1 |  |
| new_consideration_rate | New consideration rate | % | high-good |  |  | brand | OK 16 Oct G1 |  |
| engaged_view | 6s focused views | count | high-good |  |  | brand | OK 16 Oct G1 | true sfv since 17 Oct (was `video_watched_6s` proxy) |
| paid_engaged_view | Focused 6s (paid views) | count | high-good |  |  | brand | OK 16 Oct G1 | paid-view split |
| paid_engagement_engaged_view | Focused 6s (paid engagements) | count | high-good |  |  | brand | OK 16 Oct G1 | paid-engagement split |
| cost_per_1000_reached | Cost per 1,000 reached | RM | low-good |  |  | reach | OK 16 Oct G2 |  |
| video_views_p25 | Views at 25% | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| video_views_p50 | Views at 50% | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| video_views_p75 | Views at 75% | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| video_views_p100 | Views at 100% | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| average_video_play_per_user | Avg play per user | s | high-good |  |  | reach | OK 16 Oct G2 |  |
| engagements | Clicks (all) | count | high-good |  |  | reach | OK 16 Oct G2 | all clicks incl. social |
| engagement_rate | CTR (all) | % | high-good |  |  | reach | OK 16 Oct G2 |  |
| interactive_add_on_impressions | Interactive add-on impressions | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| interactive_add_on_destination_clicks | Interactive add-on destination clicks | count | high-good |  |  | reach | OK 16 Oct G2 |  |
| onsite_shopping | Shop payments | count | high-good |  |  | shop | OK 16 Oct G3 |  |
| total_onsite_shopping_value | Shop payment value | RM | high-good |  |  | shop | OK 16 Oct G3 |  |
| cost_per_onsite_shopping | Cost per shop payment | RM | low-good |  |  | shop | OK 16 Oct G3 |  |
| onsite_shopping_roas | Shop ROAS | x | high-good |  |  | shop | OK 16 Oct G3 |  |
| onsite_shopping_rate | Shop purchase rate | % | high-good |  |  | shop | OK 16 Oct G3 |  |
| value_per_onsite_shopping | Shop AOV | RM | high-good |  |  | shop | OK 16 Oct G3 | higher AOV = SCALE |
| onsite_initiate_checkout_count | Shop checkouts initiated | count | high-good |  |  | shop | OK 16 Oct G3 |  |
| onsite_total_product_details_page_view | Product page views (Shop) | count | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_cost_per_product_details_page_view | Cost per product page view (Shop) | RM | low-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_product_details_page_view_rate | Product page view rate (Shop) | % | high-good |  |  | shop | OK 16 Oct G4 full_set | display: Product page view rate (Shop) |
| onsite_value_per_product_details_page_view | Value per product page view (Shop) | RM | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_total_product_details_page_view_value | Product page view value total (Shop) | RM | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_total_add_to_cart | Add to cart (Shop) | count | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_cost_per_add_to_cart | Cost per add to cart (Shop) | RM | low-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_add_to_cart_rate | Add to cart rate (Shop) | % | high-good |  |  | shop | OK 16 Oct G4 full_set | display: Add to cart rate (Shop) |
| onsite_value_per_add_to_cart | Value per add to cart (Shop) | RM | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_total_add_to_cart_value | Add to cart value total (Shop) | RM | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| onsite_on_web_detail | Product detail page views | count | high-good |  |  | shop | OK 16 Oct G4 full_set |  |
| total_onsite_on_web_detail_value | Product detail page view value | RM | high-good |  |  | shop | OK 16 Oct G4 full_set |  |

## Groups (reference keys only — definitions live above)
- `core`: spend, cpc, cpm, impressions, clicks, ctr, reach, frequency, conversion, cost_per_conversion, conversion_rate, result, cost_per_result, result_rate, video_play_actions, video_watched_2s, video_watched_6s, average_video_play, likes, comments, shares, follows, profile_visits, live_views, live_product_clicks, live_effective_views, live_unique_views
- `brand` (Brand Consideration): new_consideration_size, cost_per_consideration, new_consideration_rate, engaged_view, paid_engaged_view, paid_engagement_engaged_view + core(shared: spend, impressions, clicks, ctr, video_play_actions, video_watched_2s, engaged_view, average_video_play, likes, comments, shares, follows, profile_visits)
- `reach` (Reach): cost_per_1000_reached, video_views_p25, video_views_p50, video_views_p75, video_views_p100, average_video_play_per_user, engagements, engagement_rate, interactive_add_on_impressions, interactive_add_on_destination_clicks + core(shared: reach, frequency, clicks, cpc, ctr, impressions)
- `shop` (Full Funnel On Shop): onsite_shopping, total_onsite_shopping_value, cost_per_onsite_shopping, onsite_shopping_roas, onsite_shopping_rate, value_per_onsite_shopping, onsite_initiate_checkout_count, onsite_total_product_details_page_view, onsite_cost_per_product_details_page_view, onsite_product_details_page_view_rate, onsite_value_per_product_details_page_view, onsite_total_product_details_page_view_value, onsite_total_add_to_cart, onsite_cost_per_add_to_cart, onsite_add_to_cart_rate, onsite_value_per_add_to_cart, onsite_total_add_to_cart_value, onsite_on_web_detail, total_onsite_on_web_detail_value + core(shared: spend, cpm, ctr, live_product_clicks)

## Do-not-use (probe FAIL 40002, all grains)
- `assisted_new_customer`, `assisted_new_customer_rate`, `cost_per_assisted_new_customer`, `engaged_view_rate` (G1 guesses)
- `skips`, `video_skips`, `ad_skips` (G2 guesses)
- `product_page_view_rate`, `add_to_cart_rate`, `new_shop_visitors`, `assisted_new_shop_visitors`, `assisted_cost_per_product_page_view`, `assisted_purchases`, `assisted_gross_revenue`, `assisted_roas` (G3 guesses — page-view/add-to-cart superseded by G4 `onsite_*`; new-90d/assisted confirmed missing in BOTH Marketing BASIC and Shop Analytics probe 08–15 Oct 2026: Shop has `avg_visitors`/`avg_customers_count`/`estimated_customers` + funnel `add_cart_rate`/`click_order_rate`/`ctr` by channel, but no 90d-inactive split and no `assisted_*`)

## How to add a group / threshold
1. New group = append a key list under §Groups (reuse keys; add new rows to §Registry only for brand-new API keys, probe first via `?group=N`).
2. New threshold = fill `Kill`/`Scale` on that row (respect `Direction`; costs invert). Watch stays implicit.
3. Preset wiring later: each registry row maps to one preset metric row (`DB expression` + bands); shared keys can appear in multiple presets.
