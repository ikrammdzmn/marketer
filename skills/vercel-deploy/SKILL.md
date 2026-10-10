---
name: vercel-deploy
description: The deploy ritual for marketer-hw (deploy_online.py, Hobby caps, CLI auth). Load before any deploy or cron work.
---

# Vercel deploy skill (repo-local, verified-only)

App: Next.js 15 + Tailwind exception at `2-gmvmax/gmvmax-auto/online/`.
Vercel project `marketer`, prod alias `marketer-hw.vercel.app`,
Root Directory `2-gmvmax/gmvmax-auto/online`.

## The ritual (every change)

1. `python -m py_compile` (touched `.py`) + `npx tsc --noEmit` in `online/`.
2. Deploy from **repo root**: `python 2-gmvmax/gmvmax-auto/deploy_online.py`
   (never `--cwd` — Root Directory + `--cwd` double-applies and builds an
   empty dir; the "Production Overrides differ" banner is the tell).
3. Build log MUST list new routes + Middleware. Then live smoke signed-out:
   `/` → 307 to `/sign-in`, data APIs → 401, `/api/health` → 200.
   (Curl 200 on `/` ≠ redirect — check status + `Location`.)

## Windows + auth gotchas

- Script uses `npx.cmd` + shell on win32 (bare `npx` fails in subprocess).
- **CLI token expires mid-session** (`Not authorized`): never debug the
  deploy first — owner runs `npx vercel login`, then retry.
- Local `.vercel/repo.json` caches the directory; fix it if the CLI path
  looks stale after a move. PowerShell 5.1: `;` chains, no unix pipes
  (`head`/`tail`/`wc` don't exist), no `&&`.

## Hobby caps (shape every design)

- **60s serverless kill**: batch per-row writes (500/chunk), no wrapping
  transaction (partial progress persists, reruns continue), cap range loops
  (shop-daily ≤31d, creative ≤7d), chunked syncs.
- **Cron daily-only**: sub-daily `vercel.json` entries fail AT DEPLOY —
  hourly automation = `.github/workflows/hourly-sync.yml` pinger
  (Actions secret `CRON_SECRET`, ~60 free min/mo, skips 02–06 MYT).
- **Slow pushes**: `git push` tails hang 2–5 min here; timeout ≠ failure —
  verdict via `git status -sb`, retry with `--progress`.

## Security gates (don't regress)

- Middleware MUST live at `online/src/middleware.ts` (App Router ignores
  root `middleware.ts` — empty manifest = public shell). Verify the built
  middleware manifest is populated.
- Webhook/cron stay public to middleware ONLY via their own secret checks.
  `NEXT_PUBLIC_*` bakes at build time (env → Save → deploy, in that order)
  and is browser-visible by definition — never a real secret.
- Google OAuth: exact verified emails in `core.access_allowlist` or fixed
  `AUTH_ADMIN_EMAIL`; data APIs recheck membership per request; Vercel
  Protection blocks non-team callbacks (owner-only temporary disable).

## Evidence index

B27/28 (timeout/auth), B41–43 (webhook secrets), B51–56 (protection gates),
B61 (PS pipes), B65 (cron), slow-push discipline — gmvmax-auto `DEV_NOTES.md`.
