# Changelog — marketer repo (master rollup)

Repo-wide release record, newest first, in plain words. One line per shipped
release per folder — detail lives in each folder's own changelog/plan (linked).
Rule: whoever ships a folder release adds one line here the same session.

## 24 Sep 2026

- `tiktok-creative-analysis` v48: status-by-day counts all 10 TikTok stages — the
  7 beyond the headline 5 (Underperforming, Calculating, Rejected, Authorization
  needed, Unavailable, Excluded, Not active) sit struck-through in the chart
  legend; click reveals the line + its own KPI card (second card row, hidden
  until used), reload resets, their deltas invert (rise = red)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v49: file cap 7 → 31 (full month of dailies) via one
  `MAX_FILES` constant driving all five gates + live button labels
  → `tiktok-creative-analysis/CHANGELOG.md`
- session ritual: folder `DEV_NOTES.md` handoff (mood + vibe + honest bug log +
  lessons 37–39), `feature.md` user showcase block, folder `AGENTS.md`
  single-constant-caps rule

## 23 Sep 2026

- `tiktok-account/sync` v19 (committed `2663c7a`): pull progress lines,
  graceful abort (exit 130), RESORT_NEWEST_FIRST backfill fix, Video-ID-first
  cols (`MIGRATED_C_D`), Creative-age custom col (`MIGRATED_INSERT_C`),
  col-A boolean rule; entry/MCP hardening (`opencode.json` absolute uv,
  `run-sync.ps1` upward probe, `exit-entry.md` clone guard)
  -> `tiktok-account/sync/CHANGELOG.md` + `tiktok-account/sync/DEV_NOTES.md`
- `tiktok-account` dashboard: picker shows `active` from accounts.json
  (grey `inactive` tag + dimmed rows; uncommitted working tree)
  -> `tiktok-account/CHANGELOG.md`
- root docs born: `DEV_NOTES.md` (session handoff) + `feature.md` (plain-words
  showcase); `otherdevice.md` Sec 4 token-copy path; `exit-entry.md` portable-MCP
  checklist; `accounts.json` reordered by owner (21 entries / 15 active)
- review track: stay-on-Sandbox evaluated (slots 10/10, dummy clean locally),
  Production cutover plan + demo-video staged, decision open; all 10 tokens
  linked (sandbox)

## 22 Sep 2026

- `tiktok-creative-analysis` v43–v47: exploration-status arc — canonical glossary
  (`gmvmax/product/exploration-status.md`, NEW) + clickable 2nd-status pills +
  Exploration guide (v43), status-by-day KPIs + 5-line chart, ranges count as one
  column (v44), green/red vs-prev deltas + rich hover (v45), all-lines Trend hover
  + solo popup moves (v46), dot-only Trend hover declutter (v47)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `gmvmax/product/exploration-status.md` born (NEW): TikTok stages incl. user's
  `Available` exclusion rule (9,553 − 5,768 = 3,785 verified); `gmvmax.md` §3 points at it

## 21 Sep 2026

- `gmvmax-auto` P0 live prod read-only: Business app APPROVED + prod OAuth (`prod_auth.py`) + report params locked (store_ids, cost/orders/gross_revenue/roi) + net ROI lock (fee 25%) + 30m scheduler task + manual unlagged 5-campaign view (`live_view.py`, 1 LIVE ROI 14.3 + 4 Product) + secrets split PRODUCT/LIVE → `gmvmax-auto/CHANGELOG.md` (checkpoints 1-4 in `gmvmax-auto/DEV_NOTES.md`)

## 20 Sep 2026

- `tiktok-account` dashboard liveliness (committed `4f9a792`): `/refresh?stream=1`
  NDJSON progress + centered popup (Hide keeps running), `fetched_at`
  last-pull stamps (profile + count + popup), `#`-first CSV export
  → `tiktok-account/CHANGELOG.md`
- `tiktok-account/sync/` born (new, untracked): daily TikTok→Sheets bridge —
  7-day upsert by Video ID into 11 sheets (Dashboard + 10 tabs), A-B user
  customs + checkboxes, deltas, jump links, colors, window presets
  (today/yesterday/since-until/full), `run-sync.ps1` launcher; first
  `--all --days 7` 10/10 live (242 videos); secrets gitignored (lengths-only)
  → `tiktok-account/sync/CHANGELOG.md` + `tiktok-account/sync/DEV_NOTES.md`

- `tools/` Sheets MCP GREEN: org-policy lift (both key-creation constraints)
  + Sheets/Drive APIs on + `GOOGLE_SHEETS_CRED` SET; scratch read/write GREEN
  on shared `mcp-scratch`; push confirmed `70f1700`; Workspace SA-create 403
  → human-creates flow; 5 more bugs fixed → `../tools/CHANGELOG.md` + `../tools/DEV_NOTES.md`

- `gmvmax-auto` approval wait = non-issue + secret hygiene: pending approval marked expected, P0 holds file-first; Neon passwords rotated, `GMV_ENC_KEY` regenerated, EXAMPLE sanitized → `gmvmax-auto/CHANGELOG.md`
- `tiktok-creative-analysis` v42: Manage accounts CSV export (same rows for
  Excel incl. Last updated stamp) + header labels the Last updated column
  → `tiktok-creative-analysis/CHANGELOG.md`

## 19 Sep 2026

- `tools/` Sheets MCP wired (sibling, outside git): `spreadsheet-mcp` cloned,
  `uv` 0.12.17 + `uv sync` OK; `marketer/opencode.json` (secret-free) +
  Antigravity `mcp_config.json` (was 0 bytes) written; key pending, scratch
  read/write test pending; 6 wiring bugs fixed (uv PATH, cp1252 emoji,
  env-var name, git-stderr, IDE config split, empty mcp_config)
  → `../tools/CHANGELOG.md` + `../tools/DEV_NOTES.md`
- `tools/` repo live (private `ikrammdzmn/tools`, `main`): `3a27f20` init
  (docs + bootstrap, clone ignored) + `70f1700` closeout/handoff; next Sheets
  work roots in that repo; key + scratch test still open

- `gmvmax-auto` P0 skeleton + Neon GREEN, apps in flight: collector stub + 8082
  dashboard verified offline-first; `TIKTOK DATA` SG `production` + persistent `dev`,
  `001–004` applied (`acct`=2, `gmv`=7 both); public-schema + reserved-`window` bugs
  fixed (`win`); Business API `TIKTOK GMV MAX` pending approval, Shop Custom app created;
  `DEV_NOTES.md` + `feature.md` + folder changelog → `gmvmax-auto/CHANGELOG.md`

- `tiktok-account`: scale-hardening + linking safety — 429 throttle/retry fix,
  range Refresh + fetch-limit box (merged cache), Unlink button, calendar hover
  preview + Clear + single-click day, MYT-datetime Posted column, lazy title
  thumbnails, wider page, link-mismatch guard (warn-with-override, amber pill),
  clean video links (tracking stripped);
  `feature.md` rewritten as user showcase → `tiktok-account/CHANGELOG.md`

- `tiktok-creative-analysis` v9–v14: Hide Ineligible tick, insight guide + chip
  popup + `?insight` link, N/A → `Product Card - campaign`, Unknown-account split,
  Insight verdict filter, picker filename chips → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v15: account ID + Active/Live ticks (saver preserves;
  🔴 LIVE / ⏸ inactive markers + ID in popup) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v16: manager row numbers + drag-to-reorder (Save keeps
  the shown order) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v17: Top affiliate tick (⭐ TOP AFFILIATE marker)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v18: T-Aff rename + Internal Account / Top Affiliate
  dropdown sections → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v19: Manager section headers (live grouping, tick/drag
  moves rows) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v20: per-account last-updated stamp (saver stamps
  changed rows only) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v21: Inactive manager section (live moves, dormant
  tops keep T-Aff) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v22: Hide inactive tick (Active-unticked rows leave
  every number) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v23: source-file subfolders + folder `[id]` labels
  (blank Campaign IDs inherit it, rows never dropped) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v24: bundled fallback repointed at existing subfolder
  file → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v25: bundled picker via `/api/files` (+HTML fallback,
  explicit Live Server warning) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v26: picker grouped by folder (collapsible, folder
  tick, live count, empty folders greyed) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v27: product–campaign tie + no bare IDs (`Unnamed
  campaign/product` placeholders) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v28: archived catalog section (old files keep names)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v29: catalog hint tooltip lists the unnamed IDs
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v30: himcoffee folder retagged to campaign ID
  (verified from bulk export) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v31: blank Product IDs inherit `Product {ID}` from
  filename → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v32: Trend per creative (day-by-day columns + long
  CSV) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v33: newest-by-date (not alphabetical) pre-tick +
  single load → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v34: Trend daily line chart (top 10, gaps for
  absent) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v35: per-row Shape sparklines (per-row scale)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v36: Trend solo popup (enlarged chart + Total /
  Latest / Δ / Days cards) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v37: Post ID column in Trend (click-to-copy)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v38: click-to-copy Post ID extended to Top +
  Compare (+hover hint; full recheck) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v39: Trend chart legend shows `Post ID · account`
  (hover keeps creative title) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v40: ROI / CPM / AOV trend metrics (ratio totals
  from sums, never summed ratios) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-creative-analysis` v41: auto-pick Combine for dated non-overlapping
  files (manual flip wins; status announces) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-event` built (new folder, untracked): HIMCOFFEE RACI board, Option A
  vanilla single-file local-only — Timeline + Worksheet + 5T/3M + RACI + PIN seats
  + CSV, verified + docs → `tiktok-event/plan.md`

## 15 Sep 2026

- `tiktok-creative-analysis` v8: multi-file compare (≤7), bulk product-campaigns
  dialect, `data/catalog.json` friendly names, bundled picker (committed `3ee528a`)
  → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-account`: dashboard ready local-only (Display API video list + post times,
  per-account OAuth, silent refresh, CSV export; sandbox proven, 10 accounts not
  all linked; Production unapproved) + `NEON_NOTE.md`, setup/otherdevice guides
  (committed `3ee528a`) → `tiktok-account/plan.md`
- `gmvmax-auto`: plan locked (`masterplan.md` committed `1d9854e`); P0 not started
  → `gmvmax-auto/masterplan.md`

## 14 Sep 2026 and earlier (grouped)

- `tiktok-creative-analysis` v0–v7: initial tool through SOP bars (uploader, KPIs,
  saver + manager, preview, insight engine) → `tiktok-creative-analysis/CHANGELOG.md`
- `tiktok-account`: tester.py (FROZEN) sandbox-proven, Terms/Privacy pages + domain
  verification via GitHub Pages for TikTok app review → `tiktok-account/plan.md`
- `tiktok-strategy`: Himwellness Growth OS playbook content complete (static;
  ROI ≥7.0, CPA ≤RM21.18 guardrails live here)
- `gmvmax/`: knowledge only (`gmvmax.md` + product xlsx) — no code, no releases
- `docs/`: `terms.html` + `privacy.html` (TikTok app review) — frozen unless the
  app form changes
