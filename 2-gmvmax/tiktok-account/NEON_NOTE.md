# NEON_NOTE.md — agent note for tiktok-account/

> Long-term plan: single Neon project (Singapore region) serves the entire repo.
> This folder owns the `acct` schema only. Read this before changing auth/storage.

## Ownership
- Schemas: `core` (shops, users, audit) / `acct` (this folder) / `gmv` (gmvmax-auto) / reserved `strategy`, `creative`.
- This folder: tables `acct_tokens` (encrypted!), `acct_videos`. Never write to `gmv_*` or `core` without cross-project check.
- Full cross-project plan: `../gmvmax-auto/masterplan.md`.

## Invariants (do not break)
1. `tester.py` is FROZEN file-based fallback — new work goes in `dashboard/`.
2. Migration path: dual-write (file + DB) first, then DB primary with local `csvs/` + memory cache-serve. Dashboard must render from cache when Neon is unreachable.
3. Tokens encrypted with Fernet (`GMV_ENC_KEY` in env or gitignored `.local_secrets.json`, never in git). Never add plaintext token columns. Production secret pasted in chat before 2026-09-17 must be rotated in portal.
4. Numbered migrations only, never edit applied files. Separate roles (`acct_app` GRANT on `acct` only). DEV vs PROD via `NEON_URL_DEV` / `NEON_URL_PROD`; UI must show branch.
5. `git status` must never show secrets. `tokens/`, `csvs/`, `.local_secrets.json` stay gitignored during dual-write.
6. Order: `acct` migration first (low-risk), `gmv` second. Keep stdlib-only unless `cryptography` approved for Fernet (no hand-rolled AES).
