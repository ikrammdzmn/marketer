# AGENTS.md — tiktok-mcp (TikTok for Business MCP memory)

> Subfolder of `2-gmvmax/gmvmax-auto/`. Business Marketing API scope only.
> Parent conventions win: read `../AGENTS.md` + `1-master/MASTER-AGENTS.md` first.
> This folder holds connection memory only — no code, no server, no build.

## What lives here

- `DEV_NOTES.md` — connection choice + advertiser list + probe log.
- No code. API calls go through the `tiktok-business` MCP in opencode,
  verified shapes in `skills/tiktok-api/SKILL.md`, audit flow in
  `skills/tiktok-ads/SKILL.md`.

## Connection (source of truth is repo `opencode.json`)

- MCP `tiktok-business`, project-local, progressive mode
  `https://business-api.tiktok.com/open_mcp/tt-ads-mcp-flat` is FULL (400 tools),
  we use `.../tt-ads-mcp-layer` (~40 tools). Full URL only on explicit need.
- Auth: OAuth via `/mcps` in IDE. No API keys in git.

## Rules

1. Official TikTok APIs only. Read-only first (`auth_advertiser_get`,
   `tool_list`/`tool_get` probes); writes only on explicit owner go.
2. API separation (`MASTER-AGENTS.md`): this MCP = Business/Ads side
   (`gmvmax-auto`). Never use it for Display API work (`tiktok-account/`).
3. Guardrails obey `1-knowledge/tiktok-strategy/` (ROI >= 7.0, CPA <= RM21.18).
4. Secrets never in git/chat. Advertiser IDs may be listed (like parent
   `plan.md` shop map); tokens never.
