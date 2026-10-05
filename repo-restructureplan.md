# Repo Restructure Plan — numbered folders + dashes (Phase 1 low-risk / Phase 2 high-risk)

> Agreed 05 Oct 2026. Scope: full move (Option B) + dash names. High-risk moves deferred to Phase 2.
> Status: Phase 1 low-risk EXECUTED 05 Oct 2026 (staged via `git mv`, uncommitted — commit only when asked). Phase 2 parked.
> Mirror of `C:\Users\darkv\.opencode\plan\repo-restructureplan.md`.

## Milestones

- [x] M0 freeze + inventory (`git status`, frozen list noted)
- [x] M1 renames to dashes (`1-master`, `1-knowledge`, `1-1-sales`, `3-ttam`, `2-gmvmax` + `1-2-tools` shells)
- [x] M2 safe moves (event, strategy, shop, shop-hourly, sheet-tools, calculator, live)
- [x] M3 pointers + docs index (`README` shims + root `AGENTS.md` + `1-master/MASTER-PLAN.md` §1/§2/§5 refs, verified old-forms absent)
- [x] M4 Phase 1 verify (`node --check` 5/5 .gs OK, `1-2-tools` ASCII-clean, no secrets staged; `SALES ORDER PROCESSOR/code.gs` has 1 pre-existing 🚀 U+1F680, bytes untouched by move)
- [ ] M5 Phase 2 high-risk `gmvmax-auto` move (deploy script + Vercel Root Dir + Telegram re-test)
- [ ] M6 Phase 2 `creative-analysis` + `account` pair move (accounts.json path + ports 8080/:8000)
- [ ] M7 full sweep (`tsc --noEmit`, grep old paths, `service restart`, versions match)

## 1. Naming (dashes, locked)

- [x] `1-MASTER/` → `1-master/` (rename only)
- [x] `1. KNOWLEDGE/` → `1-knowledge/`
- [x] `1.1 Sales/` → `1-1-sales/`
- [x] NEW `1-2-tools/` (holds `g-sheet_tools/` content; future tools land here — avoids clash with sibling `../tools/` MCP runners)
- [x] `2. GMV MAX/` (empty) → `2-gmvmax/` (shell in Phase 1, filled in phases)
- [x] `3. TTAM/` → `3-ttam/`
- [x] `1. KNOWLEDGE/0.0 TIKTOK/` → `1-knowledge/0-0-tiktok/` (knowledge only, no code)

## 2. Final homes (agreed)

- [ ] `3-ttam/campaign-performance-analysis/` — TikTok Ads Manager scorer only (:8123). Already there.
- [x] `1-1-sales/sales-performance-analysis/` + `1-1-sales/tiktok-shop/` + `1-1-sales/tiktok-shop-hourly/` — shop sales reporting home.
- [ ] `2-gmvmax/` — `gmvmax-auto/` + `tiktok-calculator/` + `tiktok-live/` + `tiktok-creative-analysis/` + `tiktok-account/` (pointer only to `tiktok-shop-hourly` in 1-1-sales).
- [x] `1-knowledge/` — existing `0-0-tiktok/` + `tiktok-strategy/` + `tiktok-event/` (both moved 05 Oct, history preserved via rename detection).
- [x] `1-2-tools/` — `g-sheet_tools/aff-notify/` + `tg_bot/` + `ROW-COL-HIGHLIGHT/` + `row_highlight-keyword/`.
- [ ] STAY at repo root always: `docs/` + `tiktok*.txt` (TikTok app review / Pages `/(root)` frozen) + `.vercel/` + `opencode.json` + `.env.local` + `.gitignore`.

## 3. Phase 1 — low-risk (do now)

- [x] 1. P0 freeze: `git status` clean-check; note frozen: `tiktok-account/tester.py`, `docs/*.html`, `gmvmax-auto/migrations/001-011`, `code.gs` live on sheets.
- [x] 2. Renames only: `1-MASTER→1-master`, `1. KNOWLEDGE→1-knowledge`, `1.1 Sales→1-1-sales`, `3. TTAM→3-ttam`; create `2-gmvmax/` shell + `1-2-tools/` shell.
- [x] 3. Safe moves (no live-service deps):
  - [x] `tiktok-event/` → `1-knowledge/tiktok-event/`
  - [x] `tiktok-strategy/` → `1-knowledge/tiktok-strategy/` (rule owner ROI ≥7.0 stays canonical)
  - [x] `tiktok-shop/` + `tiktok-shop-hourly/` → `1-1-sales/`
  - [x] `SALES ORDER PROCESSOR/` + `Sales Performance Analysis System/` stay under `1-1-sales/` (dash subnames later)
  - [x] `g-sheet_tools/*` → `1-2-tools/*` (Apps Script local copies only; bound scripts in Google unaffected)
  - [x] `tiktok-calculator/` + `tiktok-live/` → `2-gmvmax/`
- [x] 4. Pointers: `README.md` shims at old root paths DONE then REMOVED (dirs held shim only, verified) — old paths fully gone; root `AGENTS.md` index + `1-master/MASTER-PLAN.md` §1/§2/§5 refs DONE (old-forms grep absent, case-sensitive).
- [x] 5. Verify P1: `node --check` 5/5 `.gs→.js` OK, `1-2-tools` ASCII-clean, `git status` shows no secrets.

## 4. Phase 2 — high-risk (next, explicit go + re-test)

- [ ] 1. `gmvmax-auto/` → `2-gmvmax/gmvmax-auto/`:
  - [ ] Fix `deploy_online.py`: `ROOT = parent(gmvmax-auto)` breaks (points at `2-gmvmax/`). Walk up 2 levels to repo root.
  - [ ] Vercel Dashboard Root Directory: `gmvmax-auto/online` → `2-gmvmax/gmvmax-auto/online`; re-link `.vercel/`, redeploy needs fresh `npx vercel login`.
  - [ ] Telegram: URLs stay `marketer-hw.vercel.app`; re-test `/tg-probe?keep=1` + `/fetch` + `/fetch_hourly` + chart callback; `telegram_message.md` / `tg-rich-messages.md` paths update.
  - [ ] `online/vercel.json` cron `/api/cron/nightly-sync` unchanged (path-relative), but `CRON_SECRET` env stays on Vercel.
- [ ] 2. `tiktok-creative-analysis/` + `tiktok-account/` → `2-gmvmax/` AS A PAIR:
  - [ ] Preserves `dashboard` live-read of `data/accounts.json` (exact-match invariant); update relative path in reader, keep `catalog.json`/`targets.json` creative-only.
  - [ ] Test ports together: 8080 dashboard + `sync/` bridge (v21-v24, Dashboard No col + numbered tabs) + creative `:8000` loader + scorer `:8123` untouched.
- [ ] 3. Add pointer `2-gmvmax/tiktok-shop-hourly → ../../1-1-sales/tiktok-shop-hourly` (doc link, no duplicate code).
- [ ] 4. Full sweep: grep old `tiktok-*` / `gmvmax-auto/` / `g-sheet_tools/` strings in `*.md`, `*.py`, `*.js`, `*.ts`, `*.bat`; `npx tsc --noEmit` in `online/`; `opencode api get /api/info` version match + `service restart`.

## 5. MCP / Telegram-bot / Vercel guardrails

- MCP (`opencode.json`): absolute `uv.exe` + `C:/.../tools/...` paths — safe to move marketer folders. Only doc references to `../tools` need sweep. Antigravity reads `~/.gemini/config/mcp_config.json`, never `opencode.json`.
- Telegram bot (`g-sheet_tools/aff-notify/tg_bot/` + `gmvmax-auto/online/src/lib/telegram.ts`): tokens in Script Properties / Vercel env only (lengths-only in git). Move = path updates only; triggers (`installTriggers`) reinstall once, never blind re-run.
- Vercel: never `--cwd`; deploy from repo root via `deploy_online.py` (Windows `npx.cmd` + shell). Serverless 60s cap + Telegram 4096-char cap unchanged.

## 6. Open items for implementer

- [x] Confirm `tiktok-strategy/` already moved? (YES — moved 05 Oct Phase 1 into `1-knowledge/`, git shows `R tiktok-strategy/ → 1-knowledge/tiktok-strategy/`).
- [ ] Subfolder dash names under `1-1-sales/` + `1-2-tools/` (e.g. `sales-performance-analysis` vs `sales_performance`)?
- [ ] `tiktok-shop` vs `tiktok-shop-hourly` overlap: both in 1-1-sales — merge or keep separate? (kept separate in this plan).
