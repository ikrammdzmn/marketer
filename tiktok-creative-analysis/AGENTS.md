# AGENTS.md — marketer folder conventions

Static TikTok Creative analysis tool. Pure HTML/CSS/vanilla JS — **no npm, no build,
no framework**. Keep it that way.

## Files

- `index.html` — UI markup + CDN scripts (Tailwind Play `darkMode: 'class'`, SheetJS
  0.20.3, Chart.js 4.4.1). Anti-flash dark-mode script in `<head>`.
- `app.js` — all logic, single vanilla IIFE. No modules, no transpiling.
- `style.css` — extras only; layout via Tailwind classes.
- `data/accounts.json` — allowlist of managed TikTok accounts (array of
  `{name, username, accountId, note, active, live, topAffiliate, updatedAt}` objects;
  matching is exact on `name` only; username/accountId/note display-only,
  active/live/top shown as markers; updatedAt server-stamped, null until saved).
- `data/catalog.json` — user-authored friendly names: `{campaigns: {ID: {label, note}},
  products: {ID: {name, note, campaignId}}, archived: {campaigns: {...}, products: {...}}}`
  (deactivated entries live under `archived` — lookups check active first, then
  archived, so old files keep their names; `campaignId` on a product pins its
  campaign tie, otherwise the tie is derived per session from the loaded files'
  most-frequent campaign per product). Display-only — matching stays exact on raw
  file values; unnamed campaigns show `Unnamed campaign` and unnamed products
  `Unnamed product` (raw IDs only in hover tooltips + CSV ID columns), blank
  label/name falls back to raw file name. Served as static JSON (no saver endpoint).
- `data/targets.json` — SOP targets `{topN, minImpr, maxCPM}` (null = auto from
  file); edited in Manage accounts, saved via POST /api/targets.
- `server.py` — local-only server (stdlib, 127.0.0.1): static files + POST
  /api/accounts (validates ≤100 entries incl. accountId/active/live/topAffiliate,
  timestamped backup, LF) + GET /api/files (source-file listing as JSON for the
  bundled picker) + GET /api/version fingerprint. Never expose.
- `start-server.bat` — double-click launcher (python check, opens browser, runs
  server.py). No IDE / Live Server needed.
- `.gitignore` — keeps saver backups (`data/accounts.backup-*.json`) and
  `__pycache__/` out of git.
- `.gitattributes` — enforces LF text + `*.xlsx` binary (Windows `core.autocrlf`
  would otherwise flip JSON/JS to CRLF against the saver's LF).
- `source-file/*.xlsx` + one level of campaign subfolders (e.g.
  `himcoffee - [123]/file.xlsx`) — input data, read-only. Loose files and
  subfolder files list together in the picker (max 7); folder `name - [digits]`
  tags its files with that ID label-only (blank Campaign IDs inherit it for
  display/compare/CSV, rows never dropped; single-`[id]` loads pre-set the
  Campaign facet).
- `sample-data/` — 2 same-day exports for comparison: (1) full 9,202 rows, 60× `Dr. Samhan`; (2) filtered 118 rows, 117× `Dr. Samhan`.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `CHANGELOG.md` — release record, newest first. Add a line per release.
- `feature.md` — end-user guide (non-technical). Update it when UI behavior changes.
- `DEV_NOTES.md` — private handoff notes between sessions.

## Run / verify

```bash
python server.py            # recommended: static + accounts saver (localhost only)
# python -m http.server    # view-only fallback (Save disabled; use Download JSON)
# open http://localhost:8000  (file:// blocks bundled-file fetch via CORS)
```

After EVERY change: `node --check app.js` (+ `python -m py_compile server.py` if
touched) + HTTP smoke test (expect 200 for touched
files). Serve on a fresh port per test; always stop background servers.

## Rules

1. **Never hand-edit `source-file/*.xlsx`** or invent account names. The user's entries
   in `accounts.json` are authoritative (20 entries, user adds/reorders/saves
   mid-session — re-read before save-related work; test rows like `Sir Ching`
   appear; `Dr Samhan Official4` intentionally has 0 rows);
   the coverage-hints feature bridges near-misses (e.g. `DrSamhanOfficial4`).
    Matching is exact on `name` only — `username`/`accountId`/`note` are display-only
    (`active`/`live` shown as markers).
    `Product Card` is the user's authorised name for TikTok's true catalogue rows
    (blank account + Product-card type / no video / no campaign). `Unknown account`
    is the user-approved name for blank-account real videos (bulk file: 2,708 videos,
    RM6,988 revenue). Do not "fix" spellings unasked.
2. **Display changes stay on the webpage** unless export changes are requested.
3. **Data quirks**: source has no CPM column (derived: Cost ÷ Impr × 1000). 19-digit
   Post IDs exceed 2^53 — compare as Numbers (identical rounding both sides = exact
   match), but displayed IDs may differ in trailing digits. Only ~14/9,268 rows reach
   1000+ impressions. Sample-data finding: the 57-row `Dr. Samhan` gap between the 2
   same-day exports is dead inventory only — file (2) adds 57× `Ineligible / Not active`
   rows (0 impr, ~0 cost) missing from file (1); the 52 `Explored` rows match exactly.
   Full export stays safe for sales/performance. General-notes card on page says this
    in non-technical words. Blank TikTok accounts (`''`/`'0'`/`'-'`) normalise to
    `Product Card` only for true catalogue rows (Product-card type, no video, or no
    campaign); blank-account real videos become `Unknown account` with normal verdicts.
    Single-file blanks (no campaign column) stay `Product Card` as before.
    the `Exclude Product Card` tick (default off) filters them everywhere. The
    `Hide Ineligible` tick (default on, `fNoInel`) drops `Ineligible` rows everywhere
    incl. compare (status-movers stay; explicit Status=`Ineligible` bypasses it). The
    `Hide inactive` tick (default on, `fNoInactive`) drops rows of Active-unticked
    accounts everywhere incl. compare (`isInactiveAcc`; non-allowlisted never hidden).
   Insight engine (`insightOf`): verdicts from file-adaptive benchmarks
   (median CPM, top-20 min impressions, median 2s rate/AOV, p90 ROI, recomputed
   per ingest) — thresholds live in code, never hardcode file numbers. Guide
   (`renderInsightGuide`, same live numbers, collapsed) + chip popup
   (`openInsightModal` via `data-ins` join key) +    `?insight=Label` deep-link
   (once per load: expands guide, sets the `fInsight` verdict filter, scrolls to
   verdict). `fInsight` dropdown filters everything by base verdict (`insBase`
   collapses `Drops @%` → `Drops`).
   SOP bars (`topBar`/`cpmBar`): manual `targets.json` values win, else auto from
   top-N; source tagged `yours`/`auto` in UI text.
   Bulk product-campaigns dialect (`sample-data/creative data for product campaigns ... ~ ...xlsx`,
   31.5k rows): headers are `Video title/Video ID/Campaign name/Campaign ID/Product ID`
   (no ROI column — derived Revenue÷Cost), catalogue rows use `Video ID='N/A'` (join falls
   back to creative-text+account), filename uses `~`+hours for the period. `rowsOfWorkbook`
   normalises both dialects to one row shape (`campaign` blank for single-campaign files);
   never branch downstream code on dialect except the file-list badge. Compare join key is
   `keyOf(postId, account, creative)`. Trend view (`rebuildTrend`/`renderTrend`,
   same join key): one row per video, one column per file oldest→newest
   (`trendHead` short dates), metric switcher + total/latest/Δ sort, `–` for
   absent, long-format trend CSV, daily line chart above the table
   (`renderTrendChart`, top 10, gaps for absent), per-row SVG sparklines
   (`sparkline`, per-row scale, Shape column), solo popup on Shape click
   (`openTrendModal`/`closeTrendModal`, enlarged line + mini cards), Post ID
   column after Move with click-to-copy (`data-copy` delegation).
   Bundled picker (`bundlePick`) lists candidates with
   period + cached dialect badge, newest pre-ticked, max 7. Filename-only picker chips
   (`pickerMeta`): single date vs `from → to · N days`, product chip from `Product {ID}`
   (`prodOfName`), instant `bulk` badge from `product campaigns` in the name (`bulkOfName`). Product ID `'N/A'`
   displays as `Product Card - {campaign}` (friendly campaign label;
   `renderCatHint` skips it) — same rule in `prodName`, compare renderer + CSV.
4. **Editing**: copy exact strings from Read output for edit anchors, never retype.
   After each edit, grep the touched identifiers and re-read the region — CSS appends
   and plan.md lines have been clobbered before by overlapping matches.
   Bump `app.js?v=N` in index.html whenever app.js changes (no build step to hash it).
   Add a `CHANGELOG.md` line per release in the same session (counter keeps rising,
   never renumber).
5. **Replies**: short. Feasibility questions ("just answer, do not edit") get words
   only; code only on explicit "proceed/go/build".
6. **Local saver**: `server.py` binds 127.0.0.1 only, validates entries, keeps ≤10
   timestamped backups, writes LF. Never bind 0.0.0.0 / expose to LAN (no auth).
