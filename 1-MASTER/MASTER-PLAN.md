# MASTER-PLAN — marketer repo overview

> Read this first in any new session. Then read the folder plan for where you will work.
> Detailed GMV auto plan lives in `gmvmax-auto/masterplan.md` (not duplicated here).

## 1. Repo map (what lives where)
- `tiktok-creative-analysis/` — Static creative analytics (single + bulk product-campaigns dialects, multi-file compare ≤7, insight engine + SOP bars). Pure HTML/CSS/vanilla JS, no build. Authoritative `data/accounts.json` (10 × {name,username,note}, exact-match on name); `data/catalog.json` (4 campaigns + 18 products, labels blank until user names); `data/targets.json` (SOP topN/minImpr/maxCPM, null = auto). Local `server.py` (127.0.0.1) + `start-server.bat`; loader auto-picks newest `source-file/*.xlsx`. Statuses in its `plan.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `tiktok-account/` — Display API dashboard (own videos + post times). Python stdlib + Tailwind, localhost 8080. `tester.py` FROZEN. Statuses in its `plan.md`. Agent note: `NEON_NOTE.md`.
- `tiktok-strategy/` — Himwellness Growth OS playbook (`himwellness-playbook.html` + `full-strategy.md`). Business guardrails live here: ROI ≥7.0, CPA ≤RM21.18, 1 campaign/SKU, TTAM feeder role, dayparting windows, payday surge. Offline, localStorage.
- `tiktok-event/` — HIMCOFFEE RACI MASTER (`index.html`, vanilla single-file, local-only, no build). Timeline 2026–2030 + RACI Worksheet + 5T/3M Blueprint + workload + CSV + local PIN seats. Reference: `raci_campaign_dashboard.tsx` (React+Firebase, FROZEN) + `tiktok-prd` (PRD v1.0.0). Statuses in its `plan.md`; user guide `feature.md`; handoff `DEV_NOTES.md`.
- `gmvmax/` — Knowledge only: `gmvmax.md` (algo realities) + `product/*.xlsx`. No code goes here.
- `gmvmax-auto/` — NEW: auto budget-adjust service (plan locked, P0 not started). See `masterplan.md`. Future code: auth/collector/decider/actor/notify/dashboard + migrations.
- `docs/` — `terms.html` + `privacy.html` (GitHub Pages, TikTok app review). `tiktok*.txt` at root = domain verification. Never move/rename without updating TikTok app form.
- `antigravity-aistudio.md` — IDE transfer guide, not product code.

## 2. Current status (2026-09-17)
- `tiktok-account` dashboard ready local-only; 10 accounts not all linked; Production app unapproved (sandbox proven).
- `tiktok-creative-analysis` DONE local-only (UI + accounts/targets savers verified over HTTP), committed in `3ee528a`. Pending user: name `data/catalog.json` labels (all blank — raw IDs show till named). Backlog: exploration exit signals (`plan.md` §6). Open offer: silence cross-dialect "campaign moved" flag when one side is blank.
- `tiktok-strategy` playbook content complete (static).
- `tiktok-event` DONE local-only (Option A `index.html` + docs verified over HTTP, 2026-09-17). Untracked; commit only when asked. Backlog: structured due-dates, C/I columns, shared Firebase seats, mobile cards.
- `gmvmax-auto` plan only: `masterplan.md` + `NEON_NOTE.md` staged, not committed (see `git status`). P0 explicitly NOT started.
- Git: branch `main`, staged = `antigravity-aistudio.md`, `gmvmax-auto/masterplan.md`, `tiktok-account/NEON_NOTE.md`, one verification txt deleted. Commit only when asked.

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
- New-session handoff order: `BIGMASTERPLAN.md` → folder plan → `gmvmax/gmvmax.md` if touching GMV logic.
