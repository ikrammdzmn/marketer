# AGENTS.md — tiktok-account folder conventions

Stage 1 local system: per-account video + post-time + counts dashboard via the
official TikTok Display API (`POST /v2/video/list/`, scopes
`user.info.basic,profile,stats + video.list`). No npm, no build — Python
stdlib server + vanilla JS page, Tailwind Play CDN for styling. Stays on the
owner's laptop (`127.0.0.1` only, never published as-is).

## Files

- `AGENTS.md` — this file (conventions for this folder).
- `DEV_NOTES.md` — private handoff notes between sessions (vibe + facts).
- `feature.md` — end-user guide (non-technical). Update it when behavior changes.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `SETUP.md` — portal + sandbox setup record (up to first sandbox CSV).
- `otherdevice.md` — per-PC rerun guide (keys + relink only; portal not repeated).
- `tester.py` — one-run-per-account fallback (stdlib, PKCE-hex, form token
  exchange). FROZEN — do not modify; new work goes in `dashboard/`.
- `dashboard/` — the main app: `dashboard.py` (stdlib server, per-account
  pending OAuth, link-mismatch guard on `/callback` + `POST /confirm-link`
  override, silent refresh, throttled/retried pagination with range
  (`since/until`) + newest-N (`limit`) early-stop and merged cache,
  `GET /unlink`, cached table APIs), `dashboard.html`
  (Tailwind UI: pill account picker incl. amber mismatch state, calendar
  range filter with hover preview + Clear + single-click day, Limit box,
  column toggles, MYT datetime + relative Posted times, lazy title-cell
  thumbnails), `tokens/` + `csvs/` (gitignored runtime), `.gitignore`.
- `.gitignore` — `csvs/`, `.local_secrets.json`, `__pycache__/`.
- `.local_secrets.EXAMPLE.json` — keys template (real file never in git).
- `../docs/terms.html` + `../docs/privacy.html` (repo root) — TikTok app-review
  pages (Himwellness internal-use wording). Do not move without updating the
  TikTok app form URLs.
- `../tiktok*.txt` (repo root, 3 files) — TikTok domain-verification files. Must
  stay at root (serve at `/marketer/tiktok*.txt`); never rename.

## Accounts

The 10 managed accounts live in
`tiktok-creative-analysis/data/accounts.json` (exact names authoritative there).
This folder never duplicates that list — dashboard reads it live per request
(no restart needed after adding an account there).

## Run / verify

```powershell
python tiktok-account/dashboard/dashboard.py          # owns 8080
python tiktok-account/tester.py --account X --port 8081   # fallback only
# open http://127.0.0.1:8080/
```

Local-only, stdlib preferred, `127.0.0.1` only, never expose tokens. After
EVERY change: `python -m py_compile` touched `.py` + `node --check` extracted
dashboard JS + HTTP smoke test on a scratch port; always stop background
servers. Secrets (Sandbox key, tokens) via env or untracked files only.

## Rules

1. **Official API only in this folder** — no scrapers, no unofficial endpoints.
   Display API works for OWN authorized accounts only (one OAuth per account;
   `--account` is just a filename label — data = whoever logged in).
2. **Secrets never committed** — Client Secret / access + refresh tokens stay in
   `tokens/` / `.local_secrets.json` (gitignored) or env; never in git, chat
   screenshots, or error pastes. `git status` must never show them.
3. **Replies**: short. Feasibility questions ("just answer, do not edit") get
   words only; code only on explicit "proceed/go/build".
4. **GitHub Pages** (source `main`/`(root)`, project site): URLs carry the repo
   path (`.../marketer/docs/terms.html`). Switching source moves every URL —
   update the TikTok app form on switch. Domain verification on github.io:
   verify URL-prefix WITH repo path (`.../marketer/`); `Domain`/DNS type is
   impossible on github.io.
5. **TikTok portal facts** (do not re-derive): Desktop PKCE challenge = hex
   SHA256; token exchange = form-encoded; token JSON is flat; Desktop
   redirects allow only `localhost`/`127.0.0.1` (Web tab forces `https`);
   Sandbox ≠ Production config (redirects/scopes/keys re-added); Sandbox
   target users cap 10 (~1hr to appear); production blocks `video.list`
   pre-approval (`client_key` error); codes single-use; one server process.
6. **Don't touch `tiktok-creative-analysis/`** from this folder's work unless
   asked — that tool has its own AGENTS.md and invariants.
7. **Linking verifies identity** — `/callback` compares the logged-in
   `@username` against the slot's `accounts.json` username (case-insensitive)
   and stops on mismatch (warn-with-override, never silent). Tokens carry
   `linked_as` + `mismatch`, preserved across refreshes. Never save a token
   without knowing who it belongs to.
8. **Pagination is throttled by design** — 1s page gap, 429/5xx retry (5x,
   honors `Retry-After`). Range/limit pulls merge into cache; only full
   pulls replace. Server is single-threaded: big pulls block other requests.
