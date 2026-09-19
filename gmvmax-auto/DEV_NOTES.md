# DEV_NOTES.md — gmvmax-auto session handoff (19 Sep 2026, P0 day)

> Next-you: read this first, then `plan.md`, then `masterplan.md` §9. You are picking up
> mid-P0 with a warm, hands-on owner. Tone below is the vibe, not just facts.

## Vibe / dynamic / energy — sync to this frequency
- Owner is Ikram (HIMWELLNESS, MY shop), non-DB beginner but fast executor: clicks through
  Neon/TikTok portals live and pastes back screenshots instead of words. Replies are short
  ("ok", "now", "ok done", screenshots). Match that: short replies, numbered steps, no lectures.
- Session rhythm was Q→do→screenshot→verify. Owner did every portal step same-session:
  Neon project `TIKTOK DATA` (SG) → dev branch → connection strings → `.local_secrets.json` →
  SQL Editor migrations → Business API app `TIKTOK GMV MAX` → Shop Partner Center Custom app.
  Never ask twice; give one action per message with the exact click path.
- Mood at close: momentum, not stuck. Neon is GREEN (2/7 both branches). Blockers are external
  waits (Business API approval), not code. Owner trusts file-first/offline behaviour —
  keep proving "works without Neon/keys" at every step.
- Secrets discipline held all session: keys went into gitignored `.local_secrets.json` only,
  verification printed key-names + lengths, never values. Owner once pasted prod-adjacent
  material pre-17 Sep (per NEON_NOTE invariant) — treat rotation as done/assumed, don't relitigate.
- Language: owner writes casual English + screenshots. Answer in short plain English.
  No emojis unless asked. PowerShell 5.1, Windows paths, `127.0.0.1` only.

## Where P0 stands (facts, 19 Sep 2026 night MYT)
- Skeleton LANDED + verified: `collector.py` (closed-window T-2h stub tick wrote
  `cache/snapshots.jsonl`), `dashboard/dashboard.py` (owns 8082, smoke 8099 OK:
  `/api/health` LOCAL-FILE, 1 snapshot), `dashboard.html` (picker, 30m/1h table,
  freshness + branch badge, greyed rules/approval, guardrails strip).
  Verify chain used: `py_compile OK` + `node --check JS_OK` + HTTP smoke + `git status`
  clean of secrets (`cache/` + `.local_secrets.json` ignored).
- Neon GREEN: project `TIKTOK DATA`, region AWS APAC-1 Singapore, branches `production`
  (default, never expires) + `dev` (child). Migrations `001_core, 002_acct, 003_gmv`
  written then FIXED by `004_fix_schemas.sql` (see Bugs). Verify: `acct`=2, `gmv`=7
  on BOTH branches via SQL Editor counts.
- Keys local only: `NEON_URL_DEV/PROD` (pooled, sslmode), `GMV_ENC_KEY` (token_urlsafe(32),
  43 chars), `SHOP_APP_KEY` (13) + `SHOP_APP_SECRET` (40). Presence-verified by lengths.
- Business API app `TIKTOK GMV MAX`: submitted, **PENDING APPROVAL** at
  `business-api.tiktok.com/portal/apps` — NON-ISSUE 20 Sep: this wait is expected,
  P0 holds on file-first, no action. Description = internal P0 read-only wording.
  Redirect `http://localhost:8082/callback` (see Bugs: IP form rejected). Scopes = All on
  Ad account management + Ads management + Reporting (covers GMV Max GETs; write scopes
  come with approval but P0 never POSTs). Sandbox ad account button locked until approval
  (3–7 day wait typical). Sandbox base `https://sandbox-ads.tiktok.com/open_api`.
- Shop Partner Center Custom app (MY market, eCommerce Management/Connectors, name
  `HIMWELLNESS GMV MAX INTERNAL`, redirect `http://localhost:8082/callback` else bare
  `http://localhost`, API ON): created, app_key/secret saved locally. This is the shop half
  of auth; Business API is the ads half.
- `plan.md` ticked for skeleton + Neon + ENC; app/sandbox/GET-wiring/ROI-lock still open.
  Per-schema roles (`acct_app`/`gmv_app`) DEFERRED to P1 (owner-only for P0). Heartbeat/
  silent->40m alert is P1. `ALLOW_WRITES=0` hard lock in collector.

## Bugs found + fixed this session (do not regress)
1. **Unqualified table names (002/003).** Wrote `CREATE TABLE acct_tokens` after
   `CREATE SCHEMA acct` — tables landed in `public`, so `WHERE table_schema='acct'`
   returned 0 while Neon said "already exists". Owner screenshots proved it
   (schemas=3, core tables=3, acct/gmv counts=0, then "already exists" notices).
   Fixed by `004_fix_schemas.sql` (DROP public dupes + CREATE `acct.*`/`gmv.*`).
   LESSON: every DDL identifier in migrations must be schema-qualified (`acct.x`,
   `gmv.x`, `core.x`), including indexes and FK `REFERENCES gmv.gmv_shops(...)`.
   Add a grep check before any new migration: `rg "CREATE TABLE (?!acct\.|gmv\.|core\.)"`.
2. **Reserved word `window` as column.** `003` query 4 ERRORed: `win TEXT` vs `window`.
   `WINDOW` is reserved in Postgres. Renamed DB column to `win` ('30m'/'1h');
   file-cache JSON key stays `window`, collector maps `row["window"]→win` on insert.
   LESSON: never use `window`, `order`, `group`, `user` as bare columns. Prefer `win`,
   `sort`, `grp`. If a reserved word is unavoidable, quote `"window"` in DDL *and*
   every query — renaming is cheaper.
3. **Neon child-branch TTL default.** "Create child branch" checks
   `Automatically delete branch after → 1 day` by default → dev showed
   "expires Sep 20 10:36am +8". Fixed by setting expiration Never for persistent dev.
   LESSON: tell owner to uncheck auto-delete BEFORE creating persistent branches;
   default branch never expires, child branches do unless cleared.
4. **Business API redirect validator rejects IP loopback.** `http://127.0.0.1:8082/callback`
   (and trailing-slash variant) failed with misleading "beginning with http://" error.
   `http://localhost:8082/callback` (no trailing slash) accepted. LESSON: Business API =
   `localhost`, not `127.0.0.1` (Display-app Desktop rule does not transfer). Code still
   binds `127.0.0.1` (answers localhost too) — only the portal string uses localhost.
5. **`.local_secrets.json` phantom-save.** Owner said "pasted" but file didn't exist
   (only EXAMPLE). Cause: edited without Copy-Item first. LESSON: always start portal-key
   steps with `Copy-Item EXAMPLE→real + notepad real`, then verify by
   `Test-Path + key-names/lengths`, never values.

## What next-you should do first
1. WAIT (non-issue, 20 Sep): Business API approval still pending → hold P0 on
   file-first. Check approval status only when owner reports. If approved: create Sandbox Ad
   Account (name `gmvmax-sandbox`, MY/MYR/Asia_Kuala_Lumpur), record sandbox vs prod
   keys/redirects per `APP_CHECKLIST.md`, note read-only vs write scope.
2. Then wire P0 GETs in `collector.py` (sandbox base URL): `gmv_max/campaign/get`,
   `campaign/gmv_max/info`, `gmv_max/report/get`, session list. Keep `ALLOW_WRITES=0`,
   closed-window T-2h, quiet-hours skip, file-first dual-write.
3. Drive 48 consecutive 30m snapshots → dashboard freshness stamp → P0 exit.
   Then P1: dry-run decider (log only) + Telegram DM + lag measurement + ROI-lock.
4. P1 hardening: per-schema roles, heartbeat + silent->40m alert, `cryptography` Fernet
   cutover file→DB, monthly-spend reconciliation note (returns/cancels drift).

## Landmines / never-do
- Never print/paste secret VALUES (lengths + key-names only). Never commit
  `.local_secrets.json`, `cache/`, `tokens/`, `csvs/`, `__pycache__/`.
- Never edit applied migrations (001–004 frozen); new fix = 005+.
- Never `POST gmv_max/update` in P0 (collector asserts `ALLOW_WRITES==0`).
- Never act on newest report slot (lag 15m–2h) or undecided net-vs-gross ROI.
- Never bind `0.0.0.0`, never add npm/build, never touch `tester.py` / `docs/*` /
  `tiktok*.txt` / Pages source from this folder.
- Never create a second Business app to "speed up" approval (resets queue).
