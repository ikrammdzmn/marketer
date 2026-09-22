# MASTER-PLAN — marketer repo overview

> Read this first in any new session. Then read the folder plan for where you will work.
> Detailed GMV auto plan lives in `gmvmax-auto/masterplan.md` (not duplicated here).

## 1. Repo map (what lives where)
- `tiktok-creative-analysis/` — Static creative analytics (single + bulk dialects, multi-file compare ≤7 with auto-pick Combine/diff, trend per creative: day columns + line chart + sparklines + solo popup + ROI/CPM/AOV metrics, dot-only chart hover with vs-prev moves, insight engine + verdict filter + `?insight` links, exploration guide + clickable pills + status-by-day KPIs/chart with green-red deltas, SOP bars, folder-grouped filename-chip picker, click-to-copy Post IDs, manager CSV export). Pure HTML/CSS/vanilla JS, no build (`app.js?v=47`). Authoritative `data/accounts.json` (20 entries × {name,username,accountId,note,active,live,topAffiliate,updatedAt}, exact-match on name); `data/catalog.json` (4 campaigns + 18 products, user-named); `data/targets.json` (SOP topN/minImpr/maxCPM, null = auto). Local `server.py` (127.0.0.1, accounts+targets savers) + `start-server.bat`; loader auto-picks newest `source-file/*.xlsx` by end-date. Statuses in its `plan.md`; releases in `CHANGELOG.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `tiktok-account/` — Display API dashboard (own videos + post times). Python stdlib + Tailwind, localhost 8080. `tester.py` FROZEN. 17 Sep: 429 throttle/retry, range + limit pulls (merged cache), unlink, calendar UX, thumbnails, link-mismatch guard. 20 Sep: live Refresh progress popup (stream, same-connection) + last-fetch stamps + `#`-first CSV export (committed `4f9a792`); new UNTRACKED `sync/` daily Sheets bridge (11 sheets, customs, deltas, presets, ps1 launcher — own docs inside). Statuses in its `plan.md`; releases in `CHANGELOG.md`. Agent note: `NEON_NOTE.md`.
- `tiktok-strategy/` — Himwellness Growth OS playbook (`himwellness-playbook.html` + `full-strategy.md`). Business guardrails live here: ROI ≥7.0, CPA ≤RM21.18, 1 campaign/SKU, TTAM feeder role, dayparting windows, payday surge. Offline, localStorage.
- `tiktok-event/` — HIMCOFFEE RACI MASTER (`index.html`, vanilla single-file, local-only, no build). Timeline 2026–2030 + RACI Worksheet + 5T/3M Blueprint + workload + CSV + local PIN seats. Reference: `raci_campaign_dashboard.tsx` (React+Firebase, FROZEN) + `tiktok-prd` (PRD v1.0.0). Statuses in its `plan.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `gmvmax/` — Knowledge only: `gmvmax.md` (algo realities, §3 points at product glossary) + `product/exploration-status.md` (canonical TikTok stages + `Available` exclusion rule) + `product/*.xlsx`. No code goes here.
- `gmvmax-auto/` — auto budget-adjust service: P0 LIVE prod read-only 21 Sep (prod OAuth, report GET live, net ROI locked fee 25%, 30m scheduler task, manual unlagged 5-campaign view: 1 LIVE + 4 Product). Code: `collector.py` + `live_view.py` + `prod_auth.py` + `dashboard/` 8082 + migrations `001–004`. See `gmvmax-auto/plan.md` + `DEV_NOTES.md` + `feature.md`.
- `docs/` — `terms.html` + `privacy.html` (GitHub Pages, TikTok app review). `tiktok*.txt` at root = domain verification. Never move/rename without updating TikTok app form.
- `opencode.json` (NEW, untracked 19 Sep) — opencode MCP pointer: `google-sheets`
  local via `../tools/spreadsheet-mcp` (`uv run`), secret-free
  (`{env:GOOGLE_SHEETS_CRED}` only). Antigravity counterpart
  `~/.gemini/config/mcp_config.json` also wired (was 0 bytes).
- Sibling `../tools/` (private GitHub `ikrammdzmn/tools`, `main`) — `spreadsheet-mcp` cloned 19 Sep
  (`uv` 0.12.17, `uv sync` OK), 27 Sheets tools; repo live with docs +
  `bootstrap.ps1` (commits `3a27f20`, `70f1700`, push confirmed 20 Sep);
  20 Sep: key landed (`GOOGLE_SHEETS_CRED` SET), Sheets + Drive APIs on,
  scratch read/write GREEN on shared `mcp-scratch` (get → read → write →
  append → read-back → clear). Workspace rule: SA cannot create sheets
  (403 expected) — human creates + shares as Editor. Own
  `AGENTS.md`/`DEV_NOTES.md`/`feature.md`. Next Sheets work roots in that repo.
  Still open: IDE restart + in-IDE `get_spreadsheet_info`; `gh` not installed.
- `1-MASTER/` — this file + `MASTER-CHANGELOG.md` (repo rollup) + `MASTER-AGENTS.md` (shared conventions) + `antigravity-aistudio.md` (IDE transfer guide, not product code).

## 2. Current status (2026-09-20, midday)

- `tiktok-account` dashboard liveliness landed (committed `4f9a792` 20 Sep
  09:09 +0800): stream progress popup + fetched_at stamps + `#` export.
  Sibling-built `sync/` daily Sheets bridge live (UNTRACKED, own docs):
  11 sheets, first `--all --days 7` 10/10; owner ran `--today --all`,
  stopped at dry-run prompt — outcome open. `sync/` covers first 10 active
  slots vs 20-entry accounts.json (coverage question open).

- `tools/` Sheets MCP GREEN (sibling, outside git): key landed + both APIs on,
  `GOOGLE_SHEETS_CRED` SET, scratch read/write GREEN on shared `mcp-scratch`
  (Workspace: human-creates + shares, SA reads/writes; SA-create 403 is
  expected). Org-policy lift needed both key-creation constraints; 6 more
  wiring bugs fixed (check_setup false-negative, API-disabled 403, Drive URL
  shape, flaky ls-remote). IDE restart + in-IDE info test still open.
  Detail: `../tools/DEV_NOTES.md`.
- `tiktok-account` dashboard ready local-only; 20-entry accounts.json (live-read); 429-hardened range/limit pulls; link-mismatch guard live; 20 Sep: stream popup + fetched_at + `#` export (committed `4f9a792`); UNTRACKED `sync/` Sheets bridge (own docs); accounts not all linked; Production app unapproved (demo video still the next big step).
- `tiktok-creative-analysis` v23–v47 local-only, verified over HTTP, UNCOMMITTED: source subfolders + folder `[id]` labels, newest-by-date, trend per creative (day columns, line chart, sparklines, solo popup, Post ID column, Post-ID legend, ROI/CPM/AOV metrics with ratio-safe totals, dot-only hover + vs-prev moves), exploration guide + clickable pills + status-by-day KPIs/chart + green-red deltas, click-to-copy Post IDs everywhere, auto-pick Combine for disjoint dated files, manager CSV export (with Last updated stamp). `source-file/` on disk: himcoffee dailies 09-13→09-22 (user-added 09-20/21/22 + range 09-15→09-22) + `BULK DATA/` subfolder (user pruned olds, added bulk 09-14~09-21). `catalog.json` shows worktree edits (user may have started naming — re-read before naming work). Backlog: exploration exit signals (`plan.md` §6). Releases → `tiktok-creative-analysis/CHANGELOG.md`.
- `tiktok-strategy` playbook content complete (static).
- `tiktok-event` built 17 Sep (vanilla RACI board + docs), UNTRACKED. Backlog: structured due-dates, C/I columns, shared Firebase seats, mobile cards.
- `gmvmax-auto` P0 skeleton landed 19 Sep (UNCOMMITTED): Neon `TIKTOK DATA` SG with `production` + persistent `dev`, `001–004` applied (`acct`=2, `gmv`=7 both branches; 004 fixed public-schema + reserved-`window`→`win` bugs), collector stub + 8082 dashboard verified offline-first, keys gitignored (lengths-only check). Business API `TIKTOK GMV MAX` PENDING approval — expected non-issue 20 Sep, P0 holds file-first (sandbox locked); Shop Custom app created (MY). Next: sandbox GET wiring → 48×30m snapshots → P0 exit. Detail: `gmvmax-auto/plan.md`, `DEV_NOTES.md`, `CHANGELOG.md`.
- Git: branch `main`. HEAD `4f9a792` (20 Sep, dashboard liveliness; message is
  bare status text — don't amend unasked). Worktree holds UNCOMMITTED edits
  across `1-MASTER/*`, root `AGENTS.md`, `tiktok-account/` docs (ritual),
  UNTRACKED `tiktok-account/sync/`, plus the older creative-analysis /
  gmvmax-auto work noted below. Commit only when asked.

## 3. Relations each AGENTS.md must know
- **Accounts source:** `tiktok-creative-analysis/data/accounts.json` is authoritative. `tiktok-account/dashboard` reads it live — never duplicate the list. `tiktok-creative-analysis/data/catalog.json` (friendly campaign/product labels) and `data/targets.json` (SOP bars) are creative-analysis-only, display-local, not shared. `gmvmax-auto` will resolve campaigns against shop/account names from the same source of truth via `core` schema later.
- **Business rules source:** `tiktok-strategy/AGENTS.md` owns ROI ≥7.0, CPA RM21.18, scale ≤20–25%/24h, no changes 16:00–17:30, dead zones 02:00–08:00, payday surge 25th–2nd. `gmvmax-auto` decider MUST obey these — never re-derive.
- **API separation:** `tiktok-account` = Display/Login Kit (`video.list`, own accounts). `gmvmax-auto` = Business Marketing API + Shop Open API (ads/budget/GMV). Different dev apps, keys, approvals. Scopes are NOT interchangeable.
- **Shared secrets rule:** nothing secret in git, chat screenshots, or error pastes. `tokens/`, `csvs/`, `.local_secrets.json` gitignored. Production secret once pasted in chat → rotate.
- **Shared hosting rule:** GitHub Pages source `main`/`(root)`; URLs carry `/marketer/` path; verification files stay at root.
- **Shared Neon (long-term):** one project (Singapore), schemas `core` / `acct` (tiktok-account) / `gmv` (gmvmax-auto) / reserve `strategy`, `creative`. Order: `acct` first, `gmv` second. Per-schema roles, DEV/PROD branches, numbered migrations, encrypted tokens (Fernet), cache-serve for offline.

## 4. Risks when working in ONE folder alone (don't overlook)
1. Editing `accounts.json` names/duplicating lists → breaks the other dashboard (exact-match invariant). Always edit in creative-analysis only.
2. Touching `tester.py`, `docs/*.html`, `tiktok*.txt`, Pages source → breaks TikTok app review / OAuth for everyone. Frozen/verify-first.
3. Adding npm/build/framework to any folder → violates all three AGENTS.md (stdlib/static only unless explicitly approved for gmvmax-auto server deps like `cryptography`, Neon driver).
4. Binding 0.0.0.0 / exposing localhost servers → no auth gates exist. Stay 127.0.0.1.
5. Changing GMV Auto thresholds without strategy guardrails (ROI<7, scale>25%, editing in lull) → burns margin; cross-check strategy AGENTS.md §4.
6. Acting on freshest 30m report slot (lag 15m–2h) or gross-vs-net ROI confusion (2026 net includes fees/affiliate/coupons) → false auto-changes.
7. Writing to another schema (`acct_*` vs `gmv_*`) or `core` without check → cross-project breakage. Dual-write + branch badge + cache fallback required.
8. Committing/pushing unasked, or committing secrets — never.

## 5. Where to work next (pointer, not a start)
- GMV auto detail: `gmvmax-auto/masterplan.md` §9 phases (P0 first, on explicit go).
- Neon rollout: `tiktok-account/NEON_NOTE.md` (dual-write, then cutover).
- New-session handoff order: `1-MASTER/MASTER-PLAN.md` → folder plan → `gmvmax/gmvmax.md` if touching GMV logic.
