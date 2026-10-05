# AGENTS.md — tiktok-event folder conventions

HIMCOFFEE RACI MASTER (Operational Planning & Strategy Board).
Pure HTML/CSS/vanilla JS — **no npm, no build, no framework**. Keep it that way.
(Option A, chosen 2026-09-17. The `.tsx` + Firebase variant is reference only.)

## Files

- `index.html` — the app. Single vanilla IIFE + Tailwind Play CDN + Inter font.
  No modules, no transpiling. localStorage only, works from `python -m http.server`
  (and mostly from `file://` too — no fetches to block).
- `raci_campaign_dashboard.tsx` — original React + Firebase reference (1205 lines).
  FROZEN as spec source: 12-task template, 5T/3M defaults, 2026 campaign calendar.
  Do NOT try to run it here (needs build + `__firebase_config`/`__app_id` globals).
- `tiktok-prd` — PRD v1.0.0 (Julai 2026), plain text, no extension. Source of truth
  for feature scope (Timeline, Worksheet, 5T/3M, workload, CSV, PIN seats).
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `feature.md` — end-user guide (non-technical, Malay+English). Update it when UI changes.
- `DEV_NOTES.md` — private handoff notes between sessions (vibe + bugs + learnings).

## Runtime / storage (local-only by design)

- Keys: `him_event_data_v1` (years 2026–2030 → months → campaigns),
  `him_event_pin_v1` (`{pin, editors[]}` max 10, **this browser only**),
  `him_event_uid_v1` (per-browser editor identity), `him_event_ui_v1` (tab/year/month/sel/filters).
- Seed: 2026 calendar (~40 campaigns) + fresh `stdTemplate()` per campaign +
  `BLUEPRINT` 5T/3M defaults. 2027–2030 seed empty. Reset restores this exact seed.
- No backend, no sync, no secrets. PIN is a local courtesy lock, NOT real security —
  never claim otherwise to the user.

## Run / verify

```bash
# from repo root:
python -m http.server 8931
# open http://127.0.0.1:8931/tiktok-event/index.html
```

After EVERY change: parse-check the HTML + `node --check` the extracted inline
`<script>` (write to temp file first, never invent a `.js` in the folder) + HTTP
smoke test (expect 200). Serve on a fresh port per test; always stop background jobs
(`Get-Job | Stop-Job; Get-Job | Remove-Job`). This shell is **Windows PowerShell 5.1**:
use `Start-Job -ScriptBlock { … }`, never `&` (reserved, parse error).

## Rules

1. **Seed data is verbatim from the `.tsx`.** 12 task descriptions, PIC names
   (`Hafizie, Dr Samhan, Rafhanah, Shahirah, Ikram, Zaim, Live Team, ENA, COO`),
   5T/3M defaults (`RM 100,000 Sales / 5,000 Units Sold…`), campaign titles/dates/types.
   Never "fix" spellings or rename PICs unasked. Deep-clone on insert/reset —
   never share template object references across campaigns (mutation leak).
2. **R/A only, by scope.** The board is called RACI but implements Responsible +
   Accountable only (matches PRD schema). Do not add C/I columns unasked.
3. **Data quirks:** `dueDate` is free text (`"-"` = TBD display). No date parsing,
   no overdue engine — do not pretend otherwise. Workload splits `R` on `\n` or `/`
   and trims; names containing `/` will split (accepted, documented in UI tip).
   IDs are `uid()` (time36+rand); legacy seeds keep `jan-1`-style ids. CSV uses
   `csvEsc` (double quotes, wrap in quotes) — never concatenate raw commas.
4. **Display changes stay on the page** unless export changes are requested.
   CSV exports: active-campaign (`⬇`) and full-month (`Month`). Keep both.
5. **Editing:** copy exact strings from Read output for anchors, never retype.
   After each edit, re-read the region. Keep the file dependency-free (CDN only:
   Tailwind + Google Fonts). No version query strings needed (single file).
6. **Replies:** short. Feasibility questions ("just answer, do not edit") get words
   only; code only on explicit "proceed/go/build". Plan mode = words + plan only.
7. **Git:** commit/push only when asked. `tiktok-event/` is currently untracked —
   do not stage it unasked.
