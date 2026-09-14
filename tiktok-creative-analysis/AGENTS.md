# AGENTS.md — marketer folder conventions

Static TikTok Creative analysis tool. Pure HTML/CSS/vanilla JS — **no npm, no build,
no framework**. Keep it that way.

## Files

- `index.html` — UI markup + CDN scripts (Tailwind Play `darkMode: 'class'`, SheetJS
  0.20.3, Chart.js 4.4.1). Anti-flash dark-mode script in `<head>`.
- `app.js` — all logic, single vanilla IIFE. No modules, no transpiling.
- `style.css` — extras only; layout via Tailwind classes.
- `data/accounts.json` — allowlist of 10 managed TikTok accounts (array of
  `{name, username, note}` objects; matching is exact on `name` only).
- `data/targets.json` — SOP targets `{topN, minImpr, maxCPM}` (null = auto from
  file); edited in Manage accounts, saved via POST /api/targets.
- `server.py` — local-only server (stdlib, 127.0.0.1): static files + POST
  /api/accounts (validates ≤100 entries, timestamped backup, LF). Never expose.
- `start-server.bat` — double-click launcher (python check, opens browser, runs
  server.py). No IDE / Live Server needed.
- `.gitignore` — keeps saver backups (`data/accounts.backup-*.json`) and
  `__pycache__/` out of git.
- `.gitattributes` — enforces LF text + `*.xlsx` binary (Windows `core.autocrlf`
  would otherwise flip JSON/JS to CRLF against the saver's LF).
- `source-file/*.xlsx` — input data (≈9.2k rows × 24 cols; TikTok swaps it weekly,
  loader auto-picks the newest). Read-only.
- `sample-data/` — 2 same-day exports for comparison: (1) full 9,202 rows, 60× `Dr. Samhan`; (2) filtered 118 rows, 117× `Dr. Samhan`.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
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
   in `accounts.json` are authoritative — 9 of 10 match the xlsx exactly;
   `Dr Samhan Official4` intentionally has 0 rows (kept, with username);
   the coverage-hints feature bridges near-misses (e.g. `DrSamhanOfficial4`).
   Matching is exact on `name` only — `username`/`note` are display-only.
   `Product Card` is the user's authorised name for TikTok's blank-account
   catalogue-promo rows. Do not "fix" spellings unasked.
2. **Display changes stay on the webpage** unless export changes are requested.
3. **Data quirks**: source has no CPM column (derived: Cost ÷ Impr × 1000). 19-digit
   Post IDs exceed 2^53 — compare as Numbers (identical rounding both sides = exact
   match), but displayed IDs may differ in trailing digits. Only ~14/9,268 rows reach
   1000+ impressions. Sample-data finding: the 57-row `Dr. Samhan` gap between the 2
   same-day exports is dead inventory only — file (2) adds 57× `Ineligible / Not active`
   rows (0 impr, ~0 cost) missing from file (1); the 52 `Explored` rows match exactly.
   Full export stays safe for sales/performance. General-notes card on page says this
   in non-technical words. Blank TikTok accounts (`''`/`'0'`/`'-'`) normalise to
   `Product Card` (default catalogue promo, ~29% of revenue in the 09-07 file);
   the `Exclude Product Card` tick (default off) filters them everywhere.
   Insight engine (`insightOf`): verdicts from file-adaptive benchmarks
   (median CPM, top-20 min impressions, median 2s rate/AOV, p90 ROI, recomputed
   per ingest) — thresholds live in code, never hardcode file numbers.
   SOP bars (`topBar`/`cpmBar`): manual `targets.json` values win, else auto from
   top-N; source tagged `yours`/`auto` in UI text.
4. **Editing**: copy exact strings from Read output for edit anchors, never retype.
   After each edit, grep the touched identifiers and re-read the region — CSS appends
   and plan.md lines have been clobbered before by overlapping matches.
   Bump `app.js?v=N` in index.html whenever app.js changes (no build step to hash it).
5. **Replies**: short. Feasibility questions ("just answer, do not edit") get words
   only; code only on explicit "proceed/go/build".
6. **Local saver**: `server.py` binds 127.0.0.1 only, validates entries, keeps ≤10
   timestamped backups, writes LF. Never bind 0.0.0.0 / expose to LAN (no auth).
