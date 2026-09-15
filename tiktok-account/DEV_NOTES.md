# DEV_NOTES.md — handoff to next-window self

> Read this first. It carries the vibe, not just the facts.

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
