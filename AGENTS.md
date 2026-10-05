# AGENTS.md — marketer repo root

> Router, not a rulebook. Conventions live in `1-master/MASTER-AGENTS.md`.
> Status lives in `1-master/MASTER-PLAN.md` + `1-master/MASTER-CHANGELOG.md`.
> Then read the folder you will touch: its `AGENTS.md` + `plan.md` + `DEV_NOTES.md`.
> Restructure 05 Oct (Phase 1): dash folders + new homes — see `repo-restructureplan.md`. Old root paths keep a `README.md` shim for one session.

## Folder index
- `tiktok-creative-analysis/` — creative analytics (authoritative `data/accounts.json`). STAYS at root until Phase 2.
- `tiktok-account/` - Display API dashboard (8080, `tester.py` FROZEN, `NEON_NOTE.md` for `acct` schema) + `sync/` daily Sheets bridge (12 sheets, Dashboard No col + numbered tabs, Creative-age col + menu-7 seeder, own docs; v21-v24 committed `8ec64f0`). STAYS at root until Phase 2.
- `gmvmax-auto/` — GMV Max auto-adjust (online M9 hourly live 04 Oct `marketer-hw.vercel.app`, shop 1 + P0 local read-only 21 Sep; read `DEV_NOTES.md` first for vibe + portal lessons + bugs 23–35). STAYS at root until Phase 2 (Vercel Root Dir + Telegram re-test).
- `1-1-sales/Sales Performance Analysis System/` — sales analysis (plan v0 only 05 Oct, 1–5 Oct Him.DrSamhan: TTAM 0-sales CPM verdicts + GMV Max ROI cut/boost; distinct from Metric Scorer; own docs).
- `1-1-sales/tiktok-shop/` + `1-1-sales/tiktok-shop-hourly/` — shop sales reporting (hourly: shop 1; fetcher userscript + viewer with DEAD/GOLDEN/WATCH scorecard; quirks + guardrails in its AGENTS.md).
- `3-ttam/campaign-performance-analysis/` — Metric Scorer (11 TikTok OMTM verdicts + kill-list cut simulator; bands from JSON presets, metrics from JSON registry; static, :8123 only; spec `metric.md`, plan `metric-plan.md`).
- `2-gmvmax/tiktok-calculator/` + `2-gmvmax/tiktok-live/` — moved Phase 1.
- `2-gmvmax/` — shell + `README.md` pointer (`tiktok-shop-hourly` lives in `1-1-sales/`; high-risk trio joins in Phase 2).
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
