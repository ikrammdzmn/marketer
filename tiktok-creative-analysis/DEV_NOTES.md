# DEV_NOTES.md — handoff to next-window self

(DO NOT DELETE THIS PART)

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

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

## Current mood — 19 Sep late window (v38→v41, this session)

The terse loop matured into real trust. User now alternates between three gears:
(a) bug-with-screenshot ("Post ID can't copy in Top creatives", "why are KEPT rows
grey?"), (b) feasibility-first ("can we add ROI/CPM?", "auto-select Combine?" —
always "just answer, do not edit", then "ok build"), (c) meta questions
("is this usable by non-builders?", this wrap-up ritual). Replies stayed short
throughout; every build verified (`node --check` + fresh-port smoke) and announced
with the `app.js?v=N` to hard-refresh. Energy: end-of-day, get-it-landed, no
experiments — user validates visually in the browser with the 7 himcoffee dailies
(09-13→09-19) loaded, pastes screenshots of anything odd. Sync cue for next self:
lead with the one-line verdict, keep code talk out unless they say go, and never
ask them to touch terminal/JSON — offer, don't assign.

## ⏰ NEXT SESSION — remind the user

1. **Hard refresh for v41** (Ctrl+Shift+R) — `app.js?v=41` current. Auto-Combine is
   new behaviour: if they load overlapping files and totals look doubled, check
   the mode switch first (auto only fires on file-set change; their manual flip wins).
2. **Commit decision still pending — ONLY when asked.** Pile keeps growing:
   `app.js`, `index.html`, `style.css`, `AGENTS.md`, `feature.md`, `plan.md`,
   `CHANGELOG.md`, `DEV_NOTES.md` (this file), `data/catalog.json` (worktree shows
   edits — re-read before any naming work; user may have started naming), plus
   other windows' edits in `1-MASTER/*`, root `AGENTS.md`, `gmvmax-auto/` docs.
   HEAD is `1d6c81d`. Never commit secrets; never push unasked.
3. **Catalog naming** — user said they'd name things themselves. Amber `catHint`
   counts what's left; reload after saving.
4. Open offers (parked, don't nag): silence cross-dialect "campaign moved" flag when
   one side is blank; Post ID column in the account popup (user knows it has none);
   adjustable RM1 noise threshold.

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
- `accounts.json`: 20 entries × `{name, username, accountId, note, active, live,
  topAffiliate, updatedAt}` (exact-match on name; user adds/reorders mid-session —
  re-read before save-related work). `Dr Samhan Official4` kept (0 rows).
- `data/catalog.json`: worktree shows edits (user may have started naming) —
  re-read before naming work. Amber `catHint` counts what's left.
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
- Source xlsx (verified 19 Sep late): `source-file/1. himcoffee - [1858977225474178]/`
  7× daily 09-13→09-19 (Product 1729556489100298210) + `source-file/BULK DATA/`
  (5 dailies 09-07→09-15 + 09-08→09-15 range pair + bulk `00 ~ 05`); loader
  auto-picks newest by end-date; period parser accepts bare ranges AND `~`+hours;
  BUNDLED_FILE fallback carries its folder path (matters for Pages, no listing).
- TWO dialects, one row shape (`rowsOfWorkbook` normalises; never branch downstream
  except the file-list badge): single (Post ID/Creative/ROI, 118-row sample) vs bulk
  (Video title/Video ID/Campaign name+ID/Product ID, no ROI → derived Rev÷Cost;
  catalogue rows `Video ID='N/A'` join by creative-text+account). Join key is
  `keyOf(postId, account, creative)`. Verified: shared video gives identical key in
  both dialects. Bulk catalogue rows do NOT match single-file Product Cards (numeric
  vs TXT keys) — Exclude Product Card for clean mixed compares.
- Multi-file (max 7): `state.files[]` {label, period, rows, dialect}; main view =
  latest file (compare mode) or summed rows (combine mode); mode AUTO-PICKS on
  file-set change (`autoPickMode`: dated + disjoint ⇒ combine, else diff; manual
  radio wins until set changes; switch announced on status line via `state.modeMsg`).
  Δ table = oldest vs newest only (middle files listed, feed nothing — by design).
  `bundlePick` checkbox picker (newest pre-ticked, dialect badge cached after first
  read). `app.js?v=41`.
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
21. **HTML structural edit ate a div** — index.html edit dropped the bench-bar `<div>`
    opener (caught by re-reading the region). _Lesson: after structural edits always
    re-read the region; keep markup edits minimal and verify open/close balance._
22. **openpyxl `read_only=True` lies** — returned 1 col / truncated dims on both xlsx.
    _Lesson: use plain `load_workbook(data_only=True)` (never save), `read_only` is
    untrustworthy for inspection._
23. **Background-server flakiness on Win** — `Start-Job` + raw `http.server.test`
    one-liners refused connections. _Lesson: smoke via `server.py [freshport]` as a
    subprocess with explicit `cwd` + DEVNULL, `urllib` asserts, `terminate()` in
    `finally` (temp script in opencode dir, deleted after)._
24. **Single-vs-multi upload semantics tangled** — first fileInput handler had a
    confused replace/append branch. _Lesson: rule = replace only when slot list is
    empty, else append; state it in one line._
25. **Prefilled catalog labels = inventing names** — shipped "HIMCoffee Main"/"HIMCoffee"
    guesses, caught self on rule 1 and reverted to blanks. _Lesson: friendly-label
    files ALWAYS ship blank; the user names everything, fallbacks show raw values._
26. **Old session's bugs (1–10, preserved):**
    Min-ROI typo (re-read fresh code; `node --check` ≠ logic) · hand-typed oldString
    (copy from Read) · CSS clobbered twice (anchor EOF, re-read after) ·
    `misses.length` ReferenceError (grep touched identifiers) · plan.md line eaten
    (minimal oldString; user reads plan.md) · openpyxl read-only 1-column + cp1252
    emoji crash (`ascii()`, no `head` on Windows) · DEV_NOTES garble (re-read docs
    too) · parallel-shell race (sequential dependents) · deleted repo ate git
    identity (dump config before removal; repo-local identity) · `git mv` + re-verify
    from new dir.
27. **Click-to-copy shipped in ONE renderer only (v38 bug)** — v37 added `data-copy`
    to the Trend Post ID cell; Top (`renderTop`) and Compare (`renderCompare`) kept
    plain `<td class="mono">`, user screenshot-reported "can't copy". _Lesson: a new
    cell affordance MUST hit every sibling renderer the same session — `renderTop`,
    `renderCompare`, `renderTrend`, account modal, preview blob. After any affordance
    edit, grep the hook (e.g. `data-copy`) and confirm every table lights up. Now a
    standing checklist line (see below)._
28. **PowerShell ate `$vars` in `node -e`** — a `node -e "...$get_roi..."` one-liner
    arrived as `= ...` garbage (double-quoted args interpolate `$`). _Lesson:
    extends #11 — NEVER inline JS with `$` or nested quotes via PowerShell; Write a
    temp `.js` to the opencode temp dir, run, delete._
29. **User read latest-file KPIs as 7-day totals (UX gap, not code bug)** — 7 dailies
    loaded in diff mode, pasted Search for one Post ID showed Rows=1 (19 Sep only),
    asked "why". _Lesson: when a mode switch changes what headline numbers MEAN,
    auto-pick the least-surprising mode and ANNOUNCE it on the status line (→ v41
    `autoPickMode`: dated+disjoint ⇒ combine, else diff; manual flip wins until the
    file set changes; dateless files can never prove non-overlap ⇒ diff)._
30. **No-op ternary hid unfinished intent** — `rangesOverlap() ? 'compare' :
    'compare'` sat in `addFile` (both arms identical). _Lesson: identical ternary
    arms = unfinished thought; flag on sight, resolve or delete._

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
- New cell affordance (copy/tooltip/cursor)? ALL sibling renderers the same session
  (`renderTop`/`renderCompare`/`renderTrend`/modal/preview) — grep the hook after.
- New file dialect? Normalise in `rowsOfWorkbook` to the one row shape; downstream
  code must not branch on dialect. New ID mapping file? Ship IDs with blank labels
  (rule 1), display-only, filter values stay raw.
- Function-level tests: extract real functions from app.js source (brace-balance),
  eval with stubs (`num`/`int`/fake `XLSX`), assert — tests the shipped code, not a
  re-implementation. Real-file checks: dump xlsx → JSON via openpyxl (plain load,
  never save), feed samples through the real `rowsOfWorkbook`.
