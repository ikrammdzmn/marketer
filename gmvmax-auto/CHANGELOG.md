# Changelog — gmvmax-auto

Newest first. One line per shipped step. Rollup: `1-MASTER/MASTER-CHANGELOG.md`.

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
