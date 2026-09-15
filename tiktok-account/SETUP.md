# TikTok Display API — Setup to First CSV (Sandbox)

Audience: developer + team (non-technical can follow the click paths).
Scope: ends at today's win — sandbox login → token → `video/list` → CSV.
Production approval (demo video → review) is the NEXT step, not this doc.

## 1. Goal / success

For each owned TikTok account, bulk list public videos with post time via the
official Display API (`POST /v2/video/list/`, `video.list` scope), paginated by
`cursor` while `has_more=true`, exported to CSV.

Success = `tiktok-account/csvs/<Account>_videos.csv` with columns:

`account, id, title, posted_myt, posted_utc, view_count, like_count,
comment_count, share_count, cover_image_url, share_url`

Proven today: `TestDummy` (0 videos → posted 1 → counts filled), then
`DrSamhanWellness` (real rows). MYT = UTC+8.

## 2. Prerequisites

- TikTok developer account + one app at `developers.tiktok.com` (this app).
- Python 3 on the helper's laptop (tester is stdlib-only, no npm).
- Ability to log in to each TikTok account (dummy first, then the 10 managed).
- Repo Pages live (source `main` / `(root)`, project site).

## 3. App registration (portal click-path)

`My Apps` → open app → app details:

- Category: `Utilities`
- Description (73 chars, limit 120) — paste exactly:
  `Internal tool to list our own TikTok videos and post times for analysis.`
- Platforms: `Web` only (Login Kit still uses Web + Desktop tabs below).
- Web/Desktop URL: `https://ikrammdzmn.github.io/marketer/`
- Terms: `https://ikrammdzmn.github.io/marketer/docs/terms.html`
- Privacy: `https://ikrammdzmn.github.io/marketer/docs/privacy.html`
- Tool (reference): `https://ikrammdzmn.github.io/marketer/tiktok-creative-analysis/`

## 4. Domain verification

Project sites serve under `/marketer/`, never at bare `github.io`.

- Files `tiktok*.txt` stay at repo root → served at
  `https://ikrammdzmn.github.io/marketer/tiktok*.txt`.
- In TikTok portal → `URL properties for Production` → verify row 2:
  `https://ikrammdzmn.github.io/marketer/` (URL-prefix).
- Do NOT verify bare `https://ikrammdzmn.github.io/` (fails by design).
- Ignore `Domain` (DNS) type — impossible on `github.io`.
- Confirm liveness by opening the exact served `.txt` URL (must return
  `tiktok-developers-site-verification=...`) before pressing Verify.

## 5. Sandbox (required pre-approval)

Production blocks `video.list` before approval (`client_key` error). All
testing happens in Sandbox.

1. `Manage apps` → open app → top toggle `Sandbox` → `Create Sandbox`
   (clone production config). Up to 5 sandboxes allowed.
2. `Sandbox settings` → `Target users` → `Add account` → log in as each
   TikTok to whitelist (dummy first). Max 10 target users; entries can take
   up to ~1 hour to show. Dummy occupies 1 slot — remove it before adding
   all 10 real accounts.
3. Copy the **Sandbox** Client Key + Secret (not Production) into the
   helper's `tiktok-account/.local_secrets.json` (see §7). Sandbox and
   Production have separate keys, redirects, and scopes — anything set in
   Production must be re-set in Sandbox.
4. Sandbox → `Products` → add `Login Kit` AND the product covering
   `video.list` (shown as `TikTok API` / `Content Display`; older name
   `Display API`). Then `Scopes` → tick `user.info.basic` + `video.list`.
5. Sandbox → `Login Kit` → redirects (must click `Add a URI` + Save):
   - `Web` tab: `https://ikrammdzmn.github.io/marketer/tiktok-creative-analysis/`
     (`Web` forces `https://`; `http://` always errors here).
   - `Desktop` tab: `http://127.0.0.1:8080/callback` (exact, no trailing
     slash). Desktop allows `localhost` / `127.0.0.1` with port.

## 6. Login Kit notes

- Authorize URL (tester builds it): `https://www.tiktok.com/v2/auth/authorize/`
  with `client_key, scope=user.info.basic,video.list, response_type=code,
  redirect_uri, state, code_challenge, code_challenge_method=S256`.
- If TikTok bounces authorize → generic login → feed (no Authorize button):
  stay logged in, then paste the original authorize URL again in the same tab.
- QR login: after scanning, confirm on the phone app, then Authorize on PC.
  Prefer Incognito if the page sticks (see §9, 431).

## 7. Tester — install and run (helper)

Local-only: binds `127.0.0.1`, stdlib only. Tokens stay on the laptop.

Setup (once):

```powershell
Copy-Item "tiktok-account\.local_secrets.EXAMPLE.json" "tiktok-account\.local_secrets.json"
notepad "tiktok-account\.local_secrets.json"
```

Paste Sandbox Key + Secret, Save. Never commit this file (gitignored).
Alternative: env `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`.
Security: the Production secret was pasted in chat during setup — rotate it
in the portal; only Sandbox secret stays in the local file.

Run (one account per run, default port 8080 to match the Desktop URI):

```powershell
python tiktok-account/tester.py --account TestDummy
```

Then open `http://127.0.0.1:8080/` → click `1) Login...` → log in as that
same TikTok account → Authorize `video.list` → lands on `/callback` →
`Done: N videos`, saved to `tiktok-account/csvs/<Account>_videos.csv`.
Repeat per account (`DrSamhanWellness` → `@drsamhanwellness`, etc.).

Rules: exactly ONE tester process at a time; leave its PowerShell open until
`Done`; each code is single-use — never refresh `/callback`, never reuse a
TikTok tab. For a new attempt: `Ctrl+F5` on `/`, fresh login, fresh Authorize.

## 8. Verification ladder (do in this order)

1. `TestDummy` → expect `Done: 0 videos`, header-only CSV (proves
   login → token → list → save).
2. Post 1 public video on dummy → rerun fresh → CSV gains 1 row with MYT
   time (proves `create_time` + UTC→MYT).
3. Same rerun → `view/like/comment/share` columns fill (proves field set).
4. `DrSamhanWellness` as `@drsamhanwellness` → real rows (proves per-account
   OAuth; repeat for all 10).

CSV notes: only public videos return (private/deleted/under-review excluded);
cover URLs have ~6h TTL (re-pull before embedding); `share_url` carries
`tiktok.com/@user/video/id` plus API tracking params.

## 9. Roadblocks solved

| # | Symptom | Cause | Fix |
|---|---------|-------|-----|
| 1 | Pages tool 404 while terms worked | Source `/docs` serves only `docs/` | Source `main`/`(root)`; whole repo live |
| 2 | Bare-domain verify fails | Project files serve under `/marketer/` | Verify URL-prefix `.../marketer/` |
| 3 | `Web` redirect rejects `http://127.0.0.1...` | Web tab forces `https://` | `http` goes in `Desktop` tab |
| 4 | `https` redirect still rejected | Page 404 (`/callback/`) + domain unverified | Use live URL (`.../tiktok-creative-analysis/`) until verified |
| 5 | `code_challenge` error | PKCE missing | Add `code_challenge` + `S256` |
| 6 | `client_key` error on authorize | Production blocks `video.list` pre-approval | Test in Sandbox with Sandbox key |
| 7 | `non_sandbox_target` | Login account not whitelisted | Add it under Sandbox `Target users` |
| 8 | `redirect_uri` error | Sandbox list ≠ Production list / port mismatch | Re-add exact URI in Sandbox Desktop; run on 8080 |
| 9 | `Only application/x-www-form-urlencoded...` | Token POST sent as JSON | Token exchange is form-encoded; `video/list` stays JSON |
| 10 | `Code verifier or code challenge is invalid` | Base64 challenge, or code older than tester run | Desktop wants **hex** SHA256 challenge; one run = one code, no mid-flow restart, no `/callback` refresh |
| 11 | Token JSON shown as `Error:` | Parser expected `data.access_token` | Token is flat: `access_token` at top level |
| 12 | `State mismatch` | Two testers running, or stale tab | Kill all (`Get-Process python \| Stop-Process -Force`), one run, `Ctrl+F5`, fresh link |

## 10. Troubleshooting (exact error → action)

- `HTTP ERROR 431` / `This page isn't working` (authorize or Add account):
  stale TikTok cookies. Use fresh Incognito (portal login → Add/login there),
  or clear `tiktok.com` cookies, or switch browser (Edge/Firefox).
- `Something went wrong ... code_challenge`: restart tester (fix is in),
  fresh link must contain `code_challenge=`.
- `... client_key`: you are on Production pre-approval → switch to Sandbox
  key + Sandbox flow (§5).
- `... non_sandbox_target`: add that exact TikTok under Sandbox target users,
  wait, retry as that account.
- `... redirect_uri`: compare tester URI vs Sandbox Desktop entry
  character-for-character; drop any `--port` flag (use 8080).
- `... Code verifier or code challenge is invalid`: full clean cycle (§7
  Rules) — kill all, start once, fresh `/`, fresh Authorize, land once.
- `Missing keys...`: create `.local_secrets.json` from the `.EXAMPLE` file
  (§7) or set env vars; never commit it.
- `Cannot find a process with the name "python"`: nothing running — safe to
  start the tester.
- CSV header-only: account has no public videos (dummy before posting) —
  post 1 public video, rerun fresh.
- Logged into feed but no Authorize: you logged into TikTok, not the app —
  repaste the authorize link in the same tab, then Authorize.

## 11. Next (out of scope, one line)

Record one sandbox dummy run (login → Authorize → list → CSV) as the demo
video, attach it to the TikTok app review with the §3 description text, get
Production approval, then swap Production Key/Secret in and rerun §7 for the
10 accounts.
