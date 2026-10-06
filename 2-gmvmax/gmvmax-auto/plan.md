# GMV Max Auto — P0 plan

Status: P0 live prod read-only (21 Sep checkpoint 2: first `prod live` snapshot written, dashboard PROD). Business API app APPROVED, prod OAuth via `prod_auth.py`, report params locked (store_ids + advertiser_id/stat_time_day + cost/orders/gross_revenue/roi). Remaining: campaign info/session list endpoints, ROI-lock, 48x30m snapshots to exit.

## 1. Goal

Read-only visibility: Neon online + TikTok app paperwork moving + collector pulls GMV/spend/ROI into DB + skeleton dashboard renders it. No auto-adjust, no budget writes, no Telegram actions in P0.

## 2. Scope

### Neon (acct first, gmv second)

- [x] Create one Neon project, region Singapore, DEV + PROD branches (TIKTOK DATA, verified 2026-09-19)
- [x] `NEON_URL_DEV` / `NEON_URL_PROD` in env / gitignored file only, never in git
- [x] Numbered migrations: `core` (shops, users, audit) → `acct_tokens` (encrypted) + `acct_videos` → `gmv_shops, gmv_campaigns, gmv_snapshots_30m_1h, gmv_rules, gmv_approvals, gmv_action_logs, gmv_monthly_spend` (files written, not yet applied — needs Neon project)
- [x] Numbered migrations applied via 004_fix (acct=2, gmv=7 on dev+prod, `win` not `window`); per-schema roles deferred to P1 (owner-only for P0)
- [x] `GMV_ENC_KEY = secrets.token_urlsafe(32)` generated once, offline backup; `cryptography` Fernet approved for this folder only
- [ ] Heartbeat + `checker silent >40m` alert design noted (build in P1)
- [ ] Rotate any Production secret once pasted in chat

### TikTok app application checklist (paperwork, no code dependency)

- [x] New Business API app at `business-api.tiktok.com` (Display app cannot extend) — `TIKTOK GMV MAX` submitted 2026-09-19, PENDING approval (expected non-issue 20 Sep, wait, file-first continues); redirect `http://localhost:8082/callback` (IP form rejected); scopes All on Ad account + Ads + Reporting
- [x] Shop Open API Custom app (Partner Center, MY, eCommerce Connectors, `HIMWELLNESS GMV MAX INTERNAL`) created; `SHOP_APP_KEY/SECRET` in gitignored `.local_secrets.json`
- [ ] Record: sandbox vs prod keys/redirects, scopes requested (read-only first acceptable), advertiser OAuth + shop auth flow — sandbox ad account locked until Business approval
- [ ] Sandbox approved → note write-scope status (read-only vs write); P0 proceeds read-only either way

### Read-only collector (`collector.py`)

- [x] 30m pulls, Closed-window only (act on T-2h slot, never newest; lag 15m–2h) — stub tick verified 2026-09-19
- [x] Skip 02:00–06:00 MYT pull-actions (customizable later), cache + backoff, 1-shop rate fine (~48/day) — file cache working, real GET wiring waits on sandbox keys
- [x] Report GET live (store_ids + advertiser_id/stat_time_day + cost/orders/gross_revenue/roi; scheduled ticks write `prod live`; sandbox has no GMV endpoints)
- [x] `GET campaign/gmv_max/info` LIVE per seed (budget, roas target, kind via `live_view.py`); session list auto for LIVE-kind seeds
- [x] Session list wired for LIVE seeds (`session_list` key); returns empty = no max-delivery sessions created (campaign numbers flow normally)
- [x] Dual-write file + Neon first, dashboard serves memory/file cache (works offline) — file path done, Neon insert best-effort stub
- [x] Net-vs-gross ROI LOCKED 21 Sep (owner: net; `FEE_RATE=0.25`, snapshots store net gmv/roi + gross + fee_rate; strategy thresholds must state basis)

### Skeleton dashboard (`dashboard/`, clone tiktok-account pattern)

- [x] Python stdlib server + vanilla JS + Tailwind CDN, `127.0.0.1` only, one server at a time (owns 8082, smoke on 8099 OK 2026-09-19)
- [x] Campaign picker (LIVE + Product), 30m/1h table, data-freshness timestamp + API branch badge (DEV/PROD) — shows LOCAL-FILE until Neon keys set
- [x] 50d chart placeholder, rules/approval UI stubbed (greyed, P1/P2)
- [x] Strategy guardrails visible: ROI ≥7.0, CPA ≤RM21.18, scale ≤20–25%/24h, no edits 16:00–17:30, dead zones respected

## 3. Verify (per change)

`python -m py_compile` + `node --check` extracted JS + HTTP smoke on scratch port + kill servers + `git status` clean of secrets.

## 4. Exit criteria

Neon reachable from dashboard cache → collector writes 48 consecutive 30m snapshots → dashboard shows closed-window GMV/spend/ROI with freshness stamp → app sandbox read-only live.

Live 21 Sep: Windows task `GMVMaxCollector30m` runs `collector_task.bat` every 30m (closed-window T-2h, quiet-hours skip + same-slot dedupe in code). Count grows on its own — check `/api/health` count.

> NEXT SESSION: task lives on the owner's other PC (absent on `Pc_Ikram`). Update its action to `...\marketer\2-gmvmax\gmvmax-auto\collector_task.bat` (moved in restructure Phase 2; `.bat` contents already fixed). Until then, 30-min auto-pulls are stopped — snapshots only resume after the task update.

## 5. Non-goals (P1+)

No decider writes, no Telegram actions, no approvals queue live, no monthly kill-switch enforcement, no email/PWA, no `acct` file→DB cutover.

## 6. Source of truth

Detail: `2-gmvmax/gmvmax-auto/masterplan.md` §9 phases (P0 first, on explicit go). Neon rollout: `2-gmvmax/tiktok-account/NEON_NOTE.md`.

## 7. Online version — Vercel + Neon (locked 29 Sep, replicates temp-marketplace)

Single Vercel project for supported modules only (local stays frozen: `tester.py`, `tiktok-account/sync/`, `g-sheet_tools/aff-notify` Apps Script, `docs/tiktok*.txt` Pages review, `tiktok-creative-analysis/source-file/` disk).
Local rules (stdlib, `127.0.0.1`, `.local_secrets.json`, `cache/`) do NOT transfer — online uses Next.js API routes + `pg Pool` on `NEON_URL_PROD` + Vercel Env + `CRON_SECRET` guard.

- [ ] Migration `005_online.sql` (new file, never edit 001–004): `credentials.refresh_ads_tokens(advertiser_id, access_token, refresh_token)`, `gmv.gmv_campaigns(campaign_id PK, name, account, type)` cache, extend daily metrics `gmv.daily_shop_metrics(shop_number, date UNIQUE, gmv, live_cost, product_cost, manual_spend, spend_before/after_tax, roas_before/after, orders, impressions)`; schema-qualify all identifiers, `win` not `window`
- [ ] Port `src/lib/db.ts` pattern: `pg Pool(max:20, ssl prod)` + DB-first credentials with auto-refresh (`now >= expiry-1h`), env fallback
- [ ] Campaign discovery (fixes `DEV_NOTES.md:98` zeros): `GET /open_api/v1.3/gmv_max/campaign/get/?advertiser_id&filtering={"gmv_max_promotion_types":[TYPE]}&page&page_size=100` paginated → upsert `gmv_campaigns`
- [ ] Report fetch: `GET /gmv_max/report/get/?advertiser_id&store_ids=[shopId]&gmv_max_promotion_type=TYPE&dimensions=["stat_time_day","campaign_id"]&metrics=["cost","orders","gross_revenue","roi","cost_per_order","net_cost"]&start/end_date&page_size=1000`, filter to campaign map, aggregate total + accounts[] + campaigns[]
- [ ] Live drill: `dimensions=["room_id","stat_time_day"]&filtering={"campaign_ids":[single]}&metrics=[live_name,live_status,live_launched_time,live_duration,cost,gross_revenue...]` (single-ID only)
- [ ] TTAM exclusion: collect all GMV IDs, then `GET /report/integrated/get/?report_type=BASIC&data_level=AUCTION_CAMPAIGN` and exclude GMV IDs = true manual spend
- [ ] ROAS: `gmvMaxCost=live+product`, `total=gmvMax+manual`, `sst=wht=8%`, `actualRoas=gmv/totalWithTax`
- [ ] Sync: Vercel cron nightly 01:00 MYT (`0 17 * * *`) + guard-heal past 2d + 30d gap-fill, `ON CONFLICT(shop_number,date) DO UPDATE`, `Promise.allSettled(GMV, ROAS)` so GMV saves if ads fail; 30m pulls need Pro or external pinger (Hobby = daily only)
- [ ] UI parity with screenshot (`debug-table-ikram/page.tsx:METRICS`): Shop / Metric (`Total=LIVE+PRODUCT parallel`, `LIVE`, `Product`, `TTAM`, `ROAS`) / Date Range / Fetch Data + Metric/Value table + expandable Account → Campaign → Live Sessions on-demand

## 8. Shop map day-1 (same as temp-marketplace `route.ts:SHOPS`)

- `1 Him.DrSamhan shop 7495609155379170274 / adv 7505228077656621057 hasGMV=true`
- `2 HIM CLINIC 7495102143139318172 / adv 7404387549454008336 hasGMV=false` → GMV routes return zeros
- `3 Vigomax HQ 7494799386964364219 / adv 7259935704698929153 hasGMV=true`
- `4 VigomaxPlus HQ 7495580262600706099 / same adv as 3 hasGMV=true` → scope by `store_ids`, never sum across 3/4 blindly

## 9. Campaign `[Account]` naming rule (locked 29 Sep, relaxed 01 Oct)

- Format: first `[]` pair ANYWHERE (no nesting, trim inside). Regex: `\[([^\[\]]+)\]`
- `ot1 [Dr Samhan Official1] ...` → account `Dr Samhan Official1` (was `Other` under the old bracket-at-start rule; shop 1 resync 01 Oct: 202 campaigns, `unbracketed: 0`)
- With `[]`: `account=capture group 1`, display name keeps the full raw title
- Without `[]`: `account=Other`, still in totals + listed under `Other`, never hidden; nightly validator flags `WHERE name NOT LIKE '[%]%'` for rename

## 10. Start flow (online build order)

0. Freeze local + approve `online/` Next.js exception (repo rule: no npm/build unless folder approves).
1. Neon `005_online.sql` on dev first, verify counts; Vercel Env (`NEON_URL_PROD`, `TIKTOK_ADS_ACCOUNT1-4`, `SHOP_APP_KEY/SECRET`, `CRON_SECRET`) lengths-only.
2. Port `db.ts` pool + `getShopCredentials()` DB-first auto-refresh (`expiry-1h`), env fallback.
3. Campaign sync `GET gmv_max/campaign/get` + `filtering` paginated → `gmv_campaigns` + `[]` parse; verify count vs Ads Manager.
4. Report `GET gmv_max/report/get` + `promotion_type` + `[stat_time_day,campaign_id]` → filter to map → totals + accounts + campaigns; rooms drill single-ID only.
5. TTAM exclusion + ROAS (`live+product+manual`, `sst=wht=8%`).
6. Cron nightly 01:00 MYT + guard-heal 2d + 30d gap-fill, `ON CONFLICT DO UPDATE`, `allSettled(GMV,ROAS)`.
7. UI Shop/Metric/Date/Fetch + Metric/Value + Account → Campaign → Sessions; verify Sep 24–27 range.

## 11. Roadblocks / challenges / risks

- P0: Vercel Hobby cron daily-only + 60s cap — 30m pulls need Pro or external pinger; `pg` pool exhaustion (max 20 + release); token expiry mid-sync → partial rows (allSettled saves GMV); shops 3/4 share advertiser — missing `store_ids` double-counts; shop 2 zero GMV misread as bug.
- API: missing `store_ids`/main dimension → 40002; `spend` vs `cost` metric mix → invalid; `stat_time_day`-only → "1-3 main dimensions"; rate 40100 → 300–1000ms delay + retry; lag 15m–2h + 11h live latency → nightly re-sync before trust.
- Data: `Other` bucket grows without `[]` discipline (flag, never hide); gross-vs-net (fee 25%) breaks ROI ≥7.0 guardrail; cancelled/refunded drift Shop vs Marketing API; GMV restates intraday (~1%, cost stable) — same-time pulls only for comparisons.
- Process: editing 001–004 / `tester.py` / `docs/tiktok*.txt` breaks review + Neon; committing secrets/`cache/`; second Business app resets approval queue.

## 12. Todo / milestones (updated per milestone)

- [x] M0 exception: approve `online/` Next.js exception to repo no-npm rule; single Vercel project `marketer` (Root Directory `gmvmax-auto/online`), scaffold + `/api/health` landed 29 Sep)
- [x] M1 Neon `005_online.sql` drafted → applied dev → counts verified (`gmv_campaigns`, `daily_shop_metrics`)
- [x] M2 Vercel Env set (names + lengths only) + `db` pool + ads-token auto-refresh working (5 envs on Production verified 29 Sep)
- [x] M3 campaign sync: counts match Ads Manager, `[]` parse verified, `Other` fallback shown (shop 1: 202 campaigns, 29 first-bracket groups, 66 unbracketed, 29 Sep)
- [x] M4 report fetch Sep 24–27 verified: totals + accounts + campaigns match screenshot logic (shop 1 LIVE 24–27 Sep: gmv 169.8k, cost 12.6k, roi 13.48, net 10.11, 1012 orders)
- [x] M5 TTAM exclusion + ROAS (`sst=wht=8%`) verified (shop 1, 24–27 Sep: live 10,131.24 + product 2,468.21 + manual 31,527.35 = 44,126.80; roas 3.85, actual 3.32; fixed mixed-type double-count 29 Sep)
- [x] M6 cron nightly + guard-heal + gap-fill live, no dupes (`ON CONFLICT`) (single-shop verified 29 Sep: 9-27 row + healed 9-28; full 4-shop run may exceed Hobby 60s — per-shop escape hatch `?shopNumber=` kept)
- [x] M7 UI parity + cutover: expandable Account → Campaign → Sessions, freshness + branch badge (01 Oct: TTAM view, PROD badge + Fetched stamp, per-campaign Sessions drill `room_id x stat_time_day` single-ID verified 454 rooms, ON/OFF pills via `operation_status`, Total split into LIVE + Product sections; full temp-marketplace diff still open)
- [x] Deploy helper `deploy_online.py` (stdlib, prod deploy from repo root, no `--cwd`; 01 Oct: Windows `npx.cmd` + shell fix)
- [x] M8 shop-order GMV numerator, shop 1 only (03 Oct): token route PARKED (Custom app region-blocked; `007_shop_tokens` + `/api/shop-gmv` scaffold stays). Numerator LOCKED via manual parity: shop 143,941/1,016 vs ads 169,805 → −15.2%; TRUE ROAS 3.26x/2.81x (provisional — exact export method pending owner). Code later rewritten to proven temp-marketplace shape (`/order/202309/orders/search`, cipher, refresh) + `008` cols + `shop_auth.py`; authorize still "service does not exist" (review pending)
- [x] M9 hourly POC (03 Oct, owner spec → live 04 Oct): `stat_time_hour` grain VERIFIED live (code 0, 1-day span max). `009_hourly.sql` (per-campaign hour_slot TEXT PK, rewrite-on-revise) + `hourly.ts` (both types, Neon-map filter, activity edge, batched 500/chunk upserts, jar cumulative rows, ROI H·D, budget% via `010` + lazy info-fill, short names + 🔛) + `/api/cron/hourly-sync` (CRON_SECRET, Hobby-safe) + `/api/hourly` read + dashboard `Hourly` metric + Telegram group-topic tables (`/fetch` day-so-far, `/fetch_hourly` hour slice). Still open: cron-job.org hourly ping. No suggestion engine (POC only)
- [x] M10 dashboard overhaul (06 Oct, tsc-clean): Tailwind rewrite + delivery green/grey + Sessions LIVE-only + Status filter/sort + spinners + 15s cooldown + v51 calendar port (31-day cap) + nav tabs
- [x] M11 TTAM metrics + presets (06 Oct, tsc-clean, deploy decides): 3-level drills + 12-metric pulls + v3 scoring + flags/verdict (theory provisional) + toggles/filter/search + LEARNING guardrail + 3-day rule + `012_ttam_presets.sql` (applied dev+prod) + `/api/ttam-presets` + `/presets` manager + scorer export + no-refetch picker + custom-metric eval. Open: LQS verify, quartile recalibration, FUTURE items, A-vs-B sync
