# AGENTS.md — marketer repo root

> Router, not a rulebook. Conventions live in `1-master/MASTER-AGENTS.md`.
> Status lives in `1-master/MASTER-PLAN.md` + `1-master/MASTER-CHANGELOG.md`.
> Then read the folder you will touch: its `AGENTS.md` + `plan.md` + `DEV_NOTES.md`.
> Restructure 05 Oct (Phases 1+2, committed + pushed): dash folders + new homes — see `repo-restructureplan.md`.

## Folder index
- `2-gmvmax/tiktok-creative-analysis/` — creative analytics (authoritative `data/accounts.json`).
- `2-gmvmax/tiktok-account/` - Display API dashboard (8080, `tester.py` FROZEN, `NEON_NOTE.md` for `acct` schema) + `sync/` daily Sheets bridge (12 sheets, Dashboard No col + numbered tabs, Creative-age col + menu-7 seeder, own docs; v21-v24 committed `8ec64f0`).
- `2-gmvmax/gmvmax-auto/` — GMV Max online M10/M11 + P0 local read-only (shop 1; bot `/start`, `/fetch`, `/fetch_hourly`). Google OAuth + fixed-admin allowlist, read-only GMV Max/TTAM budget columns + ON-only account sums, and Shop GMV with admin one-tap token refresh are deployed; signed-out gate verified. Hourly date-fix + shop multi-day + hourly picker/scorecard/sync + Hourly shop + chart z-fix committed/pushed (`583e1cf`), owner deploy pending. Read folder `DEV_NOTES.md` first (Checkpoint 31 newest) + folder `AGENTS.md`; owner end-to-end allowlist/budget/button checks remain. Open next: manual-gap recheck (shop API vs old system) next session.
- `1-1-sales/sales-performance-analysis/` — sales analysis (plan v0 only 05 Oct, 1–5 Oct Him.DrSamhan: TTAM 0-sales CPM verdicts + GMV Max ROI cut/boost; distinct from Metric Scorer; own docs).
- `1-1-sales/tiktok-shop/` + `1-1-sales/tiktok-shop-hourly/` — shop sales reporting (hourly: shop 1; fetcher userscript + viewer with DEAD/GOLDEN/WATCH scorecard; quirks + guardrails in its AGENTS.md).
- `3-ttam/campaign-performance-analysis/` — Metric Scorer (11 TikTok OMTM verdicts + kill-list cut simulator; bands from JSON presets, metrics from JSON registry; static, :8123 only; spec `metric.md`, plan `metric-plan.md`).
- `2-gmvmax/tiktok-calculator/` + `2-gmvmax/tiktok-live/` — moved Phase 1.
- `2-gmvmax/` — shell + `README.md` pointer (`tiktok-shop-hourly` lives in `1-1-sales/`; high-risk trio joins in Phase 2).
- `skills/tiktok/` — repo-local TikTok API skill (verified endpoint shapes, creative-level rules, metric tables, quirks). Load it before any TikTok API work.
- `skills/tiktok-shop/` — repo-local Shop API skill (orders sync, token refresh, MYT bucketing, parity ref). Load before shop-side work.
- `skills/vercel-deploy/` — deploy ritual + Hobby caps + CLI auth. Load before deploys.
- `skills/neon-db/` — migration law + branches + write patterns. Load before SQL work.
- `skills/creative-analysis/` — local tool rules + online module state. Load before creative work.
- `skills/telegram-rich/` — bot delivery rules + verified block shapes. Load before bot work.
- `skills/session-handoff/` — end-of-day DEV_NOTES ritual. Load on wrap-up requests.
- `skills/calendar-picker/` — date-range picker pattern. Load before picker work.
- `1-knowledge/tiktok-strategy/` — guardrails owner (ROI ≥7.0, CPA ≤RM21.18). Automation obeys, never re-derives.
- `1-knowledge/tiktok-event/` — RACI board. `1-knowledge/0-0-tiktok/gmvmax/` — knowledge only, no code.
- `docs/` + `tiktok*.txt` — app-review pages + domain verification, frozen.
- `1-2-tools/g-sheet_tools/` — Sheets Apps Script tools (own AGENTS.md): `aff-notify/` 4x-daily
  Affiliate Collection digest (`code.gs` email + `tg_bot/` Telegram sender,
  user-tested 27 Sep) + `aff-notify/ROW-COL-HIGHLIGHT/` crosshair helpers
  (bound `code.gs` marker scope + Tampermonkey instant lines v1.1) +
  `aff-notify/row_highlight-keyword/` keyword highlighter (live on
  ALL INTERNAL CREATIVE DATA, partial match).
- `opencode.json` — opencode MCP pointer (secret-free, `{env:GOOGLE_SHEETS_CRED}` only).
- Sibling `../tools/` (private GitHub `ikrammdzmn/tools`, branch `main`) — local MCP runners (`spreadsheet-mcp`,
  27 Sheets tools, IGNORED clone) + its own `AGENTS.md`/`DEV_NOTES.md`/`feature.md`/`bootstrap.ps1`. Read/write GREEN
  20 Sep on shared sheets (Workspace: human creates + shares as Editor). Antigravity
  reads `~/.gemini/config/mcp_config.json`, never `opencode.json` — ask IDE first.

## Hard rules (all folders)
Localhost (`127.0.0.1`) only. No npm/build unless folder AGENTS.md approves.
Secrets never in git/chat (lengths-only checks). Commit/push only when asked.
Short replies; code only on explicit go.
