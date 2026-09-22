# Changelog — gmvmax-auto

Newest first. One line per shipped step. Rollup: `1-MASTER/MASTER-CHANGELOG.md`.

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
