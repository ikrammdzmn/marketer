# DEV_NOTES.md — tiktok-mcp handoff

## Choice (21 Oct 2026)

- MCP: `tiktok-business`, project-local in `opencode.json` (not global).
- Mode: progressive `tt-ads-mcp-layer` (~40 tools). Full `tt-ads-mcp-flat`
  (~400 tools) only if progressive blocks us.
- Status: `opencode mcp list` = 3/3 connected (gemini-notebook, google-sheets,
  tiktok-business). OAuth done via `/mcps`.

## Authorized advertisers (live `auth_advertiser_get`, 21 Oct 2026)

- 7505228077656621057 — GMV MAX VOL2
- 7336853270385770498 — HIM COFFEE1
- 7696424643196026886 — HIM WELLNESS SDN BHD_920v36
- 7391329013215821840 — HIM WELLNESS - ADS DR SAMHAN
- 7696423616891797556 — HIM & HER WELLNESS PRODUCT SDN. BHD._kw4rxp

Note: IDs drift per login; re-run `auth_advertiser_get` when in doubt.
Parent shop map (`../plan.md` section 8) stays authoritative for shop<->adv pairing.

## Next

- Read-only probes first (balances, campaign get, report get).
- No budget/status writes without explicit owner go + strategy guardrail check.
