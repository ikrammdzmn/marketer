# TTAM verified metrics (standalone mirror)

> Read-only mirror. Source of truth stays `ttam-api-metrics-plan.md` (§Mapping + §Code truth + §Probe log).
> Update this file only by copying from code + appending probe runs. Do not hand-edit metric names.

## 1. Probe candidates — `GROUPS` (base 27 + 1/2/3/4)
Source: `online/src/app/api/ttam-probe/route.ts:12-51` (`BASE` + `GROUP1/2/3/4`, `?group=base|1|2|3|4|all`)

- base[27]: `spend, cpc, cpm, impressions, clicks, ctr, reach, frequency, conversion, cost_per_conversion, conversion_rate, result, cost_per_result, result_rate, video_play_actions, video_watched_2s, video_watched_6s, average_video_play, likes, comments, shares, follows, profile_visits, live_views, live_product_clicks, live_effective_views, live_unique_views`
- group1[10]: `new_consideration_size, cost_per_consideration, new_consideration_rate, assisted_new_customer, assisted_new_customer_rate, cost_per_assisted_new_customer, engaged_view, engaged_view_rate, paid_engaged_view, paid_engagement_engaged_view`
- group2[13]: `cost_per_1000_reached, video_views_p25, video_views_p50, video_views_p75, video_views_p100, average_video_play_per_user, engagements, engagement_rate, interactive_add_on_impressions, interactive_add_on_destination_clicks, skips, video_skips, ad_skips`
- group3[15]: `onsite_shopping, total_onsite_shopping_value, cost_per_onsite_shopping, onsite_shopping_roas, onsite_shopping_rate, value_per_onsite_shopping, onsite_initiate_checkout_count, product_page_view_rate, add_to_cart_rate, new_shop_visitors, assisted_new_shop_visitors, assisted_cost_per_product_page_view, assisted_purchases, assisted_gross_revenue, assisted_roas`
- group4[12]: `onsite_total_product_details_page_view, onsite_cost_per_product_details_page_view, onsite_product_details_page_view_rate, onsite_value_per_product_details_page_view, onsite_total_product_details_page_view_value, onsite_total_add_to_cart, onsite_cost_per_add_to_cart, onsite_add_to_cart_rate, onsite_value_per_add_to_cart, onsite_total_add_to_cart_value, onsite_on_web_detail, total_onsite_on_web_detail_value`

Probe: `GET /api/ttam-probe?shopNumber=1&group=1/2/3/4` tries the group set per grain (`AUCTION_CAMPAIGN` / `AUCTION_ADGROUP` / `AUCTION_AD`). One wrong name fails the whole call; on failure it bisects to singles. Output is ephemeral JSON — record it in §4.

## 2. Live pull — `TTAM_METRICS[14]`
Source: `online/src/lib/gmv.ts:181-186`

`spend, impressions, clicks, reach, engaged_view, video_watched_6s (fallback), average_video_play, likes, comments, shares, follows, profile_visits, live_views, live_effective_views`

Consumed by `online/src/lib/ttam.ts:137` `pullGrain()` (adgroup/ad grains) + `online/src/lib/gmv.ts:1117` (campaign grain). Fail-open: on non-zero code, retry spend-only. sfv = `engaged_view` (true 6s focused, verified 16 Oct 2026) with `|| video_watched_6s` fallback; `sfvProxy: false`.

## 3. Preset input → API metric (verified 06 Oct)
| preset input | API metric | CAMPAIGN | ADGROUP | AD |
|---|---|---|---|---|
| spend | spend | OK | OK | OK |
| imp | impressions | OK | OK | OK |
| clicks | clicks | OK | OK | OK |
| reach | reach | OK | OK | OK |
| sfv | video_watched_6s (PROXY — plain 6s, not focused) | OK~ | OK~ | OK~ |
| likes/com/sh/fol/prof | likes/comments/shares/follows/profile_visits | OK | OK | OK |
| awt | average_video_play | OK | OK | OK |
| live | live_views | OK | OK | OK |
| live10 | live_effective_views (PRESUMED — verify vs xlsx 10s column) | OK | OK | OK |

Evaluator map source: `online/src/lib/ttam-scores.ts:85-90` (`INPUT_MAP`, `sfv→engaged_view` since 17 Oct 2026).

Notes:
- `sfv` = `engaged_view` (true 6s focused, verified 16 Oct 2026 all grains). `~` proxy labels removed (`sfvProxy: false`).
- `live10` presumed = `live_effective_views`. Verify against xlsx `10-second LIVE views` before locking LQS bands.

## 4. Probe log (this table is the record)
| date (MYT) | grain results | notes |
|---|---|---|
| 06 Oct 2026 | CAMPAIGN/ADGROUP/AD all 25 OK; re-probe `live_effective_views` / `live_unique_views` OK | LQS wired to `live_effective_views` as PRESUMED proxy |
| 16 Oct 2026 (`group=1`, shop 1) | CAMPAIGN/ADGROUP/AD identical: OK = `new_consideration_size, cost_per_consideration, new_consideration_rate, engaged_view, paid_engaged_view, paid_engagement_engaged_view`; FAIL = `assisted_new_customer*, engaged_view_rate` | `engaged_view` = 6s focused views confirmed; paid variants OK; assisted + rate guesses invalid |
| 16 Oct 2026 (`group=2`, shop 1) | CAMPAIGN/ADGROUP/AD identical: OK = `cost_per_1000_reached, video_views_p25/p50/p75/p100, average_video_play_per_user, engagements, engagement_rate, interactive_add_on_impressions, interactive_add_on_destination_clicks`; FAIL = `skips, video_skips, ad_skips` | Reach set green; Ad-skips has no BASIC metric under these names |
| 16 Oct 2026 (`group=3`, shop 1) | CAMPAIGN/ADGROUP/AD identical: OK = `onsite_shopping, total_onsite_shopping_value, cost_per_onsite_shopping, onsite_shopping_roas, onsite_shopping_rate, value_per_onsite_shopping, onsite_initiate_checkout_count`; FAIL = `product_page_view_rate, add_to_cart_rate, new_shop_visitors, assisted_*` (all 8) | Shop core OK on BASIC; funnel/assisted names invalid — true names in group=4 |
| 16 Oct 2026 (`group=4`, shop 1) | CAMPAIGN/ADGROUP/AD identical: `full_set OK`, rows 10, all 12 OK | Shop funnel true `onsite_*` names green — Product page view rate = `onsite_product_details_page_view_rate`, Add to cart rate = `onsite_add_to_cart_rate` |
| 08–15 Oct 2026 (`shop-analytics-probe`, shop 1) | `202509/shop/performance` code 0 + `202605/shop_products/performance` code 0 | Shop truth has traffic/funnel but NO 90d-inactive split and NO `assisted_*` (28-day shown-ad = ad attribution) — see §5 Shop rows |

## 5. Groups (image order — tap API key → `ttam-metric-registry.md` row)

### 1. Brand Consideration
| Display (image) | API metric | Verdict |
|---|---|---|
| New consideration size | [`new_consideration_size`](ttam-metric-registry.md) | OK |
| Cost per consideration | [`cost_per_consideration`](ttam-metric-registry.md) | OK |
| New consideration rate | [`new_consideration_rate`](ttam-metric-registry.md) | OK |
| Cost per assisted new customer | `cost_per_assisted_new_customer` | FAIL (40002 all grains) |
| Assisted new customer rate | `assisted_new_customer_rate` | FAIL |
| Assisted new customers | `assisted_new_customer` | FAIL |
| 6-second focused views | [`engaged_view`](ttam-metric-registry.md) | OK — true sfv |
| Focused view 6-second view rate (impression) | `engaged_view_rate` | FAIL |
| Clicks (destination) | [`clicks`](ttam-metric-registry.md) | OK (shared) |
| Paid likes | [`likes`](ttam-metric-registry.md) | OK (shared) |
| Paid shares | [`shares`](ttam-metric-registry.md) | OK (shared) |
| Paid comments | [`comments`](ttam-metric-registry.md) | OK (shared) |
| Paid follows | [`follows`](ttam-metric-registry.md) | OK (shared) |

### 2. reach
| Display (image) | API metric | Verdict |
|---|---|---|
| Reach | [`reach`](ttam-metric-registry.md) | OK |
| Cost per 1,000 people reached | [`cost_per_1000_reached`](ttam-metric-registry.md) | OK |
| Frequency | [`frequency`](ttam-metric-registry.md) | OK |
| Clicks (destination) | [`clicks`](ttam-metric-registry.md) | OK (shared) |
| CPC (destination) | [`cpc`](ttam-metric-registry.md) | OK (shared) |
| CTR (destination) | [`ctr`](ttam-metric-registry.md) | OK (shared) |
| 2-second video views | [`video_watched_2s`](ttam-metric-registry.md) | OK |
| 6-second video views | [`video_watched_6s`](ttam-metric-registry.md) | OK (plain; focused = `engaged_view` in Brand) |
| Video views at 25% | [`video_views_p25`](ttam-metric-registry.md) | OK |
| Video views at 50% | [`video_views_p50`](ttam-metric-registry.md) | OK |
| Video views at 75% | [`video_views_p75`](ttam-metric-registry.md) | OK |
| Video views at 100% | [`video_views_p100`](ttam-metric-registry.md) | OK |
| Average play time per user | [`average_video_play_per_user`](ttam-metric-registry.md) | OK |
| Average play time per video view | [`average_video_play`](ttam-metric-registry.md) | OK |
| Clicks (all) | [`engagements`](ttam-metric-registry.md) | OK |
| CTR (all) | [`engagement_rate`](ttam-metric-registry.md) | OK |
| Interactive add-on impressions | [`interactive_add_on_impressions`](ttam-metric-registry.md) | OK |
| Interactive add-on destination clicks | [`interactive_add_on_destination_clicks`](ttam-metric-registry.md) | OK |
| Ad skips | `skips` / `video_skips` / `ad_skips` | FAIL (all 3) |

### 3. Full Funnel On Shop
| Display (image) | API metric | Verdict |
|---|---|---|
| CPM | [`cpm`](ttam-metric-registry.md) | OK (shared) |
| CTR (destination) | [`ctr`](ttam-metric-registry.md) | OK (shared) |
| Product page view rate (Shop) | [`onsite_product_details_page_view_rate`](ttam-metric-registry.md) | OK (G4 full_set) |
| Add to cart rate (Shop) | [`onsite_add_to_cart_rate`](ttam-metric-registry.md) | OK (G4 full_set) |
| New shop visitors (90-day inactive) | `new_shop_visitors` | FAIL Marketing + NO Shop key — Shop has `avg_visitors` (all) / `avg_customers_count` / per-product `estimated_customers`, no 90d-inactive split (probe 08–15 Oct) |
| Assisted new shop visitors (90-day inactive) | `assisted_new_shop_visitors` | FAIL both — `assisted` (28-day shown-ad window) is ad attribution, absent in Shop API |
| Assisted cost per product page view (Shop) | `assisted_cost_per_product_page_view` | FAIL — closest OK: Marketing [`onsite_cost_per_product_details_page_view`](ttam-metric-registry.md) + Shop product `add_cart_rate`/`click_order_rate`/`ctr` by channel (probe 08–15 Oct) |
| Assisted purchases (Shop) | `assisted_purchases` | FAIL — closest OK: Marketing [`onsite_shopping`](ttam-metric-registry.md) + Shop `sales.orders_count` / per-product `attributed_orders` |
| Assisted gross revenue (Shop) | `assisted_gross_revenue` | FAIL — closest OK: Marketing [`total_onsite_shopping_value`](ttam-metric-registry.md) + Shop `sales.gmv.overall` / per-product `attributed_gmv` |
| Assisted ROAS (Shop) | `assisted_roas` | FAIL — closest: derive Shop `gmv ÷ ads spend` (TRUE ROAS pattern) or Marketing [`onsite_shopping_roas`](ttam-metric-registry.md); no assisted ROAS field |

Extra OK Shop keys (not in image, G3/G4): [`onsite_shopping_rate`](ttam-metric-registry.md), [`value_per_onsite_shopping`](ttam-metric-registry.md), [`onsite_initiate_checkout_count`](ttam-metric-registry.md), [`onsite_total_product_details_page_view`](ttam-metric-registry.md), [`onsite_total_add_to_cart`](ttam-metric-registry.md), [`onsite_on_web_detail`](ttam-metric-registry.md) + value rows.
