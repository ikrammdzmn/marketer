# AGENTS.md — tiktok-account folder conventions

New mini-project: bulk list of videos + post times per TikTok account via the
official TikTok Display API (`POST /v2/video/list/`, `video.list` scope,
`create_time` field). No npm, no build — plain docs + a small local tester
(pending) that stays on the owner's laptop.

## Files

- `AGENTS.md` — this file (conventions for this folder).
- `DEV_NOTES.md` — private handoff notes between sessions (vibe + facts).
- `feature.md` — end-user guide (non-technical). Update it when behavior changes.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `../docs/terms.html` + `../docs/privacy.html` (repo root) — TikTok app-review
  pages (Himwellness internal-use wording). Do not move without updating the
  TikTok app form URLs.
- `../tiktok*.txt` (repo root, 3 files) — TikTok domain-verification files. Must
  stay at root (serve at `/marketer/tiktok*.txt`); never rename.

## Accounts

The 10 managed accounts live in
`tiktok-creative-analysis/data/accounts.json` (exact names authoritative there).
This folder does not duplicate that list — it reads it when the tester is built.

## Run / verify

Nothing runnable yet. When the tester lands: local-only, stdlib preferred,
`127.0.0.1` only, never expose tokens. After EVERY change: syntax check +
smoke test; always stop background servers.

## Rules

1. **Official API only in this folder** — no scrapers, no unofficial endpoints.
   Display API works for OWN authorized accounts only (one OAuth per account).
2. **Secrets never committed** — Client Secret / access tokens stay in-memory or
   in an untracked local file; never in git.
3. **Replies**: short. Feasibility questions ("just answer, do not edit") get
   words only; code only on explicit "proceed/go/build".
4. **GitHub Pages** (source `main`/`(root)`, project site): URLs carry the repo
   path (`.../marketer/docs/terms.html`). Switching source moves every URL —
   update the TikTok app form on switch. Domain verification on github.io:
   verify URL-prefix WITH repo path (`.../marketer/`); `Domain`/DNS type is
   impossible on github.io.
5. **Don't touch `tiktok-creative-analysis/`** from this folder's work unless
   asked — that tool has its own AGENTS.md and invariants.
