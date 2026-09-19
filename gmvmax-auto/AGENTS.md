# AGENTS.md — gmvmax-auto folder conventions

> P0 skeleton landed 2026-09-19 (Neon GREEN, apps in flight). Source of truth: `masterplan.md` + `plan.md`. Handoff: `DEV_NOTES.md`. User guide: `feature.md`.

## Stack
- Python stdlib server + vanilla JS + Tailwind CDN. `127.0.0.1` only.
- No npm, no build. One server at a time (dashboard owns 8082; use `--port` scratch for smoke).
- `cryptography` (Fernet) approved for this folder only (token encryption, P1). No hand-rolled AES.

## Files
- `masterplan.md` — locked decisions + phases. `plan.md` — P0 checklist (tick per change).
- `DEV_NOTES.md` — session handoff (vibe + bugs + lessons, read first). `feature.md` — non-technical user guide.
- `CHANGELOG.md` — folder releases. `APP_CHECKLIST.md` — Business API (PENDING approval 2026-09-19, `TIKTOK GMV MAX`) + Shop Custom app (created, MY) paperwork tracker.
- `migrations/001_core.sql, 002_acct.sql, 003_gmv.sql` (FROZEN, have bugs — see 004) + `004_fix_schemas.sql` (applied dev+prod: schema-qualified tables, `win` not `window`). Never edit applied files; new fix = 005+.
- `collector.py` — 30m read-only pulls, closed-window T-2h, skip 02:00–06:00 MYT. Dual-write file + Neon (file first, DB when reachable). DB column is `win`; file JSON key stays `window`. NEVER `POST update` in P0 (`ALLOW_WRITES=0` assert).
- `dashboard/dashboard.py + dashboard.html` — serves file/memory cache, freshness stamp + DEV/PROD branch badge. Rules/approval UI stubbed grey (P1/P2).
- `cache/` (gitignored runtime), `.local_secrets.json` (gitignored, template in `.local_secrets.EXAMPLE.json`).

## Rules
1. Secrets never in git/chat: `NEON_URL_DEV/PROD`, `GMV_ENC_KEY`, TikTok/Shop keys, Telegram tokens. `git status` must never show them. Verify by key-names + lengths only.
2. Official APIs only. Closed-window only (lag 15m–2h, never act on newest slot).
3. Lock net-vs-gross ROI before first rule (May-2026: ROI includes affiliate/coupons/fees).
4. After EVERY change: `python -m py_compile` + `node --check` extracted JS + HTTP smoke on scratch port, then kill servers.
5. Never write to `acct_*` from gmv code and vice versa (per-schema roles `acct_app`/`gmv_app` deferred to P1; owner-only for P0).
6. Migrations: schema-qualify EVERY identifier (`acct.x`, `gmv.x`, `core.x` incl. indexes + FK refs); never use reserved words as bare columns (`window`→`win`). Grep-check new SQL before handing to owner.
7. Portal specifics: Neon child branches default to 1-day auto-delete (uncheck for persistent dev); Business API redirect uses `http://localhost:PORT/callback` (IP form rejected); sandbox ad account locked until app approval.
