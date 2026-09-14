# DEV_NOTES.md — handoff to next-window self

> Read this first. It carries the vibe, not just the facts.

## Window 2026-09-14 PM — TikTok Display API + GitHub Pages session (latest)

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

## Standing patterns to preserve

- Feasibility = words only; "proceed/go" = code. Short replies.
- Commit + push ONLY when asked. Secrets never committed.
- Pages: source `/(root)`; URL mapping flips on switch; re-verify pasted URLs.
- Verification files: confirm via live fetch of the exact served path first.
