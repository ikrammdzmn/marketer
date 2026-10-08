# Changelog — gmvmax-auto

Newest first. One line per shipped step. Rollup: `1-MASTER/MASTER-CHANGELOG.md`.

## Undeployed — Shop GMV multi-day (014 + Refresh) + hourly date fix + hourly autopinger

- Hourly Fetch now sends `date=${end}` (`page.tsx:489`); `/api/hourly` also accepts `endDate/startDate` fallback. Oct-07 range previously queried Oct-08 (empty) — that was the blank-charts bug, not missing data.
- `014_shop_orders_daily.sql` (NEW, owner runs DEV then PROD): `shop_order_gmv/count` + `shop_cancelled_gmv/count` on `gmv.daily_shop_metrics`. All writers tolerate pre-014 DBs (ads-only fallback, no 500).
- Shop GMV tab: `daily` cache series on GET + `POST /api/shop-gmv/refresh` (allowlisted, ≤31 days, per-day fail-open) + `Refresh daily cache` button; multi-day Performance chart (GMV bars + spend dashed line + ROAS line, recomputed) with `Shop truth | Ads attributed` toggle + daily table. `nightly-sync` now stores the shop side too (fail-open).
- `vercel.json`: hourly cron `15 * * * *` → `/api/cron/hourly-sync?shopNumber=1` (Hobby runs it daily at most); `.github/workflows/hourly-sync.yml` (NEW): true hourly pinger, skips 02–06 MYT, needs Actions secret `CRON_SECRET` (+ optional `VERCEL_BYPASS`). `tsc` exit 0. Deploy pending (CLI token expired last session).
- NOTE 08 Oct late: Vercel Hobby rejects sub-daily crons at deploy time, so the hourly `vercel.json` entry was reverted (nightly only). Hourly automation = GitHub Actions pinger alone. Alternative is Pro upgrade (owner call).
- Hourly tab rebuild (shop-hourly style): trend charts now GMV bars + spend dashed line + ROAS line per type (dual axis, ROAS recomputed); 24-hour picker (future/no-data chips disabled, bars + campaign table follow the pick, default latest); range scorecard card (Hour/Days/AvgGMV/AvgOrders/ROAS/CPA + DEAD/GOLDEN/WATCH, missing excluded, spend is real cost); `POST /api/hourly/sync` + `Sync now` button (live TikTok pull, Telegram silent, fails back to cache). `GET /api/hourly` takes `startDate/endDate` and returns `scorecard`. `tsc` 0 + `next build` green (lists `/api/hourly/sync`, `/api/shop-gmv/refresh`, Middleware).

## 08 Oct 2026 — account-budget ON-only partial + shop token live + admin refresh button (deployed)

- Account budget = sum of ON campaigns only (OFF ignored), amber `partial` label when an ON budget is still unknown; `% used` = ON spend / ON budget, one-day only (`page.tsx`: `onRows`/`knownOn`; backend already nulled OFF budgets). Header copy updated. Deployed `dpl_5rKQahzdGM1KbsfvrfN6xva1J832`; live smoke `/` 307, data API 401.
- Shop API authorized (Custom app `HIMWELLNESS GMV MAX INTERNAL`, Auth ID Active/Unlimited/MY) → exchanged `code=ROW_...` via `auth.tiktok-shops.com/api/v2/token/get` (code 0, token 122 + refresh 79); cipher from `GET /authorization/202309/shops` (code 0, Dr Samhan 7495...0274). Tokens in gitignored `.local_secrets.json` + 3 Vercel Production env vars. Local `orders/search` probe code 0. Signed-in 24–27 Sep: shop 163,540.29 / 988 vs ads 169,805.12 / 1,012 (-3.7%, TRUE ROAS 3.71x/3.19x); ads ties locked ref, shop side differs from manual 143,941 / 1,016 — parked for owner recheck vs old system.
- Admin one-tap **Refresh shop token**: `requireShopTokenAccess()` in `authz.ts` (single swap point for future per-module model); `/api/shop-token` GET = expiry info (lengths only), POST = admin + same-origin, seeds Neon row from env on first run, refreshes, audits best-effort. Fixed epoch bug: TikTok v2 `access_token_expire_in` is absolute epoch, normalized in `shopTokenExpiryMs()` (else auto-refresh never fires). Shop GMV card shows `valid until` + button for admin only. Access token ~7-day life (expires ~Oct 13–14). Deployed `marketer-2uf7h9ja4`; live smoke `/` 307, shop-token 401. Owner signed-in button test next.

## 07 Oct 2026 — Google sign-in + admin-managed email allowlist (deployed; owner tests pending)

- Added Auth.js Google OAuth, verified-email allowlist checks, protected dashboard data APIs, and fixed-admin-only `/access` page to add/remove user emails. Allowlist changes are audited in `core.audit`; webhook/cron routes keep their existing secret guards.
- Added `013_access_allowlist.sql` and setup/test instructions. Owner reports Neon dev+prod migration and Google/Vercel env complete. Next 15.5.27 production deployment `dpl_FDpqCvXJprdiMg2qXSQ57dCAHEB9` succeeded.
- Fixed signed-out page gate: Next 15 with `src/app` ignored root `middleware.ts`; moved to `online/src/middleware.ts`. Verified built manifest includes middleware. Live smoke: `/` 307 to `/sign-in`, `/api/hourly` 401, `/api/access-list` 401, `/api/health` 200. Owner Google/allowed/denied/removal tests remain.
- Dependency review: Next 14.2.35 → 15.5.27 (React 18 peer-compatible) + PostCSS 8.5.29 override resolves production-tree audit findings (`npm audit --omit=dev`: 0). Full audit still has 7 Tailwind 3 build/dev findings (5 high, 2 moderate); Tailwind 4.3.3 is a major change and remains a separate decision. No `--force` fix.
- Added campaign budgets to GMV Max and TTAM tables; deployed as `dpl_DStCPLP6hYsXmWoQXq7B2iJDmCn`. GMV Max fetches missing info only for ON campaigns in batches of 15 and caches results; TTAM reads campaign budget/mode or sums compatible daily ad-group budgets. `% used` appears only on one-day selections; lifetime/unlimited/mixed budgets have no percent. No schema migration or TikTok budget-update call was added; existing Neon cache is updated. Live budget values still need owner comparison with Ads Manager.
- Added a per-ON-GMV-campaign **Refresh budget** button. It calls an authenticated read-only TikTok `campaign/gmv_max/info` lookup and updates the existing Neon budget cache; no TikTok budget changes. Deployed `dpl_48R5oJNjejGjoH5K7ZYwnV5QHw7A`; live signed-out refresh POST is 401. Owner signed-in refresh test next.
- Added allowlisted read-only `/api/sessions/probe` (session/list keys + truncated sample). Deployed `dpl_B9sq3qGKfgr6mUCMnpRtmQ5rEvLt`; owner runs it signed in and pastes back JSON before status columns are wired. Extended with `roomId` livestream-metric probe (`live_status`, `live_launched_time`, `live_duration`); deployed `dpl_Fn3emPRsi8TSoW3ohKNDeG21oWgZ` then `dpl_3XWDiCYYb4uT2dACr9mNJY85EwWJ`.
- Sessions drill rows now carry live 🟢 ONGOING / ⚪ END status (hover: launched MYT + duration), probe-verified against room 7693707778641169173; deployed `dpl_8TVzd8xbv8cWM3wKDwDZdr4x`. Status is current TikTok state, fail-open when the lookup fails.
- Delivery flags on spending rows render grey info instead of ⛔ (spend proves delivery); deployed `dpl_9mG9iNXKrnPx9UU5qEsT7Lcqs7qt`.
- Campaign/account rows show 🟢 Active when any room is ONGOING (auto-checked for ON LIVE campaigns on Fetch, cap 5); deployed `dpl_Frr1y6Z6cjiqifeXL4KLwgED131r` (force-refresh sequential; spend-priority top-5; inline per-campaign sessions).
- Session handoff Checkpoint 26 (docs only, no deploy): vibe + discoveries + bugs B57–B62 logged in `DEV_NOTES.md`; `feature.md` refreshed for general users (inline sessions, 🟢 Active, spend-aware flags, account-budget rule). Open next: account budget = ON-campaigns sum with partial label.

## 07 Oct 2026 — bot `/start` status + unknown-command replies (tsc-clean, deployed + live-verified)

- `/start` → system status in-topic (alive MYT + DB `SELECT 1` + `MAX(hour_slot)` + `MAX(date)`, each degrading solo, no secrets out; daily formatted `YYYY-MM-DD`). Unknown `/cmd` → hint reply; plain chatter stays ignored (`tg-webhook/route.ts`).
- Outage debug: bot went silent post-restructure — `getWebhookInfo` showed 401s (secret drift → re-setWebhook with re-copied `CRON_SECRET`) then empty-body 401s (Vercel Deployment Protection in front). Fix kept: protection stays ON, webhook URL carries `?x-vercel-protection-bypass=` (query works, Telegram can't send headers). Probe 18/21 (3 fails = documented pre-existing API limits), `/fetch` + `/fetch_hourly` + `/start` live-green.
- `/start` immediately proved value: hourly stops Oct 5 23:00 (~25h stale = stopped `GMVMaxCollector30m`; task action still pre-move on owner's other PC).

## 07 Oct 2026 — deployment protection + preset write guard (owner verified)

- Incognito test found Production public despite Vercel Authentication being enabled for Standard Protection (preview-only). Owner changed it to **All Deployments**; other profiles are now blocked.
- `/api/ttam-presets` POST now requires dedicated `PRESET_WRITE_KEY` (not `CRON_SECRET`), fail-closed when absent; Vercel wall remains the actual identity gate because `NEXT_PUBLIC_PRESET_WRITE_KEY` is browser-visible. Env deployment delay caused temporary 401; owner reports the existing matching values work once deploy finished.
- Next: Google OAuth evaluation/implementation + auth regression tests. No key values recorded here.

## 06 Oct 2026 — M11 TTAM metrics + DB presets (shop 1, tsc-clean, committed/pushed `8665857`)

- TTAM 3-level drills (`ttam.ts`: campaign/adgroup/ad, on-demand click-to-load, spend-only fail-open) + full 12-metric pulls + exact v3 OMTM scoring (`scoreTtamRow`) + flags/verdict on theory-v2 bands (provisional) + toggles + verdict filter + search + LEARNING guardrail + 3-day rule.
- Preset system: `012_ttam_presets.sql` (new `ttam` schema, applied dev+prod, seed active) + `/api/ttam-presets` (CRUD + scorer export) + `/presets` manager page + TTAM-bar no-refetch picker + runtime custom-metric eval + full-name tooltips.
- Probes: `/api/ttam-probe` verified 27 BASIC metrics at all 3 grains (mapping in `ttam-api-metrics-plan.md`); sfv has no exact API equal (plain-6s proxy, labeled); LQS presumed on live_effective_views (xlsx cross-check open).
- Bugs 36–40 (client/server import wall, drill dimension 40002, edit near-misses, stale vercel cache, overstated API knowledge) — see DEV_NOTES Checkpoint 11.
- Still open: LQS verify, TTAM quartile recalibration, FUTURE UI items, A-vs-B sync, 🔥 floor, OFF per-type, export demo, shop approval, cron ping. All uncommitted.

## 06 Oct 2026 — M10 dashboard overhaul (Tailwind + filters + calendar; committed/pushed `8665857`)

- Tailwind rewrite (cards, sticky header, KPI cards) + delivery pills green/grey + Sessions LIVE-only + Status filter/sort + Fetch/Drill spinners + 15s cooldown + v51-port calendar popup (31-day cap) + Dashboard|Presets nav.

## 04 Oct 2026 — M9c Telegram maturity II (Total msg, buttons, delivery, probes)

- Third message `Total GMV Max` (Live + Product jar rows, combined verdict, dashboard button; no steady/earlier — details stay in type messages).
- Chart buttons: top-7 movers as QuickChart trend links + 📊 Dashboard on top, pairs below (multi-buttons-blocks verified live). Callback-photo tap handler built, parked dormant (URL links won). Covers saga: raw.githubusercontent URLs verified, in-blocks photo nuked Product tables → fail-open split → covers removed per owner (detached look).
- Heading/marked/quote redesign + verdict B + ROI on Steady/Earlier tables. Marked-as-object unprobed (fallback risk accepted openly).
- `011_campaign_delivery.sql` + `formatDelivery` enum map (`ENABLE`=Active, `TTS_TT_ASSET_UNAVAILABLE`=Asset unavailable, identity/product/auth codes) → Telegram `· Active` suffix + dashboard delivery line + account rollups (ON-if-any, delivery badges, Identity hidden collapsed per owner).
- Rich probes round 1–2 (9/10; anchor-EMPTY is correct behavior), stripe verdict (desktop-only), `tg-rich-messages.md` batches 1–4 (~100 classes), `telegram_message.md` Works/Partial/Not-working.
- Still open: dashboard redesign (next session, Tailwind-vs-inline), 🔥 floor gate, OFF per-type split, export demo (143,941 PROVISIONAL), shop approval watch, cron ping, commit ritual.

## 04 Oct 2026 — M9b Telegram maturity (divergence closed, jar rows, ROI, budget%)

- Divergence #1 CLOSED (04-Oct same-minute proof): LIVE Excel 164.19/1,734.82/16 vs dashboard ~166.45 (GMV+ord exact, cost +2.26); Product Excel 122.71/1,088.91/10 vs dashboard ~119.81 (cost −2.90); net −0.64 (~0.2%). Culprit = grain scope (hour vs day); OFF/unmapped ~0 that day; RM2-3 = pull-time drift. Rule: both cost+GMV revise intraday — re-pull same grain first.
- `/fetch` split: `/fetch` → day-so-far totals via `getShopReport` (`daily.ts`, ties dashboard, ALL campaigns); `/fetch_hourly` → hour slice (existing `syncHourly`). `tg-webhook` routes both, in-topic acks.
- Hourly candy format: `prev → cur (+diff ▲)` per campaign (bucket data was already there); short names bracket+tail-4 (`Dr.Samhan …2114`) + 🔛 active mark (🔥/⚠️ override); 6-col rich table (Campaign/Cost/GMV/ROI H·D/Ord/Bud).
- Bold verdict (probe): table cells render `<b>` literally — rich stays native whole-cell bold (names plain for contrast), partial-bold lives in legacy HTML fallback only.
- Hybrid + jar: header carries Hour + Day-so-far lines; rows switched to cumulative day-so-far (`10.00 → 10.20`), ROI H (bucket, n/a if hour cost<RM1) · D (cumulative); `010_campaign_budget.sql` (`budget` col, applied at least once 04 Oct) + list-sync captures budget fallbacks (list has NO budget per sample_keys — all null) + lazy info-fill for movers (≤15 `gmv_max/info` calls, fail-open, cached in DB). Bud column live (`2% 7k`, `1% 10k` verified on mobile+desktop).
- Stripe verdict (probe, `?keep=1` eyeball): `striped+compact` wins desktop, all variants flat on mobile (client ignores stripes + wallpaper bleed). Kept `striped+compact`.
- Footnote date healed: `status as of Sun Oct 04 2026` (was "hu Oct 01").
- Still open: 🔥 floor gate; OFF counts per-type; export-method demo; shop approval watch; cron-job.org ping; commit question (all still uncommitted).

## 04 Oct 2026 — M9 hourly live (Telegram tables + /fetch + real-time pivot)

- `/api/tg-webhook` (`/fetch` command, secret-token guard, in-topic replies) live; secret-mismatch 401 diagnosed via getWebhookInfo, fixed with exact re-copy + drop_pending_updates.
- Real-time pivot: activity edge, newest pair tagged (partial); whole-message ON-filter (explicit OFF excluded, `excludes N OFF · status as of` footnote); dashboard keeps all.
- Telegram divergence check open: 4 structural causes mapped (OFF inclusion, unmapped filters opposite, grain scope, pull-time drift) — awaiting owner's number pair.
- Known open: 🔥 floor (dGmv>0 gate) not implemented; footnote date garbles non-ISO ("hu Oct 01"); OFF counts shop-wide not per-type; export-method demo pending; shop app approval pending; cron-job ping open.

## 03 Oct 2026 — M9 hourly POC (built + deployed, needs first sync)
- `stat_time_hour` grain verified live (1-day span max, MYT slots, full-day grid incl. future zeros); `009_hourly.sql` (hour_slot TEXT PK, rewrite-on-revise); `hourly.ts` (Neon-map filter, activity edge, batched 500/chunk upserts after Hobby 60s timeout, prev-slot abs+% diffs, %-guard 50/200); `/api/cron/hourly-sync` (CRON_SECRET) + `/api/hourly` read; dashboard Hourly metric + Chart.js trends/bars; `telegram.ts` (rich→legacy chain, thread split, self-deleting `/tg-probe`); group-topic delivery; native rich tables + Details collapsibles (probe-verified shapes); emoji map (📹📦🔥⚠️, neutral ▲▼▪); `/fetch` via tg-webhook. All deployed green same-day.

## 03 Oct 2026 — M8 shop-order GMV scaffold, shop 1 only (code done, deploy blocked)
- New `007_shop_tokens.sql` (`credentials.shop_tokens`, schema-qualified) + `shop-credentials.ts` (DB-first, env fallback) + `shop-orders.ts` (HMAC sign, `POST /api/orders/search`, defensive sum + `sampleKeys`) + `/api/shop-gmv` (side-by-side vs ads, graceful unconfigured) + UI `Shop GMV` metric. `tsc --noEmit` clean. Deploy failed: Vercel CLI Not authorized (token refresh needed). Needs: apply 007 dev→prod, Vercel Env `SHOP_APP_KEY/SECRET` + `TIKTOK_SHOP1_ACCESS_TOKEN`, redeploy, Fetch 24–27 Sep.
- Deployed green after owner `vercel login` (`/api/shop-gmv` in routes). 007 applied (dev verified `to_regclass` OK; prod next). Token route PARKED: draft Custom app region-blocked on authorize (Malaysia target, MY seller login still refused, 4h duration). Manual parity LOCKED instead: shop 143,941/1,016 vs ads 169,805 → −15.2%; TRUE ROAS 3.26x/2.81x vs 3.85/3.32; attributed exceeds whole shop (double-claim).
- Owner chose display-only rebase (strategy files untouched): `shopTruthRef` locked constant in `getShopROAS` + ref rows in ROAS table + locked-ref line in unconfigured Shop GMV view. Deployed green.
- Rewrote shop files to proven temp-marketplace shape (public repo docs): real endpoint `POST /order/202309/orders/search` + `x-tts-access-token` + `signByUrl` (`tiktok-shop` dep) + numerator = line_items sale_price+platform_discount, CANCELLED/REFUNDED excluded; `008_shop_token_columns.sql` (shop_name/cipher/expiry cols, verified `\d` OK); `shop_auth.py` one-shot seller OAuth (stdlib, mirrors `prod_auth.py`). Authorize still blocked: "service does not exist" = app review pending. No repo authorize guide exists (their SETUP starts with tokens in env).

## 01 Oct 2026 — online M7 extras (TTAM, sessions, account fix, ON/OFF, split)
- TTAM metric view (reuses `/api/roas`, manual spend + count) + PROD branch badge + Fetched stamp on `online/src/app/page.tsx`.
- New `/api/sessions` + per-campaign Sessions button: `room_id x stat_time_day` drill, single-ID `filtering`, verified 454 rooms on LIVE campaign, no error.
- Account rule relaxed (§9): first `[]` anywhere → shop 1 resync 202 campaigns, `unbracketed: 0` (`Other` drained into real accounts).
- ON/OFF pills: `006_status.sql` (`status` + `raw` cols, applied prod+dev) → sync captures `operation_status` (only status-ish key in `campaign/get`; sample_keys recorded) → report + UI badge (green ON / grey OFF). Lesson: Total-merge dropped `status` (frontend merge must carry new fields); `await` forbidden inside setState updater.
- Total view split: LIVE GMV Max + Product GMV Max sections (own accounts each), summary unchanged.
- `deploy_online.py` Windows fix (`npx.cmd` + shell).

## 21 Sep 2026 — checkpoint 4: LIVE wired + PRODUCT/LIVE split (ritual done)
- New `live_view.py`: 4 GMV seeds (IDs from bulk export, VOL2 account) → info (budget, roas target, kind) + 7d/today report (net math) → `cache/live.json`. Found the money on GMV MAX VOL2 (was reading empty HIM COFFEE1); HIMCOFFEE 7d net ROI 6.14, HAPPY HOUR 7.84. Dashboard Live section + `/api/live` with UNLAGGED badge. List APIs can't return GMV campaigns (verified) — seeds are the discovery. Verified JS/py + 8099 smoke.
- LIVE GMV wired (owner gave ID, VOL2 account): budget RM10k, roas 20, 7d net ROI 14.3 on 300 orders. Session list parses but empty = no max-delivery sessions created.
- Secrets split PRODUCT/LIVE groups (`TIKTOK_GMV_CAMPAIGNS`); view prints LIVE first, accepts legacy flat map.
- LIVE GMV wired (owner gave ID, VOL2 account): budget RM10k, roas 20, 7d net ROI 14.3 on 300 orders. Session list parses but empty = no max-delivery sessions created.
- ROI-lock (owner): net basis, `FEE_RATE=0.25`; snapshots store net gmv/roi + `gross_gmv` + `fee_rate` for audit. Strategy thresholds must state basis.
- Schedule live: Windows task `GMVMaxCollector30m` every 30m (`collector_task.bat`, test-run OK) + same-slot dedupe in `tick()`.
- `GET gmv_max/report/get/` live via prod token: dimensions `[advertiser_id, stat_time_day]`, metrics `[cost, orders, gross_revenue, roi]`, `store_ids` required (sandbox 404 stands — no GMV endpoints there). Ticks write `prod live <day>` (zeros while account quiet, path proven). Dashboard smoke PROD. Store ID in gitignored secrets.

## 21 Sep 2026 - prod OAuth helper (shipped, token saved)
- New `prod_auth.py` (stdlib, 127.0.0.1:8082): prints authorize URL, captures `/callback` code, exchanges for prod token LOCALLY into `.local_secrets.json` (`TIKTOK_PROD_ACCESS_TOKEN/ADVERTISER_ID`, lengths-only console). Renamed keys to portal labels (`TIKTOK_APP_ID/SECRET`) across EXAMPLE + local file. Verified `py_compile`.
## 21 Sep 2026 — sandbox GET wiring (code-ready, live untested)
- `collector.py`: sandbox `GET gmv_max/report/get/` via stdlib urllib (closed-slot date, `Access-Token` header, `ALLOW_WRITES=0` assert kept); missing keys / HTTP fail → file-first stub. Neon insert comment clarified (`win` col, file key `window`). `.local_secrets.EXAMPLE.json` gains `SANDBOX_ACCESS_TOKEN/ADVERTISER_ID/BASE`. Verified `py_compile` + stub tick + 8099 smoke (`/api/health` PROD, 3 snapshots). Live sandbox data still needs owner-saved token + advertiser ID.
- 21 Sep live test: sandbox token saved (lengths OK) but sandbox has NO GMV Max endpoints (`/campaign/gmv_max/info/` + `/gmv_max/report/get/` → plain 404 on `sandbox-ads`, same path on prod returns JSON 40105 = path exists, token sandbox-only). Collector correctly keeps file-first stub. P0 holds file-first until prod read-only auth.

## 20 Sep 2026 — approval wait = non-issue + secret hygiene
- Approval-pending marked expected non-issue: P0 holds file-first, real GET wiring waits on Business approval. Docs: `plan.md` + `DEV_NOTES.md` + `APP_CHECKLIST.md` + `feature.md`.
- Secret hygiene: Neon passwords rotated in portal (dev+prod), `GMV_ENC_KEY` regenerated locally, `.local_secrets.EXAMPLE.json` sanitized to placeholders (lengths-only verify, `git status` clean). History `17c804b` still holds old copy — dead after rotation.

## 19 Sep 2026 — P0 skeleton + Neon GREEN, apps in flight
- Skeleton landed: `collector.py` (closed-window T-2h stub, quiet-hours skip, file-first
  dual-write, `ALLOW_WRITES=0`), `dashboard/` (owns 8082, picker + 30m/1h table, freshness
  + branch badge, greyed rules/approval, guardrails strip) — verified `py_compile` +
  `node --check` + smoke 8099 + `git status` clean of secrets.
- Neon live: project `TIKTOK DATA` (SG), branches `production` + `dev` (persistent,
  auto-delete cleared); `001–003` + `004_fix_schemas.sql` applied; `acct`=2, `gmv`=7 on
  both branches. Keys (`NEON_URL_DEV/PROD`, `GMV_ENC_KEY`, `SHOP_APP_KEY/SECRET`) in
  gitignored `.local_secrets.json`, verified by lengths only.
- Bugs fixed: unqualified DDL → public (fixed 004, rule: schema-qualify all); reserved
  `window` → `win` (collector maps `window→win`); branch TTL default; portal redirect
  IP-reject (`localhost` accepted). Detail: `DEV_NOTES.md`.
- Apps: Business API `TIKTOK GMV MAX` submitted, PENDING approval (sandbox locked till
  then); Shop Partner Center Custom app created (MY). Docs: `DEV_NOTES.md` + `feature.md`
  created; `AGENTS.md` + `plan.md` ticked. Next: wire sandbox GETs on approval → 48×30m
  snapshots → P0 exit.
