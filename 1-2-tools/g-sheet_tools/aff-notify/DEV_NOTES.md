# DEV_NOTES.md - aff-notify session handoff (27 Sep 2026, MYT)

> Read this first. It carries the vibe, not just the facts.

DO NOT DELETE THIS PART

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

## 27 Sep 2026 - closeout (night MYT)

- Tail after the v1 commit (`40e4f7a`): tg_bot v2 (sender, mention, test
  full-only) + v3 buckets, all verified (18 + 4 + 14 stub tests),
  feature.md now covers Telegram, masters rolled up. Uncommitted.
- Vibe stayed fast-iterative: owner compares options live (full vs
  condensed, buckets vs per-row dates), decides in one line. Sparring mode
  cooled into trust - fewer challenges needed, confirm-and-build sufficed.
- New bugs, all mine: (1) garbled assertion expression in a test harness
  (fixed by simplifying to a plain index check); (2) wrong weekday in a
  test expectation (Sep 25 2026 is Friday - the CODE was right, lesson:
  verify calendar facts independently, and when code and test disagree,
  check the test's constants first); (3) edit oldString mismatch after
  earlier edits (re-read the region first, always); (4) "Verification Katz"
  typo (re-read after editing, always). Standing lesson reinforced: the
  harness is guilty until proven innocent.
- Next window: owner picks Telegram style, installs both trigger sets,
  aligns F-formulas to marker ranges. Pending-scope 2nd email still parked.

## 27 Sep 2026 - tg_bot v2/v3 + buckets (evening MYT)

- Telegram sender built (`tg_bot/telegram.gs`, `code.gs` untouched):
  group + `Affiliate Digest` topic, `BOT_TOKEN`/`GROUP_ID`/`TOPIC_ID`/
  `MY_USER_ID`/`TG_STYLE`/`TG_ENABLED` keys, full + condensed styles,
  Open-sheet button, `logThreadId` helper, megaphone `tg://user` mention
  of the owner on every message, `testTelegram` (now full-only).
- Corrected two assumptions live: user ID can't replace chat ID for
  sending (chat-addressed only); bot can't create private-chat topics
  (group redesign instead). Topics verdict documented in plan chat.
- v3: priority rendered as Due-today / Overdue-oldest-first buckets on
  email + Telegram (shared `splitBuckets`); rows slimmed to user + link.
- Verification kit: stubbed node harness (18 tg tests, 4 mention tests,
  14 bucket tests - all pass); `node --check` via .js temp copy; ASCII 0.
- OPEN: owner comparing styles; email + Telegram triggers install after
  the pick; F-formulas still fixed ranges.

## Vibe

Owner ran this session in bursts: short confirms ("ok", "ok good"), then a
hard pivot ("ok move on, i want you to focus on different topic"), then deep
collaboration. Mid-session they deputised me as intellectual sparring partner
(assumptions/counterpoints/truth-over-agreement) AND imposed Plan-mode
discipline (discuss first, no code without "go"). The rhythm became:
challenge -> confirm -> tiny permission -> build. Respect that rhythm next
time: never jump to implementation on a vague "ok" - confirm scope first,
especially which sheet/tab/cell they mean. They test live fast (ran
testNotify the same session, "the email structure works now") and report
back in one line. Match that energy: short replies, working artifacts,
verify everything yourself.

## Facts

- New track `g-sheet_tools/aff-notify/`: `plan.md` + `code.gs` (Apps Script
  digest for the Affiliate Collection sheet, ID 44 chars, tab has TRAILING
  SPACE). Sheet read live via MCP (list_sheets -> batch_read); gid 911439667
  mapped to the tab.
- Tab anatomy (verified by reads, not assumed): header row 8, block 1 rows
  9-27 (`end` B28), block 2 rows 32-47 BRAND CONSIDERATION (`end` B48),
  block 3 row 50+ (NMR/FATIGUE, out of scope). F2 =
  COUNTIF(H$8:H$48,"PENDING VID CODE") =12; dashboard tab EMPTY (F2 idea
  moved to same-sheet). Col N = NEXT REVIEW text d/m/yy; O = relative age.
- Digest: 4 triggers (9:30/11/2/4 MYT, nearMinute), one combined email per
  run, silent-if-empty. Sections: PRIORITY (RUNNING, N<=today incl. overdue
  uncapped), REMINDER (RUNNING, N==tomorrow), ACTION (F4>=1 ads queue).
  HTML mail (inline styles, red/blue/green banners, clickable video links)
  + plain-text fallback. Dates render `Sun Sep 27 2026 (Today)` style.
  Recipients map reserves a 2nd-email slot (pending-scope later); Telegram
  hook reserved (Script Properties).
- Same session, earlier: `tiktok-account/sync` v20 (Dashboard col I Total
  Ticked, same-batchGet counting, menu 6 relabeled) - implemented + mock
  verified before Plan mode began.
- OPEN: triggers not yet installed (owner runs installTriggers when ready);
  F2/F3/F4 still fixed `H$8:H$48` in-sheet (script is marker-derived, sheet
  formulas are not - align next touch); Telegram later; 2nd email later.

## Bugs/lessons

1. **Theorised before reading.** Early plan assumed one block + dashboard
   settings; live reads revealed 3 blocks, 2 `end` markers, empty dashboard,
   F2-as-COUNTIF. LESSON: read the sheet (info -> targeted ranges) before
   proposing anything structural. Evidence before synthesis, always.
2. **Fixed-cap ranges rot silently.** `H$8:H$48` works until inserts push the
   marker past 48, then drops rows with no error. LESSON: scope from markers
   (2nd `end` in col B), never hardcoded end rows, when junk lives below.
3. **Trailing-space tab title.** `Affiliate Collection ` breaks every
   unquoted/trimmed reference. LESSON: copy the title from list_sheets output
   byte-exact; warn in AGENTS.md.
4. **PowerShell gotchas (3x):** `&&` is invalid (use `;`); `%TEMP%` does not
   expand (use `$env:TEMP`); `node --check` rejects `.gs` (copy to `.js`
   temp first). LESSON: batch these into the folder AGENTS.md so the next
   window does not pay the same toll (done).
5. **Empty-args `execute` call.** Fired the tool with no `code` key while
   rushing. LESSON: slow down on tool-call construction; one breath, check
   keys, then send.
6. **Mock-test stub lied.** Fake FORMULA/grid row misalignment made merge
   look broken (engine was right). LESSON: when a test fails, suspect the
   stub's realism before the code - align fake shapes 1:1 with production.
7. **nearMinute != exact.** Apps Script triggers land "around" the minute
   (+/-15). LESSON: promise windows, never exact times, for trigger mail.

## Mood

Upbeat, momentum-heavy. Owner trusts fast iteration + live testing over long
specs. Next window: confirm-then-build, keep replies short, verify with real
reads, and never let a secret (44-char ID, tokens) land in git - lengths-only.
