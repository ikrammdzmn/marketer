# AGENTS.md — marketer folder conventions

Static TikTok Creative analysis tool. Pure HTML/CSS/vanilla JS — **no npm, no build,
no framework**. Keep it that way.

## Files

- `index.html` — UI markup + CDN scripts (Tailwind Play `darkMode: 'class'`, SheetJS
  0.20.3, Chart.js 4.4.1). Anti-flash dark-mode script in `<head>`.
- `app.js` — all logic, single vanilla IIFE. No modules, no transpiling.
- `style.css` — extras only; layout via Tailwind classes.
- `data/accounts.json` — allowlist of 9 managed TikTok accounts (simple string array).
- `source-file/*.xlsx` — input data (9,217 rows × 24 cols). Read-only.
- `sample-data/` — 2 same-day exports for comparison: (1) full 9,202 rows, 60× `Dr. Samhan`; (2) filtered 118 rows, 117× `Dr. Samhan`.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `feature.md` — end-user guide (non-technical). Update it when UI behavior changes.
- `DEV_NOTES.md` — private handoff notes between sessions.

## Run / verify

```bash
python -m http.server
# open http://localhost:8000  (file:// blocks bundled-file fetch via CORS)
```

After EVERY change: `node --check app.js` + HTTP smoke test (expect 200 for touched
files). Serve on a fresh port per test; always stop background servers.

## Rules

1. **Never hand-edit `source-file/*.xlsx`** or invent account names. The user's spelling
   in `accounts.json` is authoritative — 5 of 9 entries intentionally don't match the
   xlsx (spacing/typo); the coverage-hints feature bridges the gap. Do not "fix" them
   unasked.
2. **Display changes stay on the webpage** unless export changes are requested.
3. **Data quirks**: source has no CPM column (derived: Cost ÷ Impr × 1000). 19-digit
   Post IDs exceed 2^53 — compare as Numbers (identical rounding both sides = exact
   match), but displayed IDs may differ in trailing digits. Only ~14/9,217 rows reach
   1000+ impressions. Sample-data finding: the 57-row `Dr. Samhan` gap between the 2
   same-day exports is dead inventory only — file (2) adds 57× `Ineligible / Not active`
   rows (0 impr, ~0 cost) missing from file (1); the 52 `Explored` rows match exactly.
   Full export stays safe for sales/performance. General-notes card on page says this
   in non-technical words.
4. **Editing**: copy exact strings from Read output for edit anchors, never retype.
   After each edit, grep the touched identifiers and re-read the region — CSS appends
   and plan.md lines have been clobbered before by overlapping matches.
5. **Replies**: short. Feasibility questions ("just answer, do not edit") get words
   only; code only on explicit "proceed/go/build".
