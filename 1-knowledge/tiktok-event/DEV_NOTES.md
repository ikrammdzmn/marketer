# DEV_NOTES.md — handoff to next-window self

> Read this first. It carries the vibe, not just the facts.

## The headspace to sync into

Terse operator, Malay+English mix, decides in one or two words. This whole window ran
on short bursts: "analyze tiktok-event folder" → read-only analysis → "i update the
tiktok-prd file" → re-analysis against the updated PRD → "can you build the page?
check if my approach is good…, ask me question…, recheck…, suggest…, confirm what
plan you want to make and do not generate answer unless I allow it" → full plan-mode
discipline (questions tool, options explained, zero code) → "ok option a" → detailed
build plan, still no code → "ok build" → built `index.html` in one shot + verified →
now this docs wrap-up. The dynamic: **feasibility first, words only; "ok" means go.**
They validate in the browser with clicks, not by reading code. Keep replies short or
they stop reading.

Energy of this conversation: calm, trusting, momentum-building. No screenshots of
breakage this time, no debug marathon — the opposite of the tiktok-account OAuth saga.
Plan mode was explicitly invoked by the user (not by the env), respected fully, and
rewarded: they picked Option A (vanilla single-file, local-only) after I explained all
three. Mood at close: satisfied, tidying up before the window ends ("This conversation
is ending soon" + full docs request, same template string as the creative-analysis
handoff — they reuse this ritual per folder).

## What this folder is (unique discoveries)

- `tiktok-event/` had NO docs when we arrived: just `raci_campaign_dashboard.tsx`
  (1205-line React + Firebase artifact, needs `__firebase_config`/`__app_id` Canvas
  globals — unrunnable here) and `tiktok-prd` (first a bare Google Docs link, then the
  user rewrote it into a real 69-line PRD v1.0.0 for HIMCOFFEE RACI MASTER 2026–2030).
- The real product: campaign Timeline (12 month cards, yearly KPI) + RACI Worksheet
  (phased task table) + 5T/3M Strategy Blueprint + PIC workload bars + CSV + PIN seats.
  Seed truth lives in the `.tsx`: 12-task template with hardcoded PICs (Hafizie,
  Dr Samhan, Rafhanah, Shahirah, Ikram, Zaim, Live Team, ENA, COO), generic
  `RM100k/5,000 units` blueprint defaults, ~40 campaigns for 2026.
- Key call: **Option A over B/C.** B (React+Firebase) violates every repo convention
  (no npm/build, see the other three AGENTS.md) and needs hosting + billing + rules.
  C (hybrid CDN+Firestore) keeps all of B's costs with extra sync-conflict code.
  A = `index.html`, Tailwind CDN, localStorage, zero cost, offline. User confirmed:
  Local-only + Full PRD modules + Internal desktop.
- PRD-vs-code gaps I surfaced (user accepted, scoped out): RACI has only R/A (no C/I);
  PIN-in-public-Firestore is security theatre; whole-month `setDoc` overwrite =
  last-write-wins; free-text dates mean no real overdue engine.

## Bugs found and fixed (and what I learned)

1. **Dead no-op in `saveStrat`** — `Object.keys(…).forEach(function(){});` scaffold left
   in the new file. Removed on re-read. LEARN: after every write, re-read the touched
   region; no-ops slip in when composing large files in one shot.
2. **Shared seed-reference leak (from `.tsx`, fixed in port)** — original builds
   `defaultCampaignData` once and reuses the same array on reset; a mutation in one
   year/month could leak elsewhere. Port uses fresh `stdTemplate()` + `clone()` per
   campaign and rebuilds seed in `seedData()`/`resetAll()`. LEARN: never share template
   object references — always deep-clone on insert AND on reset.
3. **Naive CSV in `.tsx` (fixed in port)** — raw string concat, no `"` escaping, only
   `\n→space`, no injection hygiene. Port uses `csvEsc` (double `"` + wrap). LEARN:
   never hand-roll CSV; one escaper for every cell, both export paths.
4. **`Date.now()` id collisions (`.tsx`, fixed in port)** — millisecond ids collide on
   fast adds. Port uses `uid()` = time36 + random. LEARN: any hand-made id needs an
   entropy suffix.
5. **PowerShell `&` is a parse error here** — first smoke test died with
   `The ampersand (&) character is not allowed`. Re-ran with
   `Start-Job -ScriptBlock { … }` + `Invoke-WebRequest`, got HTTP 200. LEARN: this env
   is Win PowerShell 5.1 — background with Start-Job, chain with `; if ($?)`, always
   `Get-Job | Stop-Job; Get-Job | Remove-Job` after.
6. **Canvas globals (`__firebase_config` etc.)** — spotted on read, never patched;
   chose local-only instead of shimming. LEARN: check runtime-global dependencies
   before porting anything; a shim would have hidden the real cost (build+hosting).

## Honest limitations (do NOT overclaim next window)

- Overdue highlighting was promised in the plan but shipped as TBD-grey display only —
  free-text `dueDate` ("24-31 Ogos", "H+1", "-") is unparseable. If asked, propose a
  structured date field as new scope, don't fake it.
- PIN seats are per-browser localStorage. Two laptops = two seat lists. True sharing
  needs the deferred Hybrid (Firebase) scope with real security rules.
- `tiktok-event/` is untracked in git (`?? tiktok-event/`). Commit only when asked.

## ⏰ NEXT SESSION — remind the user

1. Open `/tiktok-event/index.html` via `python -m http.server` and click through:
   year → month → campaign → edit Blueprint → add/move/delete task → PIN unlock → CSV.
2. Open questions: add C/I columns? structured due-dates? shared (Firebase) seats?
3. Commit decision pending — `index.html` + these docs are all uncommitted.
