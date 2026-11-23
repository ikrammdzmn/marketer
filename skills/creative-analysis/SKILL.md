---
name: creative-analysis
description: Rules of the local creative-analysis tool + online creative module. Load before creative-side work.
---

# Creative analysis skill (repo-local, verified-only)

Local tool: `2-gmvmax/tiktok-creative-analysis/` — static HTML/vanilla JS,
no npm/build. `server.py` binds `127.0.0.1` only. Online module: `/creative`
tab (probe, rows sync, Manage popup). `app.js?v=N` bump per change.
`pull_creative.py` mirrors Neon `creative.accounts`/`creative.targets` into
`data/` (prod default, `--dry-run`; needs `psycopg` + Neon URL; not carried:
`identity_id`).

## Data rules (do not re-derive)

- `accounts.json` is authoritative (exact `name` match only; username/ID/
  note display-only). Never invent names or "fix" spellings unasked.
  Pasted lists may carry invisible Unicode joiners — byte-verify first.
- `Product Card` = true catalogue rows (blank account + Product-card type /
  no video / no campaign). `Unknown account` = blank-account real videos
  (normal verdicts). Never merge them.
- 19-digit Post IDs exceed 2^53 — compare as Numbers, display may round.
- No CPM column in source (derive Cost÷Impr×1000). No ROI column in bulk
  dialect (derive Revenue÷Cost).
- Two dialects normalized in `rowsOfWorkbook`: standard 24-col creative
  export vs bulk (`Video title/Video ID/Campaign name/Campaign ID/
  Product ID`, `Video ID='N/A'` catalogue rows, `~`+hours filenames).
  Never branch downstream on dialect except the file badge.
- Join key everywhere: `keyOf(postId, account, creative)`.
- Status taxonomy (canonical: `1-knowledge/0-0-tiktok/gmvmax/product/
  exploration-status.md`): 10 stages; `Available` = rows minus the 5
  exclusion states. Status-by-day: one column per file, never summed.
- Insight engine: file-adaptive benchmarks (median CPM, top-20 min impr,
  median 2s rate/AOV, p90 ROI) — thresholds in code, never hardcoded.
  Online port live on /creative (aggregated posts, impression-weighted
  rates, derived CPM/AOV, targets override): same priority, Boost
  sec-clause KIV (no Exploration status in TikTok pulls) — do not
  re-add sec without a status source.
- Ratio totals recomputed from summed bases per metric, never summed ratios.
- `MAX_FILES = 31` single constant drives all gates + labels.

## Editing rules (this folder bites)

- Anchors: copy exact strings from Read output; ASCII-only anchors.
- Re-read the region after EVERY edit; grep touched identifiers.
- New cell affordance → ALL sibling renderers same session
  (`renderTop`/`renderCompare`/`renderTrend`/modal/preview).
- CHANGELOG line per release, counter never renumbers. `feature.md` +
  `plan.md` ticked per change. Commit/push only when asked.
- Never hand-edit `source-file/*.xlsx`.

## Online creative module (Phase A state)

- `/api/creative-probe` rounds 1–6 (grains, metrics, membership, identity,
  creative `item_id` dual-filter). `/api/creative-sync` (Neon IDs, ≤7d,
  scoped picker default himcoffee) + `creative.daily_rows` (018).
- Manage popup: SOP strip + grouped accounts + catalog, edit toggle,
  column chips (localStorage), changed-only stamps, JSON/CSV export.
- Ceiling: revenue/ROI per creative ✅ (round 6), Time-posted ❌,
  Creative-source ❌, secondary status = derived.
- Seller organic verified (Nov-26 probes): Shop `shop_videos/performance`
  returns NO cover field (rawKeys witnessed); imp = PRODUCT impressions
  (~87.5% of views), never video FYP; `latest_available_date` lags 1–2d;
  username/title/post_time/duration confirmed de-facto (ex-[andaian]).
  oEmbed has no `thumbnail_url`; embed `player/v1/{id}` iframe is gated
  server-side since ~17 Nov 2026 (fresh oEmbed links fail identically —
  TikTok-side, not our markup; playback on tiktok.com unaffected).
  Panels keep the original iframe + external link; preview images are
  parked on a product-thumb route into `cover_url` (product photo, not
  video frame). Per-video-day calls run
  0.5–10s (Claude-measured); scope imp to ≥10k views or sales.
- Product Top-5 lives on /creative per docs/04 table (Revenue/Click
  rate/CVR/25% view/Untung + Juga + Tiada-pertindihan); Seller stays a
  single GMV list — never put metric tabs on Seller.
- Local twin `seller-backfill.py` (+ 12:30am `SellerBackfill-Nightly`
  task): same walk/floors/upserts as the online lib; hub `/all-creative`
  is read-only (snapshot + Refresh, zero TikTok pulls).
- Analysis panels follow doc-08 (`claude-system-updated/docs/08`): hook
  3-tier on reference P25/P75 (≥500-imp rows), endurance on reach%
  (≥38 kuat / 29–37 biasa — reach, NOT leave; validator caught the
  inversion), ROI≥8 "jauh melepasi", fixed win order, both honesty
  caveats; subtitle-only bullets stay absent. `?` explanations = shared
  `hint.tsx`. Evergreen tab = Top-5 by Untung over last 3 FULL months
  (`GET /api/seller-creative/evergreen`, per-video o1/o2/o3, buckets
  auto-roll from MAX(date); Kuat = 3/3 months + ROI≥2.86, zero-cost
  passes). 91d backfill proven 17 Nov (15 Aug→13 Nov, ~19.8k
  video-days, 0 failed); live truth then: 3,246 videos, 32 Evergreen,
  17 Kuat.
- Validate bullets with `validate-insight.py` vs `video_insight.json`
  (frozen medians first): tier 81%, endu 76%, reply 100%, authority 87%
  is the bar; remainders are Oct-slice ROI + spoken-authority gap.

## Evidence index

Local `DEV_NOTES.md` (v38–v54 arc, bugs 1–50+), `plan.md`, online
Checkpoints 31+ and rounds 1–6 pastebacks.
