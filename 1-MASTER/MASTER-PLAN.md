# MASTER-PLAN — marketer repo overview

> Read this first in any new session. Then read the folder plan for where you will work.
> Detailed GMV auto plan lives in `gmvmax-auto/masterplan.md` (not duplicated here).

## 1. Repo map (what lives where)
- `tiktok-creative-analysis/` — Static creative analytics (single + bulk dialects, multi-file compare ≤31 with auto-pick Combine/diff, trend per creative: day columns + line chart + sparklines + solo popup + ROI/CPM/AOV metrics, dot-only chart hover with vs-prev moves, insight engine + verdict filter + `?insight` links, exploration guide + clickable pills + status-by-day KPIs/chart with green-red deltas + 7 on-demand stages, SOP bars, folder-grouped filename-chip picker, click-to-copy Post IDs, manager CSV export, shop daily trend (GMV-Max cards +
dashboard-pattern calendar + vs-previous deltas), loading spinner + locked
load buttons). Pure HTML/CSS/vanilla JS, no build (`app.js?v=54`). Authoritative `data/accounts.json` (20 entries × {name,username,accountId,note,active,live,topAffiliate,updatedAt}, exact-match on name); `data/catalog.json` (4 campaigns + 18 products, user-named); `data/targets.json` (SOP topN/minImpr/maxCPM, null = auto). Local `server.py` (127.0.0.1, accounts+targets savers, silent `/health` + probe quiet list) + `start-server.bat`; loader auto-picks newest `source-file/*.xlsx` by end-date. Statuses in its `plan.md`; releases in `CHANGELOG.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `tiktok-account/` - Display API dashboard (own videos + post times). Python stdlib + Tailwind, localhost 8080. `tester.py` FROZEN. 17 Sep: 429 throttle/retry, range + limit pulls (merged cache), unlink, calendar UX, thumbnails, link-mismatch guard. 20 Sep: live Refresh progress popup (stream, same-connection) + last-fetch stamps + `#`-first CSV export (committed `4f9a792`); `sync/` daily Sheets bridge committed 23 Sep (`2663c7a`, v19: progress, abort, re-sort, Video-ID-first, Creative-age col). 23 Sep: picker shows `active` from accounts.json (uncommitted). Statuses in its `plan.md`; releases in `CHANGELOG.md`. Agent note: `NEON_NOTE.md`. 28 Sep: `sync/` v21 (Dashboard No col, numbered tabs, canonical order, uncommitted).
- `tiktok-strategy/` — Himwellness Growth OS playbook (`himwellness-playbook.html` + `full-strategy.md`). Business guardrails live here: ROI ≥7.0, CPA ≤RM21.18, 1 campaign/SKU, TTAM feeder role, dayparting windows, payday surge. Offline, localStorage.
- `tiktok-event/` — HIMCOFFEE RACI MASTER (`index.html`, vanilla single-file, local-only, no build). Timeline 2026–2030 + RACI Worksheet + 5T/3M Blueprint + workload + CSV + local PIN seats. Reference: `raci_campaign_dashboard.tsx` (React+Firebase, FROZEN) + `tiktok-prd` (PRD v1.0.0). Statuses in its `plan.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `0.0 TIKTOK/gmvmax/` — Knowledge only: `gmvmax.md` (algo realities, §3 points at product glossary) + `product/exploration-status.md` (canonical TikTok stages + `Available` exclusion rule) + `product/*.xlsx`. No code goes here.
- `gmvmax-auto/` — GMV Max hourly live 04 Oct (`marketer-hw.vercel.app`, shop 1): M7 views (Total/LIVE/Product/TTAM/ROAS, sessions drill, ON/OFF pills + delivery badges/rollups) + M9 hourly (Neon hour rows `001–011`, dashboard Hourly metric + Chart.js graphs, Telegram 3-message set + `/fetch` day + `/fetch_hourly` hour + Total, jar rows, ROI H·D, Bud%, verdict, chart buttons, real-time partial tags, ON-filter) + P0 local read-only (prod OAuth, net ROI locked fee 25%, 30m scheduler). Shop-token route parked (Custom app review pending); true-ROAS ref provisional (export method pending). Next: dashboard redesign. Code: `collector.py` + `live_view.py` + `prod_auth.py` + `shop_auth.py` + `dashboard/` 8082 + migrations `001–011`. See `gmvmax-auto/plan.md` + `DEV_NOTES.md` + `feature.md` + `telegram_message.md`.
- `docs/` — `terms.html` + `privacy.html` (GitHub Pages, TikTok app review). `tiktok*.txt` at root = domain verification. Never move/rename without updating TikTok app form.
- `g-sheet_tools/` — Sheets Apps Script tools (bound scripts, no server, own
  `AGENTS.md`): `aff-notify/` 4x-daily Affiliate Collection digest
  (email `code.gs` + Telegram `tg_bot/` group-topic sender, both
  live-tested 27 Sep: buckets, mention ping, full/condensed styles;
  triggers pending). Docs: `plan.md` + `DEV_NOTES.md` +
  `feature.md` + `CHANGELOG.md`.
- `tiktok-shop-hourly/` — static shop-hourly reporting (NEW 30 Sep, uncommitted):
  third-party shop API, shop 1 first; single/range day-by-day fetch (session
  auth, max 31) + saved-JSON fallback, sums-vs-footer gate, recomputed ROAS,
  missing-vs-zero hours, Chart.js lines, combined CSV. Quirks: flat feed ROAS
  (recomputed), allocated hourly spend (shape-only). Statuses in its `plan.md`.
- `3. TTAM/campaign-performance-analysis/` — Metric Scorer (NEW 05 Oct,
  uncommitted): TikTok campaign-report xlsx in, 11 OMTM out (ERRI/HPS/ACS/CES/
  EDS/VVES/RVS/HRQ/RES/LQS/BCE) with KILL/WATCH/SCALE flags + OVERALL verdict,
  kill-list cut simulator, CSV export; bands from JSON presets (`presets/`,
  one file per campaign + manifest), metrics from JSON registry
  (`metrics.json`) with in-UI manager. Pure HTML/vanilla JS, localhost :8123
  (creative keeps :8000). Spec `metric.md`, plan `metric-plan.md`, own
  `AGENTS.md`/`feature.md`/`DEV_NOTES.md`/`CHANGELOG.md`.
- `1.1 Sales/Sales Performance Analysis System/` — sales analysis (plan v0 only
  05 Oct, uncommitted): 1–5 Oct Him.DrSamhan TTAM (RM20,668, 0 sales, CPM/Impr
  verdicts) + GMV Max (RM61,515, 9.29x, ROI 7.0 cut/boost) + L3-exclusion math
  (2.42x→3.27x). Distinct from Metric Scorer. Statuses in its `plan.md`.
- `opencode.json` (committed 23 Sep `2663c7a`) - opencode MCP pointer: `google-sheets`
  local via absolute WinGet `uv.exe` (forward slashes) + local `tools/` path, secret-free
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

- 05 Oct: `3. TTAM/campaign-performance-analysis` v1–v4 (uncommitted): NEW
  Metric Scorer built + verified (11 OMTM, quartile-calibrated v3 bands,
  OVERALL verdict, kill-list cut simulator, CSV; :8123 port fix; metrics.json
  registry; presets split). Folder moved from `sales-performance-analysis/`
  (typo fixed). Sales Performance Analysis System `plan.md` relocating to
  `1.1 Sales\` (owner, manual). Token note: full-sheet reads ~8-12k —
  default to KILL/WATCH slices from chat.

- 30 Sep: `tiktok-shop-hourly` v1–v4 (uncommitted): new track built + verified
  (viewer + same-origin userscript fetcher + scorecard + CSV loading;
  `node --check` clean, HTTP 200s, headless-tested with owner's 8-day file).
  Owner golden check in logged-in browser still open. Shop 2 merge + browser
  cache parked. Same day: `ROW-COL-HIGHLIGHT` fixes (dynamic scope,
  scope-only paint, property-nuke fix) + crosshair userscript v1.1, then
  `code.gs` deprecated (owner on Tampermonkey lines only). Also `sync` v24
  (launcher menu 7 reseeds Creative-age) + `row_highlight-keyword`
  partial-match cutover (live on ALL INTERNAL CREATIVE DATA) - both
  uncommitted.
  01 Oct: sync age formula calendar-day fix (24h truncation made yesterday
  read "today"; simulated + owner-confirmed; uncommitted, no engine change).
- 29 Sep: `tiktok-creative-analysis` v50–v54 (uncommitted): Shop daily trend +
  dashboard-pattern calendar + KPI cards with vs-previous deltas + one-click
  single-day fix + silent `/health` + probe quiet list + loading spinner with
  locked load buttons (`app.js?v=54`). Ritual done (DEV_NOTES handoff + bugs
  40–43, folder AGENTS rule 4 anchor lesson, rollup lines here + CHANGELOG +
  MASTER-AGENTS).

- 27 Sep: `g-sheet_tools/aff-notify` v1 built + email live-tested
  (`testNotify` works), then v2 Telegram sender + v3 two-bucket priority
  (both surfaces, mention ping, style pick open, all stub-tested);
  triggers pending install; sheet F-formulas still fixed ranges.
  27 Sep: `tiktok-account/sync` v20 (Dashboard col I Total Ticked, same
  batchGet, menu 6 relabeled; mock-verified, uncommitted).
  28 Sep: `tiktok-account/sync` v21 (Dashboard No col A + numbered tabs +
  canonical tab-strip/Dashboard order; fake-grid verified, uncommitted).
  29 Sep: `tiktok-account/sync` v22+v23 (`--seed-age` formula seeder +
  `C2:C10000` clear fix; stub-verified; committed `8ec64f0`).

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
- `tiktok-creative-analysis` v23–v49 local-only, verified over HTTP, UNCOMMITTED: source subfolders + folder `[id]` labels, newest-by-date, up to 31 files, trend per creative (day columns, line chart, sparklines, solo popup, Post ID column, Post-ID legend, ROI/CPM/AOV metrics with ratio-safe totals, dot-only hover + vs-prev moves), exploration guide + clickable pills + status-by-day KPIs/chart + green-red deltas + 7 on-demand stages, click-to-copy Post IDs everywhere, auto-pick Combine for disjoint dated files, manager CSV export (with Last updated stamp). `source-file/` on disk: himcoffee dailies 09-13→09-22 (user-added 09-20/21/22 + range 09-15→09-22) + `BULK DATA/` subfolder (user pruned olds, added bulk 09-14~09-21). `catalog.json` shows worktree edits (user may have started naming — re-read before naming work). Backlog: exploration exit signals (`plan.md` §6). Releases → `tiktok-creative-analysis/CHANGELOG.md`.
- `tiktok-strategy` playbook content complete (static).
- `tiktok-event` built 17 Sep (vanilla RACI board + docs), UNTRACKED. Backlog: structured due-dates, C/I columns, shared Firebase seats, mobile cards.
- `gmvmax-auto` P0 skeleton landed 19 Sep (UNCOMMITTED): Neon `TIKTOK DATA` SG with `production` + persistent `dev`, `001–004` applied (`acct`=2, `gmv`=7 both branches; 004 fixed public-schema + reserved-`window`→`win` bugs), collector stub + 8082 dashboard verified offline-first, keys gitignored (lengths-only check). Business API `TIKTOK GMV MAX` PENDING approval — expected non-issue 20 Sep, P0 holds file-first (sandbox locked); Shop Custom app created (MY). Next: sandbox GET wiring → 48×30m snapshots → P0 exit. Detail: `gmvmax-auto/plan.md`, `DEV_NOTES.md`, `CHANGELOG.md`.
- Git: branch `main`. HEAD `2663c7a` (23 Sep night, sync v19 + entry
  hardening + session docs). Worktree holds UNCOMMITTED evening work:
  dashboard active badge (`dashboard.py`/`.html`, `feature.md`), portable
  docs (`otherdevice.md` Sec 4, `exit-entry.md` MCP checklist), owner-reordered
  `accounts.json` (21 entries / 15 active), root `DEV_NOTES.md` + `feature.md`
  (new), xlsx 09-22/09-23. No secrets in set. Commit only when asked.

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
- New-session handoff order: `1-MASTER/MASTER-PLAN.md` → folder plan → `0.0 TIKTOK/gmvmax/gmvmax.md` if touching GMV logic.
