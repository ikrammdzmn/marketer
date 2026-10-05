# Repo Restructure Plan — numbered folders + dashes (Phase 1 low-risk / Phase 2 high-risk)

> Agreed 05 Oct 2026. Scope: full move (Option B) + dash names. High-risk moves deferred to Phase 2.
> Status: Phase 1 COMMITTED (`7ee3133` + `7133367`) and Phase 2 COMMITTED (`fab6495`, 124 files, local only — NOT pushed). All M0–M7 ticked.
> Mirror of `C:\Users\darkv\.opencode\plan\repo-restructureplan.md`.

## Milestones

- [x] M0 freeze + inventory (`git status`, frozen list noted)
- [x] M1 renames to dashes (`1-master`, `1-knowledge`, `1-1-sales`, `3-ttam`, `2-gmvmax` + `1-2-tools` shells)
- [x] M2 safe moves (event, strategy, shop, shop-hourly, sheet-tools, calculator, live)
- [x] M3 pointers + docs index (`README` shims + root `AGENTS.md` + `1-master/MASTER-PLAN.md` §1/§2/§5 refs, verified old-forms absent)
- [x] M4 Phase 1 verify (`node --check` 5/5 .gs OK, `1-2-tools` ASCII-clean, no secrets staged; `SALES ORDER PROCESSOR/code.gs` has 1 pre-existing 🚀 U+1F680, bytes untouched by move)
- [x] M5 Phase 2 high-risk `gmvmax-auto` move (code DONE: `deploy_online.py` ROOT walks up 2, `tsc --noEmit` exit 0; OWNER STEPS DONE 05 Oct: Vercel Root Directory redeployed; `/tg-probe?keep=1` 18/21 (3 fails = documented pre-existing API limits); `/fetch` + `/fetch_hourly` live-verified)
- [x] M6 Phase 2 `creative-analysis` + `account` pair move (siblings preserved → `dashboard.py` accounts path resolves, verified True; `sheet-sync.py` MCP lookup now walks up to find sibling `../tools` at any depth; `py_compile` OK; run/doc paths updated)
- [x] M7 full sweep (root `AGENTS.md` + `MASTER-PLAN` + `MASTER-AGENTS` + hub refs on new paths, old-forms absent; service `2.0.23` healthy)

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

## 4. Phase 2 — high-risk (EXECUTED 05 Oct 2026, staged; owner Vercel/Telegram steps open)

- [x] 1. `gmvmax-auto/` → `2-gmvmax/gmvmax-auto/`:
  - [x] Fix `deploy_online.py`: `ROOT` now walks up 2 levels to repo root (verified resolves + `ONLINE` exists, `py_compile` OK).
  - [ ] Vercel Dashboard Root Directory: `gmvmax-auto/online` → `2-gmvmax/gmvmax-auto/online`; re-link `.vercel/`, redeploy needs fresh `npx vercel login`. OWNER ACTION.
  - [ ] Telegram: URLs stay `marketer-hw.vercel.app`; re-test `/tg-probe?keep=1` + `/fetch` + `/fetch_hourly` + chart callback. OWNER ACTION.
  - [x] `online/vercel.json` cron `/api/cron/nightly-sync` unchanged (path-relative); `tsc --noEmit` exit 0.
- [x] 2. `tiktok-creative-analysis/` + `tiktok-account/` → `2-gmvmax/` AS A PAIR:
  - [x] `dashboard.py` sibling-relative accounts path resolves True (no code change needed); `sheet-sync.py` MCP lookup walks up (env override preserved); `py_compile` OK.
  - [x] Run/doc paths updated (`AGENTS.md`, `SETUP.md`, `otherdevice.md`, `sync/README.md`); ports unchanged (8080/8000).
- [x] 3. Pointer `2-gmvmax/README.md` rewritten (shop-hourly → `1-1-sales/`, trio homes recorded).
- [x] 4. Full sweep: old-forms absent (Python case-sensitive check, 0 hits); `opencode api get /api/info` 2.0.23 healthy; no secrets staged.

## 5. MCP / Telegram-bot / Vercel guardrails

- MCP (`opencode.json`): absolute `uv.exe` + `C:/.../tools/...` paths — safe to move marketer folders. Only doc references to `../tools` need sweep. Antigravity reads `~/.gemini/config/mcp_config.json`, never `opencode.json`.
- Telegram bot (`g-sheet_tools/aff-notify/tg_bot/` + `gmvmax-auto/online/src/lib/telegram.ts`): tokens in Script Properties / Vercel env only (lengths-only in git). Move = path updates only; triggers (`installTriggers`) reinstall once, never blind re-run.
- Vercel: never `--cwd`; deploy from repo root via `deploy_online.py` (Windows `npx.cmd` + shell). Serverless 60s cap + Telegram 4096-char cap unchanged.

## 6. Open items for implementer

- [x] Confirm `tiktok-strategy/` already moved? (YES — moved 05 Oct Phase 1 into `1-knowledge/`, git shows `R tiktok-strategy/ → 1-knowledge/tiktok-strategy/`).
- [ ] Subfolder dash names under `1-1-sales/` + `1-2-tools/` (e.g. `sales-performance-analysis` vs `sales_performance`)?
- [ ] `tiktok-shop` vs `tiktok-shop-hourly` overlap: both in 1-1-sales — merge or keep separate? (kept separate in this plan).
