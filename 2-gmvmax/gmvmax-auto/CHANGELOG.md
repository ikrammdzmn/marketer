# Changelog — gmvmax-auto

Newest first. One line per shipped step. Rollup: `1-MASTER/MASTER-CHANGELOG.md`.

## 29 Oct 2026 — creator grants + affiliate room detail LIVE on /shop-live (tsc clean, 15 deploys, UNCOMMITTED; latest `dpl_4MWdtsbKqu6MaPmMSrfLtxvbne1Y`)

- `036_shop_creator_tokens.sql` + `037` (granted_scopes/user_type) — per-creator token store `(shop_id, creator_open_id)`; temp admin `/shop-auth/grant` (Settings → Shop grants) mints 10-min seller/creator links; `callback` verifies creator state HMAC-only (no session), minted seller links work cross-device; `middleware` exempts callback at edge; Name/Username labels per row (survive re-grants) + MYT timestamps + lengths-only status.
- Affiliate room detail (Live Data `v202502` — bundled OAS `202309` was stale and 500s): `room-detail` bundles core_stats + traffic + gmv_trend + product (fail-open each), `(creator ✓)` picker badges via labeled-username match, `sessions` debug (`raw=1/find=/scan=creators`); `/shop-live` renders KPIs + traffic share % + products (exposure/stock) + 15-min GMV trend + null-aware List grain (`n/a`, never fake 0). Proof: room `7700018251179002645` 4/4 green, GMV 49,302.23 = List exact. Bugs B123–B130 (id-bytes, middleware-401, minted-link session, open_id scoping, 202309 staleness, absent-keys, CTOR field names, swallowed DB errors).
- Open threads parked: support tickets HELD (no longer needed); affiliate `traffic.impressions` dashboard-only (mapping ready, `n/a` rendered); post-authorize landing polish; 35 creators still to grant; Ads Cost/GMV Max ROI join optional.

## 29 Oct 2026 — creative Posted/Age + xlsx-import (tsc clean, 5 deploys, UNCOMMITTED; latest `dpl_2hZxJenpT4AJuGH1M8dvapC5pGtJ`)

- `035_creative_item_meta.sql` (owner ran dev+prod): `creative.item_meta(item_id PK, posted_at, source)`; Posted + Age columns on kill list (Columns… picker, CSV `posted,age_days`) + all-rows table, MYT age, `—` unknown.
- Round 7 probe (3 real post IDs, verdict recorded in `skills/tiktok-api/SKILL.md` §5): `file/video/ad/info` + `creative/report/get` 40001-gated, `ad/get` 0 ads on GMV PRODUCT, `gmv_max/video/get` code 0 / 0 rows (uploads, not organic posts) — no TikTok endpoint returns organic post dates, do not re-probe; `page_size` max is 50 (B122).
- `POST /api/creative-meta` + Import posted times block (paste `Post ID,Time posted` from xlsx, fills empties only, naive = MYT) — the working fallback, parked MID priority (resume after app approval → re-probe → wire `enrichItemMeta`).

## 28 Oct 2026 — TTAM live-Ad triage in Ads Manager via browser MCP (docs only, UNCOMMITTED)

- CPC >0.04 rule (0.04 and below excluded): 13 rows ticked live (9 KILL + 4 WATCH with full post IDs in `DEV_NOTES.md` Cp52); KILL = CPM 7.3–9.3 + weak hold, WATCH = near-avg CPM / clicks / thin evidence; unticks reverted on re-render (table restores selection) — verify per-row across all virtual windows, never by header count. New repo skill `skills/browser-access/` (checkbox-flow setup + agreed-tabs-only rules, untracked).

## 27 Oct 2026 — TTAM creative identity + search + deep-find (tsc clean, deployed prod `dpl_BQGPPA6EXh7w5T8PZ97AvSEgsmQe`, UNCOMMITTED)

- Ad rows carry TikTok account + post ID (`ttam.ts` keeps `tiktok_item_id/display_name/ad_text` + `label/caption` with trailing-`_postid` strip dedupe); per-adgroup creative search, one-line collapsed captions with ▸/▾, client-side deep-find with jump-to-match. NOTE: prod deploys from this tree also shipped the uncommitted DB-first arc below.

## 27 Oct 2026 — DB-first total + 40001 nightly fix + shop-1-only lock + creative analytics port (deployed `dpl_6ac4gJQ7MyqojPJVdxur4Z3dbN2P` + `dpl_EUqz2K8NV48dVrwz1QVFEtzCqJRB` + `dpl_HwDYC2gJamz4WMCnoGFKBQdWpWyD` + `dpl_5k2o2bqmU5Z7vNACmZMgjNT5jDR3` + `dpl_Afson7omjfmASTxw7bmq8ztbQ5gM` + `dpl_7FEgkgvg2QgBsNvpWPxAMZC3wimk` + `dpl_DPuZLLkzEjK3rHNdTXZUkUK43PnG` + `dpl_84QM8BCNz7GyQ8VhrVo7jLZryFgE` + `dpl_AdELLaEb9YxE1sv3HmySwrBgNduz` + `dpl_FkGQrJ9krbHecWa4Z4KNWehoTQFd`, `/api/health` ok; UNCOMMITTED)

- Total/LIVE/Product render the Neon snapshot instantly (amber `cached · synced Xm ago` pill) then swap in live numbers silently (green `live` pill); staleness threshold 60 min, fail-open everywhere. Hourly-shop snapshot badge + red `stale (>60m)` pill.
- Nightly 40001 fix: `getAdsCredentials` env fallback is per-advertiser only (no more wrong-token substitution); nightly-sync is per-shop fail-open with Telegram alerts on shop-1 failure only.
- Shop-1-only lock (owner order): nightly-sync hard-defaults `["1"]` (non-1 → 400); other shops ignored everywhere from here on.

## 26 Oct 2026 — rename GMV Max Online → Marketer HW (deployed, zero leftovers repo-wide)

## 26 Oct 2026 — DB-first hourly + freshness panel + task notes + creative kill-list (deployed, owner-verified live)

- Cron → Neon backbone: `032` (hourly PK +promotion_type) + `033` (`ttam_hourly_campaign` day grain) applied DEV+PROD; `?type=live|product` split + `ttam-sync` + `sync-status` cron endpoints; `silent:true` cron (Telegram failure-only via `cron-alert.ts`); cron-job.org 3 jobs green (product hourly :05, live :00/:15/:30/:45, TTAM :10) + nightly guard-heal.
- Freshness panel on `/gmv-max`: per-type last-sync + latest slot, KL label, 60s auto-refresh, per-type Refetch (signed-in POST).
- DB-backed LIVE/PRODUCT views (`hourly-report.ts` + `/api/hourly-report`, same shape + cached/partial flags); Fetch Data stays live re-pull; `total` still live.
- Task notes (`034` `gmv.task_notes` + GET/POST/PATCH/DELETE `/api/task-notes` + `/calendar` section/panel dots/grid dots + `task-note.py` agent write path); L6 day-7 review seeded 29 Oct.
- Creative kill-list on `/creative` (+ exclusion drafts with copy-IDs, status filter with counts, # rank, CSV of filtered view); fixed `syncCreativeDay` (>60s hang: dateless grain pulled 30k lifetime rows + sequential upserts → day grain + paged + batched).
- Ops notes: prod 500 was old 3-col ON CONFLICT vs new 4-col PK; TTAM 500 was `j*19` stride bug (fixed to `j*cols.length`); write MCP tools gated per-advertiser till Dec (L5 paused manually in Ads Manager, verified DISABLED).

## 20 Oct 2026 — Accounts live-notes + live board + module permissions (tsc clean, UNDEPLOYED; 031 owner-run on prod)

- `030`: `creative.accounts.live_note` (free text) + Accounts table column (Live-gated, hidden-but-preserved, presets datalist Internal/External/AI/Relive + typed customs, CSV/JSON included) + wider inputs/page (`max-w-[1600px]`, title tooltips, focus-expand IDs).
- Live board: pure `accounts/liveBoard.ts` grouping (fixed 4 + Other) + preview on `/accounts` + full `/accounts/live` subpage (counts, Revised-date footer) + sidebar entry; no migration/API change.
- Module permissions (deny-by-default): `031` (`core.access_allowlist.modules`, `all` = full) + `requireModule(...anyOf)` on ~40 gates incl. shared reads (presets GET, shop-gmv) + `/api/whoami` + `module-gate.tsx` (Shell/home/page gating) + Access manager scope editor + `access_allowlist.scope` audit entries.

## 20 Oct 2026 — `pull_creative.py`: Neon → local creative-analysis mirror (local-only, no deploy)

- One-way pull of `creative.accounts` + `creative.targets` (prod default, `--db dev` override, `--dry-run` diff) into the tool's `data/accounts.json` + `targets.json`. Lives in `2-gmvmax/tiktok-creative-analysis/` (moved from `gmvmax-auto` — the tool is stdlib-only, so secrets resolve from env / `../gmvmax-auto/.local_secrets.json` / local `.local_secrets.json`). Read-only on the DB; writes reuse `server.py`'s own `validate`/`validate_targets`/`write_json` (timestamped backups, LF, ≤10 kept). `identity_id` not carried (local tool has no such field). Needs a postgres driver (`pip install psycopg[binary]`). Live dry-run: prod 26 vs local 22 (9 added / 5 removed / 3 changed, targets identical).

## 17 Oct 2026 — Shop GMV summary card redesign (1 deploy `dpl_7rag6aq9GCtRMQk6iQSkAEUBC3AW`, uncommitted)

- `?shop=1&metric=shop-gmv` summary card: hero "Shop got" + shop-vs-ads bars with plain-words gap sentence + "Real return" (before/after-tax) with ads-claimed demoted to footnote; old TRUE/TRUE ACTUAL kept as hover tooltips only. tsc clean, build green, deploy output shows `deploymentProtection: []` — owner to verify Vercel wall still covers All Deployments.

## 17 Oct 2026 — TTAM probe Groups 1–4 + true focused-6s + metric registry + Shop Analytics probe (1 deploy `dpl_xGAVhvgcpWnuxAyoT4raHLUBfyUN`, all uncommitted)

- `/api/ttam-probe?group=1/2/3/4` (BASE/GROUP split, ≤15 keys/run under 60s cap): G1 6 OK/4 FAIL, G2 10 OK/3 FAIL, G3 7 OK/8 FAIL, G4 full_set OK all 12 `onsite_*` (Product page view rate + Add to cart rate resolved); logged to `ttam-verified-metrics.md` (§5 group-first) + plan.
- sfv = `engaged_view` (verified all grains): `TTAM_METRICS[14]`, `INPUT_MAP`, `sfvProxy: false` (ACS up / HPS down expected vs plain-6s proxy).
- `ttam-metric-registry.md` (62-key OMTM-style registry, Kill/Scale mostly TODO) + `/api/shop-analytics-probe` (202509 + 202605 both code 0: no 90d-split, no assisted anywhere — closest-OK mapping kept).
- Parked: `1-2-tools/TTAM Analytic/` masterplan + sample-13 thresholds (awaiting owner Kill/Scale → userscript v1).

## 15 Oct 2026 — Shop Cost module (`/shop-cost` + `/api/shop-cost`; 5 deploys through dpl_GmgtRs3JLqtLhpruxQAPS9faYvRT, all uncommitted)

- Spend share per stream (LIVE / Product / TTAM), shop 1, 1–31d, ads spend only: hero Total + in-card 100% bar + ranked #1–3 stat grid, stacked-% trend (multi-day only), daily table, per-stream campaign share (% of stream + % of total, Hide-0-spend on by default).
- Fixes: day-grain normalize (B102), Neon promotion_type bleed filter (B103), totals from row sums; design pass (reduced-motion, aria labels, dark color-scheme + theme-color via viewport export).

## 15 Oct 2026 — AI Analyst WoW + EN/MS + campaign detail (`/ai` + `/api/ai`; deploy dpl_Cpvdv4mZcG93SxrCWSL4KjBw8NQN)

- Week-over-week everywhere: GMV/Shop split current vs previous equal-length period from one 2x Neon pull (totals + % deltas, daily trend, top-10 campaigns with prev + deltas, worst spend-no-sales, fallers ≤−20%); TTAM cur+prev parallel pulls (spend deltas, raw imp/clicks/6s/likes/live + scores + KILL/WATCH/SCALE flags + verdict, top-10 named).
- EN/MS toggle (default EN, persisted + `?lang=`, part of 15m cache key); both languages use the same 4-section template (summary / wins / leaks / 3 actions) naming real campaigns + which tab to verify; TTAM prompted as feeder traffic (no ROI expected); stripEcho window widened to 600 chars.
- Smoke: `/ai` 307 → sign-in, `/api/ai` 401 signed-out; build lists `/ai`, `/ai/guardrail`, `/api/ai`.
- Follow-up `dpl_53VYyvgkawF5KTfaKHhTsMiiX5d7`: numbers-first rule (never open with a caveat/`*(Note...)*`, gaps go last with the exact Refresh button) + `coverage` facts on GMV/Shop snapshots + Shop-empty note naming the fix.
- Follow-up `dpl_D9wZJdhLWUR6hDErygMGJSnKCBqB`: WoW on closed days only (today partial excluded from GMV/TTAM/Shop totals; equal n-day windows ending yesterday).
- PENDING (17 Oct, uncommitted, undeployed): plain-words rule — full term + short form on first use in both languages (e.g. week-over-week (WoW)); blocked by other session's `shop-cost.ts` tsc errors, deploy once green.

## 15 Oct 2026 — AI Analyst module (`/ai` + `/api/ai` + `/ai/guardrail`; 6 deploys through dpl_EE1T4xgX5J62iZV15gwzVB7NVM7U, all uncommitted)

- Text-only AI analyst: sidebar `AI Analyst` page with tick boxes (GMV incl. creative rows / TTAM / Shop incl. affiliates, any combo, URL + localStorage), range 3/7/14d, Analyze + follow-up chat box (last-6 turns, live). Server route GET (15m cache) + POST chat, allowlist-gated; `GEMINI_API_KEY`/`GEMINI_MODEL` server-only env (default `gemini-3.8-flash` — 2.0-flash is shut down).
- Snapshot: Neon cache for GMV/Shop + live TTAM campaign grain (`fetchManualSpend` top-8 spend with v3 scores, closed data ending yesterday, fail-open with named `namesNote`); prompt forces gross×(1−fee)→net before min-ROI compare + `### 1) Verdict`-first order with server echo-strip.
- `/ai/guardrail` (Settings entry): per-user localStorage min-net-ROI / max-CPA / fee-rate (defaults 7.0/21.18/0.25, analysis-only — automation obeys the strategy knowledge base). Dependency-free Markdown→JSX renderer (`ai/md.tsx`, JSX-built, no raw HTML) for insight + AI chat bubbles.

## 14–15 Oct 2026 — LIVE rename fix + Bracket|TT-account toggle + enrich backoff (6 deploys through dpl_6Dh5KyJnpVV8VAYdcwgvE5TKbF4k, all uncommitted)

- Rename fix: board account/campaign names come from the Neon cache which nothing refreshed on Fetch — new `Sync names` button (allowlisted `POST /api/campaigns/sync`, auto re-fetch) + nightly-sync name heal. Rename the `[Bracket]` in Ads Manager, Sync, Fetch — new group shows. `/accounts` untouched.
- LIVE `Bracket | TT account` toggle (header of the LIVE section, remembered): groups by the TikTok account behind the campaign (identity display name + `@user`, bracket hint kept) instead of the `[Bracket]`. TT names fill lazily ≤15/Fetch like budgets (027 `account_api/account_user/identity_id`, owner ran dev+prod; PRODUCT stays bracket). Provenance: report `tt_account_name` returns `"0"` (permission wall), but `gmv_max/info.identity_list` + `gmv_max/identity/get` per-BC maps resolve real names (e.g. Dr. Samhan).
- Enrich backoff (028 `enrich_tried_at/enrich_fail`, 029 `identity_bc`, owner ran both): unresolvable campaigns (unlimited budgets, affiliate/unauthorized identities) back off 7d instead of hogging every Fetch's 15 slots; per-BC maps (≤4/Fetch) recover the affiliate tail; the true tail (45) is marked `bracket_only` and shows a calm grey note instead of amber urgency. Manual budget refresh stamps attempts too.

## 13 Oct 2026 (evening) — Total Performance Dashboard + picker week/month presets (3 deploys through dpl_449aUfUz, all uncommitted)

- Total view (`metric=total`) rebuilt to mockup: `Performance Dashboard` title + shop pill, 4 KPI cards (Total GMV + 100% pill, Orders + AOV, Cost + CPO, Blended ROI + Net sub), Channel Contribution section (full-width split bar + LIVE STREAM CHANNEL / PRODUCT SHOWCASE cards with GMV/orders/cost % + per-channel ROI). Replaces the earlier KPI+panel iteration same day.
- Range picker: This week / Last week (Monday-first, MYT) + This month / Last month presets (all within the 31-day cap); dead native month input replaced by month+year selects; one shared file so gmv-max + shop-live update together. Preset math node-verified (week edges, Feb, Dec→Jan).

## 13 Oct 2026 — auth persistence + bare login + display names + calendar month view (10 deploys through dpl_58wPcDwa1, all uncommitted)

- Google session 8h → 30d with daily rolling refresh + persistent cookie (the old 8h died on schedule because default `updateAge` 24h exceeded it); sign-in returns to the page you came from.
- `/sign-in` renders the login card only (no sidebar/top bar); stale "Neon prod · live TikTok API" header label removed (`PROD` pill stays the branch signal).
- Display names: `026_allowlist_display_name.sql` (owner ran prod) + name field on add + Rename per row in `/access`; sidebar-bottom profile block (name + email + Sign out, icon-only when collapsed) replaces the header name.
- Header today-pill (PC titles, mobile `[N today]`, links to `/calendar`) + new `/calendar` month view: big month + prev/next grids, hover/tap popups with clickable full titles, today-emerald/tomorrow-zinc cells, Today/Tomorrow side panel (mobile on top, desktop sticky right) with span progress (`Day 8/10 · Ends in 2 days`); `?from=&to=` range API (100d clamp), agenda unchanged.

## 12 Oct 2026 — calendar fixes + Shop Live module (all deployed prod, all uncommitted)

- Calendar picker: overlay above Shell bar (z-50), anchored popover under Range, mobile single-month + wrapping chips, Last 3 days preset, footer `from – to · N days` live count. Same picker wired into `/shop-live` range.
- Shop Live module NEW (`/shop-live`, sidebar entry, `lib/shop-live.ts`, `shop-analytics-credentials.ts`, routes `probe/overview/sessions/core-stats`, `025` owner-run pending): dual-key analytics app (MARKETER HW authorized, cipher captured), server auth `start/callback`, `shop_auth.py --app` slots + numeric `service_id`; list green (MARKETING + AFFILIATE metadata), minute green (MARKETING full coverage), affiliate-minute denied by TikTok design, `202309` room stats need creator tokens (grant doc parked). Signer bug fixed (base64 page_token truncation broke page 2+). Deploys through `dpl_2cG3Abz7riTJPy4expFMceaysfog`.

## 11 Oct 2026 — Upcoming multi-day + glance hierarchy + affiliates widget + #event tag (8 deploys through dpl_AcvBEj5syHQQ7PM8X2u1e2XtiRpN, all uncommitted)

- Multi-day agenda: calendar query looks back 7d + overlap filter (running spans that started yesterday show; ended ones don't); agenda repeats spans per day (`Day 2/4 · continues`, timed `until HH:MM`, midnight-end stays 1 row). All-day exclusive-end normalized once server-side.
- Glance hierarchy: Today hero (emerald wash + bar) > Tomorrow full > Later-this-week compact with inline dividers; Day pills in a fixed-width slot (titles align); `· ends` pill muted zinc (green = multi-day dot + Today only).
- Affiliates card on index (under Upcoming): due-today/overdue hero + tomorrow + pending-ads-run queue, read live from the Affiliate Collection sheet via service-account (`AFFILIATE_SHEET_ID`, Sheets API, robot = Viewer); tab self-resolves on trimmed name; 15-min cache; hint panel when unconnected.
- `#event` tag: case-insensitive marker in any calendar title (stripped on display) → amber dot + EVENT chip. Look-only: spans behave the same tagged or not.

## 11 Oct 2026 — dashboard redesign arc (sidebar shell + tabs + toasts + pages + calendar; committed 0beb51e + 61e397e, deployed dpl_GCwws828WtkGs1Vq1d9uMReVTBkc, 022/024 applied, webhook re-set + /start green)

- TTAM creative 0-spend bug: `pullGrain()` (`ttam.ts`) fetched page 1 × 1000 only — ad-grain spend rows sat past page 1 while adgroup grain fit. Now loops `total_page` (300ms gaps, client-side ID filter kept per B37). Owner verify pending (G1 04–09 Oct creatives should carry spend).
- Sidebar shell (`Shell.tsx` NEW + `layout.tsx` rewrite + `logout-action.ts`): top bar (title + PROD + lag note + email/sign-out) + icon sidebar (Menu/Shop/TikTok Ads/TikTok Shops + bottom-pinned collapsible Settings) + collapse-to-icons (persisted) + mobile drawer + sticky rail with own scroll. No top nav. All pages share it.
- Tabs replace dropdowns: `?shop=&metric=` links, auto-load on open/click/back-button, 5s Fetch cooldown (`Wait 5s`), in-flight guard. Other shops removed from menu (backend map kept; `?shop=2` falls back to 1).
- Index `/` is an empty landing (cards + agenda); board moved to `/gmv-max` (old `/?shop=&metric=` bookmarks need the new prefix).
- Toasts everywhere: `toast.ts` bus + Shell host (bottom-right, 4s, ok/err) wired to creative/presets/access saves + budget/token/hourly/shop refreshes.
- Dupe-key fix: `creative-accounts` + `creative-catalog` POSTs reject duplicate names/ids with 400 naming the culprit before DELETE (was 500 `accounts_pkey` mid-save). Targets/presets already guarded.
- `/accounts` + `/catalog` pages (moved out of the creative Manage modal, modal deleted); `022_creative_identity.sql` (NEW, owner runs dev+prod) adds `identity_id` with pre-022 API tolerance. React twin-row bugs fixed (persistent ref uids on accounts, stable keys on catalog).
- Calendar agenda: shared public calendar via service-account API read (`lib/calendar.ts`, key in `GOOGLE_CALENDAR_SA_JSON`, calendar stays private) with public-iCal fallback; per-user OAuth attempt reverted (no consent screens, 023 skipped). `/calendar-settings` page (exclude keywords + health panel) + `024_calendar_settings.sql` (NEW, owner runs dev+prod). Deploys through `dpl_73oDR1L7NPbx29q5sPw1X4BGtpn5`; smoke `/` 307, data APIs 401, health 200 throughout.
- Owner still to verify: TTAM creative spend (G1 04–09 Oct). All uncommitted.

## 10 Oct 2026 — TTAM presets arc (2 deploys; 020/021 owner-run pending)

- 019 BASIC trial preset (IMP k1000/s5000 + CPM invert k30/s15, null-safe) + Activate instant-pill + no-store fix (`ab3f8da`, `dpl_HW1mtSDhZbJmRxYc7W5ifD42TS75`, smoke 307/401/200).
- Score units (`%/RM/numeric` via `formatScore`, ACS 4dp) + per-row formulas + input legend in `/presets` + formula tables in docs (`e58882e`, `dpl_3FM4k4Hzbre6M8cS3Jv971v8X2Cb`, smoke 307/401/200).
- 020 OMTM-original reference + 021 OMTM-v3-RM trial (migrations written + node-verified, uncommitted; owner runs dev+prod). Proxy-gap measured: plain 6s ~14% hot vs focused, squared in CES; decision rule = online radar, TikTok trigger (KILL trusted, SCALE confirmed).

## 10 Oct 2026 — hourly on-the-hour + footer date fix (pushed + deployed)

- Hourly pinger `.github/workflows/hourly-sync.yml`: `15 * * * *` → `0 * * * *` (the :30 arrivals were schedule-:15 + GitHub queue lag + fetch minutes; header stamps send time). Commit `697d93a`, pushed.
- Telegram footer `hu Oct 08 2026` fixed (`hourly.ts`): `synced_at` now formats `YYYY-MM-DD HH:mm MYT` for ISO/long-string/Date alike (was `slice(0,16)`, assumed ISO). `excludes N OFF` is the correct ON-only filter. Deployed `dpl_po7TdziUVii985L8QwLZ9eucZFTU` (smoke `/` 307, `/api/hourly` 401, `/api/health` 200).
- Bot commands diagnosis: `getUpdates` returning messages = no webhook (`getWebhookInfo url:""` + pending 2); bare re-register passes but Vercel wall eats deliveries — re-set needs encoded `?x-vercel-protection-bypass=` (owner-pending).

## 10 Oct 2026 — creative module Phase A + managers modal + skills shelf (deployed, uncommitted)

- `/creative` tab + `/api/creative-probe` rounds 1–6: GMV creative grain verified (`item_id` + dual campaign/item-group filter, full attribute + delivery sets incl. cost/roi/cpo); AUCTION_AD numbers + quartiles; membership via `filters[]`; identity via `ad/get`. Ceiling ~20/24 xlsx columns; posted-time/source/secondary-status derived. Deploys `dpl_J2wuSJQb`→`dpl_Afw2SW5A`.
- Phase A sync: `018_creative_daily.sql` (owner ran dev+prod) + `lib/creative.ts` (Neon campaign IDs, rewrite-on-revise, ≤7d fail-open) + `/api/creative-sync` (scoped picker, himcoffee default) + rows table. Deploys `dpl_GMzufUwbt`→`dpl_P49BNdXg`.
- Managers modal: 016/017 (owner ran dev+prod; 22 accounts, 5 campaigns, 18 products) + grouped tables, SOP strip, changed-only stamps, drag, column chips + headers, downloads, auto-load. Deploys `dpl_AZbMHBz7`→`dpl_Ar3uHZAt`.
- Repo-local skills shelf (`skills/*/SKILL.md`, 8): tiktok (+MCP diff: video/get, VIDEO_INSIGHT, file/video/info candidates), tiktok-shop, vercel-deploy, neon-db, creative-analysis, telegram-rich, session-handoff (+standing skill-delta protocol), calendar-picker.

## 08 Oct 2026 — sessions live-title + grouping + cleanup + budget tiers (deployed, uncommitted)

- Sessions drill: meta call tries `live_name` with fail-open fallback; room×day rows collapse to one row per room (sums + recomputed ROI, GMV-desc); row shows live title + ONGOING/END pill + `started … MYT · duration` (untitled rooms fall back to `room {id}` — empty `live_name` is TikTok data). Probe includes `live_name`. Deployed `dpl_8oW49tw1` (live tie: PROMO OCTOBER 14:00 MYT = Ads Manager 14:00:17); cleanup `dpl_7nhrxi91` (no double room id, no midnight-bucket tail). Live smoke `/` 307, probe 401.
- Budget `% used` color tiers in single `BudgetUse` (`page.tsx:55`, all 4 spots): <70 plain, 70–79 amber, 80–89 red text, 90–100 red pill + white + pulse, >100 brighter-red bold pill + pulse. Deployed `dpl_AWLvFgew`.

## Undeployed — Shop GMV multi-day (014 + Refresh) + hourly date fix + hourly autopinger

- Hourly Fetch now sends `date=${end}` (`page.tsx:489`); `/api/hourly` also accepts `endDate/startDate` fallback. Oct-07 range previously queried Oct-08 (empty) — that was the blank-charts bug, not missing data.
- `014_shop_orders_daily.sql` (NEW, owner runs DEV then PROD): `shop_order_gmv/count` + `shop_cancelled_gmv/count` on `gmv.daily_shop_metrics`. All writers tolerate pre-014 DBs (ads-only fallback, no 500).
- Shop GMV tab: `daily` cache series on GET + `POST /api/shop-gmv/refresh` (allowlisted, ≤31 days, per-day fail-open) + `Refresh daily cache` button; multi-day Performance chart (GMV bars + spend dashed line + ROAS line, recomputed) with `Shop truth | Ads attributed` toggle + daily table. `nightly-sync` now stores the shop side too (fail-open).
- `vercel.json`: hourly cron `15 * * * *` → `/api/cron/hourly-sync?shopNumber=1` (Hobby runs it daily at most); `.github/workflows/hourly-sync.yml` (NEW): true hourly pinger, skips 02–06 MYT, needs Actions secret `CRON_SECRET` (+ optional `VERCEL_BYPASS`). `tsc` exit 0. Deploy pending (CLI token expired last session).
- NOTE 08 Oct late: Vercel Hobby rejects sub-daily crons at deploy time, so the hourly `vercel.json` entry was reverted (nightly only). Hourly automation = GitHub Actions pinger alone. Alternative is Pro upgrade (owner call).
- Hourly tab rebuild (shop-hourly style): trend charts now GMV bars + spend dashed line + ROAS line per type (dual axis, ROAS recomputed); 24-hour picker (future/no-data chips disabled, bars + campaign table follow the pick, default latest); range scorecard card (Hour/Days/AvgGMV/AvgOrders/ROAS/CPA + DEAD/GOLDEN/WATCH, missing excluded, spend is real cost); `POST /api/hourly/sync` + `Sync now` button (live TikTok pull, Telegram silent, fails back to cache). `GET /api/hourly` takes `startDate/endDate` and returns `scorecard`. `tsc` 0 + `next build` green (lists `/api/hourly/sync`, `/api/shop-gmv/refresh`, Middleware).
- Hourly shop metric (015): `gmv.shop_hourly_orders` cache (015 migration, owner runs dev+prod) fed by day-pull `orders/search` bucketed on MYT `create_time` (CANCELLED/REFUNDED excluded, tie-check reported); `GET /api/hourly-shop` (24-hour view: shop GMV + cached ads spend + TRUE ROAS, future blank) + `POST /api/hourly-shop/refresh` + dashboard metric with spend on/off toggle + Refresh button; nightly fills yesterday. `tsc` 0 + `next build` green (lists `/api/hourly-shop`, `/api/hourly-shop/refresh`).
- Hourly shop parity: 24-hour picker (All + hour chips, future disabled; table filters, picked chart bar spotlights) + range scorecard (same DEAD/GOLDEN/WATCH rules, gated on ≥3 cached days with a need-more-days note below that). `GET /api/hourly-shop` takes `startDate/endDate` and returns `scorecard` + `rangeDays`.
- Hourly shop range Refresh: `POST /api/hourly-shop/refresh` now loops `startDate→endDate` (cap 31, per-day fail-open + untied reporting) — one press backfills the scorecard window.
- All combo charts share one treatment (`hoverLinePlugin` + `comboOpts`/`barOpts` in `page.tsx`): lines draw in front of bars (`order`), index-mode hover with vertical rule, RM/x tooltip rows. Covers Hourly LIVE/Product trends + slot bars, Shop GMV daily, Hourly shop.

## 08 Oct 2026 — account-budget ON-only partial + shop token live + admin refresh button (deployed)

- Account budget = sum of ON campaigns only (OFF ignored), amber `partial` label when an ON budget is still unknown; `% used` = ON spend / ON budget, one-day only (`page.tsx`: `onRows`/`knownOn`; backend already nulled OFF budgets). Header copy updated. Deployed `dpl_5rKQahzdGM1KbsfvrfN6xva1J832`; live smoke `/` 307, data API 401.
- Shop API authorized (Custom app `HIMWELLNESS GMV MAX INTERNAL`, Auth ID Active/Unlimited/MY) → exchanged `code=ROW_...` via `auth.tiktok-shops.com/api/v2/token/get` (code 0, token 122 + refresh 79); cipher from `GET /authorization/202309/shops` (code 0, Dr Samhan 7495...0274). Tokens in gitignored `.local_secrets.json` + 3 Vercel Production env vars. Local `orders/search` probe code 0. Signed-in 24–27 Sep: shop 163,540.29 / 988 vs ads 169,805.12 / 1,012 (-3.7%, TRUE ROAS 3.71x/3.19x); ads ties locked ref, shop side differs from manual 143,941 / 1,016 — parked for owner recheck vs old system.
- Admin one-tap **Refresh shop token**: `requireShopTokenAccess()` in `authz.ts` (single swap point for future per-module model); `/api/shop-token` GET = expiry info (lengths only), POST = admin + same-origin, seeds Neon row from env on first run, refreshes, audits best-effort. Fixed epoch bug: TikTok v2 `access_token_expire_in` is absolute epoch, normalized in `shopTokenExpiryMs()` (else auto-refresh never fires). Shop GMV card shows `valid until` + button for admin only. Access token ~7-day life (expires ~Oct 13–14). Deployed `marketer-2uf7h9ja4`; live smoke `/` 307, shop-token 401. Owner signed-in button test next.

## 07 Oct 2026 — Google sign-in + admin-managed email allowlist (deployed; owner tests pending)

- Added Auth.js Google OAuth, verified-email allowlist checks, protected dashboard data APIs, and fixed-admin-only `/access` page to add/remove user emails. Allowlist changes are audited in `core.audit`; webhook/cron routes keep their existing secret guards.
- Added `013_access_allowlist.sql` and setup/test instructions. Owner reports Neon dev+prod migration and Google/Vercel env complete. Next 15.5.27 production deployment `dpl_FDpqCvXJprdiMg2qXSQ57dCAHEB9` succeeded.
- Fixed signed-out page gate: Next 15 with `src/app` ignored root `middleware.ts`; moved to `online/src/middleware.ts`. Verified built manifest includes middleware. Live smoke: `/` 307 to `/sign-in`, `/api/hourly` 401, `/api/access-list` 401, `/api/health` 200. Owner Google/allowed/denied/removal tests remain.
- Dependency review: Next 14.2.35 → 15.5.27 (React 18 peer-compatible) + PostCSS 8.5.29 override resolves production-tree audit findings (`npm audit --omit=dev`: 0). Full audit still has 7 Tailwind 3 build/dev findings (5 high, 2 moderate); Tailwind 4.3.3 is a major change and remains a separate decision. No `--force` fix.
- Added campaign budgets to GMV Max and TTAM tables; deployed as `dpl_DStCPLP6hYsXmWoQXq7B2iJDmCn`. GMV Max fetches missing info only for ON campaigns in batches of 15 and caches results; TTAM reads campaign budget/mode or sums compatible daily ad-group budgets. `% used` appears only on one-day selections; lifetime/unlimited/mixed budgets have no percent. No schema migration or TikTok budget-update call was added; existing Neon cache is updated. Live budget values still need owner comparison with Ads Manager.
- Added a per-ON-GMV-campaign **Refresh budget** button. It calls an authenticated read-only TikTok `campaign/gmv_max/info` lookup and updates the existing Neon budget cache; no TikTok budget changes. Deployed `dpl_48R5oJNjejGjoH5K7ZYwnV5QHw7A`; live signed-out refresh POST is 401. Owner signed-in refresh test next.
- Added allowlisted read-only `/api/sessions/probe` (session/list keys + truncated sample). Deployed `dpl_B9sq3qGKfgr6mUCMnpRtmQ5rEvLt`; owner runs it signed in and pastes back JSON before status columns are wired. Extended with `roomId` livestream-metric probe (`live_status`, `live_launched_time`, `live_duration`); deployed `dpl_Fn3emPRsi8TSoW3ohKNDeG21oWgZ` then `dpl_3XWDiCYYb4uT2dACr9mNJY85EwWJ`.
- Sessions drill rows now carry live 🟢 ONGOING / ⚪ END status (hover: launched MYT + duration), probe-verified against room 7693707778641169173; deployed `dpl_8TVzd8xbv8cWM3wKDwDZdr4x`. Status is current TikTok state, fail-open when the lookup fails.
- Delivery flags on spending rows render grey info instead of ⛔ (spend proves delivery); deployed `dpl_9mG9iNXKrnPx9UU5qEsT7Lcqs7qt`.
- Campaign/account rows show 🟢 Active when any room is ONGOING (auto-checked for ON LIVE campaigns on Fetch, cap 5); deployed `dpl_Frr1y6Z6cjiqifeXL4KLwgED131r` (force-refresh sequential; spend-priority top-5; inline per-campaign sessions).
- Session handoff Checkpoint 26 (docs only, no deploy): vibe + discoveries + bugs B57–B62 logged in `DEV_NOTES.md`; `feature.md` refreshed for general users (inline sessions, 🟢 Active, spend-aware flags, account-budget rule). Open next: account budget = ON-campaigns sum with partial label.

## 07 Oct 2026 — bot `/start` status + unknown-command replies (tsc-clean, deployed + live-verified)

- `/start` → system status in-topic (alive MYT + DB `SELECT 1` + `MAX(hour_slot)` + `MAX(date)`, each degrading solo, no secrets out; daily formatted `YYYY-MM-DD`). Unknown `/cmd` → hint reply; plain chatter stays ignored (`tg-webhook/route.ts`).
- Outage debug: bot went silent post-restructure — `getWebhookInfo` showed 401s (secret drift → re-setWebhook with re-copied `CRON_SECRET`) then empty-body 401s (Vercel Deployment Protection in front). Fix kept: protection stays ON, webhook URL carries `?x-vercel-protection-bypass=` (query works, Telegram can't send headers). Probe 18/21 (3 fails = documented pre-existing API limits), `/fetch` + `/fetch_hourly` + `/start` live-green.
- `/start` immediately proved value: hourly stops Oct 5 23:00 (~25h stale = stopped `GMVMaxCollector30m`; task action still pre-move on owner's other PC).

## 07 Oct 2026 — deployment protection + preset write guard (owner verified)

- Incognito test found Production public despite Vercel Authentication being enabled for Standard Protection (preview-only). Owner changed it to **All Deployments**; other profiles are now blocked.
- `/api/ttam-presets` POST now requires dedicated `PRESET_WRITE_KEY` (not `CRON_SECRET`), fail-closed when absent; Vercel wall remains the actual identity gate because `NEXT_PUBLIC_PRESET_WRITE_KEY` is browser-visible. Env deployment delay caused temporary 401; owner reports the existing matching values work once deploy finished.
- Next: Google OAuth evaluation/implementation + auth regression tests. No key values recorded here.

## 06 Oct 2026 — M11 TTAM metrics + DB presets (shop 1, tsc-clean, committed/pushed `8665857`)

- TTAM 3-level drills (`ttam.ts`: campaign/adgroup/ad, on-demand click-to-load, spend-only fail-open) + full 12-metric pulls + exact v3 OMTM scoring (`scoreTtamRow`) + flags/verdict on theory-v2 bands (provisional) + toggles + verdict filter + search + LEARNING guardrail + 3-day rule.
- Preset system: `012_ttam_presets.sql` (new `ttam` schema, applied dev+prod, seed active) + `/api/ttam-presets` (CRUD + scorer export) + `/presets` manager page + TTAM-bar no-refetch picker + runtime custom-metric eval + full-name tooltips.
- Probes: `/api/ttam-probe` verified 27 BASIC metrics at all 3 grains (mapping in `ttam-api-metrics-plan.md`); sfv has no exact API equal (plain-6s proxy, labeled); LQS presumed on live_effective_views (xlsx cross-check open).
- Bugs 36–40 (client/server import wall, drill dimension 40002, edit near-misses, stale vercel cache, overstated API knowledge) — see DEV_NOTES Checkpoint 11.
- Still open: LQS verify, TTAM quartile recalibration, FUTURE UI items, A-vs-B sync, 🔥 floor, OFF per-type, export demo, shop approval, cron ping. All uncommitted.

## 06 Oct 2026 — M10 dashboard overhaul (Tailwind + filters + calendar; committed/pushed `8665857`)

- Tailwind rewrite (cards, sticky header, KPI cards) + delivery pills green/grey + Sessions LIVE-only + Status filter/sort + Fetch/Drill spinners + 15s cooldown + v51-port calendar popup (31-day cap) + Dashboard|Presets nav.

## 04 Oct 2026 — M9c Telegram maturity II (Total msg, buttons, delivery, probes)

- Third message `Total GMV Max` (Live + Product jar rows, combined verdict, dashboard button; no steady/earlier — details stay in type messages).
- Chart buttons: top-7 movers as QuickChart trend links + 📊 Dashboard on top, pairs below (multi-buttons-blocks verified live). Callback-photo tap handler built, parked dormant (URL links won). Covers saga: raw.githubusercontent URLs verified, in-blocks photo nuked Product tables → fail-open split → covers removed per owner (detached look).
- Heading/marked/quote redesign + verdict B + ROI on Steady/Earlier tables. Marked-as-object unprobed (fallback risk accepted openly).
- `011_campaign_delivery.sql` + `formatDelivery` enum map (`ENABLE`=Active, `TTS_TT_ASSET_UNAVAILABLE`=Asset unavailable, identity/product/auth codes) → Telegram `· Active` suffix + dashboard delivery line + account rollups (ON-if-any, delivery badges, Identity hidden collapsed per owner).
- Rich probes round 1–2 (9/10; anchor-EMPTY is correct behavior), stripe verdict (desktop-only), `tg-rich-messages.md` batches 1–4 (~100 classes), `telegram_message.md` Works/Partial/Not-working.
- Still open: dashboard redesign (next session, Tailwind-vs-inline), 🔥 floor gate, OFF per-type split, export demo (143,941 PROVISIONAL), shop approval watch, cron ping, commit ritual.

## 04 Oct 2026 — M9b Telegram maturity (divergence closed, jar rows, ROI, budget%)

- Divergence #1 CLOSED (04-Oct same-minute proof): LIVE Excel 164.19/1,734.82/16 vs dashboard ~166.45 (GMV+ord exact, cost +2.26); Product Excel 122.71/1,088.91/10 vs dashboard ~119.81 (cost −2.90); net −0.64 (~0.2%). Culprit = grain scope (hour vs day); OFF/unmapped ~0 that day; RM2-3 = pull-time drift. Rule: both cost+GMV revise intraday — re-pull same grain first.
- `/fetch` split: `/fetch` → day-so-far totals via `getShopReport` (`daily.ts`, ties dashboard, ALL campaigns); `/fetch_hourly` → hour slice (existing `syncHourly`). `tg-webhook` routes both, in-topic acks.
- Hourly candy format: `prev → cur (+diff ▲)` per campaign (bucket data was already there); short names bracket+tail-4 (`Dr.Samhan …2114`) + 🔛 active mark (🔥/⚠️ override); 6-col rich table (Campaign/Cost/GMV/ROI H·D/Ord/Bud).
- Bold verdict (probe): table cells render `<b>` literally — rich stays native whole-cell bold (names plain for contrast), partial-bold lives in legacy HTML fallback only.
- Hybrid + jar: header carries Hour + Day-so-far lines; rows switched to cumulative day-so-far (`10.00 → 10.20`), ROI H (bucket, n/a if hour cost<RM1) · D (cumulative); `010_campaign_budget.sql` (`budget` col, applied at least once 04 Oct) + list-sync captures budget fallbacks (list has NO budget per sample_keys — all null) + lazy info-fill for movers (≤15 `gmv_max/info` calls, fail-open, cached in DB). Bud column live (`2% 7k`, `1% 10k` verified on mobile+desktop).
- Stripe verdict (probe, `?keep=1` eyeball): `striped+compact` wins desktop, all variants flat on mobile (client ignores stripes + wallpaper bleed). Kept `striped+compact`.
- Footnote date healed: `status as of Sun Oct 04 2026` (was "hu Oct 01").
- Still open: 🔥 floor gate; OFF counts per-type; export-method demo; shop approval watch; cron-job.org ping; commit question (all still uncommitted).

## 04 Oct 2026 — M9 hourly live (Telegram tables + /fetch + real-time pivot)

- `/api/tg-webhook` (`/fetch` command, secret-token guard, in-topic replies) live; secret-mismatch 401 diagnosed via getWebhookInfo, fixed with exact re-copy + drop_pending_updates.
- Real-time pivot: activity edge, newest pair tagged (partial); whole-message ON-filter (explicit OFF excluded, `excludes N OFF · status as of` footnote); dashboard keeps all.
- Telegram divergence check open: 4 structural causes mapped (OFF inclusion, unmapped filters opposite, grain scope, pull-time drift) — awaiting owner's number pair.
- Known open: 🔥 floor (dGmv>0 gate) not implemented; footnote date garbles non-ISO ("hu Oct 01"); OFF counts shop-wide not per-type; export-method demo pending; shop app approval pending; cron-job ping open.

## 03 Oct 2026 — M9 hourly POC (built + deployed, needs first sync)
- `stat_time_hour` grain verified live (1-day span max, MYT slots, full-day grid incl. future zeros); `009_hourly.sql` (hour_slot TEXT PK, rewrite-on-revise); `hourly.ts` (Neon-map filter, activity edge, batched 500/chunk upserts after Hobby 60s timeout, prev-slot abs+% diffs, %-guard 50/200); `/api/cron/hourly-sync` (CRON_SECRET) + `/api/hourly` read; dashboard Hourly metric + Chart.js trends/bars; `telegram.ts` (rich→legacy chain, thread split, self-deleting `/tg-probe`); group-topic delivery; native rich tables + Details collapsibles (probe-verified shapes); emoji map (📹📦🔥⚠️, neutral ▲▼▪); `/fetch` via tg-webhook. All deployed green same-day.

## 03 Oct 2026 — M8 shop-order GMV scaffold, shop 1 only (code done, deploy blocked)
- New `007_shop_tokens.sql` (`credentials.shop_tokens`, schema-qualified) + `shop-credentials.ts` (DB-first, env fallback) + `shop-orders.ts` (HMAC sign, `POST /api/orders/search`, defensive sum + `sampleKeys`) + `/api/shop-gmv` (side-by-side vs ads, graceful unconfigured) + UI `Shop GMV` metric. `tsc --noEmit` clean. Deploy failed: Vercel CLI Not authorized (token refresh needed). Needs: apply 007 dev→prod, Vercel Env `SHOP_APP_KEY/SECRET` + `TIKTOK_SHOP1_ACCESS_TOKEN`, redeploy, Fetch 24–27 Sep.
- Deployed green after owner `vercel login` (`/api/shop-gmv` in routes). 007 applied (dev verified `to_regclass` OK; prod next). Token route PARKED: draft Custom app region-blocked on authorize (Malaysia target, MY seller login still refused, 4h duration). Manual parity LOCKED instead: shop 143,941/1,016 vs ads 169,805 → −15.2%; TRUE ROAS 3.26x/2.81x vs 3.85/3.32; attributed exceeds whole shop (double-claim).
- Owner chose display-only rebase (strategy files untouched): `shopTruthRef` locked constant in `getShopROAS` + ref rows in ROAS table + locked-ref line in unconfigured Shop GMV view. Deployed green.
- Rewrote shop files to proven temp-marketplace shape (public repo docs): real endpoint `POST /order/202309/orders/search` + `x-tts-access-token` + `signByUrl` (`tiktok-shop` dep) + numerator = line_items sale_price+platform_discount, CANCELLED/REFUNDED excluded; `008_shop_token_columns.sql` (shop_name/cipher/expiry cols, verified `\d` OK); `shop_auth.py` one-shot seller OAuth (stdlib, mirrors `prod_auth.py`). Authorize still blocked: "service does not exist" = app review pending. No repo authorize guide exists (their SETUP starts with tokens in env).

## 01 Oct 2026 — online M7 extras (TTAM, sessions, account fix, ON/OFF, split)
- TTAM metric view (reuses `/api/roas`, manual spend + count) + PROD branch badge + Fetched stamp on `online/src/app/page.tsx`.
- New `/api/sessions` + per-campaign Sessions button: `room_id x stat_time_day` drill, single-ID `filtering`, verified 454 rooms on LIVE campaign, no error.
- Account rule relaxed (§9): first `[]` anywhere → shop 1 resync 202 campaigns, `unbracketed: 0` (`Other` drained into real accounts).
- ON/OFF pills: `006_status.sql` (`status` + `raw` cols, applied prod+dev) → sync captures `operation_status` (only status-ish key in `campaign/get`; sample_keys recorded) → report + UI badge (green ON / grey OFF). Lesson: Total-merge dropped `status` (frontend merge must carry new fields); `await` forbidden inside setState updater.
- Total view split: LIVE GMV Max + Product GMV Max sections (own accounts each), summary unchanged.
- `deploy_online.py` Windows fix (`npx.cmd` + shell).

## 21 Sep 2026 — checkpoint 4: LIVE wired + PRODUCT/LIVE split (ritual done)
- New `live_view.py`: 4 GMV seeds (IDs from bulk export, VOL2 account) → info (budget, roas target, kind) + 7d/today report (net math) → `cache/live.json`. Found the money on GMV MAX VOL2 (was reading empty HIM COFFEE1); HIMCOFFEE 7d net ROI 6.14, HAPPY HOUR 7.84. Dashboard Live section + `/api/live` with UNLAGGED badge. List APIs can't return GMV campaigns (verified) — seeds are the discovery. Verified JS/py + 8099 smoke.
- LIVE GMV wired (owner gave ID, VOL2 account): budget RM10k, roas 20, 7d net ROI 14.3 on 300 orders. Session list parses but empty = no max-delivery sessions created.
- Secrets split PRODUCT/LIVE groups (`TIKTOK_GMV_CAMPAIGNS`); view prints LIVE first, accepts legacy flat map.
- LIVE GMV wired (owner gave ID, VOL2 account): budget RM10k, roas 20, 7d net ROI 14.3 on 300 orders. Session list parses but empty = no max-delivery sessions created.
- ROI-lock (owner): net basis, `FEE_RATE=0.25`; snapshots store net gmv/roi + `gross_gmv` + `fee_rate` for audit. Strategy thresholds must state basis.
- Schedule live: Windows task `GMVMaxCollector30m` every 30m (`collector_task.bat`, test-run OK) + same-slot dedupe in `tick()`.
- `GET gmv_max/report/get/` live via prod token: dimensions `[advertiser_id, stat_time_day]`, metrics `[cost, orders, gross_revenue, roi]`, `store_ids` required (sandbox 404 stands — no GMV endpoints there). Ticks write `prod live <day>` (zeros while account quiet, path proven). Dashboard smoke PROD. Store ID in gitignored secrets.

## 21 Sep 2026 - prod OAuth helper (shipped, token saved)
- New `prod_auth.py` (stdlib, 127.0.0.1:8082): prints authorize URL, captures `/callback` code, exchanges for prod token LOCALLY into `.local_secrets.json` (`TIKTOK_PROD_ACCESS_TOKEN/ADVERTISER_ID`, lengths-only console). Renamed keys to portal labels (`TIKTOK_APP_ID/SECRET`) across EXAMPLE + local file. Verified `py_compile`.
## 21 Sep 2026 — sandbox GET wiring (code-ready, live untested)
- `collector.py`: sandbox `GET gmv_max/report/get/` via stdlib urllib (closed-slot date, `Access-Token` header, `ALLOW_WRITES=0` assert kept); missing keys / HTTP fail → file-first stub. Neon insert comment clarified (`win` col, file key `window`). `.local_secrets.EXAMPLE.json` gains `SANDBOX_ACCESS_TOKEN/ADVERTISER_ID/BASE`. Verified `py_compile` + stub tick + 8099 smoke (`/api/health` PROD, 3 snapshots). Live sandbox data still needs owner-saved token + advertiser ID.
- 21 Sep live test: sandbox token saved (lengths OK) but sandbox has NO GMV Max endpoints (`/campaign/gmv_max/info/` + `/gmv_max/report/get/` → plain 404 on `sandbox-ads`, same path on prod returns JSON 40105 = path exists, token sandbox-only). Collector correctly keeps file-first stub. P0 holds file-first until prod read-only auth.

## 20 Sep 2026 — approval wait = non-issue + secret hygiene
- Approval-pending marked expected non-issue: P0 holds file-first, real GET wiring waits on Business approval. Docs: `plan.md` + `DEV_NOTES.md` + `APP_CHECKLIST.md` + `feature.md`.
- Secret hygiene: Neon passwords rotated in portal (dev+prod), `GMV_ENC_KEY` regenerated locally, `.local_secrets.EXAMPLE.json` sanitized to placeholders (lengths-only verify, `git status` clean). History `17c804b` still holds old copy — dead after rotation.

## 19 Sep 2026 — P0 skeleton + Neon GREEN, apps in flight
- Skeleton landed: `collector.py` (closed-window T-2h stub, quiet-hours skip, file-first
  dual-write, `ALLOW_WRITES=0`), `dashboard/` (owns 8082, picker + 30m/1h table, freshness
  + branch badge, greyed rules/approval, guardrails strip) — verified `py_compile` +
  `node --check` + smoke 8099 + `git status` clean of secrets.
- Neon live: project `TIKTOK DATA` (SG), branches `production` + `dev` (persistent,
  auto-delete cleared); `001–003` + `004_fix_schemas.sql` applied; `acct`=2, `gmv`=7 on
  both branches. Keys (`NEON_URL_DEV/PROD`, `GMV_ENC_KEY`, `SHOP_APP_KEY/SECRET`) in
  gitignored `.local_secrets.json`, verified by lengths only.
- Bugs fixed: unqualified DDL → public (fixed 004, rule: schema-qualify all); reserved
  `window` → `win` (collector maps `window→win`); branch TTL default; portal redirect
  IP-reject (`localhost` accepted). Detail: `DEV_NOTES.md`.
- Apps: Business API `TIKTOK GMV MAX` submitted, PENDING approval (sandbox locked till
  then); Shop Partner Center Custom app created (MY). Docs: `DEV_NOTES.md` + `feature.md`
  created; `AGENTS.md` + `plan.md` ticked. Next: wire sandbox GETs on approval → 48×30m
  snapshots → P0 exit.
