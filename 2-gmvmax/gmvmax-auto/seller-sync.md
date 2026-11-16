# seller-sync.md — Seller Creative organic sync contract (one contract, two writers)

Shop Open API → Neon `creative.*` → `/seller-creative` Seller tab. Two writers,
same keys, same rules — read this before touching either.

## Sources (Shop Open API, Analytics app, shop 1)

- `GET /analytics/202509/shop_videos/performance` — per-day per-video listing.
  Params: `start_date_ge`, `end_date_lt` (= day+1), `sort_field` views|gmv,
  `page_size` 100, `page_token` (base64, first-`=` split preserved).
  Shape (probe-verified Nov-26): `{video_list|videos[], latest_available_date,
  next_page_token|page_token}`; rows carry `id, views, click_through_rate,
  gmv{amount,currency}, sku_orders, username, title, duration, video_post_time
  ("YYYY-MM-DD HH:mm:ss", MYT), hash_tags[], products[{id,name}]`. **No cover
  field. No retention. No engagement (likes/comments/shares). No indirect split.**
- `GET /analytics/202509/shop_videos/{id}/products/performance` — per-video-day
  product imp/clicks: `{products[{product_impressions, product_clicks, ctr,
  customers, ...}], total_count}`. Imp = PRODUCT impressions (~87.5% of views).
- `GET .../overview_performance` — `latest_available_date` only (lag guard).
- `GET auth.tiktok-shops.com/api/v2/token/refresh` — rotation; SAVE the new
  refresh token (B138 lesson: expiry-1h auto-refresh or the 7d token dies).

Walk (both writers identical): views-sort pass + gmv-sort pass, newest-first,
100/page, ≤25 pages; stop views-pass after 2 thin pages (<100 views), gmv-pass
after 2 seller-less pages. Keep row iff views ≥ 100 OR gmv > 0. Money unwrap
`{amount}` (B142). Post time +08:00. Snowflake `postedFromId` fallback.

## Neon tables (`038_creative_organic.sql`)

- `creative.video_day_organic (video_id, date)` — views/ctr/gmv(`null` = unknown,
  never 0-fill)/sku_orders + imp/clicks (NULL = not yet pulled). Rewrite-on-revise
  upsert; imp = `COALESCE(EXCLUDED, stored)` (listing syncs never wipe Fill).
- `creative.video_meta (video_id)` — username/caption/duration/hashtags/products/
  posted_api/posted_from_id/account_class/cover_url. First-known-wins EXCEPT
  account_class (overwritten every sync from the mapping below).
- `creative.ads_manager_day` — migrated, EMPTY (integrated pull parked).

## Account classes (B-taxonomy, post-pull enrichment — never gates the pull)

`resolveAccountClasses` reads `creative.accounts` (exact lower match, cached per
run): active=false → inactive; top_affiliate → top_affiliate; else internal;
unregistered → legacy regex (`/samhan|himcoffee/` → linked, else affiliate).
DB fail-open → legacy regex. Re-sync relabels old rows automatically.

## The two writers

| | Online `/api/seller-creative/sync` (+ `imp`) | Local `seller-backfill.py` |
|---|---|---|
| When | Manual Sync / Fill buttons; single-day chunks (server ≤7d guard, client loops 1d) | `SellerBackfill-Nightly` task, daily 00:30, `--days 2`, 25-min self-stop |
| Scope | Listing (+ optional ≤15 imp cands, ≥10k views or sales) | Listing + imp for ALL qualifying video-days in range |
| Token | `shop-analytics-credentials.ts` (env keys + Neon row) | Same Neon row + `.local_secrets.json` keys (Fernet n/a — tokens stored plaintext) |
| Imp | `imp` route, 5/batch, 8 rounds/day | Inline per video-day, deadline-checked |
| Skip rule | None (user picks range) | Days newer than `latest_available_date` skipped + logged |
| Log/notify | Fetch popup + toast + `msg` | `seller-backfill.log` (append) + Telegram topic 30 (`TELEGRAM_THREAD_ID`); exit 0/1/2 |

Fail-open everywhere: per-day errors collected, never thrown; 429 → exponential
backoff (verified risk is 429 only, not token damage); non-JSON → snippet error.

## Schedules on this PC (verified 15 Nov 2026)

- `SellerBackfill-Nightly` 00:30 daily (25-min cap, StartWhenAvailable) → imp backfill.
- `TikTokSync-{Morning,Evening,Night}` → tiktok-account dashboard (different module).
- `PCShutdown-1AM` daily 01:00 (`/f`, forced). NO `GMVMaxCollector30m` on this PC
  (AGENTS.md stale — fix when touching it).
- Sleep-after = Never on AC: locked-at-midnight runs fine; logged-off defers to boot.

## Verify a sync (ground truth)

`temp-data/Video Performance List_*.xlsx` (Seller Center export, video grain) vs
Neon same range: overlapped videos must match GMV to the cent; export-only tail
must sum RM0 (proves the 100-view floor drops nothing real); neon-only videos
with GMV = deleted/privated since export (flag if it grows). Imp totals will
always trail export (Fill scope — by design, not a bug). Throwaway checker lives
in `%TEMP%\opencode\xcheck.py` (not committed) — re-create per run.

## Profit + insight math (docs/04 + doc-08, exact cutoffs)

- `untung = GMV×0.35 − kos ads` (MARGIN const, per-product config parked);
  breakeven ROI 2.86; "jauh melepasi" floor 8.
- Hook tiers from reference P25/P75 (loaded ≥500-imp rows): kuat/lemah/sedang;
  endurance on reach=habis/50: ≥38% kuat, 29–37% biasa, else lepas;
  completion setanding ±15%. Fixed win order: reply, authority, ROI≥8, evergreen.
- Reference should be trailing-90d recomputed nightly; until history exists
  (≈Jan 2027) the loaded window stands in with its range printed.
- Subtitle-only bullets (voice start, beg-kuning ≥50% position, script density)
  and covers are absent by design — never synthesize them.
- Validation: `validate-insight.py` vs `video_insight.json` (frozen 1 Ogo–26 Okt
  medians first). Known deltas: Oct-slice ROI understates full-window ROI;
  spoken-authority (subtitle) vs caption regex (expect ~85%, not 100%).
