---
name: tiktok-shop
description: Verified TikTok Shop API shapes for this repo (orders sync, tokens, MYT bucketing). Load before any shop-side work. Only verified shapes live here.
---

# TikTok Shop skill (repo-local, verified-only)

Shop Partner Center Custom app (`HIMWELLNESS GMV MAX INTERNAL`, MY market).
Auth: seller-side authorize URL → `8082/callback` → exchange at
`auth.tiktok-shops.com/api/v2/token/get` (code 0: access ~122 chars,
refresh ~79). **Cipher comes from `GET /authorization/202309/shops`,
NOT the token response** (it carries no shops/cipher). Shop 7495...0274
(Dr Samhan MY). Tokens in gitignored `.local_secrets.json` (lengths-only
in chat) + 3 Vercel prod env vars. Authorize stays dead until app approval
(`service does not exist` = review pending).

## Token refresh (online, admin one-tap)

`requireShopTokenAccess()` in `authz.ts` (single swap point: admin today,
per-module later). `/api/shop-token`: GET = expiry info (lengths only),
POST = admin + same-origin, seeds Neon row from env on first run, refreshes
via `token/refresh`, audits best-effort. **v2 `access_token_expire_in` is
absolute epoch** — normalize epoch-vs-duration in `shopTokenExpiryMs()`
or auto-refresh never fires. Access life ~7 days. Shop GMV card shows
`valid until` + Refresh button (admin only).

## Second app (Analytics & Reporting, Oct 2026)

Dual-key model: orders keep `SHOP_APP_KEY/SECRET` + `credentials.shop_tokens`
(007/008); analytics uses `SHOP_ANALYTICS_APP_KEY/SECRET` +
`credentials.shop_analytics_tokens` (025, writers tolerate pre-025).
`service_id` shape is per-app: MARKETER HW authorizes by numeric app ID,
key form 404s — support both via `SHOP_*_SERVICE_ID` override, default key.
Cipher is shop-level (identical across apps for one shop); tokens differ.
Server auth: `/api/shop-auth/start` (admin, signed-state cookie, 302) +
`/callback` (exchange, cipher via Authorization Shops, per-app upsert).
Local twin: `shop_auth.py --app orders|analytics` (no Google session needed).

## Orders sync (`orders/search`)

Day-pull per date, bucket on MYT `create_time` (UTC+8). **Exclude
`CANCELLED`/`REFUNDED`** — shop truth is net sellers' reality.
Tie-check every pull: `tied/diff/unparseable` (bucketed hours vs day total).
Rewrite-on-revise (`ON CONFLICT DO UPDATE` — shop restates like ads).
Tables: `gmv.daily_shop_metrics` (014: `shop_order_gmv/count`,
`shop_cancelled_gmv/count`; writers tolerate pre-014 DBs, ads-only fallback)
+ `gmv.shop_hourly_orders` (015: shop/date/hour PK). Range loops ≤31d
(daily) / ≤7d-style small (hourly), per-day fail-open, no wrapping
transaction (Hobby 60s — partial progress persists, reruns continue).
Nightly fills yesterday; hourly-shop view = shop GMV bars + cached ads
spend toggle + TRUE ROAS (shop GMV ÷ ads spend — reads ~18% below
ads-attributed ROAS by nature: attributed LIVE+Product can exceed whole-shop
sales = double-claim overlap).

## Parity note (locked ref)

24–27 Sep shop 1: shop API 163,540.29 / 988 vs ads 169,805.12 / 1,012
(-3.7%, TRUE ROAS 3.71x/3.19x). Manual export said 143,941.26 / 1,016 —
gap parked: owner rechecks export method/status filter (Checkpoint 28).
Never compare across pull times (intraday restatement).

## Shop performance analytics (verified Oct 2026, `/api/shop-analytics-probe`)

- `GET /analytics/202509/shop/performance` (granularity ALL/1D): traffic =
  `avg_page_views/avg_visitors/avg_conversation_rate` only; sales = GMV/
  orders/`avg_customers_count`. No 90-day-inactive split, no assisted fields.
- `GET /analytics/202605/shop_products/performance`: funnel `add_cart_count/
  rate`, `click_order_rate`, `ctr` + `unique_*` + channel splits
  (seller_live/video/product_card, affiliate_*, shop_tab). Same gaps: no
  90d-split, no `assisted_*` (28-day shown-ad = ad attribution, not seller API).
- Needs `TikTok Shop Analytics` scope (dual-key analytics app, 025).
- Affiliated LIVE rooms likewise need a creator token, NOT the seller token
  (seller calls answer 36009005 user-type or 28001022 minute-denied by design).

## Live Room creator APIs (verified 29 Oct 2026, Cp54, green on prod)

- Documented family is `v202502` — the bundled OAS only knew `202309`,
  which 500s `36009003` on every endpoint regardless of token. Verify new
  TikTok API versions against live Partner docs, never the bundled snapshot.
- `GET /analytics/202502/live_rooms/{live_room_id}/{core_stats,traffic_performances,gmv_trend_performances,product_stats}`:
  creator `access_token` in header + signed `app_key` in query, NO
  `shop_cipher` (36009004 if sent). Product CTOR field is
  `click_order_rate` here vs `click_to_order_rate` on core — check per
  endpoint, never assume symmetry.
- AFFILIATE List rows (`202609`, `accountType=AFFILIATE_ACCOUNTS`) omit
  `traffic.impressions/ctr/tap_through_rate` — absent key ≠ 0, render `n/a`,
  keep the mapping ready; never substitute product impressions.
- Creator open_ids are context-scoped: the alliance grant open_id differs
  from the shop List open_id for the SAME human, and the exchange carries no
  username. Match grants↔rooms by admin-set username label; always Copy id
  from the table (never retype); verify the TikTok profile pre-approve.

## Evidence index

Checkpoints 28/29 (auth+refresh), 30 (014/015/pinger), creative Phase A.
Bugs: B63–B69 in gmvmax-auto `DEV_NOTES.md`.
