# DEV_NOTES.md — handoff to next-window self

(DO NOT DELETE THIS PART)

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users.

> Read this first. It carries the vibe, not just the facts.

## The headspace to sync into

This is a **fast, terse, iterative loop** with a non-technical marketer (TikTok Shop affiliate
analysis for HIMCoffee / Dr Samhan product). The user's messages are short bursts:
"editor", "ok proceed", "ok good, why i dont see X?", "just answer, do not edit the code",
"ok go on". That is the whole dynamic:

1. User asks **why / is-it-possible** → they almost always append **"just answer, do not edit
   the code"**. Respect it literally: explain the design, give options, write NO code.
   They are checking feasibility before spending the change.
2. User says **"ok proceed" / "ok go on" / "ok build"** → implement immediately, verify
   (`node --check` + HTTP smoke test), tick `plan.md`, reply short.
3. User validates each step ("ok good") then fires the next micro-request.

Never dump long technical essays. Short answers, then build. They validate visually in the
browser (`http://localhost:8000`), not by reading code.

## Current mood (this window)

Git-surgery + ship-it energy. This window: diagnosed the 10k phantom Source Control
count (repo rooted at home folder), bundled + removed it, pushed to a fresh GitHub repo,
answered a VS Code account-scope dialog, and moved everything into
`tiktok-creative-analysis/`. User is decisive ("1", "ok move it all") and trusts the
loop. Momentum still high — keep changes small, verified, and pushed.

## Project snapshot (updated: everything now lives under `tiktok-creative-analysis/`)

- Dir: `C:\Users\PC CUSTOM\Documents\github\marketer\tiktok-creative-analysis\`
  (serve / run / commit from HERE now, not from `marketer/` root).
- GitHub: `https://github.com/ikrammdzmn/marketer.git`, branch `main` (tracks
  `origin/main`). Commits so far: `8f8018c` initial tool, `5be1f3c` folder move.
- Home-level repo saga (closed): old `.git` at `C:\Users\PC CUSTOM` (170 commits of
  `multimedia-mamtj6/dev`, empty index, 0 tracked files) caused the ~10k Source
  Control badge. Backed up to
  `Documents/github/home-git-backup-20260913.bundle` (20.7 MB, `git bundle verify`
  passed — restorable via `git clone <bundle>`), then deleted. `kalendar-hijrah/`
  has its own independent `.git` — never touched. Identity (`HC Office / darkvadez…`)
  was recovered from the deleted repo's local config and re-set repo-local in marketer.
- Features added since last notes: dataset **period + file-date line** (parsed from
  filename like `7 days 2026-09-06 - 2026-09-13`, formatted DD MMMM YYYY, falls back to
  min/max Time posted; file date = Last-Modified header or upload timestamp), raw-data
  inventory answer (13 of 24 columns consumed — see chat), filter-card 3-row layout.
- Still true from before: **no npm/build** (Tailwind Play, SheetJS, Chart.js CDNs);
  run `python -m http.server` → `:8000`, `file://` blocks bundled fetch. Allowlist
  spelling is authoritative — 5 of 9 entries intentionally mismatch the xlsx, never
  "fix" unasked. No CPM column in source (derived). 19-digit Post IDs: exact match via
  identical Number rounding, trailing display digits may differ. Only ~14/9,217 rows hit
  1000+ impr. `plan.md` is user-read — tick per change. Display changes stay off exports
  unless asked.
- Prior window shipped (already in code + docs, verified present in `index.html:159`):
  General-notes card, sample-data comparison (57-row `Dr. Samhan` gap = dead
  `Ineligible / Not active` inventory; 52 `Explored` rows identical).

## Bugs found & fixed (and the lesson from each)

1. **Min-ROI typo**: wrote `parseFloat($('fMinOrders') && $('fMinRoi').value)`.
   Fixed to `$('fMinRoi').value`. _Lesson: re-read just-written code before verifying;
   `node --check` catches syntax, never logic._
2. **Edit oldString mismatch**: hand-typed oldString with stray characters → edit failed.
   _Lesson: copy exact text from Read output, never retype from memory._
3. **CSS rules clobbered TWICE** (`.hint-btn:hover`, `.suggest-empty` deleted when appending
   new rules — oldString matched the rule I then overwrote). _Lesson: when appending CSS,
   anchor on a unique end-of-file marker or re-read the tail first; always grep/read the
   file after an edit that touches shared context._
4. **`misses.length` ReferenceError**: summary line referenced an array that never existed
   (actual accumulator was the `html` string). Caught via grep, fixed with a `missing`
   counter. _Lesson: after every edit, grep the identifiers you touched._
5. **plan.md line accidentally replaced** (suggestions checkbox eaten by a new entry's
   oldString). Restored immediately. _Lesson: keep oldString scope minimal; verify plan.md
   after each touch — the user reads this file._
6. **openpyxl read-only iteration** returned only 1 column; switched to normal mode.
   **PowerShell cp1252 + emoji** account names crashed console output; used
   `.encode('ascii','backslashreplace')`. **Windows `head` doesn't exist** in PowerShell —
   don't pipe to it. **Background HTTP servers**: always `Stop-Job/Remove-Job` in
   `finally`, and use a fresh port per test (8123, 8124…).
7. **Wrote a garbled line into DEV_NOTES.md itself** (autocomplete glitch mid-sentence).
   Caught on re-read, fixed immediately. *Lesson: re-read doc files after writing them
   too — not just code.*
8. **Parallel shell calls raced** (folder listing ran before `git bundle create`
   finished → momentary confusion + a stale `.bundle.lock` to clean up). *Lesson:
   dependent shell steps go sequential in one command, not parallel calls.*
9. **Deleting the home repo also deleted its local git identity** → commit failed with
   "Author identity unknown". Recovered the values from memory and re-set repo-local.
   *Lesson: dump `git config --local --list` into the backup notes BEFORE removing any
   repo; set identity repo-local (`git config user.name/...` inside the repo), never
   global, unless asked.*
10. **Moved the app with `git mv`** (100% renames, history kept) — verified all relative
    paths (`data/…`, `source-file/…`, `app.js`, `style.css`) survived by re-running the
    HTTP smoke test from the new dir. *Lesson: `git mv` + re-verify from the new
    location; update the working directory in your head (serve/commit from the subfolder
    now). Also: `New-Item` errors if the user already created the folder — harmless,
    ignore and continue.*

## Standing patterns to preserve

- `node --check app.js` + HTTP smoke test (200s for touched files) after EVERY change.
- `plan.md` checkbox per feature, promptly. Commit + push when the user says so (branch
  `main`, remote `origin`); future pushes are bare `git push`.
- Ask-mode vs build-mode: feasibility = words only; "proceed/go" = code.
- Git hygiene: repos live in project folders, never above them. Moves via `git mv`.
- Keep replies short. Demos happen in their browser, not in chat.
