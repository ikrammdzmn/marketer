# Changelog — tiktok-account dashboard

Local-only release record, newest first. One line per shipped change.
Rollup: `1-MASTER/MASTER-CHANGELOG.md`. Status checklist: `plan.md`.

## 19 Sep 2026 — live Refresh progress popup
- Last-fetch timestamp: profile header + Videos count show `Last fetch:
  <MYT> (<relative>)` from cache `cached_at` (new `fetched_at` on
  `/api/videos` + `/refresh` done); popup done-line logs it → `plan.md`
- `/refresh?stream=1` streams NDJSON progress (per-page page/videos-so-far,
  retry waits, final done/error) on the same connection (single-thread safe);
  centered popup shows it live, Hide tucks away without stopping the pull;
  non-stream JSON path kept as fallback → `plan.md`

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
- Clean video links: tracking query stripped at ingest (covers untouched);
  pre-existing caches auto-migrate on view (shared `_write_cache` writer)
- `feature.md` rewritten as full non-technical showcase + guide

## 15 Sep 2026 and earlier (grouped)

- Dashboard ready: per-account OAuth, silent refresh, cached table + profile
  header + Refresh + Export, accounts read live from
  `tiktok-creative-analysis/data/accounts.json` → `plan.md`
- `tester.py` sandbox-proven (FROZEN since) → `plan.md`
- Terms/privacy pages + domain verification via GitHub Pages → `SETUP.md`
