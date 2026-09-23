# DEV_NOTES.md - marketer repo root session handoff (23 Sep 2026, night MYT)
> Read this first in a new session, then `1-MASTER/MASTER-PLAN.md`,
> then the folder you will touch (`AGENTS.md` + `plan.md` + `DEV_NOTES.md`).

## Vibe

Marathon closeout session, owner's tidying energy all the way through -
short bursts ("ok", "ok go", "ok fit it", "ok good") with screenshots
doing half the talking (checkbox red triangles, portal dialogs, picker
pills). Plan mode ping-ponged all evening: words-only feasibility,
pushback on the F-column idea, an ELI5 verdict ("toy boxes" - robot
shelves vs your shelf - which actually settled the design), then build
bursts with live-sheet verification after every step. Mood at the end:
tired but flowing; owner heading into TikTok app-review prep. Match it:
short replies, one action per message, verify on the live sheet, never
lecture. Owner mixes English + Malay patience and catches real bugs
from screenshots alone.

## Facts

- Repo moved in Explorer: `marketer-1/` up one level over old `marketer/`
  (HEAD was 2647c04). `exit-entry.md:2.2` now guards the clone
  (`Test-Path ... # must be False`) so it never happens again.
- Pushed `2663c7a` (23 Sep night): sync v19 + entry/MCP hardening +
  session docs. Tree now holds the evening's uncommitted work (dashboard
  active badge, portable docs, accounts reorder - all owner's/ours, no
  secrets; `git status` verified clean of secret paths).
- `sync/` graduated: was UNTRACKED, now committed. Engine v19: pull
  progress lines, Ctrl+C abort (exit 130), RESORT_NEWEST_FIRST,
  Video-ID-first cols (MIGRATED_C_D), Creative-age col C
  (MIGRATED_INSERT_C), `_checkbox_bool()` on all rewrite paths.
  Standing rule recorded: bump SYNC_VERSION + log DEV_NOTES same session.
- Sheet `ALL INTERNAL CREATIVE DATA`: 12 sheets, Dr Samhan tab 2,543
  rows newest-first, 9 ticks intact, col A 100% real booleans (verified
  UNFORMATTED). C2 ARRAYFORMULA goes in after migration (owner pastes).
- Tokens: all 10 linked (sandbox); `Dr_Samhan.json` = slot Dr Samhan
  (@affiliatedrsamhan1), `Dr__Samhan.json` = slot Dr. Samhan (@dr.samhan),
  both `linked_as` clean. 9 others relinked same day.
- Review track: evaluated, leaning stay-on-Sandbox (10/10 slots full,
  zero headroom - dummy slot check came back clean locally, portal
  Target-users count still owner's 2-click check). Production cutover
  plan + demo-video + scope justifications staged in chat, unstarted.
- `accounts.json`: 21 entries / 15 active; owner reordered it by hand
  (data identical, menu order changed) - user's order, do not "fix".
- Dashboard picker now shows `active` from accounts.json (grey
  `inactive` tag + dimmed rows, still selectable). Verified live smoke
  21/15 on scratch port 8099.

## Bugs found & fixed (lesson each)

1. **Backfill burial.** Row-2 insert assumed new rows are newer; `--full`
   buried 22 tracked ticked rows under 2,521 older ones. Lesson: every
   "insert at top" design must state its precondition and repair the
   seam (now RESORT_NEWEST_FIRST). Diagnose from the sheet, not theory:
   the Dec-2020-over-Sep-2026 seam row proved it.
2. **Checkbox text, twice.** Whole-row rewrites wrote `"TRUE"` strings;
   strict BOOLEAN validation flagged every cell. Fixed, then the NEXT
   migration reintroduced it (normalizer missed the new path). Lesson:
   re-audit EVERY write path on EVERY change; recorded in sync AGENTS.md
   col-A bullet citing the incident.
3. **C2 single-cell glitch.** 35k-cell rewrite, exactly one cell wrong
   (duplicated title, ID recoverable from share link). Header check
   passed while data was corrupt. Lesson: after bulk rewrites, scan
   full columns (ID-likeness + dup check), never just headers.
4. **Headless Ctrl+C is silent.** `GenerateConsoleCtrlEvent` needs a real
   console; in agent shells the child kept pulling to page 88+. Lesson:
   test abort via runpy + mocked sleep raising KeyboardInterrupt.
5. **Shell eats `$vars` and has no `head`/`&&`.** Inline PowerShell with
   `$` fails; `python -c` quoting breaks. Lesson: TEMP script FILES via
   `write` (opencode temp dir, deleted after), `;` chaining only.
6. **F-column Age idea.** Mid-block insert would misalign every positional
   read + get overwritten by engine writes. Lesson: respect owned ranges
   (customs A-C = yours, system = robot's); the ELI5 landed it.

## Open (next window)

- Owner pastes C2 ARRAYFORMULA; confirm red triangles gone in UI.
- Portal Target-users count (2-click dummy-slot check).
- Review: demo video + submit, or confirmed stay-on-Sandbox.
- 9 tokens were relinked - watch for expiry/revoke; never run live sync
  from two PCs at once.
- Commit the evening's working tree when owner asks (no secrets in set).
