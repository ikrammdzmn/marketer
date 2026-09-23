# DEV_NOTES.md — handoff to next-window self

> Read this first. It carries the vibe, not just the facts.

DO NOT DELETE THIS PART

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

## Window 2026-09-15 — Sandbox OAuth marathon → tester → dashboard (latest)

Vibe: marathon debug loop, same terse user, even more screenshots. User drove
the browser (every TikTok error pasted within seconds: 431, code_challenge,
client_key, non_sandbox_target, redirect_uri, verifier, form Content-Type,
State mismatch), I drove the code. Bursts like "ok", "still same", raw URLs,
then pure joy at first CSV: "ok gooooooddddddddd". Mixed English + Malay
("untuk", "tq"). Energy: refuses to quit — dummy 0 videos → posted a real
volleyball video to prove end-to-end → counts → real DrSamhanWellness rows →
then a whole second act: dashboard with calendar picker, column toggles, pill
dropdown, Tailwind restyle. Decides in one word ("ok go", "ok nevermind",
"just answer, do not edit"). Browser-validates everything; never runs a
command blind.

What happened: (1) Redirect saga closed: `Web` tab forces `https://`, so
`http://127.0.0.1:8080/callback` lives in `Desktop` tab; Web got the live
`.../marketer/tiktok-creative-analysis/` URL. (2) Domain row verified by user
(`.../marketer/` prefix). (3) User supplied Production Key + Secret in chat —
NOT committed; keys live only in untracked `.local_secrets.json`. Production
authorize failed with `client_key` (pre-approval block on `video.list`) →
moved to **Sandbox**: created sandbox, whitelisted target users (cap 10,
takes ~1hr), switched tester to Sandbox key. (4) PKCE saga: added
`code_challenge` (base64) → TikTok Desktop docs say **hex SHA256** → fixed.
Token endpoint wants `application/x-www-form-urlencoded` (not JSON); token
JSON is **flat** (`access_token` top-level, no `data` wrapper). (5) First live
run: `TestDummy` 0 videos → user posted volleyball video → 1 row with correct
MYT (+8) + counts (8 views). (6) Added `view/like/comment/share` columns, then
`user.info.profile + user.info.stats` scopes (follower counts etc.) — old
tokens needed fresh re-login. (7) Built `tester.py` (one-run-per-account
fallback, kept). (8) Built `dashboard/` per approved plan: per-account pending
OAuth state, silent refresh (access ~24h / refresh ~1yr), cached table +
profile header + Refresh + Export, accounts read live from
`tiktok-creative-analysis/data/accounts.json`. (9) Dashboard UX spree:
loading spinner + Refresh lock, Video ID column, relative Posted times
(`1 month 5 days ago`, exact MYT on hover), calendar range picker (dual-month,
presets, video-less + future days disabled), column checkboxes (# unlockable,
All-master keeps Video ID), pill account picker (green linked / red not linked,
status text not username), Tailwind CDN restyle to match house style,
outside-click closes popups. (10) Session closed with docs: `SETUP.md`,
`otherdevice.md` (per-PC guide), this handoff, `feature.md` rewrite,
`AGENTS.md` update. Production still UNAPPROVED — demo video not recorded yet.
User pasted a live sandbox token pair in chat once (treat as burned).

Mood to match next: celebrate first, then one exact command. Remaining work:
link 9 real accounts → record sandbox dummy run as demo video → submit app
review → swap Production keys → optional Stage 2 (hosted). Never propose
publishing Stage 1 as-is (no auth gate, localhost-only by design).

## Window 2026-09-14 PM — TikTok Display API + GitHub Pages session (previous)

Vibe: same terse loop as creative-analysis, even shorter fuses — "ok try option
one", screenshot of the TikTok app form, "can you publish the two?", "ok works,
tq", then domain-verify trouble. User is non-technical, browser-validates
everything, decides fast. Energy was pragmatic, not exploratory: get the TikTok
app submitted, get Pages live, move on. Kept replies short; used the question
tool twice (dev-app keys, account access) — answers: NO dev app yet, OWNS all
accounts. Next window: user returns with a TikTok Client Key (or still stuck on
domain verification) — pick up there, offer the local OAuth + paginate-to-CSV
tester on explicit "proceed".

What happened: (1) bulk video+post-time options → user picked Option 1
(official Display API `video/list`, `create_time`). NOT scrapers — user chose
compliant path. (2) TikTok app form help: keep Category `Utilities`,
description `Internal tool to list our own TikTok videos and post times for
analysis.` (<120 chars), Platforms `Web` only. (3) Drafted `docs/terms.html` +
`docs/privacy.html` at repo root (Himwellness Sdn Bhd, internal-use wording, 14
Sep 2026); user committed them in `e8c84d1 multi update`. (4) Pages saga: `/docs`
source → terms worked, tool 404'd; switched source to `/(root)` → tool works at
`/marketer/tiktok-creative-analysis/`, terms moved to `/marketer/docs/terms.html`
(TikTok form URLs updated). Taught user vs project site
(`ikrammdzmn.github.io/marketer/...`, no rename needed; free Pages needs Public
repo). (5) Domain verification still OPEN: three `tiktok*.txt` at repo root are
LIVE at `/marketer/tiktok*.txt` (verified first file via fetch, content
`tiktok-developers-site-verification=...`) but user tried verifying bare
`https://ikrammdzmn.github.io` — fails by design; must verify URL-prefix
`https://ikrammdzmn.github.io/marketer/`. `Domain` (DNS) type is impossible on
github.io. If TikTok portal forces bare domain, escape hatch = new repo named
`ikrammdzmn.github.io`. No code written this window (feasibility + hosting only).

Mood to match next: short confirmations, exact URLs, no lectures. User says
"tq", means it works — confirm and name the next single action.

## Folder history

- 2026-09-14: this folder (`tiktok-account/`) created by user mid-session; prior
  session notes were first written into `tiktok-creative-analysis/` by mistake,
  then moved here per user correction (creative-analysis files reverted to
  `e8c84d1`). Lesson: ask WHICH folder before writing handoff docs — the
  Display API project is separate from the creative-analysis tool.

## Bugs found & fixed (and the lesson from each)

1. **Pages source `/docs` hid the tool** — `.../marketer/tiktok-creative-analysis/
index.html` 404'd because Pages only served `docs/`. _Lesson: source=`/docs`
   publishes ONLY docs/; source=`/(root)` publishes the whole repo. Switching
   source moves every public URL (terms went `/marketer/terms.html` →
   `/marketer/docs/terms.html`) — update ALL pasted URLs (TikTok form) on switch.
   Diagnose by mapping file path → served URL before touching settings._
2. **Bare-domain verification on a project site** — `tiktok*.txt` at repo root
   serves at `/marketer/tiktok*.txt`, never at `https://ikrammdzmn.github.io/
tiktok*.txt`, so verifying the bare domain always fails. _Lesson: on
   `user.github.io/repo` Pages, always verify the URL-prefix property WITH the
   repo path; `Domain`/DNS type is impossible on github.io. Confirm liveness with
   a real fetch of the exact served URL before arguing with the console._
3. **Project vs user site confusion** — user asked if repo must be renamed to the
   account name for Pages. _Lesson: `username.github.io` repo = user site (root);
   any other name = project site (`username.github.io/repo/`). No rename needed;
   state the two exact live URLs instead of explaining theory._
4. **Handoff docs written to the wrong folder** — session notes went to
   `tiktok-creative-analysis/` before user said this Display API work belongs in
   `tiktok-account/`. _Lesson: the two folders are separate projects with
   separate AGENTS.md; confirm target folder first, and revert stray edits
   (`git checkout -- <files>`) instead of leaving them._
5. **`http` redirect pasted in `Web` tab** — Login Kit Web forces `https://`, so
   `http://127.0.0.1:8080/callback` always errored there. _Lesson: Web = https
   live URL only; loopback http goes in `Desktop` tab. Sandbox and Production
   keep SEPARATE redirect lists — re-add in Sandbox after switching._
6. **PKCE challenge as base64url** — TikTok Desktop requires **hex SHA256**
   (`CryptoJS.SHA256(verifier).toString(Hex)`), Web-style base64url gives
   `Code verifier or code challenge is invalid`. _Lesson: read the platform tab
   (Desktop ≠ Web); docs Desktop section states hex explicitly._
7. **Token POST as JSON** — `/v2/oauth/token/` accepts only
   `application/x-www-form-urlencoded`. _Lesson: token = form, `video/list` =
   JSON; different endpoints, different content types._
8. **Token parsed as `data.access_token`** — real response is flat
   (`access_token` top-level). _Lesson: print the raw shape once before
   writing the parser; TikTok v2 token has no `data` wrapper._
9. **Stale-link `State mismatch` / verifier errors** — STATE + verifier live in
   the server process; any restart, second process, or `/callback` refresh
   invalidates pending codes (single-use). _Lesson: kill-all → start once →
   fresh `Ctrl+F5` → login → Authorize in one unbroken run; never refresh the
   callback page._
10. **Two servers on port 8080** — tester and dashboard both default 8080;
    second start crashes or callback hits the wrong app (incl. the "no CSS"
    confusion: tester serves bare HTML). _Lesson: dashboard owns 8080; tester
    fallback uses `--port 8081` (and that URI must also be registered)._
11. **`client_key` authorize error** — production rejects `video.list`
    pre-approval. _Lesson: pre-approval testing = Sandbox key + Sandbox target
    users, not production key._
12. **`non_sandbox_target`** — login account not whitelisted. _Lesson: every
    test login must first be added under Sandbox `Target users` (cap 10,
    up to ~1hr to appear; dummy eats one slot)._
13. **`redirect_uri` error after switching to Sandbox** — redirect lists don't
    transfer. _Lesson: re-add exact URIs in Sandbox; run on the registered port
    (no `--port` surprises)._
14. **HTTP 431 on TikTok pages** — bloated `tiktok.com` cookies, not our code.
    _Lesson: retry in fresh Incognito / clear cookies / switch browser before
    touching code._
15. **CSV labeled TestDummy held drsamhanwellness data** — `--account` is only
    the filename label; data = whoever logged in. _Lesson: always match label
    ↔ login account; dashboard consent page shows the logged-in name — use
    `Switch account` or logout first._
16. **Edit clobbered `esc()` in dashboard.html** — a replacement `oldString`
    swallowed the neighboring function. _Lesson: after EVERY edit, grep the
    touched identifiers + re-read the region; caught immediately, fixed by
    re-adding. Same for PowerShell inline `python -c` quoting (breaks on
    nested quotes) — write temp script files instead._
17. **Secrets pasted in chat** — user dropped Production Key/Secret and later a
    live token pair into the conversation. _Lesson: never echo secrets back;
    rotate the Production secret in portal; tokens live only in gitignored
    `tokens/` + `.local_secrets.json`._

## Standing patterns to preserve

- Feasibility = words only; "proceed/go" = code. Short replies.
- Commit + push ONLY when asked. Secrets never committed.
- Pages: source `/(root)`; URL mapping flips on switch; re-verify pasted URLs.
- Verification files: confirm via live fetch of the exact served path first.
- Dashboard owns 8080; one server process at a time; fresh code per attempt.
- Tester (`tester.py`) is the untouched fallback — new work goes in `dashboard/`.

## Window 2026-09-17 — scale-hardening + linking safety (latest)

Vibe: calm, surgical, high-trust loop. No screenshots this time, no marathon —
the user came with one crisp bug report ("429 on old accounts like dr.samhan")
and then steered feature-by-feature in single sentences: throttle? go. date
range? go. unlink? add it. limit 30/custom? plan first, then go. Thumbnails?
just answer, then option A. Table too narrow? widen. App-review readiness?
opinion. Bug forecast? list. Why token dupes? explain. Wrong-slot link?
guard it. Warn or block? which is better — picked warn. Every "go" was earned
by a words-only feasibility answer first; the AGENTS.md rule 3 rhythm
(words → go → code → verify → short confirm) is exactly our dynamic now.
Energy: owner-operator tidying the shop before TikTok app review, mixing
English + Malay patience ("ok gooooood" era is over; now it's "ok go").
Match it: short replies, exact next action, zero lectures.

What happened, in order:
1. **429 root-caused**: `pull_and_cache` fired ~36 back-to-back `video/list`
   pages (719 videos, DrSamhanWellness) with no delay + no retry → TikTok
   throttled. Fix: `PAGE_DELAY=1.0` between pages, `post_json`/`get_json`
   retry 429/5xx (5 tries, honors `Retry-After`, error bodies surfaced),
   transient URLError retried too.
2. **Range preload**: TikTok has NO server-side date filter (cursor+max only),
   so implemented early-stop (newest-first → stop past `since_ts`, skip newer
   than `until_ts`) + range pulls MERGE into cache. UI: calendar range sent
   as `since/until` (MYT days) on Refresh.
3. **Unlink button**: red button, visible only when linked; `GET /unlink`
   deletes the token file, cache kept viewable.
4. **Fetch limit**: Limit box (All/30/50/100/custom ≤10000) → `max_videos`
   newest-N cap, also merged. 30 ≈ 2 pages ≈ 2s.
5. **Calendar UX**: hover range preview (`HOV` + `onmouseover`, label shows
   `start → hovered`), single-click selects one day immediately (first click
   now also `applyFilter`s), Clear button (visible only when R.s set).
6. **Posted column**: exact MYT datetime primary + grey relative below
   (was relative-only with hover title).
7. **Thumbnails (Option A)**: 40px `loading=lazy` cover inside Title cell,
   click opens full cover, `onerror` hides expired (~6h) images, text-only
   fallback. Rejected: separate column (width), oEmbed/scrape/embed (slow,
   fragile, off-API-only-rule).
8. **Width**: container `max-w-7xl` → 1760px (user saw wasted side space).
9. **App-review opinion**: strengths (official API, minimal scopes, live
   terms/privacy, unlink=data control) vs gaps (demo video #1, per-scope
   justification, reviewer test path for a localhost tool, production parity,
   rotate burned secret, free dummy sandbox slot). User has NOT yet recorded
   the demo video — still the next big step.
10. **Bug forecast + token-dupe postmortem**: `safe()` collisions
    (`Dr_Samhan.json` + `Dr__Samhan.json` both exist) + no cleanup. Then the
    live incident: user linked @affiliatedrsamhan1 into the "Dr. Samhan"
    (@dr.samhan) slot — both slots held the same login.
11. **Mismatch guard (warn-with-override)**: `/callback` fetches `user/info`
    pre-save, compares actual vs expected username (case-insensitive);
    mismatch renders a 409 stop page (try again / jump to matching slot /
    checkbox save-anyway via new `POST /confirm-link`); duplicates flagged;
    tokens store `linked_as`+`mismatch` (preserved across refreshes);
    `/api/accounts` exposes both; pill has 3rd amber state with hover tip.
    User chose warn over hard block (renames, dummies, review test logins).

Unique discoveries this window:
- `accounts.json` grew 10 → 20 entries (names/usernames/accountIds edited
  17 Sep; `Dr. Samhan`=`dr.samhan`, `Dr Samhan`=`affiliatedrsamhan1`).
  Dashboard reads it live — renames orphan token/cache files (see bug 20).
- Still single-threaded `HTTPServer`: big pulls block all other requests;
  Refresh button lock mitigates, background jobs NOT built.
- Merged cache never forgets deletions (only full All-time pulls replace);
  profile `video_count` vs table count will diverge — said out loud to user.
- `page > 500` = silent 10k-video ceiling, still in place.
- Plan-mode windows happened mid-session (read-only stretches): answered
  thumbnail/oEmbed questions + wrote implementation plans without touching
  code. If user says "just answer, do not edit", obey literally.

## Bugs found & fixed (and the lesson from each)

18. **429 on big accounts** — tight pagination loop, no throttle/retry.
    _Lesson: every external paginated loop gets delay + bounded retry +
    partial-progress preservation from day one; rate limits are a `when`,
    not an `if`._
19. **My own no-op edit + collapsed newline** (`/export` line joined onto the
    `if` line; a same-text old/new "succeeded"). _Lesson: never send an edit
    with identical old/new; after every edit re-read the region — caught via
    Read, fixed immediately._
20. **Token-file dupes + wrong-slot link** — lossy `safe()` + save-without-
    verify + no cleanup. _Lesson: filenames derived from user labels need
    collision handling; any OAuth "save" must verify identity pre-write and
    keep the evidence (`linked_as`) forever. Unlink should eventually offer
    orphan cleanup._
21. **Single-day needed double-click** — first calendar click never applied
    the filter. _Lesson: every selection gesture must produce a visible
    result immediately; a click that only arms state feels broken._
22. **Relative-only timestamps** — user couldn't see actual post time.
    _Lesson: relative times are decoration; absolute datetime is data. Show
    both, data first._
23. **Plan.md clobber (Unlink line overwritten by guard tick)** — same
    overlapping-anchor class of mistake as bug 16. _Lesson: append-only
    discipline on checklists; re-read the file after each tick when lines
    sit adjacent._

## Standing patterns to preserve (amends)

- Words → go → code → verify → short confirm. "Add X to the plan first"
  means edit plan.md only, then wait.
- "Just answer, do not edit" is absolute (plan-mode or not).
- Verify ritual now: `py_compile` + `node --check` extracted JS + unit
  script (mocked API) + scratch-port smoke + kill servers + grep touched
  identifiers. Temp scripts in opencode temp dir.
- Temp servers keep escaping `p.wait()` — always `Get-Process python` check
  + `Stop-Process -Force` after smokes.
- Docs per change: `feature.md` (user words), `plan.md` tick, folder
  `CHANGELOG.md` + `MASTER-CHANGELOG.md` line, MASTER-PLAN status if scope
  moved. (This window: created `tiktok-account/CHANGELOG.md`; rewrote
  `feature.md` as full showcase.)

## Window 2026-09-17 (late) — second PC + clean links (latest)

Vibe: support-desk interlude, then a two-line fix that grew teeth. User tried
to clone this exact setup onto a Win10 second PC (Antigravity terminal) and
hit the classic wall: pasted screenshots vanished. Then back on the project:
"trim the ?utm… off video links" → built `clean_share`, user proved it
wasn't enough (stale cache still dirty on click) → added read-time
migration. Mood stayed light throughout ("huh, its finally works").
Headspace for next-you: this user now runs TWO PCs (this one = opencode
chat; other = Win10 + Antigravity + external Windows Terminal + opencode).
Anything terminal-flavored must be qualified with WHICH pc + WHICH window.

What happened:
1. **Image-paste saga (other PC)**: pasting screenshots into Antigravity's
   terminal did nothing. Diagnosis: terminals accept text only; this chat's
   input converts clipboard pictures into `[Image N]` attachments (that's
   the proof an image was sent — no chip, no pixels). Fix path walked:
   `npm install -g opencode-ai` → EPERM cleanup warning (old opencode.exe
   locking files; kill + retry = clean install) → paste still dead inside
   IDE terminal → standalone cmd received images but rendered `?????`
   glyphs (Win10 conhost, no Unicode) → `chcp 65001` + TrueType font patch,
   Windows Terminal recommended → can't embed WT inside Antigravity (panel
   is xterm, not swappable) → side-by-side external terminal, or
   `opencode web` + browser URL. Closed with "huh, its finally works".
2. **`clean_share`**: strips `?utm_campaign=tt4d_open_api&utm_source=…` (+
   fragments) from `share_url` at ingest in `pull_and_cache`; covers
   deliberately untouched (query = expiry signature). Verified 7-case unit
   + mock e2e (share clean, cover intact).
3. **Stale-cache report**: user clicked `open`, still saw `?utm…` — old rows
   cached pre-fix. Instead of demanding re-pulls: `maybe_migrate_cache`
   runs on every `/api/videos` view (rewrites JSON+CSV only when dirty,
   idempotent, missing-account safe) + extracted shared `_write_cache()`
   used by pull + migration. Just viewing the table heals it.
4. Footnote given: if `?utm…` ever reappears on fresh rows, suspect TikTok
   re-adding params on navigation (their site does that), not us.

Unique discoveries:
- `here` = opencode-ai via npm (`C:\Users\PC CUSTOM\...\npm\node_modules\
  opencode-ai`), PID-confirmed. Other PC = Win10, conhost defaults,
  Antigravity IDE. opencode TUI needs a Unicode-capable terminal OR
  `opencode web` + browser for full fidelity.
- Refactor hazard, live example: extracting `_write_cache` silently dropped
  the profile (`pp`) write AND left `pp` undefined — caught by re-reading
  the region before any run (NameError would have hit on next Refresh).
  Re-reads are not bureaucracy; this is the second save of the session.

## Bugs found & fixed (and the lesson from each)

24. **Stale cache survived a correct fix** — ingest-only cleaning left old
    rows dirty; user found it in one click. _Lesson: every data-normalizing
    fix ships with a read-time migration for pre-existing rows, or the fix
    is only half-shipped. Users never "re-pull to apply"._
25. **Refactor dropped the profile write + orphaned `pp`** — same session,
    same file, caught by re-read. _Lesson: any extract-method edit gets a
    full re-read of BOTH call site and new function before verify; the
    compiler won't catch a still-referenced-but-undefined name until the
    code path runs (and this path runs against live tokens)._

## Standing patterns to preserve (amends)

- "Do the dev note ritual" = append window section + bugs/lessons here,
  tick plan/changelogs for anything built since last ritual. No commit.
- Two-PC user now: always disambiguate machine + terminal app when helping
  with setup; `[Image N]` chip = image actually sent.
- Don't kill unfamiliar Python PIDs (6000 = system Python, left alone);
  only kill scratch servers you started (C:\Python314 ones), verified by
  Path before `Stop-Process`.

## Window 2026-09-20 — dashboard liveliness + sync/ born next door (latest)

Vibe: classic terse-owner day, single-sentence steers all the way down:
"why slow?" → "show the data flow instead" → "as popup?" → "go" → "show
example" → "go" → two-servers-one-time? → VS Code right-click-run ok? →
"last fetch timestamp" → "go" → "export csv number column" → ritual. Zero
"Screenshots this window except one (VS Code context menu). Every feature
went words-first (plan-mode drafts + live question-tool pick for
stream-vs-poll and popup placement), then built on "go". Energy: pragmatic
shop-tidying before daily operations — the owner is shifting from
link-everything to RUN-everything (daily Sheets rhythm). Match it: short
replies, exact next action, no lectures.

What happened, in order:
1. **"Why slow?"** — diagnosed from code, no edits: 20-video pages +
   1s PAGE_DELAY + single-threaded HTTPServer. Concrete numbers from live
   caches (Dr__Samhan 2,530 videos ≈ 127 pages ≈ 3–4 min alone; ~10k total
   ≈ 10+ min for a full all-account sweep) + table renders thousands of
   rows + thumbnails at once. Prescribed Limit/range fast path (30 ≈ 2s).
2. **Live Refresh stream** (plan-mode → "go"): `post_json`/`get_json`
   gained `on_wait`, `pull_and_cache` gained `on_progress`/`on_wait`
   (best-effort, never break pulls), new `_stream_refresh` NDJSON endpoint
   (`progress` per page, `waiting` on 429/Retry-After, final `done`/`error`)
   on the SAME connection — single-thread safe, no poll endpoint needed.
   Non-stream JSON kept as fallback. Honest limit stated: no % bar, TikTok
   returns `has_more` only.
3. **Popup, not div growth**: centered `#refModal` (title + live line +
   5-line mini-log + Hide-keeps-running + View-table-on-done). Hide never
   aborts (reader keeps consuming); broken-pipe mid-pull still saves cache.
4. **Last-fetch timestamp**: cache `cached_at` (always written, never shown)
   exposed as `fetched_at` on `/api/videos` + both `/refresh` paths via new
   `cache_fetched_at()` (mtime fallback); profile header + Videos count show
   `Last fetch: <MYT> (<relative>)` reusing `rel()`; popup done-line logs it.
5. **Export `#` column**: `exp()` header gains `#` first, rows `i+1` —
   matches on-screen order (filtered included).
6. **Two-servers question**: dashboard 8080 vs creative-analysis server.py
   8000 — different ports, run both at once in TWO terminals (one terminal
   can't: first server never exits). VS Code "Run Python File in Terminal"
   reuses ONE integrated terminal → New Terminal for the second file.
7. **Data-where + commit-safe answers**: csvs/tokens gitignored per-user
   runtime; committing code never locks other machines out (they relink +
   Refresh their own caches; accounts.json already shared live-read).
8. **Sibling session built `sync/`** (NOT this window's code — separate
   builder, own docs at `sync/DEV_NOTES.md` v1–v9): `sheet-sync.py` daily
   TikTok→Sheets bridge (11 sheets: Dashboard + 10 tabs `@user / Name`,
   A-B user customs + checkbox validation, C-N system upsert by Video ID,
   deltas, HYPERLINK jump links, tab colors, footer timestamp, window
   presets today/yesterday/since-until/full, `run-sync.ps1` launcher with
   window→scope→dry-run menus). First `--all --days 7`: 10/10 (242 videos).
   `.gitignore` extended (sync secrets/logs/__pycache__). UNTRACKED
   (`?? tiktok-account/sync/`); dashboard work committed `4f9a792` 09:09
   +0800 by owner mid-window (message is bare `git status` text — see
   lesson 29). This window ended with owner pasting a `run-sync.ps1`
   `--today --all` run stopped at the `Dry-run preview first? [y/N]:`
   prompt — UNANSWERED, run outcome unknown.
9. **Ritual**: this section + bugs/lessons, feature/plan/CHANGELOG ticks,
   MASTER-* rollup. No commit (rule).

Unique discoveries this window:
- `cached_at` has been in every cache JSON since `_write_cache` existed —
   the timestamp feature was purely exposure, zero migration needed.
- `4f9a792` proves the owner commits from another surface mid-window;
   always `git status` before ritual edits — the tree may have moved under
   you (it did: dashboard files committed while sync/ stayed untracked).
- `accounts.json` now 20 entries but sync sheets cover "first 10 active" —
   slot coverage vs full list is next window's question, not this one's
   assumption.

## Bugs found & fixed (and the lesson from each)

26. **`hour12,false` typo in new `exp()`** — object literal needs the colon;
   broke ALL dashboard JS. Caught by `node --check` before any browser run.
   _Lesson: the verify ritual is the safety net, not the re-read — run
   `node --check` on EVERY html edit even when the diff looks trivial._
27. **Double-dot typo (`decode()..strip()`) in temp smoke script** — inline
   `python -c` quoting/typing hazard, same class as bug 16. _Lesson: temp
   verification scripts go in FILES (`write` tool), never `-c` one-liners;
   syntax-check the helper before trusting its verdict._
28. **`head -20` in PowerShell 5.1** — not a cmdlet. _Lesson: this shell gets
   `Select-Object -First N`, `;`/`if ($?)` chaining, never `&&`/`head` —
   re-learned every few windows; pin it._
29. **Owner-composed commit message = raw `git status` text (`4f9a792`)** —
   not a bug in code but a repo-hygiene incident (MASTER-AGENTS §3 says
   messages say what changed). _Lesson: next window, offer `git commit
   --amend -m` wording IF owner asks to touch history — never amend
   unasked; just note it here and move on._

## Window 2026-09-23 — active badge + review track + portable docs (night)

Vibe: closeout stretch of a marathon day (sync v19 already pushed
`2663c7a`). Owner steering in single sentences with screenshots:
which token file is which, picker should show active status, portal
product/scope dialogs, Pages-vs-Vercel, publish-online-vs-Tailscale,
USB token copy, portable MCP. Two Plan-mode excursions (review plan,
column-placement debate settled by ELI5) with clean build-mode
follow-throughs. Short "ok go" rhythm held throughout.

What happened, in order:
1. **Token-file ID**: `Dr_Samhan.json` = slot Dr Samhan
   (@affiliatedrsamhan1), `Dr__Samhan.json` = slot Dr. Samhan
   (@dr.samhan) - `safe()` maps `.` to `_`. Verified via `linked_as`
   (usernames only, token values never printed): both clean, old
   cross-link incident resolved. All 10 relinked (sandbox).
2. **Picker active status** (built): `/api/accounts` now carries
   `active` from accounts.json; grey `inactive` tag + dimmed rows,
   still selectable. Verified py_compile + `node --check` + live smoke
   on scratch port 8099 (21 accounts / 15 active, server stopped after).
   `feature.md` + `CHANGELOG.md` + `plan.md` ticked.
3. **Review track** (words only): stay-on-Sandbox evaluated (10/10 slots,
   dummy clean locally, portal count still owner's check); Production
   parity list (4 scopes incl basic/profile, Desktop redirect re-add),
   demo-video plan, per-scope justifications, cutover = key swap +
   10 relinks. Decision open. Portal guidance given: tick NOTHING except
   Login Kit (done) + the Display card (scroll - it was off-screen);
   no Posting/Share/Webhooks/Portability/Local Service.
4. **Hosting questions** (words only): Pages wins over Vercel (static
   surface only, re-verify cost); Pages cannot hold Neon creds (browser
   Postgres = leaked secrets); publish-online vs Tailscale - recommended
   Tailscale + encrypted backup over public hosting (no auth gates, stdlib
   server, portal/review churn); USB token-copy file list + conditions.
5. **Portable docs** (built on go): `otherdevice.md` section 4 token-copy
   path, `exit-entry.md` portable-MCP checklist + token pointer.
6. **accounts.json reordered by owner** (data identical, 21/15) - user's
   order, keep; it renumbers the sync scope menu.

Unique discoveries this window:
- `linked_as` on the token is the ground truth for slot-vs-login
  questions - filename is only the slot. Read usernames, never values.
- Portal Add-dialogs grey buttons + missing entries resolve to: scroll,
  search, then trust the attached-list tab, never the dialog.
- `accounts.json` grew 20 -> 21 entries; dashboard shows all 21, sync
  covers active-10 semantics per its own picker (`pick_accounts`).

30. **No new code bugs this window.** Process note: plan-then-build
    excursions worked because each feasibility answer ended with an
    explicit question and each build was verified on live surfaces.
    _Lesson: keep that rhythm; never let plan-mode advice drift into
    uncommitted code without a `go`._
