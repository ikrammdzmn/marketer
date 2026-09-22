# AGENTS.md — gmvmax-auto folder conventions

> P0 live prod read-only 21 Sep (first `prod live` snapshots, 5-campaign unlagged view, net ROI locked). Source of truth: `masterplan.md` + `plan.md`. Handoff: `DEV_NOTES.md`. User guide: `feature.md`.

## Stack
- Python stdlib server + vanilla JS + Tailwind CDN. `127.0.0.1` only.
- No npm, no build. One server at a time (dashboard owns 8082; use `--port` scratch for smoke).
- `cryptography` (Fernet) approved for this folder only (token encryption, P1). No hand-rolled AES.

## Files
- `masterplan.md` — locked decisions + phases. `plan.md` — P0 checklist (tick per change).
- `DEV_NOTES.md` — session handoff (vibe + bugs + lessons, read first). `feature.md` — non-technical user guide.
- `CHANGELOG.md` — folder releases. `APP_CHECKLIST.md` — Business API (PENDING approval 2026-09-19, `TIKTOK GMV MAX`) + Shop Custom app (created, MY) paperwork tracker.
- `migrations/001_core.sql, 002_acct.sql, 003_gmv.sql` (FROZEN, have bugs — see 004) + `004_fix_schemas.sql` (applied dev+prod: schema-qualified tables, `win` not `window`). Never edit applied files; new fix = 005+.
- `collector.py` — 30m prod pulls, closed-window T-2h, skip 02:00–06:00 MYT. Net ROI lock (`FEE_RATE=0.25`, gross kept). DB column is `win`; file JSON key stays `window`. NEVER `POST update` in P0 (`ALLOW_WRITES=0` assert).
- `live_view.py` — MANUAL unlagged per-campaign view (eyes only; 2h rule stays for scheduler/auto). Seeds from `TIKTOK_GMV_CAMPAIGNS` {PRODUCT, LIVE} (list APIs return zero GMV rows — verified). Writes `cache/live.json` (LIVE first).
- `prod_auth.py` — one-shot prod OAuth (authorize URL → 8082 /callback → local exchange; lengths-only console).
- `collector_task.bat` + Windows task `GMVMaxCollector30m` (every 30m; same-slot dedupe in code).
- `dashboard/dashboard.py + dashboard.html` — file/memory cache, freshness stamp + DEV/PROD branch badge, Live section (`/api/live`, UNLAGGED badge). Rules/approval UI stubbed grey (P1/P2).
- `cache/` (gitignored runtime), `.local_secrets.json` (gitignored; keys: `TIKTOK_APP_ID/SECRET`, `TIKTOK_PROD_ACCESS_TOKEN/ADVERTISER_ID`, `TIKTOK_STORE_ID`, `TIKTOK_ADVERTISERS` map, `TIKTOK_GMV_CAMPAIGNS` {PRODUCT, LIVE}, `SANDBOX_*`, `SHOP_APP_*`, Neon URLs, `GMV_ENC_KEY`).

## Rules
1. Secrets never in git/chat: `NEON_URL_DEV/PROD`, `GMV_ENC_KEY`, TikTok/Shop keys, Telegram tokens. `git status` must never show them. Verify by key-names + lengths only.
2. Official APIs only. Closed-window only (lag 15m–2h, never act on newest slot).
3. Lock net-vs-gross ROI before first rule (May-2026: ROI includes affiliate/coupons/fees).
4. After EVERY change: `python -m py_compile` + `node --check` extracted JS + HTTP smoke on scratch port, then kill servers.
5. Never write to `acct_*` from gmv code and vice versa (per-schema roles `acct_app`/`gmv_app` deferred to P1; owner-only for P0).
6. Migrations: schema-qualify EVERY identifier (`acct.x`, `gmv.x`, `core.x` incl. indexes + FK refs); never use reserved words as bare columns (`window`→`win`). Grep-check new SQL before handing to owner.
7. Portal specifics: Neon child branches default to 1-day auto-delete (uncheck for persistent dev); Business API redirect uses `http://localhost:PORT/callback` (IP form rejected); sandbox ad account locked until app approval.
