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

## Evidence index

Checkpoints 28/29 (auth+refresh), 30 (014/015/pinger), creative Phase A.
Bugs: B63–B69 in gmvmax-auto `DEV_NOTES.md`.
