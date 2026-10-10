---
name: neon-db
description: Neon conventions for this repo (migrations, branches, patterns). Load before any schema or SQL work.
---

# Neon DB skill (repo-local, verified-only)

Project `TIKTOK DATA`, AWS APAC-1 Singapore. Branches: `production`
(default, never expires) + `dev` (child). **Child branches default to
1-day auto-delete — uncheck at creation** for persistent dev (B3).
Owner runs migrations in the SQL Editor, dev first then prod.

## Migration law (violations are the top bug source)

- **Schema-qualify EVERY identifier** (`acct.x`, `gmv.x`, `core.x`,
  `creative.x`, `ttam.x`) — indexes + FK refs included. Unqualified DDL
  lands in `public` and counts read 0 (B1).
- **Never bare reserved words** as columns (`window`→`win`, never `order`,
  `group`, `user`). Renaming beats quoting (B2).
- **Never edit applied files** (`001`–`018` frozen) — new fix = next number.
  Grep-check new SQL before handing over.
- Seeds live in-file (`012` presets, `016` catalog) via `ON CONFLICT`
  upserts — reruns safe. Reruns showing skip-notices = success.

## Write patterns (Hobby-safe)

- Rewrite-on-revise: `ON CONFLICT (...) DO UPDATE` everywhere (TikTok +
  shop restate intraday). No wrapping transaction on multi-row loops —
  partial progress persists, reruns continue (B27).
- Batch multi-row upserts (500/chunk). Range loops capped per endpoint.
- Per-day fail-open with `skipped` reporting — never all-or-nothing.

## Key tables

- `core.access_allowlist` (Google gate) + `core.audit` + `core.shops`.
- `gmv.gmv_campaigns` (campaign cache: THE promotion-type map — every
  report pull filters by it; campaign IDs come from here, never re-prove
  `campaign/get`) + `gmv.daily_shop_metrics` (014 shop cols) +
  `gmv.shop_hourly_orders` (015) + `gmv_campaigns.budget` (lazy info-fill).
- `creative.accounts/catalog_campaigns/catalog_products/targets/daily_rows`
  (016–018). `ttam.presets` (012). Shop tokens: credentials table,
  first-run seed from env.

## Secrets + roles

- Connection strings + keys live in gitignored `.local_secrets.json`
  locally, Vercel env in prod. Lengths-only in chat, never values.
- Per-schema roles (`acct_app`/`gmv_app`) deferred — owner-only for now.
  Never write `acct_*` from gmv code and vice versa.

## Evidence index

B1–B5 (schemas/branches/redirects), 013/014/015/016/017/018 handoffs,
Checkpoint 30 (branch recreate → self-sufficient 014) — gmvmax-auto `DEV_NOTES.md`.
