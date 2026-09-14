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

Long, dense, productive session — AOV → CSV preview → username allowlist → local
saver → bundled 404 → period bug → exploration audit → Product Card → save debugging
→ gitignore → handoff. User is decisive and trusting ("ok proceed", "okkk"). Loop is
healthy. Loose ends (top of next window): user never confirmed "Saver connected" on
THEIR machine — ask for the probe status line first thing if save comes up again.

## Project snapshot

- Dir: `C:\Users\PC CUSTOM\Documents\github\marketer\tiktok-creative-analysis\`
  (serve / run / commit from HERE, never from `marketer/` root — wrong cwd breaks
  relative-path commands silently or loudly).
- GitHub: `https://github.com/ikrammdzmn/marketer.git`, branch `main`. Commits this
  window (unverified count — run `git log`): work through AOV→Product Card era is in
  `5dafbd5`; **uncommitted**: `data/accounts.json` (`edrewrfwer` test row removed by
  user — review then commit when asked; NEVER commit without being asked).
- Serving: `python server.py` (stdlib, 127.0.0.1, static + POST /api/accounts saver +
  GET /api/version fingerprint) or double-click `start-server.bat`. Plain
  `http.server` / Live Server / Pages = view-only (Save dead by design).
- `accounts.json`: 9 × `{name, username, note}` objects; matching exact on `name`;
  8 of 9 match xlsx; `Dr Samhan Official4` kept (0 rows, coverage hints bridge
  `DrSamhanOfficial4` twin). User edits this file directly too — re-read before work.
- Source xlsx rotates weekly (`source-file/` currently 09-07–09-14, 9,268 rows);
  loader auto-picks newest by filename; period parser accepts bare date ranges.
- Blank accounts (`''`/`'0'`/`'-'`) normalise to user-named `Product Card`
  (catalogue promo, was ~29% of revenue); `Exclude Product Card` tick, default off.
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
18. **Old session's bugs (1–10, preserved):**
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
  Server) owns port 8000.
