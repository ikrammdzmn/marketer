# AGENTS.md — marketer repo root

> Router, not a rulebook. Conventions live in `1-MASTER/MASTER-AGENTS.md`.
> Status lives in `1-MASTER/MASTER-PLAN.md` + `1-MASTER/MASTER-CHANGELOG.md`.
> Then read the folder you will touch: its `AGENTS.md` + `plan.md` + `DEV_NOTES.md`.

## Folder index
- `tiktok-creative-analysis/` — creative analytics (authoritative `data/accounts.json`).
- `tiktok-shop-hourly/` — shop hourly reporting (shop 1; fetcher userscript + viewer with DEAD/GOLDEN/WATCH scorecard; quirks + guardrails in its AGENTS.md).
- `tiktok-account/` - Display API dashboard (8080, `tester.py` FROZEN, `NEON_NOTE.md` for `acct` schema) + `sync/` daily Sheets bridge (12 sheets, Creative-age col, own docs; committed 23 Sep `2663c7a`).
- `gmvmax-auto/` — GMV Max auto-adjust (P0 live prod 21 Sep: prod OAuth, unlagged 5-campaign view, net ROI locked; read `DEV_NOTES.md` first for vibe + portal lessons).
- `tiktok-strategy/` — guardrails owner (ROI ≥7.0, CPA ≤RM21.18). Automation obeys, never re-derives.
- `tiktok-event/` — RACI board. `gmvmax/` — knowledge only, no code.
- `docs/` + `tiktok*.txt` — app-review pages + domain verification, frozen.
- `g-sheet_tools/` — Sheets Apps Script tools (own AGENTS.md): `aff-notify/` 4x-daily
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
