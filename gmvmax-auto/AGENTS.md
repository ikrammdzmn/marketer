# AGENTS.md — gmvmax-auto folder conventions

> M9 hourly live 03 Oct (shop 1): `stat_time_hour` grain, Neon hourly rows, dashboard Hourly metric + Chart.js graphs, Telegram group-topic tables + `/fetch`. Source of truth: `masterplan.md` + `plan.md`. Handoff: `DEV_NOTES.md` (read first — vibe + bugs 23–29). User guide: `feature.md`.

## Stack
- Python stdlib server + vanilla JS + Tailwind CDN. `127.0.0.1` only.
- No npm, no build. One server at a time (dashboard owns 8082; use `--port` scratch for smoke).
- `cryptography` (Fernet) approved for this folder only (token encryption, P1). No hand-rolled AES.

## Files
- `masterplan.md` — locked decisions + phases. `plan.md` — P0 checklist (tick per change).
- `DEV_NOTES.md` — session handoff (vibe + bugs + lessons, read first). `feature.md` — non-technical user guide.
- `CHANGELOG.md` — folder releases. `APP_CHECKLIST.md` — Business API (PENDING approval 2026-09-19, `TIKTOK GMV MAX`) + Shop Custom app (created, MY) paperwork tracker.
- `migrations/001_core.sql, 002_acct.sql, 003_gmv.sql` (FROZEN, have bugs — see 004) + `004_fix_schemas.sql` (applied dev+prod: schema-qualified tables, `win` not `window`) + `005_online.sql` (ads-token store, account cache, daily rollup) + `006_status.sql` (campaign `status` + `raw`, applied prod+dev 01 Oct) + `007_shop_tokens.sql` (shop token store, applied dev+prod 03 Oct) + `008_shop_token_columns.sql` (cipher/expiry cols) + `009_hourly.sql` (per-campaign hour_slot TEXT PK, rewrite-on-revise). Never edit applied files; new fix = 010+.
- `collector.py` — 30m prod pulls, closed-window T-2h, skip 02:00–06:00 MYT. Net ROI lock (`FEE_RATE=0.25`, gross kept). DB column is `win`; file JSON key stays `window`. NEVER `POST update` in P0 (`ALLOW_WRITES=0` assert).
- `online/` (Next.js exception, Vercel `marketer` prod `marketer-hw.vercel.app`, deploys need fresh `npx vercel login` — CLI token expires mid-session) — `src/lib/gmv.ts` (campaign/report/TTAM/sessions, account = first `[]` anywhere, status = `operation_status` → ON/OFF), `src/lib/hourly.ts` (hour grain pulls, Neon-map type filter, activity edge, ON-filter, movers/steady, Telegram builders; EMOJI + PCT_* + STAGNANT_SPEND consts live here), `src/lib/telegram.ts` (sendRichMessage blocks → rich-html → legacy chain + group thread split + `/tg-probe` self-deleting shape probe), `src/app/page.tsx` (Shop/Metric/Date/Fetch + Metric-Value + per-type Account → Campaign → Sessions, TTAM view, PROD badge, Hourly metric + Chart.js trends/bars), `src/app/api/sessions/route.ts` (single-ID room drill), `src/app/api/hourly/route.ts` (DB read) + `api/cron/hourly-sync/route.ts` (batched upserts, CRON_SECRET, external pinger) + `api/tg-webhook/route.ts` (`/fetch`, secret-token guard) + `api/tg-probe/route.ts`, `deploy_online.py` (repo-root deploy, Windows `npx.cmd` fix). Deps: `pg`, `tiktok-shop` (signByUrl), `chart.js` (allowed under the exception).
- `shop_auth.py` — one-shot SHOP OAuth (seller-side `services.tiktokshop.com` URL → 8082 /callback → `auth.tiktok-shops.com/token/get` exchange; lengths-only console). Blocked until Custom app approval ("service does not exist").
- `live_view.py` — MANUAL unlagged per-campaign view (eyes only; 2h rule stays for scheduler/auto). Seeds from `TIKTOK_GMV_CAMPAIGNS` {PRODUCT, LIVE} (list APIs return zero GMV rows — verified). Writes `cache/live.json` (LIVE first).
- `prod_auth.py` — one-shot prod OAuth (authorize URL → 8082 /callback → local exchange; lengths-only console).
- `collector_task.bat` + Windows task `GMVMaxCollector30m` (every 30m; same-slot dedupe in code).
- `dashboard/dashboard.py + dashboard.html` — file/memory cache, freshness stamp + DEV/PROD branch badge, Live section (`/api/live`, UNLAGGED badge). Rules/approval UI stubbed grey (P1/P2).
- `cache/` (gitignored runtime), `.local_secrets.json` (gitignored; keys: `TIKTOK_APP_ID/SECRET`, `TIKTOK_PROD_ACCESS_TOKEN/ADVERTISER_ID`, `TIKTOK_STORE_ID`, `TIKTOK_ADVERTISERS` map, `TIKTOK_GMV_CAMPAIGNS` {PRODUCT, LIVE}, `SANDBOX_*`, `SHOP_APP_*`, Neon URLs, `GMV_ENC_KEY`).

## Rules
1. Secrets never in git/chat: `NEON_URL_DEV/PROD`, `GMV_ENC_KEY`, TikTok/Shop keys, Telegram tokens. `git status` must never show them. Verify by key-names + lengths only.
2. Official APIs only. Newest hourly pair is partial by definition (tag it, decide off closed hours) — the old closed-window T-2h rule was dropped per owner 03 Oct for the hourly view; scheduler/auto still never acts on the newest slot.
3. Lock net-vs-gross ROI before first rule (May-2026: ROI includes affiliate/coupons/fees).
4. After EVERY change: `python -m py_compile` + `npx tsc --noEmit` in `online/` + deploy via `deploy_online.py` (build log must list new routes).
5. Never write to `acct_*` from gmv code and vice versa (per-schema roles `acct_app`/`gmv_app` deferred to P1; owner-only for P0).
6. Migrations: schema-qualify EVERY identifier (`acct.x`, `gmv.x`, `core.x` incl. indexes + FK refs); never use reserved words as bare columns (`window`→`win`). Grep-check new SQL before handing to owner.
7. Portal specifics: Neon child branches default to 1-day auto-delete (uncheck for persistent dev); Business API redirect uses `http://localhost:PORT/callback` (IP form rejected); sandbox ad account locked until app approval.
8. Online deploys run from the repo root (`python gmvmax-auto/deploy_online.py`, never `--cwd`); on Windows the script uses `npx.cmd` + shell. New API row fields must be carried through every frontend merge/accumulator (Total view merges LIVE+Product). Credential lookup is per-advertiser — never substitute another shop's token (40001 means wrong token, not no access). Serverless caps: Hobby kills at 60s — batch all per-row write loops (500/chunk); Telegram caps at 4096 chars (rich 32k) — truncate + overflow line. Every report pull gets filtered by the Neon promotion_type map (bugs 16/24). `tsconfig.tsbuildinfo` is gitignored.
9. Sparring mode is ON for this folder (owner order 03 Oct): challenge assumptions, no blind affirmation; feasibility talk gets words only until explicit go.
