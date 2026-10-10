# DATA_FLOW.md — gmvmax-auto zero-to-result runbook (Metric dropdown, all 8 options)

> How to read this file (dynamic for both audiences):
> - **Plain words** = general user. What you click, what you see, how you know it is right.
> - **Technical** = implementer. Exact endpoint + params → transform → Neon table → API route → UI render + verify. Cite `file:line`.
> - Start at §0 for from-scratch setup. Then jump to the §1–§8 option you need. §9 is the failure map.
> - Companion docs: `feature.md` (user guide), `masterplan.md` (locked decisions), `plan.md` §7–§10 (online build order), `DEV_NOTES.md` (session history, not the spec), `skills/tiktok-api/SKILL.md` (verified API shapes).

## §0 From scratch — two tracks

### Track A — brand-new shop/ads onboarding (no app, no tokens, no DB rows)

**Plain words.** You create two TikTok-side approvals, connect both logins once, then run numbered database setups in order, then pull your first numbers.

**Technical.**
1. Business API app: create at `business-api.tiktok.com` (sandbox + prod tracked separately). Display app (`video.list`, Login Kit) cannot be extended. Record sandbox vs prod keys/redirects. Scopes: read-only first is acceptable (`campaign/gmv_max/info`, `gmv_max/report/get`, session list). Write scope only matters at P2. (`APP_CHECKLIST.md:5-8`, `plan.md:23-26`)
2. Shop Open API Custom app (Partner Center, MY): `HIMWELLNESS GMV MAX INTERNAL` pattern. Keep `SHOP_APP_KEY/SECRET`. (`plan.md:24`, `shop_auth.py:39-42`)
3. Prod advertiser OAuth (one-shot, localhost only): `python prod_auth.py` prints `https://business-api.tiktok.com/portal/auth?app_id&state&redirect_uri=http://localhost:8082/callback`, listens `127.0.0.1:8082/callback`, exchanges `oauth2/access_token` locally, appends to gitignored `.local_secrets.json` (lengths-only console). (`prod_auth.py:32-44`, folder `AGENTS.md`)
4. Shop OAuth (one-shot): `python shop_auth.py` prints seller-side `https://services.tiktokshop.com/open/authorize?service_id={app_key}&state=...`, captures `code` at `127.0.0.1:8082/callback`, exchanges `GET auth.tiktok-shops.com/api/v2/token/get?app_key&app_secret&auth_code&grant_type=authorized_code`, saves `TIKTOK_SHOP1_ACCESS_TOKEN/REFRESH_TOKEN/SHOP_CIPHER/SHOP1_SHOP_ID` to `.local_secrets.json`. Cipher picked from `shops[]` matching your shop id else first entry. (`shop_auth.py:23,39-42,64-102`)
5. Neon (SG project, DEV + PROD branches): set `NEON_URL_DEV/PROD` in env/gitignored file only. Run migrations **in numeric order, never edit applied files**: `001_core.sql` → `002_acct.sql` → `003_gmv.sql` → `004_fix_schemas.sql` (schema-qualifies everything, `win` not `window`) → `005_online.sql` (`credentials.refresh_ads_tokens`, `gmv.gmv_campaigns`, `gmv.daily_shop_metrics`) → `006_status.sql` → `007_shop_tokens.sql` (`credentials.shop_tokens`) → `008_shop_token_columns.sql` (cipher/expiry cols) → `009_hourly.sql` (`gmv.hourly_campaign_metrics`) → `010_campaign_budget.sql` (`budget`) → `011_campaign_delivery.sql` (`delivery`) → `012_ttam_presets.sql` (`ttam.presets` + seed `ttam-manual-theory-v1`) → `013_access_allowlist.sql` → `014_shop_orders_daily.sql` (shop-truth cols) → `015_shop_hourly_orders.sql` (`gmv.shop_hourly_orders`) → `016/017/018` creative. Next migration = 019+. (folder `AGENTS.md`, `migrations/004_fix_schemas.sql:13-87`, `migrations/007_shop_tokens.sql:7-15`, `migrations/009_hourly.sql:7-18`)
6. Online env (Vercel): `NEON_URL_PROD`, per-advertiser `TIKTOK_ADS_ACCOUNT{1..4}_ACCESS_TOKEN` (fallback `TIKTOK_PROD_ACCESS_TOKEN`), `SHOP_APP_KEY/SECRET`, `TIKTOK_SHOP1_*` (first Neon seed), `CRON_SECRET`, Google OAuth + `AUTH_ADMIN_EMAIL`. Lengths-only checks. (`plan.md:97-98`)
7. First sync order (§B step 5): campaign sync → daily backfill → hourly → shop daily → shop hourly → open dashboard and Fetch.

### Track B — existing creds + empty DB → dashboard numbers (shop 1)

**Plain words.** Same logins work; the database is empty. You run the setups, tell the system your campaign list, backfill day by day, then the dashboard fills.

**Technical.**
1. Apply migrations on DEV first, verify counts, then PROD. (`plan.md:97`)
2. Seed campaign map: `GET /api/campaigns/sync` (`Authorization: Bearer CRON_SECRET`) runs `syncShopCampaigns(shopNumber)` — `gmv_max/campaign/get/?advertiser_id&filtering={"gmv_max_promotion_types":[TYPE]}&page&page_size=100` for both `PRODUCT_GMV_MAX` + `LIVE_GMV_MAX`, parses first `[...]` anywhere as account (else `Other`), upserts `gmv.gmv_campaigns(campaign_id,shop_id,kind,name,account,promotion_type,advertiser_id,status,budget,delivery,raw,updated_at)` with `ON CONFLICT(campaign_id) DO UPDATE`. (`online/src/lib/gmv.ts:149-263`, `online/src/app/api/campaigns/sync/route.ts:9-25`)
   - Local P0 fallback: TikTok has no GMV list returning rows, so IDs come from Ads Manager into `.local_secrets.json:TIKTOK_GMV_CAMPAIGNS {LIVE,PRODUCT}`, then `python live_view.py`. (`live_view.py:36-54`, `feature.md:117-121`)
3. Shop token first-use: admin opens Shop GMV card → **Refresh shop token** (`POST /api/shop-token`, `requireShopTokenAccess()`, seeds Neon from `TIKTOK_SHOP1_*` env, then `refreshShopToken`; expiry normalized in `shopTokenExpiryMs()`, auto-refresh at expiry-1h). (`online/src/app/api/shop-token/route.ts:15-116`, `online/src/lib/shop-credentials.ts:17-120`)
4. Backfill order (respect caps: Hobby kills at 60s — batch writes 500/chunk; Telegram 4096 chars; shop refresh ≤31d/press):
   a. Daily GMV + TTAM + ROAS: dashboard Fetch (or `POST` nightly-sync) → `gmv.daily_shop_metrics`, `ON CONFLICT(shop_number,date) DO UPDATE`, `Promise.allSettled(GMV,ROAS)` so GMV saves if ads fail. (`plan.md:77`, `online/src/app/api/cron/nightly-sync/route.ts:44-76`)
   b. Hourly ads: **Sync now** (`POST /api/hourly/sync`) or pinger `GET /api/cron/hourly-sync?shopNumber=1` (`Bearer CRON_SECRET`). (`online/src/app/api/hourly/sync/route.ts:10-44`)
   c. Shop daily: Shop GMV → **Refresh daily cache** (`POST /api/shop-gmv/refresh {shopNumber:1,startDate,endDate}`, ≤31d, per-day fail-open). (`online/src/app/api/shop-gmv/refresh/route.ts:9-80`)
   d. Shop hourly: Hourly shop → **Refresh** (`POST /api/hourly-shop/refresh {date|startDate,endDate}`, ≤31d). (`online/src/app/api/hourly-shop/refresh/route.ts:21-59`)
5. Verify (§1–§8 verify steps), then enable automation: Vercel nightly 01:00 MYT + guard-heal past 2d + 30d gap-fill; hourly via `.github/workflows/hourly-sync.yml` Actions pinger (Hobby cron is daily-only; sub-daily `vercel.json` entries fail deploy; skips 02–06 MYT). (`plan.md:77`, folder `AGENTS.md`)

Shop map day-1 (never sum blindly — scope by `store_ids`): shop 1 Him.DrSamhan `7495609155379170274` / adv `7505228077656621057` (hasGMV); shop 2 HIM CLINIC (no GMV → zeros); shops 3/4 share one advertiser (scope carefully). (`plan.md:80-85`)

---

## §1 Total GMV Max (LIVE + Product merged)

**Plain words.** One view adding both GMV Max types. Two tables (LIVE, Product) + one combined total. Campaign rows show ON/OFF pill + delivery state; account rows roll up the same way.

**Technical.**
- Source: two `getShopReport()` calls — `LIVE_GMV_MAX` + `PRODUCT_GMV_MAX` — via `GET gmv_max/report/get/?advertiser_id&store_ids=[shopId]&gmv_max_promotion_type=TYPE&dimensions=["stat_time_day","campaign_id"]&metrics=["cost","orders","gross_revenue","roi","cost_per_order","net_cost"]&start_date&end_date&page&page_size=1000`. (`online/src/lib/gmv.ts:272-317`)
- Filter: keep only rows whose `campaign_id` is in Neon `gmv.gmv_campaigns WHERE shop_id+promotion_type` map (kills mixed-type bleed, bugs 16/24). (`online/src/lib/gmv.ts:338-370`)
- Merge (no server TOTAL type): frontend fetches both and sums — `gmv/cost/orders = LIVE + Product`, `net = gmv × 0.75` (`FEE_RATE=0.25`), `roi = gmv/cost`. Sections `[{LIVE},{Product}]`. (`online/src/app/page.tsx:755-780`, `online/src/lib/gmv.ts:319,416,436`)
- Status/delivery: `operation_status` → ON/OFF pill; `secondary_status` → `formatDelivery()` labels; spend-aware badge (grey info on spenders, ⛔ only at zero spend); account 🟢 Active if any room ongoing. (`feature.md:9`, folder `AGENTS.md`)
- Route/UI: `GET /api/gmv-max?shopNumber&promotion_type=LIVE|PRODUCT&startDate&endDate` × 2, merged client-side. (`online/src/app/api/gmv-max/route.ts:7-29`)
- Verify: Total = LIVE + Product exactly; compare one day vs Ads Manager GMV Max filtered by type; `net ≈ gross × 0.75`.

## §2 LIVE GMV Max (Marketing API)

**Plain words.** Only livestream-boosted GMV Max campaigns. Each row can open its rooms (Sessions button) directly underneath.

**Technical.** Same call as §1 with `gmv_max_promotion_type=LIVE_GMV_MAX`, same Neon-map filter, same net math. Rooms drill: `GET /api/sessions?campaignId&startDate&endDate` → `dimensions=["room_id","stat_time_day"]&filtering={"campaign_ids":[single]}&metrics=["cost","orders","gross_revenue","roi"]` (single-ID only; multi-ID = 40002), collapsed room×day → one row per room (sums + recomputed ROI, GMV-desc); meta call adds `live_status/live_launched_time/live_duration/live_name` (UTC→MYT, fail-open; empty `live_name` → `room {id}`). (`online/src/lib/gmv.ts:443-578`, `online/src/app/api/sessions/route.ts:8-29`)
- Verify: campaign count vs Ads Manager LIVE filter; one room's spend+sales vs session row.

## §3 Product GMV Max (Marketing API)

**Plain words.** Only product-card GMV Max campaigns. Same columns as LIVE, no rooms.

**Technical.** Same call as §1 with `gmv_max_promotion_type=PRODUCT_GMV_MAX`. No sessions drill. Budget enrichment shared with §2 (see §9 budgets).
- Verify: Product total + LIVE total = Total (§1); check `Other` account bucket (missing `[]` in name) via `WHERE name NOT LIKE '[%]%'`.

## §4 TTAM (Manual, excl GMV)

**Plain words.** Only your manual (non-GMV) campaigns — GMV Max excluded automatically. Rows show spend + verdict (SCALE/WATCH/KILL/LEARNING) + 11 grades; click campaign → ad groups → ads. LEARNING means too new/small (needs RM30 + 1,000 impressions); ranges under 3 days show grades but no verdicts. (`feature.md:90-107`)

**Technical.**
- Source: `GET report/integrated/get/?report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=["stat_time_day","campaign_id"]`, metrics `TTAM_METRICS` = `spend,impressions,clicks,reach,video_watched_6s,average_video_play,likes,comments,shares,follows,profile_visits,live_views,live_effective_views`; fail-open full-set then `["spend"]`-only retry. (`online/src/lib/gmv.ts:97-102,712-800`, `online/src/lib/ttam.ts:83-131`)
- Exclusion: build GMV id set via `gmv_max/campaign/get/` both types, drop any `campaign_id` in it; names/status from classic `campaign/get/` (classic-only, zero GMV rows). (`online/src/lib/gmv.ts:580-638,712-763`)
- Drills (parent+child dims = 40002, so child grain alone + client filter): adgroups `GET /api/ttam-adgroups?campaignId` (`AUCTION_ADGROUP`, `dims=["stat_time_day","adgroup_id"]`, names via `/adgroup/get/`); ads `GET /api/ttam-ads?adgroupId` (`AUCTION_AD`, `dims=["stat_time_day","ad_id"]`, names via `/ad/get/`). (`online/src/app/api/ttam-adgroups/route.ts:5-16`, `online/src/app/api/ttam-ads/route.ts:5-16`, `online/src/lib/ttam.ts:136-238`)
- Scoring: preset from Neon `ttam.presets WHERE active ORDER BY updated_at DESC LIMIT 1` (seed `ttam-manual-theory-v1`, 11 bands + `{min_spend:30,min_impressions:1000,min_days:3}`); pure scorer `lib/ttam-scores.ts` (only client-safe import); `preset` returned in ROAS payload; CRUD at `/api/ttam-presets` + `/presets` manager. (`migrations/012_ttam_presets.sql:7-43`, `online/src/lib/gmv.ts:803-843`)
- Caveats: `sfv = video_watched_6s` proxy; `live10 = live_effective_views` presumed vs xlsx 10s col (`ttam-api-metrics-plan.md:77-88`).
- Verify: `manual spend + GMV-Max cost = total ads spend` (§5); one campaign vs Ads Manager manual filter.

## §5 ROAS (Return on Ad Spend)

**Plain words.** One number answering "for every RM1 of ads, how many RM of sales came back". Uses real tax (SST+WHT 8% each) for the honest version.

**Technical.** Route `GET /api/roas?shopNumber&startDate&endDate` → `getShopROAS()`: `gmv = live.gmv + product.gmv` (attributed `gross_revenue`); `gmvMaxCost = live.cost + product.cost`; `totalAdsSpend = gmvMaxCost + manual.spend`; `sst = wht = totalAdsSpend × 0.08`; `roas = gmv/totalAdsSpend`; `actualRoas = gmv/(totalAdsSpend+sst+wht)`. Per-leg `net = gross × 0.75`. (`online/src/app/api/roas/route.ts:5-19`, `online/src/lib/gmv.ts:824-934`)
- TRUE ROAS swaps numerator to shop truth: `trueRoas = shopOrderGMV/totalAdsSpend` (see §8). Locked parity ref 24–27 Sep: shop 143,941.26/1,016 vs ads 169,805.12. (`online/src/lib/shop-orders.ts:182-206`, `online/src/lib/gmv.ts:905-915`)
- Verify: recompute from §2+§3+§4 legs; `actual < roas` always (taxes); guardrail ROI ≥ 7.0 is **net**.

## §6 Hourly (per campaign, shop 1 — Marketing API)

**Plain words.** Yesterday/today hour by hour: sales bars + spend dashed + ROI line, 24 hour chips, DEAD/GOLDEN/WATCH scorecard, Sync-now button when mornings are empty, newest hour tagged partial — decide off closed hours. (`feature.md:17-24`)

**Technical.**
- Source: `fetchHourlyRows()` — same base as daily but `dimensions=["stat_time_hour","campaign_id"]`, `metrics=["cost","orders","gross_revenue"]`, `start_date = end_date = date` (1-day span max). Slot TEXT `YYYY-MM-DD HH:00:00` MYT. (`online/src/lib/hourly.ts:33-77`)
- Store: `syncHourly(shopNumber,date)` shop-1-only pulls both types, Neon-map filter (`keep = !mapped || mapped == want` so types never overwrite each other's PK), activity edge (`edge = last slot with totals > 0`; full-day grid includes future zeros; newest pair always partial/revising), batched upserts 500/chunk: `INSERT INTO gmv.hourly_campaign_metrics(shop_id,campaign_id,hour_slot,promotion_type,cost,gmv,orders) … ON CONFLICT(shop_id,campaign_id,hour_slot) DO UPDATE`. Table PK `(shop_id,campaign_id,hour_slot)` (`009_hourly.sql:7-18`). (`online/src/lib/hourly.ts:101-165`)
- Read: `GET /api/hourly` = DB-only `getHourlyView(date)` (latest 24 slots + campaign join) + `getHourlyScorecard(start,end)` (≤31d, per-hour avgs, DEAD <2 orders/d, GOLDEN top-5 avg sales, WATCH CPO > RM50, needs 3+ saved days). Diffs are jar-cumulative (`cur − prev`, ROI H per-bucket, ROI D cumulative; OFF excluded). (`online/src/lib/hourly.ts:209-265,732-805`, `online/src/app/api/hourly/route.ts:8-34`)
- Write paths: `POST /api/hourly/sync` (silent live re-pull + fresh view, shop-1 guard); `GET /api/cron/hourly-sync?shopNumber&date` (`Bearer CRON_SECRET`, external pinger). Nightly fills yesterday; 02–06 MYT skipped. (`online/src/app/api/hourly/sync/route.ts:10-44`, `online/src/app/api/cron/hourly-sync/route.ts:9-29`, `.github/workflows/hourly-sync.yml:6-45`)
- Verify: day sum of hourly ≈ daily §1 (intraday revises ~1%, cost stable); future slots blank/zero; partial tag on newest.

## §7 Hourly shop (Shop API, shop 1)

**Plain words.** Same hour grid but with your **real** orders (cancelled/refunded out), optional ad-spend dashed line + TRUE ROI. First view of a new range is empty — press Refresh once; notice says tied or flags untied days. (`feature.md:26-30`)

**Technical.**
- Source: `fetchShopRawDayOrders(date)` → `POST open-api.tiktokglobalshop.com/order/202309/orders/search` (`access_token/app_key/shop_cipher/shop_id/version=202309/page_size=50`, `signByUrl`, `x-tts-access-token`, body `{create_time_ge,create_time_lt}` = MYT day bounds, paginate `next_page_token` ≤100 pages, 400ms gap). Rejects `shopNumber != 1`. (`online/src/lib/shop-orders.ts:31-137`, `online/src/lib/hourly-shop.ts:51-60`)
- Bucket: `orderTs` from `create_time|createTime|order_create_time` (ms→s) → `Intl Asia/Kuala_Lumpur` hour; numerator `Σ(sale_price + platform_discount)`; skip `CANCELLED/REFUNDED`; unparseable-ts counted separately. Tie-check `diff = |bucketed + unparseable − dayTotal|`, `tied = diff ≤ 0.05`. (`online/src/lib/hourly-shop.ts:14-107`)
- Store: `gmv.shop_hourly_orders PK(shop_number,date,hour)` (`shop_gmv,shop_orders,unparseable_orders@h0,updated_at`), rewrite-on-revise. (`migrations/015_shop_hourly_orders.sql:8-18`)
- Read: `getHourlyShopView` = cache + `SUM(cost)` from `gmv.hourly_campaign_metrics WHERE shop_id + hour_slot LIKE date%`, `trueRoas = shopGmv/adSpend` (null when spend 0), today-future `missing:true` zeroed; scorecard same gates as §6 (3+ days, ≤31d). (`online/src/lib/hourly-shop.ts:110-197`)
- Routes: `GET /api/hourly-shop?shopNumber&date`; `POST /api/hourly-shop/refresh {date|startDate,endDate}` ≤31d per-day fail-open + 400ms gap → `{refreshed,untied,failed}`. (`online/src/app/api/hourly-shop/route.ts:7-25`, `online/src/app/api/hourly-shop/refresh/route.ts:21-59`)
- Verify: bucketed + unparseable = day total (tied); one hour vs Shop Center order-hour export.

## §8 Shop GMV (Shop API, shop 1 — multi-day)

**Plain words.** Real shop sales across days: bars + spend + ROI chart with **Shop truth | Ads attributed** toggle + day table. Reads saved rows instantly; **Refresh daily cache** re-pulls when stale (max 31 days/press). (`feature.md:32-35`)

**Technical.**
- Source: same `orders/search` day loop as §7 (MYT bounds, `sale_price + platform_discount`, CANCELLED/REFUNDED → `cancelledGMV/cancelledCount`, remainder `gmv/orderCount`). No tie-check on daily path (hourly only); per-day fail-open (failed day keeps old row). (`online/src/lib/shop-orders.ts:31-137`)
- Store: `gmv.daily_shop_metrics PK(shop_number,date)` + ads cols + `shop_order_gmv/count, shop_cancelled_gmv/count` (`014`). Upsert `ON CONFLICT(shop_number,date) DO UPDATE`. (`migrations/014_shop_orders_daily.sql:12-39`)
- Routes: `GET /api/shop-gmv?shopNumber&startDate&endDate` = live `getShopGMV` (both numerators + `trueRoas/trueActual`) + cached `daily[]` (pre-014 fallback); `POST /api/shop-gmv/refresh {shopNumber:1,startDate,endDate}` loops `getShopROAS + fetchShopDayOrders`, `MAX_DAYS=31`. (`online/src/app/api/shop-gmv/route.ts:18-68`, `online/src/app/api/shop-gmv/refresh/route.ts:9-80`, `online/src/lib/shop-orders.ts:182-200`)
- Manual-gap note (open since Cp28): shop API 163,540.29/988 vs manual export 143,941/1,016 for 24–27 Sep — method pending owner; do not "fix" by scaling. (Cp28 + `plan.md:142`)
- Verify: Shop-truth vs Ads-attributed toggle diverges ≈ −15% (cancelled/refunded + attribution windows); TRUE ROAS < ads ROAS.

---

## §9 Shared rules (apply to all 8)

- **Net-vs-gross lock:** guardrail ROI ≥ 7.0 is **net** (`net = gross × 0.75`, `FEE_RATE=0.25`). CPA ≤ RM21.18. (`plan.md:36`, `feature.md:61-67`)
- **Budgets (read-only):** source `GET campaign/gmv_max/info/?advertiser_id&campaign_id` (`budget/daily_budget/total_budget` + `budget_mode`); list `campaign/get` carries no budget. Policy: ON campaigns only, ≤15 missing infos per Fetch (cost-desc), cached in `gmv.gmv_campaigns`; repeated Fetch continues filling (`budgetRefreshRemaining` count); per-campaign **Refresh budget** (`POST /api/gmv-max/budget`, Neon `status='ON'` check, 409 otherwise, no TikTok budget-update call ever). `% used` one-day only (`BUDGET_MODE_DAY/DYNAMIC_DAILY/MIXED_DAILY`); lifetime/unlimited/mixed show amount, no %. Tiers: <70 plain, 70–79 amber, 80–89 red text, 90–100 red pill + pulse, >100 brighter bold pill + pulse. TTAM: campaign amount else compatible ad-group sum. Account = ON-sum only + `partial` label. (`online/src/lib/gmv.ts:39-80,389-432`, `online/src/app/api/gmv-max/budget/route.ts:10-70`, `migrations/010_campaign_budget.sql:4`, `migrations/011_campaign_delivery.sql:4`)
- **Compare rules (never break):** same-time pulls only (TikTok restates intraday ~1%, cost stable); `store_ids` always set (shops 3/4 share advertiser); never substitute another shop's token (`40001` = wrong token, not no access); `40002` = shape error, read message (dual-filter, single-ID, parent+child); skip `"-"` placeholder rows; `item_id "-1"` = unattributed bucket (keep, label). (`plan.md:105-110`, `skills/tiktok-api/SKILL.md:72-85`)
- **Freshness:** dashboard shows branch badge (PROD = real) + Fetched stamp; `/start` reports DB + newest hour/day (frozen = collector/pinger stopped). Newest hour/day always partial. (`feature.md:51,63-64`)
- **Failure map:** empty view → press Sync/Refresh (gate hides panel when cache empty — by design prompt); 401 → signed-out or wrong token; 40002 → dimensions/filtering; Hobby 60s → batch + per-shop `?shopNumber=` escape; token `valid until` near → admin Refresh; approval-blocked (`service does not exist`, region-block) → scaffold stays, manual parity holds. (Cp28/30, `plan.md:105-110`)

## Sources

- Code: `online/src/lib/gmv.ts`, `hourly.ts`, `hourly-shop.ts`, `shop-orders.ts`, `shop-credentials.ts`, `ttam.ts`, `ttam-scores.ts`, `daily.ts`, `shops.ts`, `ads-credentials.ts`; routes `online/src/app/api/{gmv-max,roas,hourly,hourly/sync,cron/hourly-sync,cron/nightly-sync,sessions,campaigns/sync,shop-gmv,shop-gmv/refresh,hourly-shop,hourly-shop/refresh,shop-token,ttam-adgroups,ttam-ads,ttam-presets}/route.ts`; `collector.py`, `live_view.py`, `prod_auth.py`, `shop_auth.py`; `.github/workflows/hourly-sync.yml`.
- DB: `migrations/001_core.sql,004_fix_schemas.sql,005_online.sql,006_status.sql,007_shop_tokens.sql,008_shop_token_columns.sql,009_hourly.sql,010_campaign_budget.sql,011_campaign_delivery.sql,012_ttam_presets.sql,013_access_allowlist.sql,014_shop_orders_daily.sql,015_shop_hourly_orders.sql`.
- Docs: `masterplan.md` §4–§5, `plan.md` §7–§12, `feature.md`, `APP_CHECKLIST.md`, `ttam-api-metrics-plan.md`, `DEV_NOTES.md` Cp10/11/28/30/31/32 + bugs 16/19/20/24, `skills/tiktok-api/SKILL.md`.
