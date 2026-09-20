# tiktok-account — bulk video + post-time via TikTok Display API

Status: DASHBOARD READY (local only; link each account once, then select + Refresh)

## 1. Goal

- For each of the 10 managed accounts: bulk list of public videos + post time
  (`id, title, create_time, cover_image_url, share_url, view/like/comment/share counts`) via official
  `POST /v2/video/list/` (`video.list` scope), paginated by `cursor` while
  `has_more=true`, exported to CSV/Excel.

## 2. Scope

- [x] Options explained; user picked Option 1 (official Display API, own accounts)
- [x] TikTok app form values: Category `Utilities`, description (<120 chars),
  Platforms `Web` only
- [x] `docs/terms.html` + `docs/privacy.html` published via GitHub Pages
  (live at `.../marketer/docs/terms.html`, `.../docs/privacy.html`)
- [x] GitHub Pages source `main`/`(root)` (tool + docs both live)
- [x] Domain verification: URL-prefix `https://ikrammdzmn.github.io/marketer/`
  verified by user (3 `tiktok*.txt` live at root; `Domain`/DNS type skipped)
- [x] TikTok app: Client Key + Secret supplied (kept off-git); redirects:
  Web `.../marketer/tiktok-creative-analysis/`, Desktop `http://127.0.0.1:8080/callback`
- [x] Local OAuth + paginate-to-CSV tester `tester.py` (stdlib, 127.0.0.1 only,
  secrets via env or untracked `.local_secrets.json`; scopes
  `user.info.basic,profile,stats + video.list`; per-account profile JSON +
  video CSVs; smoke-tested 200)
- [ ] One account live end-to-end: authorize → all pages → CSV with post times

## 3. Verify

- [x] Terms/privacy URLs open (200) before pasting into TikTok form
- [x] Verification file live: `.../marketer/tiktok22A2*.txt` fetched OK
- [x] Tester smoke: `/` returns 200 with TikTok login link (dummy keys, port 8083)
- [x] Tester live-proven (sandbox): `TestDummy` authorize → token → 1 posted video → `csvs/TestDummy_videos.csv` (MYT+8 OK)
- [x] Dashboard `dashboard/` (stdlib, 127.0.0.1:8080): per-account pending OAuth,
  silent refresh, cached table + profile header + Refresh + Export;
  accounts from `accounts.json`; own `dashboard/csvs/` + `tokens/` (gitignored);
  smoke: `/` 200, `/api/accounts` 10. Tester kept as fallback (`--port 8081`).
- [x] Throttle fix (429): 1s page gap + Retry-After backoff on 429/5xx (5 tries);  range Refresh (`since/until` from calendar, early-stop newest-first, merged
  cache) so 700–2000-video accounts pull safely.
- [x] Unlink button (linked accounts only) + `/unlink` endpoint; deletes the
  token file, keeps cached videos viewable.
- [x] Link-mismatch guard (warn-with-override): `/callback` verifies the
  logged-in `@username` against the slot, blocks silent mislinks with a stop
  page (try again / jump to matching slot / checkbox save-anyway), flags
  duplicates, stores `linked_as`+`mismatch`, amber pill state.
- [x] Calendar hover preview: after start-day click, hovering previews the
  range (highlight + button label) before the end-day click.
- [x] Calendar Clear button + single-click selects one day at once (no more
  double-clicking the same day).
- [x] Title-cell thumbnails (40px, lazy-load, click opens full cover,
  auto-hide when the ~6h cover link expires).
- [x] Fetch limit: Limit box next to Refresh — All / 30 / 50 / 100 / custom;
  Refresh fetches newest N only, merged into cache (30 ≈ 2 pages, ~2s).
  Composes with range filter.
- [x] Clean video links: `?utm_campaign…&utm_source…` tracking stripped at
  ingest (table + CSV + export); cover URLs untouched (query = expiry key).
  Old caches auto-migrate on next table view (no re-pull needed).
- [x] Live Refresh popup: `/refresh?stream=1` streams NDJSON progress
  (per-page page + videos-so-far, rate-limit waits, final done/error) on the
  same connection; centered popup shows it live, Hide tucks it away without
  stopping the pull; old single-JSON path kept as fallback.
- [x] Last-fetch timestamp: profile header + Videos count show `Last fetch:
  <MYT datetime> (<relative>)` from cache `cached_at` (served via
  `/api/videos` + `/refresh` done); popup done-line logs it too.
- [x] Export `#` column: CSV download leads with the on-screen row number
  (same filter, same order).
- [x] `sync/` daily Sheets bridge (own docs in `sync/`): `sheet-sync.py`
  upserts 7-day window by Video ID into 11 sheets (Dashboard + 10 tabs),
  A-B user customs, deltas, jump links, colors, window presets
  (today/yesterday/since-until/full), `run-sync.ps1` launcher; first
  `--all --days 7` 10/10 live. Untracked until owner asks to commit.
- [ ] Table page-size (planned, if wanted): show N rows at a time in browser
  (e.g. 30/page with Next/Prev) for fast rendering on 2000-video accounts.
- [ ] Link all 10 real accounts end-to-end (one Authorize each)
- [ ] 10 real accounts end-to-end: authorize → all pages → CSVs with post times
