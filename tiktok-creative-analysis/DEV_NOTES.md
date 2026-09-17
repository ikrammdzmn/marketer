# DEV_NOTES.md — handoff to next-window self

(DO NOT DELETE THIS PART)

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session

> Read this first. It carries the vibe, not just the facts.

## The headspace to sync into

Fast, terse, iterative loop with a non-technical Malay-speaking marketer (TikTok Shop
affiliate analysis for HIMCoffee / Dr Samhan products). Short bursts: "just answer, do
not edit the code" vs "ok proceed/go". That is the whole dynamic:

1. User asks **why / is-it-possible** (often + "just answer, do not edit the code") →
   words only: explain, give options, write NO code. They check feasibility first.
   (This env also has plan/build modes — same spirit: plan mode = words + plan only.)
2. User says **"ok proceed" / "ok go"** → implement immediately, verify
   (`node --check` + HTTP smoke test on a fresh port), tick `plan.md`, reply short.
3. User validates visually in the browser (`http://localhost:8000`), not by reading
   code. They test with real clicks and paste real screenshots of breakage.

Translation layer you must run constantly: their words ≠ data words. "No data" meant
"no orders" (rows existed). "Beg kuning" = yellow bag = TikTok product showcase.
"Black account" = blank account. Clarify and re-state before encoding anything into UI.
Their pasted account lists contain **invisible Unicode joiners** — always byte-verify
pasted names with `ascii()` before writing them into `accounts.json`.
They also test forms with keyboard-mash gibberish (e.g. `edrewrfwer` landed in
`accounts.json`) — always inspect the file for stray test rows before committing.

They refuse terminal/IDE flows: will not run Live Server correctly, will open a `.bat`
in the editor instead of double-clicking it. Guide them to File Explorer +
double-click / desktop shortcut. They keep old habits (Live Server on its own port was
the root cause of the whole saver saga). Expect to redirect twice.

## Current mood (this window)

Multi-file era. User asked "can the system handle multiple files, compare each video
by 2 source files" (feasibility first, then "ok go") — so the tool learned:
multi-slot loader (up to 7, drag-drop/multi-pick/bundled), baseline→latest Δ table
(NEW/LOST/KEPT), Combine-days sum mode, overlap guard. Then user revealed the bulk
GMV Max export (different headers + `~`-hours naming) living in sample-data — so we
built the header adapter, Campaign filter/column, bundled checkbox picker, and
`data/catalog.json` friendly-name mapping. Same terse loop throughout ("ok go",
"ok goo"), plan-mode detours respected (words-only, question tool, no code until
"ok go"). Ended on: user will fill catalog labels themselves — ALL labels ship
blank on purpose. They committed nothing this window; the pile is big (see below).

## ⏰ NEXT SESSION — remind the user

1. **Name things in `data/catalog.json`** — 4 campaign labels + 18 product names are
   blank. They said "ok i will update the naming". Raw IDs show until named; the
   amber `catHint` note counts what's left. Reload page (Ctrl+Shift+R) after saving.
2. **Commit decision pending** — large uncommitted pile (app.js, index.html, AGENTS,
   feature, plan, accounts.json, deleted sample-data (1).xlsx, untracked catalog.json
   + 5 new xlsx in source-file/sample-data). ONLY when asked.
3. Open offer: silence the cross-dialect "campaign moved" flag when one side is blank
   (every KEPT row in a mixed session flags `→ [campaign]` — noisy but true).

## Project snapshot

- Dir: `C:\Users\PC CUSTOM\Documents\github\marketer\tiktok-creative-analysis\`
  (serve / run / commit from HERE, never from `marketer/` root — wrong cwd breaks
  relative-path commands silently or loudly).
- GitHub: `https://github.com/ikrammdzmn/marketer.git`, branch `main`. HEAD is
  `df051d2` (tiktok-account plan). Creative-analysis code last committed in `e8c84d1`;
  **uncommitted pile**: `app.js`, `index.html`, `AGENTS.md`, `feature.md`, `plan.md`,
  `data/accounts.json` (modified), deleted `sample-data/...(1).xlsx`, untracked
  `data/catalog.json` + bulk xlsx in `sample-data/` + 4 new files in `source-file/`
  (5 daily 09-08→09-15 + bulk `00 ~ 05`). NEVER commit without being asked.
- Serving: `python server.py` (stdlib, 127.0.0.1, static + POST /api/accounts +
  POST /api/targets savers + GET /api/version fingerprint) or double-click
  `start-server.bat`. Plain `http.server` / Live Server / Pages = view-only.
- `accounts.json`: 10 × `{name, username, note}` (user added `Dr. Samhan` @dr.samhan
  themselves); 9 of 10 match xlsx; `Dr Samhan Official4` kept (0 rows). User edits
  this file directly too — re-read before work.
- `data/targets.json`: `{topN, minImpr, maxCPM}`, null = auto from file. Bench bars
  (`topBar`/`cpmBar`) manual-win-else-auto-top-N, tagged `yours`/`auto`. CPM bar =
  MEDIAN of top-N (user agreed: average twitches on outliers; median↔avg gap is
  itself a warning). fTopN switcher (10/15/20/25) is view-state that persists on
  next Manager Save — by design, single source in `state.targets`.
- SOP ground truth (09-07 file): top-20 min impr **574**, CPM band 8.21/med 22.16/
  max 51.55, **36** boost candidates (ROI≥3, spend<RM50). 3-day-stop rule NOT
  buildable: single snapshot per load, no longitudinal data — say so if asked.
- Insight engine (`insightOf`): priority Catalogue > Template > Review > Boost >
  Learning > Hook > Cliff > Basket > neutral. Spend-no-orders (Review) outranks
  Boost by design. View-rate ingest fields added (ctr, v2, v25–v100). Preview blob
  needs its OWN copy of any new CSS (it doesn't inherit style.css).
- `docs/privacy.html+terms.html` at repo root: NOT ours, don't touch.
- Backlog still parked: plan.md §6 (exploration exit signals).
- Source xlsx rotates weekly (`source-file/` now: 5 daily per-campaign 09-08→09-15 +
  bulk `creative data for product campaigns 2026-09-08 00 ~ 2026-09-15 05`, 31.5k rows;
  loader auto-picks newest by filename; period parser accepts bare ranges AND `~`+hours;
  BUNDLED_FILE fallback repointed at the current file (matters
  for GitHub Pages, which has no directory listing).
- TWO dialects, one row shape (`rowsOfWorkbook` normalises; never branch downstream
  except the file-list badge): single (Post ID/Creative/ROI, 118-row sample) vs bulk
  (Video title/Video ID/Campaign name+ID/Product ID, no ROI → derived Rev÷Cost;
  catalogue rows `Video ID='N/A'` join by creative-text+account). Join key is
  `keyOf(postId, account, creative)`. Verified: shared video gives identical key in
  both dialects. Bulk catalogue rows do NOT match single-file Product Cards (numeric
  vs TXT keys) — Exclude Product Card for clean mixed compares.
- Multi-file (max 7): `state.files[]` {label, period, rows, dialect}; main view =
  latest file (compare mode) or summed rows (combine mode); Δ table = oldest vs
  newest only (middle files listed, feed nothing — by design). `bundlePick` checkbox
  picker (newest pre-ticked, dialect badge cached after first read). `app.js?v=8`.
- `data/catalog.json`: user-authored {campaigns:{ID:{label,note}}, products:{ID:{name,note}}}
  (4 + 18 IDs from the 09-08 bulk file, ALL blank until user names them — prefilled
  guesses were reverted per rule 1). Display-only; filter values stay raw names.
- Blank accounts (`''`/`'0'`/`'-'`): true catalogue rows (Product-card type / no
  video / no campaign) normalise to user-named `Product Card`; blank-account real
  videos → user-approved `Unknown account` (bulk file hid 2,708 videos / RM6,988
  revenue under Product Card before the split). `Exclude Product Card` tick, default
  off. Single-file blanks (no campaign column) stay `Product Card` as before.
- User learnings (no build yet, parked in plan.md §6): boosting an inactive video
  re-enters Exploring (pool entry is repeatable); the export is pre-filtered to
  catalog-attached creatives, so no per-row yellow-bag flag exists.
- Derived metrics: CPM, AOV (no source columns). 19-digit Post IDs: Number-compare,
  display may blur trailing digits. Exploration-status audit findings live in
  AGENTS.md rule 3 + chat: mapping deterministic; Performing split is
  delivery-based; Outstanding is per-campaign relative (top Performing out-earned all
  10 Outstanding) — never present Outstanding as global top-10.
- Invariants: no npm/build (CDN Tailwind Play/SheetJS/Chart.js); `plan.md` ticked per
  change (user reads it); `feature.md` is the non-technical guide (kept current);
  display-only by default (exports change only when asked); bump `app.js?v=N` per JS
  change; `.gitattributes` enforces LF + xlsx binary (added: core.autocrlf fights LF).

## Bugs found & fixed (and the lesson from each)

Prior windows 1–10 live below (kept for continuity). This window:

11. **PowerShell strips `"` in inline scripts** — `node -e`/`python -c` with double
    quotes arrived mangled (silent!). _Lesson: Write temp scripts to
    `C:\Users\PCCUST~1\AppData\Local\Temp\opencode\` (short 8.3 path, no spaces),
    run, delete. Never fight inline quoting again._
12. **Start-Job inherits the wrong cwd** — background `http.server` served an empty
    dir → phantom 404s. _Lesson: pass `--directory` (or absolute script path)
    explicitly; fresh port per test; Stop/Remove-Job in `finally`._
13. **`sorted()` exhausts `itertools.groupby`** — all groups came back empty.
    _Lesson: materialise `[(s, list(g))]` before sorting/iterating twice._
14. **Python text-mode writes CRLF on Windows** — saver broke the repo LF invariant.
    _Lesson: `open(..., newline="\n")` whenever LF is mandated; then locked it with
    `.gitattributes` (`* text=auto eol=lf`, `*.xlsx binary` — verified `text: unset`
    on the real xlsx)._
15. **Stale cached `app.js` gaslit debugging** — user's error text matched OLD code.
    _Lesson: `app.js?v=N` bump per change (now AGENTS.md rule 4); treat "error text
    matches old code" as a cache diagnosis; tell user Ctrl+Shift+R._
16. **Blind `r.json()` on same-origin API calls** — 501 HTML / empty 4xx bodies
    produced jargon errors. _Lesson: parse via `text()` + per-cause messages, and
    fingerprint the server (GET /api/version) so the UI names its own backend._
17. **Destructive command in the wrong cwd** — `Remove-Item data/...` ran from
    `marketer/` root (failed loudly = lucky). _Lesson: set workdir to the subfolder
    for every file op; re-verify paths before anything destructive._
18. **Edit clobbered a lone declaration line** — oldString `function openMgr() {`
    replaced with helpers, orphaning its body (caught instantly by `node --check`).
    _Lesson: never anchor on a bare declaration; include body lines on both sides._
19. **Standalone preview blob missed new styles** — badges rendered unstyled until
    the `.sec` rules were duplicated into the inline preview CSS. _Lesson: the
    preview page is a separate document; every new visual language needs a copy
    there (add to the preview-CSS checklist)._
20. **eval-scoping in test harness** — `eval` inside a `forEach` callback hid the
    extracted functions. _Lesson: join sources, one top-level eval._
22. **HTML structural edit ate a div** — index.html edit dropped the bench-bar `<div>`
    opener (caught by re-reading the region). _Lesson: after structural edits always
    re-read the region; keep markup edits minimal and verify open/close balance._
23. **openpyxl `read_only=True` lies** — returned 1 col / truncated dims on both xlsx.
    _Lesson: use plain `load_workbook(data_only=True)` (never save), `read_only` is
    untrustworthy for inspection._
24. **Background-server flakiness on Win** — `Start-Job` + raw `http.server.test`
    one-liners refused connections. _Lesson: smoke via `server.py [freshport]` as a
    subprocess with explicit `cwd` + DEVNULL, `urllib` asserts, `terminate()` in
    `finally` (temp script in opencode dir, deleted after)._
25. **Single-vs-multi upload semantics tangled** — first fileInput handler had a
    confused replace/append branch. _Lesson: rule = replace only when slot list is
    empty, else append; state it in one line._
26. **Prefilled catalog labels = inventing names** — shipped "HIMCoffee Main"/"HIMCoffee"
    guesses, caught self on rule 1 and reverted to blanks. _Lesson: friendly-label
    files ALWAYS ship blank; the user names everything, fallbacks show raw values._
21. **Old session's bugs (1–10, preserved):**
    Min-ROI typo (re-read fresh code; `node --check` ≠ logic) · hand-typed oldString
    (copy from Read) · CSS clobbered twice (anchor EOF, re-read after) ·
    `misses.length` ReferenceError (grep touched identifiers) · plan.md line eaten
    (minimal oldString; user reads plan.md) · openpyxl read-only 1-column + cp1252
    emoji crash (`ascii()`, no `head` on Windows) · DEV_NOTES garble (re-read docs
    too) · parallel-shell race (sequential dependents) · deleted repo ate git
    identity (dump config before removal; repo-local identity) · `git mv` + re-verify
    from new dir.

## Standing patterns to preserve

- `node --check app.js` (+ `py_compile server.py` if touched) + HTTP smoke test
  (200s) after EVERY change; fresh port; stop servers; delete temp scripts.
- `plan.md` checkbox per feature, promptly. Commit + push ONLY when asked.
- Feasibility = words only; "proceed/go" = code. Short replies.
- User's spelling/entries authoritative; never invent account names; verify pasted
  names byte-for-byte.
- First question on any save complaint: "what does the probe status line say?"
  Second: "Ctrl+Shift+R, then tell me." Third: confirm `server.py` (not Live
  Server) owns port 8000. (Resolved: it was Live Server + stale cache;
  user confirmed Save works. `app.js?v=8` current.)
- New visual? Update THREE places: `style.css` + preview inline CSS + `feature.md`.
  New filter? FOUR: input markup + listener list + `filtered()` + `filterContext()`.
- New table column? SIX: thead + empty-note colspan + row renderer (+modal renderer) +
  CSV + preview cols/widths/body (+compare table + compare CSV if applicable).
- New file dialect? Normalise in `rowsOfWorkbook` to the one row shape; downstream
  code must not branch on dialect. New ID mapping file? Ship IDs with blank labels
  (rule 1), display-only, filter values stay raw.
- Function-level tests: extract real functions from app.js source (brace-balance),
  eval with stubs (`num`/`int`/fake `XLSX`), assert — tests the shipped code, not a
  re-implementation. Real-file checks: dump xlsx → JSON via openpyxl (plain load,
  never save), feed samples through the real `rowsOfWorkbook`.
