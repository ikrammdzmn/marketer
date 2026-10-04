# Changelog — gmvmax-auto

Newest first. One line per shipped step. Rollup: `1-MASTER/MASTER-CHANGELOG.md`.

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
