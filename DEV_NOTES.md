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

## Current mood (end of this window)

Productive and satisfied. Shipped in one session: accounts.json, full visualiser, CPM,
coverage notes, 2nd-status, 1k tick, grouped dropdown, account search + suggestions,
Post-ID paste search, modal popup + pagination, filter layout. User kept saying "ok" and
moving forward — momentum is high. Don't break it with big unsolicited refactors.

## Project snapshot

- Dir: `C:\Users\PC CUSTOM\Documents\github\marketer\`
- `index.html` + `app.js` (~515 lines, vanilla IIFE) + `style.css` + `data/accounts.json`
  - `plan.md` + `source-file/*.xlsx` (~1 MB). **No npm, no build** — Tailwind Play CDN
    (`darkMode: 'class'`), SheetJS 0.20.3 CDN, Chart.js 4.4.1 CDN.
- Run: `python -m http.server` → `http://localhost:8000`. `file://` blocks bundled-file
  fetch (CORS) — upload/drag-drop still works there.
- Data: 9,217 rows × 24 cols, 1,613 distinct TikTok accounts. Allowlist = user's 9 managed
  accounts in `data/accounts.json` (simple string array, **their spelling preserved** —
  5 of 9 DON'T match the xlsx: spaced `Affiliate Dr Samhan 3/4/6` vs no-space actuals,
  `Dr Samhan Offcial3` typo vs `Official3`, spaced `Official4` vs `DrSamhanOfficial4`,
  and `Affiliate Dr Samhan1` genuinely has 0 rows). User will fix spelling "later" —
  the coverage-hints feature exists precisely to bridge this gap. Do NOT "fix" their
  JSON unasked.
- Key data quirks: **no CPM column** (derived = Cost÷Impr×1000); 19-digit Post IDs exceed
  2^53 so matching compares Numbers both sides (identical rounding → exact) but displayed
  IDs may differ in trailing digits (logged in plan.md); only **14/9,217** rows hit 1000+
  impressions; `Exploration secondary status` values: Unavailable 4701, Underperforming
  3031, Authorization needed 537, Exploring 437, Rejected 352, Performing 153, Outstanding 6.
- Status tracking lives in **`plan.md`** — user explicitly asked for it and checks it
  ("i dont see any edit in plan.md" was once just an un-reloaded editor + untracked git
  folder; files were fine). Keep it ticked per change.
- Display-only changes go on the webpage; **exports untouched unless asked** (user said so
  for coverage notes).
- Sample-data finding (2026-09-13): 2 same-day exports compared — (1) full 9,202 rows
  with 60× `Dr. Samhan`, (2) filtered 118 rows with 117× `Dr. Samhan`. All 60 IDs from
  (1) exist in (2); the +57 in (2) are all `Ineligible / Not active`, 0 impr, ~0 cost
  (Cost 58.35→59.26 drift on 7/60 common rows = different export times). The 52
  `Explored` rows match exactly, so the full export stays safe for sales/performance.
  Shipped a non-technical General-notes card on the page + `feature.md`/`plan.md` entries.

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

## Standing patterns to preserve

- `node --check app.js` + HTTP smoke test (200s for touched files) after EVERY change.
- `plan.md` checkbox per feature, promptly.
- Ask-mode vs build-mode: feasibility = words only; "proceed/go" = code.
- Keep replies short. Demos happen in their browser, not in chat.
