# Changelog — tiktok-account dashboard

Local-only release record, newest first. One line per shipped change.
Rollup: `1-MASTER/MASTER-CHANGELOG.md`. Status checklist: `plan.md`.

## 17 Sep 2026 — scale-hardening + linking safety

- Link-mismatch guard (warn-with-override): `/callback` verifies logged-in
  `@username` vs slot, 409 stop page (retry / jump to matching slot /
  checkbox save-anyway via `POST /confirm-link`), duplicate flagging,
  `linked_as`+`mismatch` on tokens, amber pill → `plan.md`
- 429 fix: 1s page gap + 429/5xx retry (5x, honors `Retry-After`) → `plan.md`
- Range Refresh (`since/until` early-stop, merged cache) + Fetch limit box
  (All/30/50/100/custom newest-N, merged) → `plan.md`
- Unlink button (linked-only) + `GET /unlink` (token deleted, cache kept)
- Calendar: hover range preview, single-click selects one day, Clear button
- Posted column: MYT datetime primary + grey relative below; 40px lazy
  title-cell thumbnails (expired-cover auto-hide); page widened 1280→1760px
- `feature.md` rewritten as full non-technical showcase + guide

## 15 Sep 2026 and earlier (grouped)

- Dashboard ready: per-account OAuth, silent refresh, cached table + profile
  header + Refresh + Export, accounts read live from
  `tiktok-creative-analysis/data/accounts.json` → `plan.md`
- `tester.py` sandbox-proven (FROZEN since) → `plan.md`
- Terms/privacy pages + domain verification via GitHub Pages → `SETUP.md`
