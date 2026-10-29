# DEV_NOTES.md — gmvmax-auto session handoff (19 Sep 2026, P0 day)

> Next-you: read Checkpoint 54 first (current facts), then Checkpoints 53/52/51/50/49/48/47/46/45/44/43/42/41/40/39/38/37/36/35/34/33/32/31/30/29/28/27/26/25/24/23/22/21/20/19/18/17/16/15/14/13 and the vibe below them.
> Short replies, numbers first, one action per message. Sparring mode is ON.
> Read this first. It carries the vibe, not just the facts.

DO NOT DELETE THIS PART!!! i ask you

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

## Checkpoint 54 — 29 Oct 2026 (creator grants + affiliate room detail LIVE on /shop-live; 15 deploys, all UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner opened with "the /shop-live is incomplete" and drove a full-day evidence arc: TikTok MCP reads (Business API can't see Shop minute data, 5 advertisers green) → opened Partner Center themselves → API Testing Tool 105002 → re-auth via localhost callback → green List (8 MARKETING rooms) + green Minute (399 intervals) → mapped minute-vs-list GMV mismatch (intervals 1355.30 ≈ list 1434.37, minute-overall 418.50 is stale — trust intervals) → demanded affiliate detail → Live Data scope enabled mid-session → creator alliance flow (state-required, API-list-empty-before-scope) → approved as wrong TikTok login first (Ikram, not dr.samhan — caught by identity check, re-granted right) → 36009003 wall → v202502 discovery → GREEN on all 4 room endpoints → wired into /shop-live with owner eyeballing every step ("gooooodd", then dashboard-compare screenshots). Mood: high-trust, high-tempo, owner tests on prod between every deploy and pastes exact results. Terse "ok go" = build + deploy immediately. "wrap up" came only after the dashboard-parity question was answered.

**What shipped (tsc clean every step, 15 prod deploys, all owner-verified live, all UNCOMMITTED; latest `dpl_4MWdtsbKqu6MaPmMSrfLtxvbne1Y`).**
- `036_shop_creator_tokens.sql` + `037` (scopes/user_type cols) — owner ran prod (confirm dev too). Per-creator store keyed `(shop_id, creator_open_id)`.
- Temp `/shop-auth/grant` (admin-only, Settings → Shop grants, unlisted otherwise): 10-min HMAC-minted seller/creator links (`start?format=json`), seller 302 flow kept, creator alliance URL `shop.tiktok.com/alliance/creator/auth?app_key&state`.
- `callback`: creator branch verifies query-state HMAC with NO session (minted link is the capability; legacy cookie flow keeps session gate); seller minted-links also session-free cross-device. `status` (lengths-only inventory) + creator `PUT label` (Name/Username, survives re-grants) + MYT timestamps.
- `middleware.ts`: `/api/shop-auth/callback` public at edge (route still enforces HMAC/expiry).
- Creator probe → room detail: `GET /api/shop-live/creator-probe` (matrix: core_stats + traffic + gmv_trend + product, fail-open each) and `GET /api/shop-live/room-detail` (username-labeled grant lookup + 4-call bundle); `GET /api/shop-live/creator-grants` (username inventory for badges); `sessions` gains `raw=1/find=/scan=creators` debug.
- `/shop-live` renders: `(creator ✓)` picker badges, Fetch room detail (KPIs + traffic sources w/ share % + products w/ exposure/stock + 15-min GMV trend), List-grain row (impressions/views/clicks/tap-through exact/avg-watch/sales, null-aware `n/a`), CTOR field fix (`click_order_rate`), live-now lag hint.
- Proof run: room `7700018251179002645` (24 Oct Mid-Month Sale, dr.samhan affiliate) — 4/4 green, GMV 49,302.23 = List live_gmv exact. Ongoing live `7701965489588816692` renders live too.
- TTS Open Toolkit: already installed (CLI 0.1.7 `tts_open_toolkit`, skills in Claude dir, MY profile authed) — used its skill pack in-chat (OAS/FAQ); CLI proxy unused.

**Bugs + lessons (sequence continues B122).**
- B123 circulated-id mismatch: probe said "no grant" while status showed the row — my pasted open_id carried an invisible difference. Lesson: open_ids are Copy-id-from-table bytes only, never retyped; lookup errors now echo looked-up prefix+len.
- B124 middleware 401'd the session-less callback before the route's HMAC check ran. Lesson: self-authenticating routes (signed state + expiry) belong in the middleware public list; the route still enforces.
- B125 seller minted-link "admin only" on another device. Lesson: the minted HMAC link IS the capability (10-min + single-use code) — session gate only for legacy cookie flow.
- B126 creator open_id (alliance `nAKT…`) ≠ shop List open_id (`B35v…`) for the SAME human; exchange carries no username. Lesson: match grants↔rooms by admin-labeled username, never cross-surface open_ids; labels are manual (one per creator, survives re-grants).
- B127 Live Room `202309` 500s `36009003` on every endpoint regardless of token — bundled OAS was stale; documented version is `v202502`. Lesson: for brand-new TikTok APIs, verify the version against live Partner docs/Testing Tool, never the bundled OAS.
- B128 affiliate List rows omit `traffic.impressions/ctr/tap_through_rate` (verified in raw dumps). Lesson: absent key ≠ 0 — render `n/a`, keep the mapping ready; never substitute product_impressions.
- B129 product CTOR field is `click_order_rate` on product rows vs `click_to_order_rate` on core — same family, different names. Lesson: check field names per endpoint, never assume symmetry.
- B130 `getShopCreatorGrant` swallowed DB errors into "no grant". Lesson: split table-missing vs no-row errors at the lookup boundary.
- Lesson: wrong-login approvals are silent (grant stores with "@?") — always verify the TikTok profile on the approval screen BEFORE tapping Authorize; the username can't be recovered afterward (exchange has no name field).
- Lesson: `seller token → 36009005` vs `creator token → 36009003` on the same call is a clean token-type discriminator — probe the seller control first when a new creator endpoint fails.

**Open (owner vs next-build).**
- Owner: label remaining creator rows as grants land (1/36: dr.samhan); eyeball room detail vs Seller Center dashboard; support tickets HELD (v202502 works — do not send the drafted 36009003 ticket); optional single-field ticket for affiliate `traffic.impressions` (dashboard-only today).
- Next-build: parked post-authorize landing UI polish; affiliate minute (28001022) stays denied by design — room detail is the path, no further work; Ads Cost + GMV Max ROI join (Marketing API) if owner asks; TTS CLI `openapi` proxy for future probes (optional).
- Standing: tree mixes Cp53 + sibling uncommitted work — touch only shop-auth/shop-live files; commit/push never unasked (owner commits).

## Checkpoint 53 — 29 Oct 2026 (creative Posted/Age: columns live, API path dead, xlsx-import fallback; PARKED mid-priority)

**To next-you: get back in this headspace instantly.** Owner asked for one thing — "posted time and age on /creative" — then steered probe-first through four TikTok dead ends without flinching ("can we probe to try see it?", pasted every Round 7 result back verbatim). Accepted the honest verdict (API can't give organic post dates) and parked it mid-priority instead of pushing a fifth guess. Same terse loop as Cp51: "go", screenshot, "wrap up". Sibling session touched the same tree all day (shop-auth, nightly-sync, gmv-max page) — my files are creative/*, creative.ts, creative-meta, 035, skill §5 only.

**What shipped (tsc clean every step, 5 prod deploys, all UNCOMMITTED; latest `dpl_2hZxJenpT4AJuGH1M8dvapC5pGtJ`).**
- `035_creative_item_meta.sql` (owner ran dev+prod): `creative.item_meta(item_id PK, posted_at, source)`.
- `/creative` Posted + Age columns (kill list + Columns… picker + CSV `posted,age_days` + all-rows table); MYT age from `posted_at`, `—` when unknown.
- Sync auto-fill (`enrichItemMeta`, fail-open, `metaForce` retries misses on manual Sync): `file/video/ad/info` → `ad/get` → `gmv_max/video/get` (store_id+store_authorized_bc_id, page_size ≤50).
- Round 7 probe (3 real post IDs): file + creative/report = 40001-gated; ad/get = 0 ads; video/get = code 0 / 0 rows (uploads, not organic posts). Verdict: **no TikTok endpoint returns organic post dates** — recorded in `skills/tiktok-api/SKILL.md` §5, do not re-probe.
- Fallback that works: `POST /api/creative-meta` + Import posted times block (paste `Post ID,Time posted` from xlsx, fills empties only, naive = MYT).

**Parked (MID priority, resume later).** True auto post-dates need app approval (re-probe the 40001s) or a Shop/Research-API path. Resume: Run probe → Round 7 → if any source green, wire into `enrichItemMeta`; else keep xlsx-import.

**Bugs + lessons.**
- B121 edit ate `round2Probe`'s closing brace (insert anchored on `return out; }` + export consumed the brace; tsc caught it at EOF). Lesson (B93/B106/B118 repeat, logged honestly): structural inserts need a re-read of BOTH seams before verifying — tsc catches it, eyes find it faster.
- B122 `gmv_max/video/get` at page_size 100 40002s ("number must be most 50") while enrich silently missed. Lesson: when TikTok names a number in an error message, apply it to every caller immediately (enrich now pages 50).
- Lesson: probe-then-wire beats guessing — 4 endpoints × 3 deploys of evidence killed the API path in one session instead of a week of maybes.

**Open (owner vs next-build).**
- Owner: commits (tree mixes other uncommitted work); eyeball Posted/Age after an import.
- Next-build: nothing pending on this arc.

## Checkpoint 52 — 28 Oct 2026 (TTAM live-Ad creative triage in Ads Manager via browser MCP; docs only, UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner drove live in their own Chrome (tab 31, TTAM Ad view, Brand Consideration 28 Sep–27 Oct): "tick all above 0.04" → "exclude 0.04 and below, 0.05+ only" → "what did I tick?" → "analysis, kill or not?" → defended 4 WATCH → "untick the 4 watch" → "I see 12 selected" → "list full numbers" → "wrap up". Terse throughout, decides fast, trusts screenshots over claims. Sparring stayed ON (CPC-line honesty, asymmetric-risk case for WATCH). No code, no deploys, no commits (owner commits). Standing rules kept: agreed tab only, no sign-in touches, no agent tabs left open.

**What happened (verified via chrome-devtools MCP, not guesses).**
- Rule locked: Cost per consideration strictly >0.04 (0.04 and below excluded). 13 rows qualify.
- Verdicts: CPC nominates, CPM vs 5.03 avg + 6s-hold vs 10.83% avg decide → 9 KILL + 4 WATCH (~RM2,238 of 14,490 at stake).
- WATCH (4, keep): `7664088569220173074` (0.05, 214 clicks — best pull, fix hook), `7664498275264761095` (0.05, CPM 5.42 ≈ avg), `7664088569220173074` (0.05, rate 13.43% ≈ mean), `7664499552828820754` (0.06, thin evidence 17k impr).
- KILL (9): `7664866336257953042` (0.11) / `7665617581130255624` + `7664155824754789650` (0.08) / `7668986026152496392` + `7665617335671115026` + `7664868135668829448` (0.07) / `7670470280048889096` (0.06, CPM 9.31) / `7668981355144809736` + `7664867079840877832` (0.05).
- Final live state: all 13 ticked (header count bounced 9/12/13 mid-sweep — virtualized re-renders; ground truth = per-row DOM read, 13/13 confirmed).

**Bugs + lessons.**
- B119 table restores prior selection on re-render: snapshot-uid clicks + `input.click()` unticks reverted; header count disagreed with mounted DOM (9 vs 12). Lesson: on this Ads Manager table, treat selection as sticky-per-row-identity — verify by sweeping ALL virtual windows and reading checked-state per row, never by header count or single-window DOM.
- B120 TikTok creative table lives in shadow DOM: `querySelector('table')` = null, `innerText` = empty, `textContent` + shadow-piercing `deep()` works. Lesson: any future Ads Manager DOM work starts with the shadow-walk + `deep()` text helper, not snapshot uids.
- Lesson: `skills/browser-access/SKILL.md` created this session (UNCOMMITTED, untracked) — checkbox-flow setup + agreed-tabs-only rules. Next browser session: read it first, `list_pages` first call, never `taskkill` Chrome.
- Lesson: 0.04 is the account's own Total-row average, not a benchmark — it drifts down as the tail is killed. If CPC becomes a rule, relative form (`>2x trailing avg`) is defensible; absolute 0.04 is eyeball.

**Open (owner vs next-build).**
- Owner: bulk action on the 13 (or untick 4 WATCH first — hand them the 13 full IDs above); TTAM score eyeball after focused-6s switch + Kill/Scale for sample-13 → userscript v1 still parked.
- Next-build: nothing pending on this arc. Tree still mixes Cp49–51 uncommitted work + untracked `skills/browser-access/` — touch only docs until owner commits.

## Checkpoint 51 — 27 Oct 2026 (creative analytics port: accounts/trends/verdicts/columns/diagnostics; 14 deploys, all live-verified, UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner drove screenshot-first all day: pasted Ads Manager vs board mismatches, asked "why different?", then steered each fix ("ok go", "ok next", "ok next phase", "deploy each one"). Started from a real 28% gap on himcoffee 24→26 Oct — diagnosed as read-path LIMIT-2000 (B117), proved with a single-day exact match, then ported half the local creative-analysis tool online phase by phase. Frequent Plan/Build toggles — roll with it, words-first in Plan, build on "go". Sibling session active all day (Cp50, `ttam.ts` + skill touches) — touch only creative/gmv files. Owner commits, never us.

**What shipped (tsc green every step, 14 prod deploys, all owner-verified live, all UNCOMMITTED).**
- B117 fix: KPIs from server-side full-range SUMs (`totals` + `totalsStatus`, `?status=` + `?totalsOnly=1` support); 24→26 reconciles exact 1765/14264/8.08. Follow-up: per-day chunked Fetch (oldest day starved again at 2000 rows — newest-first LIMIT serves 27+26 before 25).
- Kill list: verdict filter, Post ID column (copy), Columns… picker (All/None, state-only reset), Spend/GMV rank toggle, Daily ▸ day-columns + Total (metric-driven, hidden by default), Shape column (solo popup entry), hook/hold diagnostics in `Why` + expandable quartile/CTR/CVR strip + per-post sparkline.
- Analytics blocks: Top-10-accounts cards (5×2 grid kept) + collapsible per-account summary, ads-daily trend (5 tickable cards, vs-previous deltas, Chart.js multi-line, day table), trend-per-creative (top-10 chart, pivot table w/ `=` absent, solo popup, CSV) — later merged into kill list; chart/CSV/solo survive.
- Account kinds (owner rules): registered plain = internal, top_affiliate = top affiliate, unregistered = affiliate, inactive + spending = red ⚠ + banner + `Why` fragment, Product-card bucket = no pill (server CASE label). Kind filter + per-kind subtotals.
- Shared skill calendar on `/creative` (Range button + DateRangePicker, no fork); slimmed sync (roi/cpo mapper-computed, dropped from pull).
- Product-card "0"-account diagnosis: raw `tt_account_name` sentinel, same family as B98.

**Bugs + lessons.**
- B117 KPI-on-truncated-rows: aggregates server-side, never from display sets.
- B118 edit-tool appetite, 3 hits one session (TrendChart signature, loadTargets decl, rows-toggle opener eaten by partial-oldString edits). Lesson (B93/B106 repeat, logged honestly): big-block replaces need a re-read of BOTH seams before verifying — tsc catches it, eyes find it faster.
- Lesson: sibling deploys carry your uncommitted code to prod (Cp50) — deploy IDs in this tree are shared; note shared-tree deploys in the checkpoint, don't claim sole ownership.
- Lesson: exact-count labels ("2000 rows.") are tripwires — when a count sits exactly on a known cap, it's the cap until proven otherwise.

**Open (owner vs next-build).**
- Owner: eyeball prod `/creative` end-to-end (kinds, Daily ▸, solo, trend CSV); tonight's nightly confirms no 40001 page.
- Next-build: parked defensive sync-caps fix (build only if a campaign passes 20 products or surprise `skipped`); commit/push never unasked (tree mixes sibling work).

## Checkpoint 50 — 27 Oct 2026 (TTAM creative identity + per-adgroup search + deep-find; tsc clean, deployed prod, UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Same terse "ok/go" loop, owner testing on prod between builds (screenshots of the TTAM drill). Arc: TTAM creative analysis (ad `...274913` hogging 84.6% of its adgroup) → challenger-split plan → `adgroup_create` IN_ROLL_OUT blocked (manual Ads Manager path handed over, still pending) → built the visibility tooling instead so the owner can see creatives without relying on ad names. Two plan-mode interludes (freshness-panel question → DB-first plan now lives in `C:\Users\darkv\.opencode\plan\` for the other chat; deep-find 60s question → answered from architecture, no new code needed). Closed "ok wrap up" → ritual, docs only, zero commits.

**What shipped (tsc green after every edit, 6 prod deploys, all UNCOMMITTED; latest `dpl_BQGPPA6EXh7w5T8PZ97AvSEgsmQe`).**
- TTAM ad identity (`ttam.ts`): `TtamAd` carries `tiktok_item_id/display_name/identity_type/ad_text` from `/ad/get/` (fields were fetched, mapper dropped them) + `label/caption` with Choice-A dedupe (strip trailing `_19digits` from `ad_name`; title==text renders once). Short post-ID names pass through untouched.
- Per-adgroup creative search + caption collapse (`page.tsx`): filter box per open adgroup (matches ad/post/account/text/caption, `n/m` counter); caption collapses to one ellipsis line with ▸/▾ toggle; post ID always on line 1.
- Deep-find (`page.tsx`): button next to the campaign search fans out client-side across unexpanded campaigns/adgroups (spend order, `first hit stops` default on), streams clickable matches, jumps (expand + scroll + highlight + verdict filter reset), Stop/skip accounting (`scanned N, skipped M`), resume-from-cache. No new API routes.
- Deploy trail: `dpl_…nlbvu7md` (identity+search) → `dpl_FNRgNkGDLeLnjvomgTkf63M2uCT7` (collapse) → `dpl_EMP7TY…` (unverified mid) → `dpl_9boRatqT2…` (Choice A) → `dpl_F5sa5nmDqZd…` (deep-find) → `dpl_BQGPPA6EXh7w5T8PZ97AvSEgsmQe` (close-out, current prod).

**Findings (verified via MCP, not guesses).**
- `ad_name` is verbatim stored: `...775394` rows store `"{caption} _{post_id}"` (creation-flow default), while the same posts in another account store bare post IDs. API never composes — Ads Manager just renders its own short form. Lesson: strip `/[\s_]*\d{19}\s*$/` before comparing/displaying names.
- Write tools gated: `adgroup_create` → `NOT_AVAILABLE/IN_ROLL_OUT` per-advertiser till Dec (deterministic, pre-validation). Challenger split (RM20, winner stays) parked on manual Ads Manager duplicate. Reads all green.
- Post-ID-only reverse lookup: no single tool (`tt_video_info_get` needs auth code); practical path is `ad_get` pull + client-side `tiktok_item_id` match, or `identity_video_info_get` once identity known.

**Open (owner vs next-build).**
- Owner: manual challenger split in Ads Manager (4 losers → `EVENT | CHALLENGER` RM20, pause originals after delivery); then ask for a 5-way spend-share re-pull to confirm. Do NOT commit (explicit).
- Next-build: nothing pending on this arc. Standing constraints: shop-1-only (Cp49 order, still active); tree mixes Cp49's uncommitted DB-first work — touch only my files.
- ⚠️ CORRECTION to Cp49: it claims UNDEPLOYED, but this session deployed prod 5× from this same dirty tree — **prod already contains Cp49's DB-first code** (plus mine). Owner's "already do" on thread 3 is consistent with that. Do not re-deploy Cp49's arc as "new".

## Checkpoint 49 — 27 Oct 2026 (DB-first total + 40001 nightly fix + shop-1-only lock + creative totals/picker; tsc clean, deployed `dpl_6ac4gJQ7MyqojPJVdxur4Z3dbN2P`, UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Plan-mode → "go" loop, all terse. Owner confirmed the two open decisions fast (60-min staleness, silent background-fill) then tested while I built. Mid-session they pasted a Telegram `nightly-sync FAILED: campaign/get 40001` alert — diagnosed from code-shape alone (wrong-token substitution, not a permission loss) and fixed same session. Closed with a standing order: **shop 1 only from here on, ignore other shops everywhere** — treat as an active constraint until explicitly lifted. Then "wrap up" → full ritual, docs only, zero commits (owner commits). No deploys this session (nothing left the laptop; owner deploys).

**What shipped (tsc green after every edit, all UNCOMMITTED + UNDEPLOYED).**
- DB-first total/live/product (`gmv-max/page.tsx`): auto-load renders the Neon snapshot instantly with a `cached · synced Xm ago` pill, then a silent live refresh atomically replaces it (no merger double-count). Fresh singles stay cached (Fetch Data = live, as today); total + stale (>60 min) singles auto-refresh; missing/empty snapshot → fetch-first as today; live failure keeps cache + retry note. Merged rows carry `cached/pulledAt/partial`; live rows show a green `live` pill.
- Hourly-shop badge (`hourly-shop.ts` + page): `getHourlyShopView` returns `snapshot { shopUpdatedAt, adsPulledAt, ageMin, stale }` (fail-open); UI pill `cached · synced Xm ago`, red `stale (>60m)` when stale.
- B115 fix (`ads-credentials.ts`): env fallback is per-advertiser only (shop's own `accessTokenEnv` via SHOPS) — another shop's token can never be handed over mislabeled again.
- B116 fix (`cron/nightly-sync`): per-shop fail-open (one shop's error records + continues, guard-heal too); Telegram alerts on shop-1 failure only.
- Shop-1-only lock (owner order): nightly-sync hard-defaults to `["1"]`; explicit non-1 `shopNumber` → 400. Hourly/TTAM crons already default `shopNumber=1`; dashboard `VALID_SHOPS` was already `{"1"}`.
- Creative totals fix (`api/creative-sync` full-range SUMs + `totalsStatus`, page KPIs from totals; B117 LIMIT-2000 diagnosis proven by 26-Oct single-day exact match) + shared skill calendar picker on `/creative` (Range button + DateRangePicker popup, no fork).
- Deployed `dpl_6ac4gJQ7MyqojPJVdxur4Z3dbN2P` (READY, `/api/health` ok; owner-asked). Still UNCOMMITTED. Note Cp50's correction: sibling session's 5 deploys had already carried Cp49's DB-first code to prod — this deploy adds the creative arc on top.
- Kill-list follow-ups: verdict filter (ALL/SCALE/WATCH/KILL/FATIGUE, drives summary+CSV+draft) + Post ID column (mono, click-to-copy) + Columns… picker (All/None + 12 checkboxes, state-only reset). Deployed `dpl_EUqz2K8NV48dVrwz1QVFEtzCqJRB` (READY, health ok; owner-asked). Still UNCOMMITTED.
- Creative analytics port (all `tsc` clean, each phase deployed owner-asked: `dpl_HwDYC2gJamz4WMCnoGFKBQdWpWyD` layout → `dpl_5k2o2bqmU5Z7vNACmZMgjNT5jDR3` accounts → `dpl_Afson7omjfmASTxw7bmq8ztbQ5gM` table-collapse → `dpl_7FEgkgvg2QgBsNvpWPxAMZC3wimk` Product-card label → `dpl_DPuZLLkzEjK3rHNdTXZUkUK43PnG` sort toggle + ads-daily sparkline → `dpl_84QM8BCNz7GyQ8VhrVo7jLZryFgE` per-creative strip → `dpl_AdELLaEb9YxE1sv3HmySwrBgNduz` local-style trend cards/chart/vs-prev → `dpl_FkGQrJ9krbHecWa4Z4KNWehoTQFd` per-day chunked fetch). Still UNCOMMITTED.

**Bugs + lessons.**
- B115 env-chain token substitution: `ENV_FALLBACKS` returned the first non-empty token for ANY advertiser — shop 2 ran on shop 1's token → `campaign/get 40001`. Lesson: credential fallbacks resolve per-identity or not at all; a chain that "helpfully" substitutes is a wrong-token bug wearing a resilience costume (rule 8 exists for exactly this).
- B116 nightly multi-shop abort: `Object.keys(SHOPS)` loop with a single outer try/catch meant shop 2's 40001 killed shops 3/4 + guard-heal + paged the owner. Lesson: every multi-tenant cron loop is per-tenant try/catch with per-tenant results; the alert fires on the money tenant only.
- B117 KPI-on-truncated-rows: creative KPIs summed the `LIMIT 2000` display set, understating a 3-day range ~28% (kept-ROI 8.50 > full-ROI 8.08 was the fingerprint — `gmv DESC` keeps the head). Lesson: aggregates always compute server-side over the full set; display limits never feed totals (B79's family).
- Lesson: `getManualCampaigns` 40001 was a red herring (fail-open catch) — the fatal throw was `getGMVMaxIds` one call earlier in `fetchManualSpend` (outside any try). When an alert names an endpoint, grep ALL throw sites with that prefix before blaming the first one found.
- Lesson: `ttam.ts` shows `M` in this tree — another session's uncommitted work. tsc covers the whole tree, so their file gates my deploys; touch only my files, note theirs.

**Open (owner vs next-build).**
- Owner: eyeball prod tabs (DB-first badges, creative 24→26 Oct ≈ 1765/14264/8.08, creative 📅 picker); tonight's nightly run confirms shop 1 green + no 40001 page.
- Next-build: nothing pending on this arc. Parked: defensive sync-caps fix (paginate product grain + 20-chunk group loop; audit 27 Oct closed clean — himcoffee 24→26 reconciles exact, no cap bit; build only if a campaign passes 20 products or an unexpected `skipped` appears). Standing constraints: shop-1-only; commit/push never unasked (tree mixes sibling session's `ttam.ts` + Cp50 work — touch only my files).

## Checkpoint 48 — 26 Oct 2026 (TikTok MCP + DB-first hourly + task notes + kill-list; all deployed, owner-verified live)

**To next-you: get back in this headspace instantly.** Marathon owner-driven day, terse loop throughout ("ok", "go", "ok done", screenshots, "park here. wrap up"). Owner tests on prod fast and reports precisely (pastes PowerShell errors + cron-job.org screenshots verbatim). "ok" without detail means build the proposal as specced. No deploys blocked on CLI auth (deploy_online.py worked repeatedly; exit-code-1 wrapper noise is cosmetic — JSON says READY). Sparring stayed ON but owner mostly wanted speed over debate; push back only where money is at stake (L5/L6 pause call, MAIN 1 hero). Tree mixes this session only — but commit unasked NEVER (owner commits).

**What shipped (all tsc-clean, deployed prod, owner-verified).**
- TikTok for Business MCP `tiktok-business` project-local + progressive (opencode.json); 5 advertisers green; memory in `tiktok-mcp/` (AGENTS + DEV_NOTES). Write tools IN_ROLL_OUT per-advertiser till Dec — MCP is READ-ONLY for GMV MAX VOL2. L5 paused manually in Ads Manager, verified DISABLED via API.
- Cron→Neon backbone: 032 (hourly PK +promotion_type) + 033 (ttam_hourly_campaign day grain) + 034 (task_notes); type-split hourly-sync, ttam-sync + sync-status cron routes, cron-alert.ts failure-only Telegram (silent:true cron); cron-job.org 3 jobs green; nightly guard-heal stays.
- Freshness panel (/gmv-max) + DB-backed LIVE/PRODUCT views (hourly-report.ts, same shape + cached/partial; Fetch = live re-pull; total still live).
- Task notes (/calendar section + Today/Tomorrow groups + grid dots + edit/delete/refresh-propagation fix); task-note.py agent write path; L6 day-7 seeded 29 Oct (id 1).
- Creative kill-list (/creative: aggregation + KILL/WATCH/SCALE + CSV + exclusion-draft copy + status filter + # rank); fixed syncCreativeDay >60s hang (dateless grain = 30k lifetime rows mislabeled + sequential upserts → day grain + paged + batched). Oct 9–10 cache rows were lifetime snapshots — re-sync fixed.
- Analysis delivered in chat (not stored): 19–26 Oct ROI 10.68 gross / 7.97 net; MAIN 1 hero post 21%-spend@3.65 + tail waste; VINCA/Kombo + weak HIMCoffee = kill; L6 beats L5; 24 Oct spend spike 3–4x (unexplained, owner eyes on).

**Bugs + lessons.**
- B110 032-on-PROD 500: new 4-col PK vs old 3-col ON CONFLICT — every schema-widening migration must grep all ON CONFLICT targets the same session. Fixed + deployed same day.
- B111 ttam stride: `o = j * (cols.length + 1)` desyncs every row after first — batch builders: stride MUST equal column count; mirror hourly.ts `j * 7` shape. Owner's Telegram failure alert caught it (system works).
- B112 creative dateless grain: dimensions without stat_time_* make TikTok ignore start/end_date silently returning lifetime data — ALWAYS include a time dim when dates matter; symptom = suspiciously round/huge row counts.
- B113 panel stale: add-form reloaded only its own list — any dual-source view needs an onChanged refresh prop; check both readers after every writer change.
- B114 PowerShell quoting: multi-line python -c with quotes breaks in PS 5.1 — temp .py file in opencode temp dir instead (deleted after).
- Lesson: owner pastes secrets-adjacent values into chat selections (CRON_SECRET fragment appeared in a system reminder) — never repeat values back; lengths-only always.
- Lesson: `total` metric view still live-pulls (by design, Stage 6 scope) — next session will ask about it; answer: DB total needs manual-spend + shop-truth merge (ttam cache + daily_shop_metrics), doable, not started.

**Open (owner vs next-build).**
- Owner: 29 Oct L6 day-7 review (task note seeded); eyes on 24-Oct-spike cause; apply exclusion drafts in Ads Manager by hand.
- Next-build: DB-backed `total` view; exclusion auto-apply (needs explicit owner go + guardrail sign-off, post-Dec gate); creative auto-sync cron (currently manual Sync button); feature.md user-guide pass for panel/notes/kill-list (deferred this wrap-up — folder CHANGELOG + plan carry the record).

## Checkpoint 47 — 20 Oct 2026 (creative-analysis v55 + pull_creative move + chart-legend skill; local-only, UNCOMMITTED)

**To next-you.** Parallel-session day: Cp46's access/live-board work is theirs — mine was all creative-analysis side. Terse feasibility→"go" loop, plus two plan-mode interludes (owner flips modes cleanly). No deploys (nothing deployable: static tool + local script + skill).

**What shipped (all local, uncommitted, nothing pushed).**
- Preview column controls v55 (`tiktok-creative-analysis/app.js:buildPreviewHtml` only + `?v=55`): Show all / Post ID only / Hide all + `Columns…` tick list + Copy Post IDs (newline-joined, copied-count note). `CHANGELOG` v55 + `feature.md` + `plan.md` ticked; smoke 200s on fresh port 8131.
- `pull_creative.py` now in `tiktok-creative-analysis/` (moved from here — tool is stdlib-only so secrets resolve outward, not inward). Live `--dry-run` vs prod green: 26 vs 22 (9+/5−/3~, targets same). Real pull NOT run — owner reviews renames first (`mrjalanking7`→`MrJalanKing 🇲🇾`?). Changed-only stamp kept from Neon; backups automatic.
- New repo skill `skills/chart-legend-gating/` (legend-gated lines + card sync, from secDay v44/v48). Declined blanket rollout: surveyed all 5 Chart.js instances, only secDay fits (trend = dynamic top-10, rev/solo single-dataset, shop 2-metric). Tooltip-helper consolidation proposed + explained, parked on "nvm".

**Bugs + lessons.**
- B108 cp1252 print crash: prod names carry `🇲🇾`; Windows console `print` died mid-dry-run. Fix: `sys.stdout.reconfigure(encoding="utf-8")` at top. Lesson: every local script that prints DB content needs this on win32 — add to the reuse checklist.
- B109 two-python trap: `bin/python.exe` (has psycopg) vs `C:\Python314\python.exe` (editor/PATH default, didn't). Pylance "cannot find psycopg" was lint-only — runtime was green. Lesson: when the owner screenshots an import squiggle, check `where.exe python` first; installed driver into both. Lesson: verify which interpreter the IDE resolves before touching code.

**Open (owner vs next-build).**
- Owner: review dry-run diff (possible renames shift exact-name matching) → run real pull → `python server.py` smoke → commit/push when ready (tree mixes Cp46 + ≥1 other session — never unasked).
- Next-build: tooltip `vsPrev` suffix helper if owner revives it; audit-log readback UI stays optional (Cp46).

## Checkpoint 46 — 20 Oct 2026 (Accounts live-notes + live board + module permissions; tsc clean, UNDEPLOYED, 031 owner-run on prod)

**To next-you: get back in this headspace instantly.** Owner drove the whole arc in short bursts with screenshots: "add live notes column (available if live is true)" → specced in Plan mode (new 030 TEXT col, hidden-but-preserved when unticked, free length, in CSV/JSON) → "ok go" → built → "expand the space, too tight" → widened w-28→w-64 + page max-w-6xl→1600px → "display when editing also more wide, use the side empty space?" → widened all text inputs (name/user/id/identity/note) + title tooltips + focus-expand on the two ID columns → "for live if true i want dropdown (Internal/External/AI/Relive) + add another value" → datalist presets + localStorage customs, no migration → "dashboard to show general info like this [4-col screenshot]" → fixed-4 + Other board, preview section on /accounts + full /accounts/live subpage → "are there options to allow a user access to accounts editing only?" → full 10-module permission system (031 + requireModule + Access UI + Shell/home/page gates) → owner ran 031, "it works" → "explain 3" (audit scope entries + shared-read rule) → built audit entries → "wrap up". Mood: brisk, visual, owner tests on prod fast; "ok" without detail means build the proposal as specced. No deploys this session — owner deploys; tree mixes other sessions' creative-analysis xlsx + chart-legend skill work, never commit unasked.

**What shipped (tsc clean at every step, ALL UNCOMMITTED + UNDEPLOYED).**
- `030_creative_live_note.sql` (new): `creative.accounts.live_note TEXT DEFAULT ''`; fail-open `hasLiveNoteCol()` in `api/creative-accounts` (GET/POST carry + changed-only stamp). Owner runs dev+prod.
- `/accounts` table: `live_note` col after Live (view `—` when unticked, edit disabled, value preserved); wider inputs (name w-56, user w-44, acct w-48 focus:w-64, identity w-72 focus:w-96, note w-48, live-note w-64) + `title=` hover on all; page `max-w-[1600px]`; CSV/JSON include `live_note` (+ `liveNote` alias).
- Live-note presets: `<input list="live-note-presets">` datalist (Internal Acc / External Acc / AI / Relive + row values + `localStorage:creative-live-note-customs` ≤50, stashed on save).
- Live board: pure `accounts/liveBoard.ts` (`groupLiveAccounts`, fixed 4 + `Other`, name-sorted, `revisedAt`); compact preview on `/accounts` (6/col + more-links) + full `/accounts/live` subpage (counts + `Revised <date en-GB>` footer) + Settings sidebar `Live board` entry.
- Module permissions (deny-by-default): `031_access_modules.sql` (owner ran prod 20 Oct — confirm dev too); `allowlist-store` MODULES(10) + `normalizeModules` (unknown→deny) + `getUserModules` (fail-open pre-031); `authz.requireModule(...anyOf)`; 40 gates swapped across all data routes (shared reads: ttam-presets GET gmv-max/presets + POST presets-only; shop-gmv gmv-max/shop-cost; shop-token GET 3-shop-mods, POST stays admin); `/api/whoami`; `module-gate.tsx` (useWhoami/canSee/ModuleGate/ModuleRedirect); Shell filters every nav section; home page server-filters cards + Agenda/Affiliates; all 12 module pages redirect to `/` when ungranted; `/access` manager Full-checkbox + per-row Scope editor; PUT audit `access_allowlist.scope` {email,old,new} + POST detail carries modules.
- Proof: `npx tsc --noEmit` green after each arc; `grep requireAllowlistedUser api/` = zero hits; owner confirmed scoped accounts-only access works on prod ("it works").

**Bugs + lessons.**
- B106 access-list POST over-delete: hand-transcribed oldString (409→400 slip) matched a block boundary and the edit ate the whole POST body; caught on re-read, repaired from fresh read. Lesson: never transcribe oldStrings from memory — copy from the immediately-preceding read output; after EVERY structural edit re-read the region before continuing (rule 14 exists for exactly this).
- B107 auth import depth: `online/auth.ts` sits at online/, so `@/lib`-style `../auth` from `src/app/page.tsx` 404s in tsc — count `../` from the file's own dir (`../../auth`), same for `api/whoami` (`../../../../auth`). Lesson: new route files must resolve the auth import against the tree, not copy the depth from a different folder.
- Windows note (repeat of Cp45): no `head` cmdlet — bare `npx tsc --noEmit`.

**Open (owner vs next-build).**
- Owner: deploy `deploy_online.py` from repo root (build must list `/accounts/live` + `/api/whoami`); re-verify scoped accounts-only user post-deploy (nav/home/gates + 403s) + signed-out/removed paths; commit/push when ready (never unasked — tree mixes ≥2 other sessions).
- Next-build: nothing pending. Optional: audit-log readback UI on /access; per-module write-key split was declined (public keys add no security — session+module is the boundary, documented in plan).

## Checkpoint 45 — 17 Oct 2026 (Shop GMV summary-card redesign; 1 deploy, UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Quiet single-task session after the big TTAM-probe arc: owner pasted the old 8-row shop-gmv card ("more understandable? refer design skills") → diagnosed flat hierarchy + TRUE/TRUE ACTUAL jargon + ambiguous delta → proposed 3-band redesign in words first (sparring rule: words until "go") → owner said "go" → edited `page.tsx:1712-1798` only → tsc clean → owner said "deploy" → `dpl_7rag6aq9GCtRMQk6iQSkAEUBC3AW` green → owner asked "explain each one" (did, line-by-line) → "why ads claims is bigger?" (Shop API real orders ex-cancel/refund vs Marketing API attribution credit — decide off shop truth) → "wrap up". Mood: calm, owner happy with words-first proposal; no bugs, no other-session interference this time.

**What shipped (tsc clean, deploy green, UNCOMMITTED).**
- Summary card only (`online/src/app/gmv-max/page.tsx:1712-1798`, `cardCls` untouched, daily chart/table untouched): hero "Shop got MYR + orders + spend" → shop-vs-ads bars (emerald vs grey) + plain-words gap sentence → "Real return" big + after-SST+WHT sub + per-MYR1 sentence + ads-claimed footnote. Old TRUE ROAS/TRUE ACTUAL survive as `title=` tooltips. Not-configured branch kept with reworded locked-ref line.
- Deploy: `deploy_online.py` from repo root, build lists `/gmv-max` + `/api/shop-gmv`. Output shows `deploymentProtection: []` — flagged to owner, NOT verified/fixed (rule 12: wall must cover All Deployments).

**Bugs + lessons.**
- None this session. Note: `npx tsc` in `online/` on win32 — pipe to `head` fails (no head cmdlet); run bare `npx tsc --noEmit`.

**Open (owner vs next-build).**
- Owner: eyeball `?shop=1&metric=shop-gmv` on prod; verify Vercel Deployment Protection still All Deployments; commit/push when ready (tree still mixes uncommitted work from ≥3 sessions — never commit unasked).
- Next-build: nothing pending on this card. Optional follow-ups if owner asks: rename hourly-shop table's `TRUE ROAS` header for consistency; add guardrail pill (ROI 7.0 floor) to the Real-return band.

## Checkpoint 44 — 17 Oct 2026 (TTAM probe Groups 1–4 + true focused-6s switch + metric registry + Shop Analytics probe + TTAM Analytic masterplan; 1 deploy, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner drove the whole arc with screenshots and short "ok go"s: first "probe all TTAM metrics?" → found the plan file already had the map → they asked where probe info lives → wanted it in an md → then the three metric-group display lists (Brand Consideration / Reach / Full Funnel On Shop) → mapped display→API names (many guesses) → extended `CANDIDATES` → probe timed out (>60s) → split `?group=1/2/3` → owner deployed + pasted JSON like a champ three times → `engaged_view` (true focused-6s) confirmed → switched sfv off the plain-6s proxy → 8 Shop funnel guesses FAIL → found true `onsite_*` names → `?group=4` full_set OK ×3 grains → assisted/new-90d still keyless → tried Shop API (`/api/shop-analytics-probe`, both code 0) → confirmed no 90d-split and no assisted anywhere → owner: "explain simple" → parked to Tampermonkey highlight in `1-2-tools/TTAM Analytic/` (masterplan + sample-13 thresholds, awaiting Kill/Scale + userscript) → "wrap up". Mood: fast, tactile, owner trusts probe evidence over docs; "ok go" means build it now. Sparring held once (warned Group 3 shop set would likely FAIL on BASIC — half right: core OK, funnel needed true names).

**What shipped (tsc clean at each deploy; deploys green where noted; ALL UNCOMMITTED).**
- Probe split: `route.ts` `BASE/GROUP1–4` + `?group=base|1|2/3/4|all` (+ count in output, sleeps 500→300/200ms). Owner ran G1/G2/G3/G4 on prod, pasted JSON; logged to `ttam-verified-metrics.md:§1/§4/§5` + plan Code truth/log.
- G-results (identical all 3 grains): G1 6 OK (`new_consideration_*`, `engaged_view`, both `paid_engaged_*`) / 4 FAIL (`assisted_*`, `engaged_view_rate`); G2 10 OK (reach set + `engagements`/`engagement_rate` = Clicks/CTR-all + interactives) / 3 FAIL (`skips*`); G3 7 OK (onsite core) / 8 FAIL (funnel guesses); G4 full_set OK rows=10, all 12 OK (`onsite_product_details_page_view_rate` = Product page view rate, `onsite_add_to_cart_rate` = Add to cart rate).
- sfv switch (`dpl_xGAVhvgcpWnuxAyoT4raHLUBfyUN`, `/api/health` ok): `TTAM_METRICS[14]` adds `engaged_view` (fallback `video_watched_6s`), `toRaw` prefers engaged, `INPUT_MAP sfv→engaged_view`, `sfvProxy: false` everywhere. Expect ACS up / HPS down vs plain-6s (~14% hot).
- Docs: `ttam-verified-metrics.md` (standalone mirror, §5 group-first in image order, tap→registry) + `ttam-metric-registry.md` (62-key registry, OMTM-style Kill/Scale mostly blank, groups reference keys, do-not-use list).
- Shop probe: `/api/shop-analytics-probe` (202509 shop performance + 202605 product performance, 08–15 Oct window both code 0): traffic only `avg_page_views/avg_visitors/avg_conversation_rate`, funnel `add_cart_rate/click_order_rate/ctr` by channel. Verdict logged: no 90d-inactive split, no `assisted_*` on either API — closest-OK mapping kept in §5.
- Parked: `1-2-tools/TTAM Analytic/` (`masterplan.md` + `plan.md` + `thresholds.json` v1-sample-13, only `impressions` pre-filled). Next: owner fills Kill/Scale → userscript v1.

**Bugs + lessons.**
- B105 mega-probe timeout: ~65-metric full set + singles bisect ≈ 195 TikTok calls > 60s Hobby cap. Lesson: never grow `CANDIDATES` without a `?group=` shard; keep each run ≤15 metrics.
- sfv `||` fallback treats genuine 0-engaged as missing (falls back to plain-6s). Harmless (sfv=0 either way → ACS 999→null-safe path) but note it before anyone "fixes" it into a branch.
- `code 0 ≠ usable` repeat (B98 family): assisted-group names 40002 on BASIC yet Ads Manager shows the columns (zeros) — UI display ≠ API metric. Lesson: probe-first, and keep FAIL display names visible with reason instead of deleting them.

**Open (owner vs next-build).**
- Owner: fill Kill/Scale for sample-13 (or name 2–3 rules) → TTAM Analytic userscript v1; decide raw-threshold vs OMTM-score format for bands.
- Next-build: Re-fetch TTAM to eyeball corrected scores; wire registry rows → preset metric rows when thresholds lock; commit/push everything (never unasked — tree mixes ≥3 sessions: ai/WoW, shop-cost, ours).
- Watch: `tsc` covers whole `online/` tree — another session's broken file blocks your deploy (B104 repeat risk).

## Checkpoint 43 — 15–17 Oct 2026 (AI Analyst WoW + EN/MS + campaign detail; 3 deploys, plain-words rule PENDING, UNFINISHED)

**To next-you: get back in this headspace instantly.** Owner pasted a Shopee-style Malay report ("I want like this at least") and asked why our TTAM verdict reads vague ("WATCH / AUDIT … conversion data absent"). Diagnosed honestly: TTAM has no ROI by design (engagement metrics only) + we starved the prompt (scores without metrics/flags/names), and Shop cache was genuinely empty (not a model glitch). Owner picked EN default + MS toggle, then drove screenshot-by-screenshot: caveat-first output → numbers-first rule → −55.5% WoW looked unfair → closed-days-only windows → "what is wow" → plain-words rule (week-over-week (WoW) on first use). Mood: brisk, visual, impatient with jargon; answers in words + numbers land, caveats don't. Sparring held once (no Shopee/multi-kedai numbers — TikTok shop 1 only, never invent).

**What shipped (tsc clean at each deploy, all UNCOMMITTED).**
- `dpl_Cpvdv4mZcG93SxrCWSL4KjBw8NQN`: WoW everywhere (GMV/Shop current-vs-previous from one 2x Neon pull: totals + % deltas, daily trend, top-10 campaigns with prev + deltas, worst spend-no-sales, fallers ≤−20%; TTAM cur+prev parallel pulls with spend deltas, raw imp/clicks/6s/likes/live + scores + flags + verdict, top-10 named) + EN/MS toggle (default EN, persisted + `?lang=`, part of 15m cache key) + 4-section template both languages (summary / wins / leaks / 3 actions, real campaign names + which tab to verify) + TTAM feeder note (no ROI expected).
- `dpl_53VYyvgkawF5KTfaKHhTsMiiX5d7`: numbers-first rule (never open with caveat/`*(Note...)*`; gaps go last with exact Refresh button) + `coverage` facts on GMV/Shop snapshots + Shop-empty note naming the fix (Refresh daily cache, ≤31d/press).
- `dpl_D9wZJdhLWUR6hDErygMGJSnKCBqB`: WoW on closed days only (today partial excluded from GMV/TTAM/Shop totals; equal n-day windows ending yesterday).
- PENDING (edited, NOT deployed): plain-words rule — full term + short form on first use (week-over-week (WoW), gross merchandise value (GMV), return on investment (ROI), cost per acquisition (CPA), return on ad spend (ROAS), average order value (AOV); MS equivalents). Blocked: `npx tsc --noEmit` now fails on the OTHER session's untracked `online/src/lib/shop-cost.ts` (TS2451 duplicate `names` ×2). Did NOT touch their file. Deploy the rule once tsc is green again.

**Bugs + lessons.**
- B104 other-session tsc block: `tsc --noEmit` covers the whole `online/` tree, so one session's broken file blocks every other session's deploy. Lesson: before blaming your edit, `git status --short` to attribute the failing file; never "fix" another session's file unasked — note it and park the deploy.
- WoW partial-today trap: mixing 6 closed days + partial today vs 7 full days manufactures a ~−50% "drop". Lesson: WoW windows must be equal CLOSED periods; today's live edge gets its own section (todayHours), never inside the comparison.
- Caveat-first output loses trust even when honest: the Shop-empty note was true but led the answer. Lesson: headline numbers first, data gaps last with the exact fix button.

**Open (owner vs next-build) — UNFINISHED, do these next.**
- Owner: Shop GMV tab → Refresh daily cache (≤31d/press) → re-run Analyze (Shop WoW still empty until then); retest `/ai` EN + MS fresh (toggle range to bust 15m cache) and confirm the −55.5% moves after closed-days fix; say whether "fallers" named the right campaigns.
- Next-build: deploy plain-words rule (needs green tsc — coordinate with shop-cost session owner); run `GET /api/ttam-probe?shopNumber=1` now that CANDIDATES carry the 3 requested groups (other session's tree change, uncommitted) and record which Group 2/3 metrics go FAIL on BASIC; commit/push everything (never unasked).
- Watch: tree mixes TWO sessions' uncommitted work — ours (`lib/ai.ts`, `app/api/ai/route.ts`, `app/ai/page.tsx`, untracked `app/ai/md.tsx`) vs theirs (`lib/shop-cost.ts`, `app/shop-cost/`, `app/api/shop-cost/`, Shell link, layout viewport, `app/api/ttam-probe/route.ts` CANDIDATES, `ttam-verified-metrics.md`, `ttam-api-metrics-plan.md`). Touch only AI files until they settle.

## Checkpoint 40 — 14–15 Oct 2026 (LIVE rename fix + Bracket|TT-account toggle + enrich backoff; 6 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner opened with a plain complaint: a live account renamed in TikTok, board still shows old name. Diagnosed in one read (`getShopReport` reads Neon cache, only `syncShopCampaigns` writes it, nothing calls it on Fetch) → shipped `Sync names` POST + button + nightly heal → owner asked "are live campaigns using the bracket?" (yes, `parseCampaignName`) → "what if we add API-or-bracket option for LIVE?" → long probe arc across Plan/Build toggles (owner toggles plan mode constantly — roll with it, probe-first answers land best). Probed `tt_account_name` at 4 grains (campaign grains code-0 but value `"0"`), doc-exact 7-day retry (`named: 0` despite spend), `campaign/get` (9 keys, no account), `ad/get` (0 ads), `gmv_max/info` (JACKPOT: `identity_list` with real `identity_id` + `identity_authorized_bc_id`), then `gmv_max/identity/get` shape-hunted via error messages (`store_id required` → `store_authorized_bc_id required` → code 0, 27 names, `fcba7163 → Dr. Samhan @dr.samhan` has_want:true). Owner even tried Postman themselves (used the ROW_ auth code as Access-Token — ELI5'd hotel key-card vs booking slip, they laughed "you do yourself, haha" → probed server-side instead). Backlog drained 171 → 76 → the 76 parked honest: `identity_unmapped` under the store BC = affiliate/unauthorized tail no endpoint will name → `bracket_only` marker + grey note. Mood: brisk, evidence-driven, high trust; owner pastes JSON/probe output like a champ. Sparring held once (talked them out of per-BC over-engineering until the fail-mix proved it: 76×`identity_unmapped`).

**What shipped (tsc 0 every step, deploys green, ALL UNCOMMITTED).**
- Rename fix (`dpl` chain start): `POST /api/campaigns/sync` (allowlist+same-origin, `CRON_SECRET` GET kept) + `Sync names` button on `/gmv-max` (syncs then auto-fetches) + nightly-sync heals names fail-open. `/accounts` untouched per owner.
- Toggle (`dpl_7RL5AcXKGMAeV2rG9okMzNoLK1cF`): `027` (`account_api/account_user/identity_id`, owner ran dev+prod) + `SHOPS[1].storeBcId` + `fetchGmvIdentityMap` (15-min cache) + lazy fill ≤15/Fetch sharing the budget info-call (one call fills both) + `?accountSource=api` grouping + LIVE `Bracket|TT account` header toggle (localStorage) + `@user`/bracket hints + per-row `· TT name`. PRODUCT always bracket.
- Backoff (`dpl_DKAAybWw5jWLJTbw15k9fZ7rZaNq`): `028` (`enrich_tried_at/enrich_fail`, owner ran) + fresh-first sort + tolerant 3-level save chain + deferred counters in both amber lines + manual-refresh stamps. Fixed the 2-per-Fetch crawl (unresolvable top-spenders hogged slots forever).
- Per-BC recovery (`dpl_DEUvSEQ45qa2FYTF5fwuE9T2Ckrs`): `029` (`identity_bc` + re-queue of 76, owner ran) + per-BC maps ≤4/Fetch + `needAccount` gating on resolvable + no-stamp on transient map failure. Result: 45 true tail identified.
- Parking (`dpl_6Dh5KyJnpVV8VAYdcwgvE5TKbF4k`): `bracket_only` skip in fill+second-phase + `accountBracketOnly` counter + grey note. Amber now counts actionable only.
- Probe route `/api/live-account-probe` (A–G sections) stays deployed — useful, harmless, read-only.

**Bugs + lessons.**
- B97 stale-cache-by-design: board reads Neon, nothing refreshes names on Fetch. Lesson: every cached label needs a visible refresh path + an automatic heal (button + nightly), or renames "don't show" forever.
- B98 `code 0 ≠ usable`: `tt_account_name` answers OK with value `"0"` (doc :4531 permission wall). Lesson: always read sample VALUES, not just codes — the probe now returns `per_sample` for this reason.
- B99 error messages name the missing param (`store_id required` → `store_authorized_bc_id required`). Lesson: when shape-hunting, follow the message verbatim one param at a time; each 40002 is progress.
- B100 enrichment without backoff starves: unresolvable rows retry at top priority forever (2/Fetch drain). Lesson: every lazy-fill loop stamps attempts and sorts fresh-first from day one.
- B101 ROW_ code ≠ Access-Token (owner Postman). Lesson: ELI5 with the hotel key-card analogy; then just do it server-side.
- Identity map cache key must include the BC (`advertiser:store:bc`), not just store — per-BC maps would have collided.
- `saveEnrichment` needs the full tolerant chain (029 → 028/027 → 027 → budget-only); each migration otherwise breaks older DBs instead of degrading.

**Open.**
- Owner: nothing pending — 027/028/029 applied (confirm dev+prod all three), Fetch until amber clears, eyeball TT-account groups vs brackets.
- Next-build: `bracket_only` recheck button IF a grey count ever drops on its own (re-auth signal); TTAM creative-spend eyeball + manual-gap recheck still parked since Cp28-35; commit/push everything (never unasked — this arc: gmv.ts+shops.ts+3 routes+page + 027/028/029 + probe + AGENTS ledger).

## Checkpoint 39 — 13 Oct 2026 (Total Performance Dashboard mockup + picker week/month presets + skill update; 3 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Continuation of Cp38 evening. Owner wanted orders + LIVE/Product fractions on total → shipped KPI+panel, "im not satisfied" + mockup screenshot → plan-mode (they keep toggling it) → "ok build it" → TotalPerformanceDashboard to mockup, deployed `dpl_4Fomso6i` → picker ask (This/Last week, This/Last month + dead month selector + "edit one, sync all?") → confirmed single shared file after grep, planned, "ok go, btw i roll back the edit the code for calendar page" → checked tree: `/calendar` intact (SidePanel/popups present), rollback was prod-side only; this deploy re-baselined prod → presets verified by node script (week edges, Feb 28d, Dec→Jan) → temp script deleted → "update the details in calendar picker skills" → SKILL.md + wrap up. Mood: owner judges by screenshot-match; "not satisfied" means show a mockup, don't iterate blind.

**What shipped (tsc 0, deploys green, ALL UNCOMMITTED).**
- Total dashboard (`gmv-max/page.tsx`, `dpl_4Fomso6i`): `TotalPerformanceDashboard` on `metric==="total"` only — title bar + shop pill, 4 KPI cards (Total GMV + 100% pill, Orders + AOV, Cost + CPO, Blended ROI green + Net sub), Channel Contribution section (full-width emerald/sky split bar + LIVE STREAM CHANNEL / PRODUCT SHOWCASE cards with GMV %, orders %, cost %, per-channel ROI, bottom bars). Replaced prior KPI+ShareRow panel same session. Single-metric views untouched.
- Picker (`DateRangePicker.tsx`, `dpl_449aUfUz`): This/Last week (Mon-first, MYT-aware `mytWeekdayMon0`), This/Last month (all ≤31d cap); kept Last 3 days (Cp37 ask — do not remove); native `input[type=month]` replaced by month+year selects (native dropdown was dead chrome). Shared file → gmv-max + shop-live sync. Note: build log shows someone else's `/ai` routes landing in same deploys — not ours, don't touch.
- Skill: `skills/calendar-picker/SKILL.md` gains week/month preset rules + native-month-input ban + one-shared-file note.

**Bugs + lessons.**
- B95 PowerShell eats `node -e` quotes (Expression expected). Lesson: temp `.js` file under approved Temp + `node file`, delete after.
- B96 `tsc` workdir discipline (B94 repeat risk): no tsconfig below `online/` passes silent-green. Always `online/`.
- Rollback check first: owner "rolled back" but tree was intact — `grep` for the feature before reacting; prod re-baselines on next deploy anyway.

**Open.**
- Owner: eyeball Total dashboard numbers vs tables (shares sum 100%, channel ROI sane); try all picker presets on both pages + month/year selects.
- Next-build: prior parks unchanged. Commit/push everything (never unasked). `.env.example` + `ai/` changes in tree are another session's — leave alone.

## Checkpoint 42 — 15 Oct 2026 (Shop Cost module: /shop-cost spend share LIVE/Product/TTAM + stacked trend + design pass; 5 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner asked "spend % per stream for 1 day or range, new module shop cost" — planned in plan-mode, built on "ok go": `lib/shop-cost.ts` (3 serial range pulls, day-split) + `GET /api/shop-cost` + `/shop-cost` page + sidebar link. First prod data came back ALL ZEROS with campaign tables showing real spend — diagnosed two bugs from the symptom shape alone (campaign sums right + day buckets zero = day-key mismatch; "live/product mixed" = the known mixed-type bleed, bugs 16/24, which the new fetcher hadn't filtered). Fixed both, redeployed. Then owner ran a design review via two skills (`vercel-labs/agent-skills:web-design-guidelines` + `uizze.sh:ui-taste` — both fetched live, playbooks operate/distill/audit/polish applied, findings in chat). Owner agreed the big line chart was distracting; I recommended stacked-100% area ("which is better?" → stacked, not close — composition question gets composition chart), they said go + "KPI cards by hierarchy". Shipped: hero Total + in-card share bar + ranked #1–3 stat grid, trend→daily→campaign order, Hide-0-spend toggle. Mood: fast visual-iteration loop, owner screenshots everything — match the screenshot, don't debate it. Sparring held once (talked them out of lines for a composition question).

**What shipped (tsc 0 every step, 5 prod deploys, ALL UNCOMMITTED).**
- `dpl_DpL1aznKKjUvPTqKwhfqcuynWN1F`: Shop Cost v1 (`shop-cost.ts`, `/api/shop-cost`, `/shop-cost`, Shell link). Denominator = ads spend only, shop 1, ≤31d, per-day rows + range totals + per-stream campaign lists (% of stream + % of total).
- `dpl_832Ym5LDhPbFjytDHaTSAWS426aQ`: zero-day fix — `normDay` (slice 0,10, unparseable rows count in campaigns only), Neon `promotion_type` bleed filter (drop only positively-other-type rows, unmapped stay), stream totals from row sums not day buckets.
- `dpl_ALPevFXGqYANrw49PbnD2dWNNKMs`: design pass — stacked-100% area (h-56, hidden on 1-day, below campaign table… later reordered), RM/% toggle removed, hero + ranked grid, `aria-pressed`/`role=img`/reduced-motion/Intl ticks, layout `color-scheme:dark` + theme-color.
- `dpl_GuL6T3JbZTD3r2ixfzka9K5GUnph`: themeColor moved metadata→viewport export (build warned, now zero warnings) — final prod state.
- Reorder + Hide-0-spend (in `dpl_GmgtRs3JLqtLhpruxQAPS9faYvRT`): order hero→trend→daily→campaign; toggle on-by-default with hidden count, stream totals unaffected.

**Bugs + lessons.**
- B102 day-grain assumption: bucketed only on exact day-string match, silently dropping every row when TikTok returns datetimes. Lesson: normalize time grains at the fetch boundary and make totals independent of bucketing — totals from row sums, buckets for display only.
- B103 new fetchers must apply the Neon type filter from day one (bugs 16/24 bleed applies to every new `gmv_max/report/get` caller, not just `getShopReport`).
- Next themeColor/metadata API: `themeColor` lives in `viewport` export, not `metadata` — build warns, tsc stays green. Lesson: read build warnings, not just tsc.

**Open.**
- Owner: eyeball `/shop-cost` numbers vs Ads Manager (stream %s sum 100, campaign % of stream sums ~100, totals match ROAS legs); if a LIVE/Product campaign sits in the wrong tab its Neon `promotion_type` is stale → `/api/campaigns/sync`.
- 10-15 (today) LIVE spike 36.6% is partial-day — recheck tomorrow.
- Commit/push everything (never unasked): shop-cost lib + route + page, Shell link, layout viewport — all uncommitted.

## Checkpoint 41 — 15 Oct 2026 (AI Analyst module: /ai + /api/ai + /ai/guardrail + TTAM live scores + md renderer; 6 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner asked "can we add AI agents (you or Gemini) for analytic and suggestions?" in plan-mode, picked AI-page + all-modules + text-only with my hidden-JSON idea parked, then drove the build in short bursts: module ticks (GMV/TTAM/Shop) → Gemini key setup (theirs) → "model 2.0-flash no longer available, use 3.8-flash" (verified against live model docs — 2.0 is shut down, 3.8 stable, switched default) → plan-mode again for chat-box + guardrail-location ("explain option 3" first) → guardrail gets own path `/ai/guardrail` under Settings → TTAM INSUFFICIENT-DATA verdict (snapshot had preset-only, no ad rows) → wired live campaign-grain pull → echo-garbage output (`} and CPA <= ...` prompt-tail echo + raw campaign ID as top spender) → echo-strip + namesNote → "why it just show like this?" with an image I COULD NOT SEE (this session rejects image input — said so, asked for 1–4 wording instead) + raw-markdown complaint (confirmed in code: plain `whitespace-pre-wrap` div) → plan-mode markdown-renderer plan → "wrap up, continue on other session" → ritual in plan-mode is writes, so handed facts-only handoff → "go" with plan lifted → built Md renderer + did the full ritual. Mood: brisk, owner tests instantly, screenshots over words — except this session couldn't receive them. Sparring held where it mattered (text-only-first with hidden-JSON read-only, localStorage guardrails over DB table, no react-markdown per dep list).

**What shipped (tsc 0 every step, 6 prod deploys, ALL UNCOMMITTED).**
- `/ai` page + sidebar `AI Analyst` (`ai/page.tsx`, `dpl_FjjxryEwPLmi9moXBg28pxi5hP44`): ticks `[GMV] [TTAM] [Shop]` any-combo (URL `?m=` + localStorage), range 3/7/14d, Analyze, follow-up chat box (needs Analyze first, last-6 turns, 1000-char cap, live not cached).
- `/api/ai` (`api/ai/route.ts`): GET cached insight (`?modules=&days=&minRoi=&maxCpa=&fee=`), POST chat (`{message,history,modules,days,guardrails}`). Allowlist-gated both.
- `lib/ai.ts` (server-only, never client-imported): Neon-cache snapshot (GMV campaigns/hourly/top-creatives incl. creative rows, TTAM preset + live campaign grain via `fetchManualSpend` top-8 spend with v3 scores, Shop daily + affiliates), Gemini REST (`GEMINI_API_KEY` server-only, `GEMINI_MODEL` override, 50s abort), 15m cache per module-combo incl. guardrails.
- `/ai/guardrail` + Settings entry (`ai/guardrail/page.tsx`, `ai/guard.ts`, `dpl_2gDwfEKCHz4UmJNBcjP3kGu8VEFX`): per-user localStorage min-net-ROI / max-CPA / fee-rate (defaults 7.0/21.18/0.25 match strategy KB); `/ai` shows active values + edit link. Analysis-only — automation obeys `1-knowledge/tiktok-strategy/`, never this page.
- Prompt fixes (`dpl_31XDZXzfU3kfcbtr6oR3vBU5EsmW`, `dpl_BL9fioU8Eih7TSprTHzdfFkxG26W`): gross×(1−fee)→net before min-ROI compare (state both); `### 1) Verdict`-first order + server `stripEcho` (cuts pre-heading echo ≤400 chars); TTAM name-lookup failure recorded as `namesNote` with TikTok error text instead of silent IDs.
- `ai/md.tsx` + page wiring (`dpl_EE1T4xgX5J62iZV15gwzVB7NVM7U`, latest): dependency-free Markdown→JSX (### headings, **bold**, `code` chips, -/1. lists, paragraphs), JSX-built never raw-HTML (AI text can't inject markup), applied to insight card + AI chat bubbles (user bubbles stay plain).
- `.env.example`: `GEMINI_API_KEY=` + `GEMINI_MODEL=` (server-only, never `NEXT_PUBLIC_`).
- Smoke each deploy: `/api/ai` 401 signed-out; `/ai`, `/ai/guardrail` 307 → sign-in. Build lists `/ai`, `/ai/guardrail`, `/api/ai` (jose Edge-runtime warnings are pre-existing auth noise).

**Bugs + lessons (sequence continues B95+).**
- B95 declared-type-vs-body: `fetchManualSpend` rows carry scores/metrics at runtime but the declared return type is `{campaign_id,spend}[]` → tsc error on `.scores`. Lesson: when consuming a lib fn, read its DECLARED return type, not its body; cast at the boundary (`as any[]`) and note it.
- B96 stale-memory edit: crafted oldString for buildPrompt's follow-up branch from memory, tool rejected it. Lesson: grep/read the exact region before every edit — never reconstruct code from memory (rule 8's cousin).
- B97 success-then-duplicate: edit reported success, re-read showed no change, re-edit created a DOUBLE sidebar link. Lesson: when tool-result and re-read disagree, grep-COUNT the identifier before touching it again (extends B57/B67/B71/B93).
- B98 raw-LLM-in-div: Gemini markdown rendered via `whitespace-pre-wrap` shows `###`/`**` literally. Lesson: any LLM text gets a renderer, never a plain div; dep list bans `react-markdown` → tiny local component, JSX-built so no `dangerouslySetInnerHTML` class of bug can exist.
- B99 prompt-echo: model continued the prompt tail (`} and CPA <= ...`) before answering. Lesson: order models to start at the heading AND defend server-side (`stripEcho` before `### 1)`) — instruction alone is belt, strip is suspenders.
- B100 silent fail-open: `campaign/get` died inside try/catch and AI showed raw IDs with no explanation. Lesson: fail-open paths must still record WHY (`namesNote` with the error text) so the next layer (AI, owner) can reason about it.

**Open (owner vs next-build).**
- Owner: confirm `GEMINI_API_KEY` in Vercel Production (page errors honestly when missing); retest `/ai` TTAM-ticked Analyze fresh (toggle range to bust cache) + chat + guardrail save; describe the "just show like this" screenshot IN WORDS (image input rejected this session) if the Md renderer didn't fix it.
- Next-build: hidden-JSON proposals (read-only numbers under text-only) parked from plan; shared-DB guardrails (over localStorage) if the team needs one set of values; commit/push everything (never done unasked — this session adds 6 files: `ai/`, `api/ai/`, `lib/ai.ts`, `.env.example` + Shell).
- Watch: another session is active in this repo (027–029, `/api/live-account-probe`, `3-ttam/analysis` landed 14–15 Oct) — touch only AI files until they settle.

## Checkpoint 38 — 13 Oct 2026 (auth persistence + bare login + display names + header pill + /calendar month view + profile block; 10 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner opened with a complaint, not a screenshot: "why sign in every time I close the browser?" → diagnosed 8h maxAge vs 24h default updateAge in one read → "ok for 30d" → implemented + deployed → screenshot of signed-out page showing full sidebar ("show login only?") → plan-mode (they keep toggling it) → "ok" + new ask in same breath (display names on access page) → planned both, "ok go" → 026 written, owner ran it on prod, rename 500'd → couldn't see prod logs, so made audit best-effort + surfaced DB code, redeployed → "ok now it works" → "is the lag label needed?" (plan-mode, option 1: remove) → "go" → calendar pill + month-page plan → "what is 2 today: Sale X?" (it was my example text, clarified) → "ok go" → shipped → sidebar top-vs-bottom (plan, words only per ask: below) → "drop from header" → shipped → month-view refinements in short bursts (sidebar move, hover popups, small-grid popups, today/tomorrow highlights, right-side Today/Tomorrow panel with Day x/y + Ends-in) → "ok good, wrap up". Mood: fast loop, owner tests instantly and reports in one line; trust high. Sparring light today (talked them into truncate-in-cell + full-in-popup instead of full titles in cells).

**What shipped (tsc 0 every step, 10 prod deploys, ALL UNCOMMITTED).**
- Auth persistence (`auth.config.ts`, `dpl_B3CifSbq`): session 8h → 30d + `updateAge` 24h + `jwt.maxAge` 30d + persistent `sessionToken` cookie; sign-in respects `callbackUrl`.
- Bare login (Shell `/sign-in` early return, `dpl_9cqJRgbe`): no sidebar/topbar signed-out. Same deploy: display names — `026_allowlist_display_name.sql` NEW (owner ran prod), `allowlist-store` tolerant helpers, access-list GET/POST (+PUT rename, bootstrap-admin upsert), access-manager name field + Rename, layout→Shell `displayName`, top bar name with email tooltip.
- Rename 500 (`dpl_5hs6qasv`): audit INSERT sank PUT → best-effort + DB code in admin-only error. Lesson B92.
- Label removal (`dpl_QvTB1enM`): "Neon prod · live TikTok API (lag 15m–2h)" span deleted; PROD pill stays the branch signal.
- Calendar (`dpl_6rbCyfP56`): header today-pill (PC titles, mobile `[N today]`, links `/calendar`, fail-silent); `getRangeEvents` + `?from=&to=` (100d clamp); `/calendar` page (big month + prev/next dots, Monday-first, MYT edges, look-only); sidebar `Calendar` in Menu + `Calendar filters` rename; agenda `Calendar →` link.
- Profile block (`dpl_D1ZBkdpx`): name/email + Sign out moved to sidebar bottom (icon-only collapsed); header name dropped, pill takes `ml-auto`.
- Popups + highlights (`dpl_26JZXRwF`, `dpl_2PN5vtEf`, `dpl_7Mt2PZuwU`): hover/tap day popups (full titles, clickable, edge-flip, all 3 grids); today emerald + tomorrow zinc cells.
- Side panel (`dpl_58wPcDwa1`, latest): Today/Tomorrow cards (mobile on top, desktop sticky right, grid untouched) with span progress `Day 8/10 · Ends in 2 days` / `Started today · Day 1/10` from full-span MYT day math.

**Bugs + lessons (sequence continues B91+).**
- B91 never-refreshing session: Auth.js default `updateAge` 24h > custom `maxAge` 8h → token dies on schedule, active use or not. Lesson: when touching session maxAge, always set updateAge well under it.
- B92 audit in the critical path: PUT rename 500'd on the audit INSERT (prod `core.audit` mismatch), masking the real error. Lesson: audit writes are best-effort (try/catch, never gate the save); admin-only routes may echo the DB code.
- B93 edit-tool appetite: route.ts kept a stale body after a partial-oldString edit; MonthGrid lost its signature line the same way. Lesson: re-read the edited region every time (rule 8 exists for this); tsc catches the breakage, eyes catch the cause.
- B94 silent-green tsc: ran `tsc --noEmit` with workdir in `src/app/calendar/` (no tsconfig) → exit 0, checked nothing. Lesson: always run from `online/`.

**Open (owner vs next-build).**
- Owner: nothing pending — 026 applied prod, all features eyeball-verified by them. Commit/push everything (never done unasked — 12 files: 10 modified + 026 + `calendar/`).
- Next-build: prior parks unchanged (creator-grant doc, manual-gap recheck, TTAM creative-spend eyeball, affiliate retest).

## Checkpoint 37 — 12 Oct 2026 (calendar z-fix + Shop Live module: dual-key auth, list/minute/core-stats probes, signer bug; ALL DEPLOYED, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner drove with screenshots and one-line verdicts all day: clipped calendar → "ok" → "too far from label" → mobile single-month question → "ok go" → range-count + Last-3-days ask → plan-mode detour (they put me in Plan twice, out twice) → LIVE-dashboard dream (Image 2) → metric wishlist → "login by account" → partner-doc hunt (they pasted MDs like a champ: minute, then list) → "new app?" → category screenshots → "full access?" → write-later → redirect-URL "this?" → "why localhost?" → "save auth code in system?" → multi-shop share question → "use this callback" → admin-only confusion (seller Google vs personal Gmail can't share a profile) → plan-A-local-script → service_id saga (key form 404s, numeric ID works — evidence beat my claim) → cipher fetch (I ran it, lengths-only) → 105005→app-On→env-missing→admin-only→draft→publish→probe-green → 28001006 (too-new room) → list-doc → MARKETING-green/AFFILIATE-28001022 → toolkit install detour (their idea, paid off via bundled OAS: 202309 room family found) → core-stats 36009004 (app_key) → 36009005 (user-type wall) → "wrap up". Sparring held where it mattered (talked them out of generic "full access" scopes, behavior-gating, third-app-before-checking-RoaS). Mood: long day, high trust, they execute portal steps fast when given exact clicks.

**What shipped (py_compile + tsc 0 every step, prod deploys green, ALL UNCOMMITTED).**
- Calendar (`DateRangePicker.tsx`, `gmv-max/page.tsx`): overlay `z-20`→`z-50` over Shell `z-30`; anchored popover under Range (button-rect + clamp, fixed-root to dodge the `z-10` header trap); mobile single-month (`right` hidden), wrapping preset chips; Last 3 days preset; footer live `from – to · N days` + hover preview.
- Shop Live module (`/shop-live` + sidebar entry, `lib/shop-live.ts` + `shop-analytics-credentials.ts`, routes `probe/overview/sessions/core-stats`, `dpl_2cG3Abz` latest): dual-key model (analytics keys first, legacy fallback); server auth `start` (admin, signed-state cookie, 302) + `callback` (exchange, cipher via Authorization Shops, per-app upsert, HTML result); `shop_auth.py --app analytics|orders` + `SHOP_*_SERVICE_ID` override (numeric ID works, key 404s — B88); `025_shop_analytics_tokens.sql` (NEW, owner-run status: confirm dev+prod); local cipher fetch script (temp, deleted after).
- Probes (all read-only): minute green (MARKETING, full coverage incl. tap~/derived CTOR/AOV/GMV-h); list green after doc-exact query set (B89) — MARKETING + AFFILIATE metadata; affiliate minute `28001022` denied by design; `202309/core-stats` answers `36009005 user-type` on seller tokens (creator door identified, grant pending).
- Toolkit: `@tts-open-toolkit/cli` installed by owner + 7 cc skills; bundled OAS mined for the 202309 family (no code dependency, reference only).
- Deploys this session (prod aliased each): picker z-fix → anchored+Last3 → shop-live new → auth routes → service_id → sessions picker → calendar-on-shoplive → list-path → enum → sign-params → signer-fix → core-stats → app_key-fix. Last: `dpl_2cG3Abz7riTJPy4expFMceaysfog`.

**Bugs + lessons (sequence continues B86+).**
- B86 picker under header: overlay `z-20` vs Shell `z-30`. Lesson: fixed overlays default above the tallest chrome (`z-50`); never nest absolute panels inside low-z sticky parents (stacking-context trap).
- B87 `tiktok-shop` `parseQueryString` splits on EVERY `=` → base64 `page_token` (`..MQ==`) truncated in signature, full token sent → page-2+ always 106001. Lesson: single-page endpoints mask signer bugs; multi-page affiliate lists exposed it. Local `signShopUrl` splits first-`=` only (byte-identical otherwise). Same latent bug in `shop-orders.ts` — do not "fix" blind while its path works.
- B88 `service_id` shape is per-app: MARKETER HW authorizes by numeric app ID, key form 404s. Lesson: evidence (working callback URL) beats doc-pattern claims; support both via `*_SERVICE_ID` override, default key.
- B89 list signing = doc-exact query set only; `access_token`/`shop_id`/`version` travel outside signing — every extra in-query breaks it (all 4 variants died identically). Lesson: when N variants fail identically, stop varying and read the Query Header table.
- B90 `core-stats` needs `app_key` in-query despite OAS silence (36009004 named it). Lesson: OAS omits signing params; error codes name the missing piece — read them literally.
- Creator/MARKETING vs AFFILIATE walls are TikTok design (28001022/36009005), never code bugs. Lesson: probe MATRIX (affiliate × marketing × control) before building; Testing Tool payload diff (queries node) is the ground truth for param sets.

**Open (owner vs next-build).**
- Owner: confirm 025 dev+prod; retest core-stats pair post-app_key-fix (no reply yet); affiliate detail waits on creator-grant doc (alliance URL/exchange/response/scopes — owner couldn't find it, parked); AFFILIATE list retest post-signer-fix (probably green, unconfirmed); commit/push everything (explicitly never done unasked).
- Next-build: creator table (026-style, open_id-keyed) + alliance callback + core-stats-under-creator IF grant doc lands; minute endpoint possibly unnecessary (list already returns tap/avg-watch/GMV-h exact); Shop GMV-style cache table for live minutes only after shape need proven; `/shop-live` KPI enrichment from list blocks.

## Checkpoint 36 — 11 Oct 2026 (Upcoming multi-day + glance hierarchy + affiliates widget + #event tag; 8 deploys, ALL UNCOMMITTED)

**To next-you: get back in this headspace instantly.** Owner drove in screenshots, not words: multi-day question → plan-mode A/B/C examples → "go with A" → "show yesterday too" → screenshot "still not good" → 3-tier plan → screenshot "still not good" again → their own 2-column sketch → "which is better?" (talked them into single-column: time-ordered short lists scan top-down, columns break chronology + truncate long titles) → "ok try" → "why is 4/4 green?" → mute-ends + Today-wash-back → "ok good" → affiliate-reminder into dashboard → widget/table-choice via question tool → HTTP 400 saga (their sheet shared, API on) → exact-error surfacing → "Unable to parse range" → tab-rename self-heal → "OK WORKS" → #event tag plan (look-only vs behavior-gate examples) → "ok use a" → wrap up. Sparring held throughout (2-col, behavior-gate both argued down with failure modes). Mood: brisk, visual, decisive.

**What shipped (tsc 0 every step, all deployed prod, ALL UNCOMMITTED).**
- Multi-day agenda (`calendar.ts` + `agenda.tsx`, `dpl_fC7774avU`): query `timeMin` back 7d + overlap filter (yesterday-started sales now show, ended ones don't) + all-day exclusive-end normalization; rows repeat per touched day (`Day 2/4 · continues`, `until HH:MM` for timed, midnight-end stays 1 row). 5-case node test green.
- 3-tier hierarchy (`dpl_DVuVyZ4i` → refined `dpl_6fVr4pqN`): Today hero (emerald wash + bar, restored after owner "too heavy then too light" round-trip) > Tomorrow full > Later-this-week compact with inline dividers; Day pills moved to fixed-width slot so titles share one x-edge; `· ends` pill muted to zinc (green now means multi-day dot + Today only); `1 today` counter dropped as redundant.
- Affiliates widget (`lib/affiliates.ts` NEW + `/api/affiliate-digest` + `affiliates.tsx` on index, `dpl_21oWgSeW`): same buckets as aff-notify (due today/overdue/tomorrow + PENDING ADS RUN queue), service-account `spreadsheets.readonly` read of `B9:N100`, 2nd-`end` cutoff, d/m/yy parse, 15-min cache, needsConnect hints. Owner steps done live: shared sheet + `AFFILIATE_SHEET_ID`.
- 400 saga (`dpl_4Q6TZCRB` detail-surfacing → `dpl_BAY5dahv` self-heal): hardcoded `Affiliate Collection ` (trailing space) 400'd on their renamed tab; reader now lists workbook tabs + trimmed-match, names names on miss.
- `#event` tag (`dpl_AcvBEj5sy`): case-insensitive detect + strip at map time (API + ICS), `promo` flag → amber dot + EVENT chip. Look-only per owner pick; `#eventful` negative tested (8-case node green).

**Bugs + lessons (don't repeat).**
- B84 Google Sheets 400 = bad range/ID, 403 = no access. Lesson: surface `error.message` to allowlisted eyes immediately instead of guessing; permission vs request-shape splits the diagnosis in one step.
- B85 hardcoded tab titles rot (trailing-space rename). Lesson: resolve sheet tabs via metadata + trimmed match; never hardcode display names from another tool's docs.
- Pill-column alignment: conditional chips ragged the title edge (screenshot-proved). Lesson: fixed-width slot reserved on every row, empty when unused — one alignment edge per card.
- Tag semantics: behavior-gate tags fail silently when forgotten. Lesson: tags highlight, never gate (option A default).

**Open.** Everything this checkpoint uncommitted (8 files touched: agenda/calendar/affiliates ×3 + page + docs below). Cp35 parks still parked (manual-gap recheck, TTAM creative-spend eyeball). No new migrations, no new secrets in git (IDs/keys lengths-only, env-only).

## Checkpoint 35 — 11 Oct 2026 (dashboard redesign arc: sidebar shell + tabs + toasts + pages + calendar; COMMITTED 0beb51e + 61e397e, deployed dpl_GCwws828WtkGs1Vq1d9uMReVTBkc, 022/024 applied, webhook re-set + /start green)

**To next-you: get back in this headspace instantly.** Owner drove the whole day in short bursts, screenshots over words: creative-0-spend report → "tabs like HIM Tracking" → plain-words explanations (asked twice, no jargon) → edge-to-edge sidebar → auto-load → 15s-to-5s → per-tab URLs → hide unused shops → nav-in-sidebar → all-pages sidebar → top bar + collapsible icons → dupe-key crash + global toasts → accounts/catalog split + Ads Identity ID → twin-row edit bug → "check another bug" audit → sticky sidebar → dashboard-as-index → Settings collapse → shared-calendar embed → service-account robot (they pasted the key JSON with the private key blanked — confirm redacted-for-chat vs broken download) → 403 = disabled Calendar API → exclude keywords → calendar settings page → "anything left?" → wrap up. Sparring stayed ON (talked them out of backend shop deletion; into DB-first auto-load). Mood: pleased, brisk, precise all day.

**What shipped (tsc 0 every step, deploys green, ALL UNCOMMITTED).**
- TTAM creative fix (`ttam.ts`): `pullGrain` loops `total_page` now (was page-1-only truncation). Owner verify pending (G1 04–09 Oct should carry spend).
- Shell (`Shell.tsx` NEW, `layout.tsx`, `logout-action.ts`): top bar (title/PROD/lag/email/sign-out) + icon sidebar + bottom-pinned collapsible Settings + mobile drawer + sticky independent scroll. Board at `/gmv-max`, empty index `/` (cards + agenda). Tabs are `?shop=&metric=` links with auto-load + back-button; cooldown 5s; menu trimmed to shop 1 (backend map kept).
- Toasts (`toast.ts` bus + Shell host, 4s ok/err) on every save: creative/presets/access + budget/token/hourly/shop refreshes.
- Dupe guards on accounts/catalog POSTs (400 names culprit, pre-DELETE); targets/presets already guarded.
- `/accounts` + `/catalog` pages (Manage modal deleted from `/creative`); 022 identity column (API pre-022 tolerant); twin-row key bugs fixed (ref uids, stable catalog keys).
- Calendar: service-account reader + iCal fallback (`lib/calendar.ts`, key in `GOOGLE_CALENDAR_SA_JSON`, calendar stays private); per-user OAuth attempt fully reverted, 023 skipped. `/calendar-settings` (excludes + health) + 024. Owner runs 022/024, enables Calendar API, keeps robot Viewer.

**Bugs + lessons (don't repeat).**
- B79 single-page report pulls truncate silently (spend exists, page 1 lacks it). Lesson: every report pull loops `total_page`, no exceptions.
- B80 `let` counters in render reset every render (twin rows). Lesson: row identity lives in refs, never locals.
- B81 index `key={i}` on editable rows (typed text jumps on delete). Lesson: stable keys wherever inputs exist.
- B82 DELETE-then-INSERT savers + duplicate payload = wiped table + 500. Lesson: validate uniqueness BEFORE the DELETE and name the culprit.
- B83 public iCal 404s on group calendars without full-public sharing (curl proved it). Lesson: verify feeds with curl before promising panels; service accounts dodge the class.
- PS standbys: no unix pipes in shell tool; deploy from repo root; `Move-Item` needs the dest dir first; `git status` never stages g-sheet_tools churn (owner-side, leave alone).

**Open.** 022/024 applied dev+prod 11 Oct; online/ committed `0beb51e`, migrations `61e397e`, pushed; deployed `dpl_GCwws828WtkGs1Vq1d9uMReVTBkc` (build lists /accounts /catalog /gmv-max /calendar-settings + /api/calendar-*) after a false alarm (prod showed old UI — pushes don't auto-deploy here, CLI ritual did it; also corrected self: signed-out /api/* 401s in middleware before routing, so 401 on a new route proves nothing). Owner re-set webhook, /start green. TTAM creative-spend eyeball + manual-gap recheck parked to next session. Ritual done, stop.

## Checkpoint 34 — 10 Oct 2026 (TTAM presets arc: BASIC + units + OMTM original/v3 + proxy-gap proof; 2 deploys, ritual pending)

**To next-you: get back in this headspace instantly.** Owner drove the whole arc in short bursts: custom metric ask → BASIC IMP/CPM via 019 → activate-does-nothing → units/format ask → OMTM table version ID (v1 draft vs v2 vs v3 vs new v4-RM) → 020 reference → v3 directives (three revisions!) → 021 trial → preset registry → "which metric/version is better" → implement → TikTok custom-metric screenshots → number-mismatch hunt → proxy-gap proof → decision rule → wrap up. Sparring stayed ON (talked them out of importing v1 as live scoring; RM-scale flags caught by sample-checking every table before seeding). Mood: pleased, brisk, precise — pastes screenshots, not logs.

**What shipped (all verified, deploys green).**
- `019_ttam_basic_metrics.sql` (NEW, owner ran it — `ttam-basic-v1` visible): duplicates ACTIVE preset + IMP (`imp`, k1000/s5000) + CPM (`spend/imp*1000`, invert k30/s15). Caught pre-ship: bare `imp` false-KILLs spend-only rows → null-safe.
- Activate-trap fix (`ab3f8da`, `dpl_HW1mtSDhZbJmRxYc7W5ifD42TS75`): button acted on loaded preset + stale pill → optimistic pill + no-store fetches. Smoke 307/401/200.
- Units + formulas (`e58882e`, `dpl_3FM4k4Hzbre6M8cS3Jv971v8X2Cb`): `formatScore` leaf (`%/RM/numeric`, ACS 4dp), header unit tooltips, per-row formula lines + input legend in `/presets`, formula tables in feature + plan doc. Smoke 307/401/200.
- `020_ttam_omtm_original.sql` (NEW, uncommitted, owner-run pending): verbatim v1 table, full-name shorts, flagged warts, ERRI/LQS/BCE bandless (WATCH default, Save needs bands).
- `021_ttam_omtm_v3.sql` (NEW, uncommitted, owner-run pending): v3 trial (RM, ERRI 0.3/1.5, VVES 20/80, RVS 100/300, RES 80/240, ACS 0.025/0.008 strict, HPS 20/35 unproven).
- Scorer side: `presets/omtm-original.json` + manifest line (uncommitted) so the dropdown lists OMTM Original; verified `node --check` + HTTP 200s on :8131, server stopped after. Owner's own export `presets/ttam-omtm-original-v1.json` sits untracked (theirs, never touch). Two Oct04-09 xlsx files untracked (owner data).
- Proxy-gap proof (measured, not theorized): plain 1,254,217 vs focused 1,100,460 (~14% hot); left-column numbers reproduced to the cent (ACS 0.78, BCE 7.77, CES 169.24M) from screenshot inputs. Standing rule: online = radar, TikTok = trigger; online-KILL trusted, online-SCALE confirmed in TikTok.

**Bugs + lessons (don't repeat).**
- B75 Activate targets the LOADED preset, not the clicked row (presets `page.tsx:253` sends `presetKey` state). Lesson: action buttons must name their target; after any write, repaint optimistically AND no-store the refetch.
- B76 dashboard ignored `format` (`ScoreCells` printed raw `toFixed(2)`). Lesson: display contracts live with the data (preset `format`), not beside it — check the renderer reads every field the writer stores.
- B77 scorer all-0.00-KILL on user file = single-column name-only export. Lesson: read the file's actual headers (`openpyxl`, all sheets) before touching code — screenshot showed a DIFFERENT file (two twins, one with ` (1)`).
- B78 scorer `loadBundled` is a hardcoded path (`app.js:438`), no picker. Lesson: say so in one line instead of debugging the file.
- TikTok `%` format auto-×100s (Excel-style); ours appends the sign only → ×100 must live in the expression. Lesson: when transcribing platform formulas, port the FORMAT SEMANTICS, not just the math.
- Cross-preset numbers never compare (EDS 100× + ACS unit mismatch prove mixed rulers). Lesson: one preset, re-fetch both sides, then compare; EDS/ERRI agreement is the setup check.
- B61 family again (PS quoting vs inline scripts) → temp-file scripts, deleted after. Lesson stands.

**Open.** Owner runs 020/021 dev+prod → trials BASIC/v3 → quartile recalibration from live distributions, then lock (standing M11). Webhook bypass re-register still owner-pending from Cp33. Manual-gap recheck parked since 28. `.vscode/settings.json` deletion uncommitted (not mine). Everything this checkpoint uncommitted except `697d93a`/`ab3f8da`/`e58882e`.

**Vibe.** Longest single arc yet, all owner-driven, zero wasted builds (every migration sample-checked in node before writing). Ritual, then stop.

## Checkpoint 33 — 10 Oct 2026 (hourly on-the-hour + footer MYT date + webhook-gone diagnosis; pushed + deployed)

**To next-you: get back in this headspace instantly.** Owner asked why hourly Telegram lands at :30, then why the footer reads `hu Oct 08 2026`. Both answered, both fixed, pushed (`697d93a`), deployed (`dpl_po7TdziUVii985L8QwLZ9eucZFTU`, smoke `/` 307, `/api/hourly` 401, `/api/health` 200). Then owner reported `/start` + `/fetch` dead and pasted `getUpdates` output showing both commands sitting unprocessed — diagnosed from that paste alone: `getUpdates` returning messages proves NO webhook (conflict error = active). `getWebhookInfo` confirmed `url:""`, pending 2. Owner re-registered bare (ok:true) and it still died — missing bypass, re-set with encoded `?x-vercel-protection-bypass=` is owner-pending. Mood: brisk, satisfied ("ok push and deploy", "ok wrap up"). Sparring stayed ON.

**What shipped.**
- Cron `15 * * * *` → `0 * * * *` (`.github/workflows/hourly-sync.yml:17`): the :30 was schedule-:15 + GitHub queue lag + fetch minutes (header stamps send-time `pulledMYT`). Honest note: the flip was already sitting in the working copy when this session started (not my edit) — committed it as the fix anyway.
- Footer garble fixed (`hourly.ts:261-274`): `String(syncedAt).slice(0,16)` assumed ISO; `pg` returns `Thu Oct 08…` → chopped `T` gave `hu Oct 08 2026`. Now parses as Date → `YYYY-MM-DD HH:mm MYT` (verified ISO/long/Date/null via node), one edit covers all 3 messages (shared `syncedNote`). `excludes 183 OFF` is correct ON-only filter, not a bug.
- `tsc` exit 0. Commit explicitly asked + pushed + deployed same session.

**Bugs + lessons (don't repeat).**
- B73 `getUpdates`-with-messages = webhook ABSENT. Lesson: never debug the route first — `getWebhookInfo` (`url` empty? pending count? `last_error_message`) names it before any code reading.
- B74 bare `setWebhook` returns ok:true yet commands die under All-Deployments wall. Lesson: `url=` must carry percent-encoded `?x-vercel-protection-bypass=`; unencoded `?` truncates the registration.
- B61 repeats (×5): `head` in PS5.1 + PS7-only `-SkipHttpErrorCheck` flag. Lesson stands; `curl.exe -w` is the smoke tool now.
- Commit-hygiene lesson: `git diff` before `git add` — question any hunk you didn't author instead of narrating it as yours.

**Open.** Owner finishes bypass `setWebhook` re-register + read-back (`url` set, no PASTE) + `/start` reply check; if silent, `last_error_message` decides. `.vscode/settings.json` deletion sits uncommitted (not mine, never stage). Manual-gap recheck still parked since 28. Phase B (creative KPIs/verdicts/trend) unstarted.

**Vibe.** Short diagnostic arc, owner drives with pastes, agent answers with evidence. Ritual, then stop.

## Checkpoint 32 — 10 Oct 2026 (creative module: probes 1–6 green → Phase A sync + managers modal + skills shelf; deployed, uncommitted)

**To next-you: get back in this headspace instantly.** Owner opened with "next big addition" and chose creative-analysis-online, no-export (fetch from GMV Max), separate tab. Then drove with docs in hand — pasted the `creative_delivery_statuses` filter section, then dimensions, then the full metrics article. Those three pastes did more than a week of guessing: `item_id` = Post ID grain, creative-level metric tables, dual-filter rule. Protocol held (screenshots/pastes > logs, one action per message, plan/build switches on owner order — four this session). Two trust wobbles, both answered with evidence: "don't see any light" → scoped himcoffee sync (2 calls, seconds); "(0)+(0) but I ran 016/017" → counts proof (22/5/18) then auto-load. Mood at close: satisfied, shelf-building ("what skills can be added?", "re ask", one-by-one through 8 skills). Sparring stayed ON (serie: talked them OUT of running the MCP, INTO the diff-then-skill sequence).

**What shipped (tsc 0 throughout, ~15 deploys, ALL UNCOMMITTED).**
- `/creative` tab + `/api/creative-probe` rounds 1–6 (dpl_J2wuSJQb→dpl_Afw2SW5A): video/product grains dead (40002) → AUCTION_AD numbers OK (+quartiles p25–p100, conversion_rate) → `filters[]` fix (membership OK, ~50 GMV ad rows) → `ad/get` identity (`tiktok_item_id`, URL-tail Post ID, `ad_text`, `app_name`, `create_time`) → doc-grounded `item_id` dual-filter (campaign+item_group) FULL GREEN incl. `cost/roi/cpo` the docs omit. Final ceiling: ~20/24 columns fetchable; Time-posted/Creative-source/secondary-status stay derived.
- Phase A (`018_creative_daily.sql`, `lib/creative.ts`, `/api/creative-sync`, rows table; dpl_GMzufUwbt→dpl_P49BNdXg): per-creative nightly rows, rewrite-on-revise, ≤7d fail-open sync, campaign picker default himcoffee (scoped sync = 2 calls, kills the 60s timeout class). Neon IDs after `campaign/get` drift (B70).
- Managers modal (dpl_AZbMHBz7→dpl_Ar3uHZAt): `016` accounts (22 seeded) + catalog + `017` targets; grouped tables, SOP strip, changed-only stamps, drag reorder, column chips + headers, downloads, auto-load, single Manage button. Owner ran 016/017/018 dev+prod; edits verified working.
- Skills shelf (8, repo-local, `skills/*/` + AGENTS pointers): tiktok, tiktok-shop, vercel-deploy, neon-db, creative-analysis, telegram-rich, session-handoff (+standing skill-delta protocol), calendar-picker. Diff pass fed tiktok skill (video/get, VIDEO_INSIGHT, file/video/info candidates).

**Bugs + lessons (don't repeat).**
- B70 `campaign/get` param drift: identical shape demanded `store_ids`, then `dimensions`, while dashboard's passes — contextual validation, not worth chasing. Lesson: campaign IDs come from the Neon cache (the map reports already filter by); never re-prove list endpoints from new code.
- B71 edit ate the `sleep` declaration (round-5 block replaced it), then duplicate-restore confusion; caught by tsc, resolved by ground-truth read. Lesson stands from B57/B67: after structural edits grep the identifier count, not just re-read the region.
- B72 glob brackets: `[18589...]` in a path is a character class — `glob` returns 0 silently. Lesson: `os.listdir` for bracketed paths, always.
- B61 repeats (×3): `head`/`tail`/`wc`/`&&` in shell tool on PS5.1. Lesson stands; consider it a pre-flight check now.
- UX lessons: empty states must name the next action ("No cached rows — press Sync", not "run 018"); Load buttons die once auto-load lands; `-1` item rows are real (unattributed bucket), label them.

**Open.** Phase B (KPIs/verdicts/trend on creative rows) unstarted. Copy-JSON probe button queued. Manual-gap recheck still parked since 28. Everything uncommitted (14 tracked + creative routes + migrations 016–018 + `skills/` + owner-touched accounts.json + stray `postman/`, `start-viewer.bat` — all theirs, never stage).

**Vibe.** Docs-driven day: owner's three pastes were the whole critical path. End state: creative numbers flow without exports, managers mirror the local tool, knowledge is shelved in skills. Ritual run via the new skill, then stop.

## Checkpoint 31 — 08 Oct 2026 (sessions live-title + grouping + cleanup + budget tiers; deployed, uncommitted)

**To next-you: get back in this headspace instantly.** Same owner, same protocol (screenshots > logs, one action per message, Plan/Build mode switches by owner order — three this session: plan → build → plan → build). Session shape: owner pasted Ads Manager Livestreams screenshot (PROMO OCTOBER / Ongoing / 14:00:17) next to our Sessions drill showing `room … · 2026-10-08 00:00:00` and asked "can the API fetch start time, duration, live title?" Answer was yes-2-of-3 already in code: `live_launched_time`/`live_duration` fetched since Checkpoint 20 but buried in hover title, day-bucket rendered as if it were start time; only `live_name` was new. Owner verified via probe JSON themselves, then "ok good", then color-tier ask with exact bands, then ritual. Mood: pleased, brisk, precise — "ok go" / "ok good" / "ok i see".

**What shipped (tsc 0, build green, all deployed, all UNCOMMITTED — no commit/push unless asked).**
- Sessions live title + grouping (`gmv.ts`, `dpl_8oW49tw1`): 2nd meta call tries `["live_status","live_launched_time","live_duration","live_name"]` first, falls back without `live_name` on 40002 (fail-open both hops); room×day rows collapse to one row per room (cost/gmv/orders summed, ROI recomputed, sorted GMV desc, `days/firstDay/lastDay` kept). Probe extended with `live_name` (`sessions/probe/route.ts`). Proof: `PROMO OCTOBER 🔥‼️ · started 2026-10-08 14:00 MYT` ties Ads Manager's `14:00:17` exactly (06:00:17 UTC +8).
- Sessions cleanup (`page.tsx`, `dpl_7nhrxi91`): line 1 = title (or `room {id}` when untitled) + pill; line 2 = `started … MYT · duration` (+ `room {id} ·` prefix only when titled, `Nd range` only when multi-day). Midnight-bucket tail gone.
- Budget `% used` tiers (`BudgetUse`, `page.tsx:55`, `dpl_AWLvFgew` — one renderer, all 4 spots: GMV account/campaign, TTAM campaign/adgroup): <70 plain, 70–79 amber, 80–89 red text, 90–100 red pill + white + pulse, >100 brighter-red bold pill + pulse. Owner chose: pulse on 90%+ only, stronger style for overspend.

**Bugs + lessons (don't repeat).**
- B68 day-bucket rendered as event time (`room {id} · {s.day}` read as start time). Lesson: grain columns (`stat_time_day`) are never event times — display the attribute metric (`live_launched_time`), keep the bucket as secondary at most.
- B69 probe `roomId=` param is label-only (filter is `campaign_ids:[single]`, group by room — per-room filters 40002 per Checkpoint 19). Lesson: don't "fix" the probe to return one room; the full-campaign list IS the answer, read the matching row.
- Empty `live_name:""` is valid TikTok data (3 untitled END rooms this probe), not a fetch failure — fallback to `room {id}` by design, no retry loop will fill it.
- B61 repeat: `head` in shell tool fails on Win PS5.1 (used again, failed again). Lesson stands: no unix pipes in shell tool, ever.

**Open.** Manual-gap recheck (shop API vs old system) still parked since 28. Everything this session deployed but uncommitted (code: probe route, `gmv.ts`, `page.tsx`; docs: this file + friends). Owner deploys from Checkpoint 30 arc presumably done (these three deploys went through on current CLI auth — no `vercel login` needed this time).

**Vibe.** Short sharp verification loop: screenshot → probe JSON → screenshot → "ok good". Sparring stayed ON (talked through pulse-tier noise tradeoff via question tool: pulse-90-only won, stronger-style for >100). End-of-day ritual requested by name — done thoroughly, then stop.

## Checkpoint 30 — 08 Oct 2026 (hourly date-fix + shop multi-day + hourly rebuild + hourly-shop + pinger; pushed, deploy pending)

**To next-you: get back in this headspace instantly.** Same owner, same protocol (screenshots > logs, one action per message, no commit/push unless asked — except this arc explicitly approved pushes). The day's shape: each user message unlocked exactly one build ("fix it", "ok do A", "ok good 014 + refresh", "ok go", restyle/silent/push/range answers, "use b", "fill all the graph, yes"). Sparring stayed ON; two plan-mode interludes (hourly-why + shop-hourly-where) resolved into separate-metric + cache+refresh before any code. Push is now routine (approved) but slow — `git push` tails hang 2–5 min on this network; wait it out with `--progress`, verify with `git status -sb`, never assume the timeout means failure.

**What shipped (commits `d247e65` → `e75163a`, all pushed; deploy needs owner `npx vercel login` + run).**
- Hourly blank-charts bug: `page.tsx` sent `startDate/endDate`, `/api/hourly` read `date` → always queried today (empty). Fixed: frontend sends `date=${end}`; route falls back `date ?? endDate ?? startDate`.
- `014_shop_orders_daily.sql` (self-sufficient CREATE + ALTERs — dev branch lacked the 005 table entirely after a branch recreate; owner saw `42P01`, then clean skip-notices on rerun). Writers tolerate pre-014 DBs (ads-only fallback).
- Shop GMV multi-day: GET returns `daily` cache series; `POST /api/shop-gmv/refresh` (≤31d, per-day fail-open); tab has Shop-truth|Ads toggle + daily Performance chart + table + Refresh button. UI bug caught post-deploy: panel hid when cache empty (exactly when Refresh was needed) — gate is now multi-day-range OR non-empty daily.
- Hourly rebuild (shop-hourly style): GMV bars + spend dashed + ROAS lines, 24-hour picker (future/no-data disabled, bars+table follow pick), range scorecard (DEAD/GOLDEN/WATCH, missing excluded), `POST /api/hourly/sync` + Sync-now (Telegram-silent). GET takes startDate/endDate → `scorecard`.
- `015_shop_hourly_orders.sql` + Hourly shop metric: day-pull `orders/search` bucketed on MYT `create_time` (CANCELLED/REFUNDED out, tie-check `tied/diff/unparseable` reported); GET 24-hour view (shop GMV + cached ads spend + TRUE ROAS, future blank, spend toggle); range Refresh (backfills scorecard window); nightly fills yesterday; picker + spotlight + ≥3-day-gated scorecard added for parity.
- `.github/workflows/hourly-sync.yml`: true hourly pinger (Hobby cron is daily-only AND rejects sub-daily expressions at deploy — `vercel.json` hourly entry reverted after a failed deploy). Needs Actions secret `CRON_SECRET` (+ optional `VERCEL_BYPASS`). First manual run #1 Success 27s. GitHub-ToS question answered: scheduled hourly syncs are explicitly supported, ~60 free min/mo.
- Chart treatment shared (`hoverLinePlugin` + `comboOpts`/`barOpts` + RM/x tips, all 5 graphs): then the z-order saga — bars still covered lines until source-read proved `_drawDatasets` iterates ascending-sorted metasets in REVERSE (higher `order` = behind). Bars `order: 3`, spend 2, ROAS 1.

**Bugs + lessons (don't repeat).**
- B63 param-name mismatch across the fetch boundary (startDate/endDate vs date). Lesson: when a dashboard control "does nothing", compare the exact query string sent vs the exact params read before anything else.
- B64 render gate hiding its own recovery path (Refresh inside `daily.length > 0`). Lesson: empty-state CTAs must live outside the non-empty condition — test every panel with an empty cache.
- B65 Vercel Hobby rejects sub-daily crons AT DEPLOY (not at runtime). Lesson: Hobby = daily cron max, confirmed by deploy error; external pinger is the only hourly path short of Pro.
- B66 Chart.js `order` is inverted vs intuition (higher = behind, reverse-iteration). Lesson: never trust "higher = front" memory — read `_drawDatasets` in the installed dist (10 lines) before shipping z-order.
- B67 triple-hop edit left a dangling `rf` reference (caught by re-read, would have been a runtime ReferenceError tsc misses? — no, tsc DID catch nothing; caught on manual re-read). Lesson stands from B57: re-read after structural edits, especially multi-step ones.
- Slow-push discipline: `git push` timing out ≠ failed; `git status -sb` (ahead 1 vs clean) is the verdict, then retry with `--progress`.

**Open.** Owner deploys (login first), runs 015 prod, adds `CRON_SECRET` secret (done? run #1 Success suggests yes), Refreshes shop caches, eyeballs picker/scorecard/charts. Manual-gap recheck (shop API vs old system) still parked from 28. `DEV_NOTES.md` itself is still dirty locally (pre-existing, never staged — keep it that way until asked).

**Vibe.** Long shipping arc, owner precise and pleased ("ok good"). End-of-day ritual requested by name — do it thoroughly, then stop.

## Checkpoint 29 — 08 Oct 2026 (admin one-tap shop-token refresh; deployed)

**Why.** Shop access token expires ~Oct 13–14 and prod ran on env fallback
(no auto-refresh). Owner asked for a one-tap dashboard refresh like the
reference repo (`tiktok-account` silent-refresh + button), admin-only for
now, per-module later.

**What shipped.** `requireShopTokenAccess()` in `authz.ts` (single swap
point: admin today, modules[] later). New `/api/shop-token`: GET returns
expiry info to allowlisted users (lengths only); POST is admin +
same-origin, seeds the Neon row from env on first run, refreshes via
`token/refresh`, UPDATEs `credentials.shop_tokens`, audits best-effort.
Fixed an epoch bug: TikTok v2 `access_token_expire_in` is absolute epoch,
so `shopTokenExpiryMs()` normalizes epoch vs duration (else auto-refresh
would never fire). Shop GMV card shows `valid until <date>` + Refresh
button for admin only; others see nothing.

**Proof.** tsc 0 + build green (lists `/api/shop-token` + Middleware).
Deployed `marketer-2uf7h9ja4`. Live smoke: `/` 307, shop-token 401
signed-out. Owner signed-in test DONE 08 Oct: card showed env-fallback,
one tap seeded Neon + refreshed → `valid until 2026-10-14`.

**Vibe.** Same. No commit/push unless asked.

## Checkpoint 28 — 07 Oct 2026 (shop token live locally + prod env set; shop-gmv verify next)

**Why.** Owner authorized the Custom app via `Copy authorization link`
(Auth ID 7693937668253943570, Active/Unlimited/MY) and pasted the
`localhost:8082/callback?code=ROW_...` URL. Exchanged locally via
`auth.tiktok-shops.com/api/v2/token/get` (code 0): access token (122) +
refresh (79) saved to gitignored `.local_secrets.json`; cipher came from
`GET /authorization/202309/shops` (code 0, shop 7495...0274 Dr Samhan MY),
not from the token response (it carries no shops/cipher). Local
`orders/search` probe 24–27 Sep: code 0, pages flow, real order keys.

**Prod.** Owner added the 3 Production env vars; redeployed
(`marketer-222abg5k1`, Ready). Live smoke: `/` 307, shop-gmv 401
signed-out. Signed-in verify 07 Oct night: 24–27 Sep shop API gives
163,540.29 / 988 vs ads 169,805.12 / 1,012 (-3.7%, TRUE ROAS 3.71x/3.19x).
Ads side ties locked ref exactly; shop side does NOT (manual export said
143,941.26 / 1,016). Gap parked to next session — owner rechecks against
the old system's export method/status filter.

**Vibe.** Same as 27. No commit/push unless asked.

## Checkpoint 27 — 07 Oct 2026 (account-budget ON-only partial; built green, deploy blocked)

**Why.** Owner asked why some accounts show a budget and others show `—`.
Root cause: `budgetsComplete` hid the whole account sum unless every row had
a budget (`page.tsx:648`), and OFF rows forced `budget: null` (`gmv.ts:425`).
Owner approved: account budget = sum of ON campaigns only, ignore OFF; mark
partial when an ON budget is still unknown; `% used` = ON spend / ON budget,
one-day only.

**What changed.** `online/src/app/page.tsx`: `onRows`/`knownOn` replace
`budgetsComplete`; `accountBudget` = known-ON sum; `accountSpend` = ON-only
spend; `partial` flag when `knownOn < onRows`; cell shows sum + amber
`partial` (hover = N ON campaigns need lookup) when `accountBudget > 0`,
else `—`. Header copy updated to ON-only + partial wording.

**Proof.** `npx tsc --noEmit` exit 0. `npx next build` green (all routes +
Middleware listed). Deployed `dpl_5rKQahzdGM1KbsfvrfN6xva1J832` (alias
`marketer-hw.vercel.app`). Live smoke: `/` 307 to `/sign-in`, data API 401.
Owner Fetches one-day range signed in and confirms partial sums + % on ot1 rows.

**Vibe.** Same as 26. No commit/push unless asked.

## Checkpoint 26 — 07 Oct 2026 (session handoff; account-budget question open, no deploy)

**To next-you: get back in this headspace instantly.** Owner drives with
phone screenshots, not logs — three screenshots beat any stack trace tonight.
They speak short ("ok fix it", "ok go", "why there are account that had
budget"). You answer short: numbers first, one action per message, sparring
ON, no fluff. Each deploy answers exactly one screenshot. They verify signed
in; you only ever see 307/401 smoke (root 307, data APIs 401) — never owner
data. No commit/push unless asked (repo sits past `92e6016` + `8665857` with
uncommitted budget/session work; `git status` shows many Ms + two untracked
API dirs — leave them alone).

**Energy/mood.** Late-session, fast-iteration trust loop: probe → tiny fix →
deploy → owner screenshot → next fix. Owner is happy ("ok good") but precise —
they caught that Dr.Samhan needed manual open while HIMCoffee flipped alone,
and that account budgets show for some accounts but not others. Mood is
collaborative, not formal. Keep it that way: plain words, status codes as
proof, ask for one signed-in check at a time.

**Unique discoveries this arc (20→25).** `session/list` empty ≠ no
livestreams (it lists max-delivery sessions, not delivered rooms). Room truth
comes from livestream-level `gmv_max/report/get` filtered by single campaign,
grouped by `room_id`: `live_status`/`live_launched_time`/`live_duration` —
status is CURRENT TikTok state, not historical; launched UTC → MYT +8 (23:56
UTC = 07:56 MYT verified vs Ads Manager). Spend proves delivery: ON +
spending + `Asset unavailable` flag = grey info, ⛔ only on zero-spend rows.
`campaignOngoing()` = any room `liveStatus === "ONGOING"` drives 🟢 Active on
campaign + account. Auto-check cap 5 sequential (rate-limit safe); order
matters so sort by spend desc. Inline `Fragment` per campaign beats popup for
context. Account budget is all-or-nothing today (`budgetsComplete`), which is
exactly why the owner asked the last question.

**Open next session.** Owner approved: account budget = sum of ON campaigns
only, ignore OFF; mark partial when an ON budget is still unknown; `% used`
= ON spend ÷ ON budget, one-day only. NOT implemented yet — implement +
verify + deploy on next go. Remind them Fetch may still need repeats (15
missing infos per Fetch, highest-spend first, cached).

**Bugs found/fixed + lessons (don't repeat).**
- B57 edit ate `VerdictCell` signature (multi-line oldString). Lesson: after
every structural edit, re-read the region before verifying (folder rule 8).
- B58 auto-check reused stale sessions (React `setSessions({})` async +
closure cache). Lesson: `loadSessions(id, force)` + sequential force-refresh
on Fetch; manual button keeps cache path.
- B59 auto-check first-5 report order skipped Dr.Samhan. Lesson: sort
candidates by spend desc before slicing cap; caps need importance order, not
report order.
- B60 Sessions dumped below whole list. Lesson: one `Fragment` per campaign
(campaign row + its rooms), `sessionsExpanded` set, `toggleSessions()`;
background pill checks never expand rows.
- B61 PowerShell `&&` + `head` fail on Win PS5.1. Lesson: `;` chaining,
avoid unix pipes in shell tool.
- B62 edit failed on MASTER-CHANGELOG long line (whitespace/emoji drift).
Lesson: anchor tiny unique substrings, not whole paragraphs.
- B56 carryover: curl 200 ≠ redirect; check status + Location + middleware
manifest; middleware belongs at `online/src/middleware.ts` when `src/app`
exists.
- Account `—` is NOT missing data bug: strict `budgetsComplete` hides partial
sums by design (`page.tsx:648`); OFF forces `budget: null` (`gmv.ts:425`).
Next session changes this to ON-only partial by owner order.

**Vibe.** Screenshots do the debugging. Display truth, don't mask it. Probe
first, build third. No commit/push unless asked.

## Checkpoint 25 — 07 Oct 2026 (inline per-campaign sessions; deployed)

**Why.** Owner asked: Sessions button dumped all rooms below the whole campaign
list, forcing scroll + guess which rooms belong where. Chose inline expand
over popup to keep context beside the clicked campaign.

**What shipped.** `sessionsExpanded` set + `toggleSessions()` in
`online/src/app/page.tsx`: Sessions toggles to Hide, room rows render in a
Fragment directly beneath that campaign only. Background auto-checks for 🟢
Active pills never expand rows. Fetch clears expanded set with sessions.

**Proof.** py_compile + tsc + build green. Deployed `dpl_Frr1y6Z6cjiqifeXL4KLwgED131r`. Live
smoke: `/` 307, sessions API 401. Owner clicks Sessions on ot1 Dr.Samhan and
confirms rooms appear beneath it, other campaigns untouched.

**Vibe.** Same as 24. No commit/push unless asked.

## Checkpoint 24 — 07 Oct 2026 (spend-priority auto-check; deployed)

**Why.** ot1 Dr.Samhan (1862612348807426) needed manual Sessions open to flip
🟢 Active while HIMCoffeedrsamhan flipped automatically. Root cause: auto-check
took the first 5 ON LIVE campaigns in report order, so Dr.Samhan could miss
the batch.

**What shipped.** Fetch auto-check now collects ON LIVE candidates, sorts by
spend desc, takes top 5, then force-refreshes sequentially. No API traffic
increase; fail-open unchanged.

**Proof.** py_compile + tsc + build green. Deployed `dpl_87bUfeDXeGMVZJY2G6UpL1hTjWJ8`. Live
smoke: `/` 307, sessions API 401. Owner Fetches once and confirms both ot1
rows read 🟢 Active with no clicks.

**Vibe.** Same as 23. No commit/push unless asked.

## Checkpoint 23 — 07 Oct 2026 (force-refresh room checks; deployed)

**Why.** Owner showed pills only flip to 🟢 Active after opening Sessions per
campaign. Root cause: auto-check reused cached session rows (React state reset
is async), and parallel checks risked the Marketing API rate limit.

**What shipped.** `loadSessions(id, force)` bypasses cache when forced;
Fetch auto-check now force-refreshes ON LIVE campaigns sequentially
(one at a time, cap 5). Manual Sessions button behavior unchanged.

**Proof.** tsc + build green. Deployed `dpl_EwfNcXERGdcyezVMR3RaaNKQzkE7`. Live
smoke: `/` 307, sessions API 401. Owner Fetches once and confirms ot1 +
Dr.Samhan rows read 🟢 Active with no clicks.

**Vibe.** Owner's screenshots do the debugging — three images pinpointed the
stale-cache path faster than any log. No commit/push unless asked.

## Checkpoint 22 — 07 Oct 2026 (🟢 Active from ongoing rooms; deployed)

**Why.** Owner asked: account + campaign rows should show 🟢 Active when a room
is ongoing. Grey info text wasn't enough — they want the Active pill.

**What shipped.** `campaignOngoing()` derives live-delivery from loaded room
state (any room `liveStatus === "ONGOING"`). Campaign and account rows show
🟢 Active instead of the cached flag when true. Fetch auto-loads sessions for
ON LIVE campaigns (cap 5, silent fail-open) so pills correct themselves with
no clicks. Underlying flag data untouched.

**Proof.** tsc + build green. Deployed `dpl_3gZRXQaE4iCfrGeBvvcBQf2S7qTA`. Live
smoke: `/` 307, data API 401. Owner confirms on the ot1 + Dr.Samhan rows.

**Vibe.** Small, sharp iterations win: each deploy answers one screenshot. No
commit/push unless asked.

## Checkpoint 21 — 07 Oct 2026 (spend-aware delivery badge; deployed)

**Why.** Owner screenshot proved the false alarm: room ONGOING + spending, yet
campaign row showed ON + ⛔ Asset unavailable. Spend proves delivery, so a
diagnostic flag on a spending campaign must not render as a red alarm.

**What shipped.** New `DeliveryPill` in `online/src/app/page.tsx`: Active stays
🟢; any other flag on a row with cost > 0 in range renders grey info (hover
explains TikTok still reports the flag); ⛔ appears only when the row spent
nothing. Applied to campaign rows and account rollups. Flag data itself is
untouched — display-only change.

**Proof.** tsc + build green. Deployed `dpl_9mG9iNXKrnPx9UU5qEsT7Lcqs7qt`. Live
smoke: `/` 307, data API 401. Owner rechecks the ot1 row signed in.

**Vibe.** Display truth, don't mask it: the flag stays visible, just not red
when spend contradicts it. Watch: if TikTok ever reports a flag WITH zero
spend on an ON campaign, ⛔ still correctly shows.

## Checkpoint 20 — 07 Oct 2026 (room live-status in Sessions drill; deployed)

**Why.** Owner matched room 7693707778641169173 on both sides and asked if the
drill can show ongoing-or-not. Probe proved `live_status`/`live_launched_time`/
`live_duration` return per room (ONGOING + UTC launched time, verified against
Ads Manager's 07:56 MYT start).

**What shipped.** `getCampaignSessions` now makes one extra livestream-level
call (single-campaign filter, group by room, fail-open) and attaches
`liveStatus`/`liveLaunchedMyt`/`liveDuration` to each room row. UI shows
🟢 ONGOING / ⚪ END pill with launched-MYT + duration in the hover title.
Status is current TikTok state, not historical. Launched time converted
UTC→MYT (verified: 23:56 UTC = 07:56 MYT).

**Proof.** tsc + build green. Deployed `dpl_8TVzd8xbv8cWM3wKDwDZdr4x`. Live
smoke: sessions API 401 signed-out, `/` 307. Owner opens Sessions on the LIVE
campaign signed in to see pills.

**Vibe.** Probe-first discipline paid off twice today (budget fields, now room
status). Keep it: docs first, probe second, build third. No commit/push unless
asked.

## Checkpoint 19 — 07 Oct 2026 (session/list probe deployed; status columns next)

**Why.** Sessions drill is report-based (room x day spend, no status). Ads
Manager Livestreams tab shows LIVE name + Ongoing/Ended + start time for the
same room ID. Owner asked to recheck room level for ongoing-or-not.

**What shipped.** New allowlisted GET `/api/sessions/probe` calls
`campaign/gmv_max/session/list/` (page_size 5) and returns code, data keys,
item keys, and one truncated sample — no secrets. Field names still unverified
until owner runs it signed in.

**Proof.** tsc + build green (route listed). Deployed
`dpl_B9sq3qGKfgr6mUCMnpRtmQ5rEvLt`. Live smoke: probe 401 signed-out, `/` 307,
health 200. Extended with `roomId` branch (doc-grounded livestream metrics
`live_status`, `live_launched_time`, `live_duration`); deployed
`dpl_Fn3emPRsi8TSoW3ohKNDeG21oWgZ`, live signed-out probe still 401.

**Next.** Owner opens (signed in)
`/api/sessions/probe?shopNumber=1&campaignId=1862612348807426&roomId=7693707778641169173`
and pastes back the JSON (`roomProbe` section: does `live_status` return
Ongoing/Ended?). Then wire live status into the Sessions drill. Probe result so
far: session/list is code 0 with empty `session_list` — that endpoint only
covers max-delivery sessions created in the campaign, not delivered rooms.
First room-metric attempt failed 40002 (missing campaign_id filter); second
attempt failed 40002 (`room_ids` is not a supported filter). Probe now filters
by single campaign and groups by room (`room_id`, then `room_id+day` fallback),
deployed `dpl_3XWDiCYYb4uT2dACr9mNJY85EwWJ` (signed-out probe still 401).

**Vibe.** Same as Checkpoint 18: short replies, verify with status codes, no
portal changes by agent, no commit/push unless asked.

## Checkpoint 18 — 07 Oct 2026 (Refresh-budget button deployed; owner live test next)

**Why.** Dashboard showed cached Neon budget; normal Fetch never refreshed a
stored value, so a GMV Max budget edit in TikTok stayed stale. Owner asked for a
per-campaign refresh button.

**What shipped.** ON GMV Max rows have Refresh budget. It POSTs to new
`online/src/app/api/gmv-max/budget/route.ts` (allowlist + same-origin checks),
verifies the campaign row is still ON for that shop/type, GETs
`campaign/gmv_max/info` via `fetchGmvMaxBudgetInfo`, and UPDATEs only the
existing `gmv.gmv_campaigns.budget` cache. No TikTok budget-update call, no
migration. Button updates the row + one-day % in place and shows a status line.

**Proof.** `npx tsc --noEmit` + `npx next build` green; build lists
`/api/gmv-max/budget`. Local no-cookie smoke: refresh POST 401, data API 401,
health 200. Deployed `dpl_48R5oJNjejGjoH5K7ZYwnV5QHw7A` (alias
`marketer-hw.vercel.app`). Live no-cookie smoke: `/` 307 to `/sign-in`,
refresh POST 401, `/api/gmv-max` 401. Authenticated refresh (owner, signed in)
still open: change a LIVE budget in TikTok, press Refresh budget, compare row.

**Vibe.** Owner tests in another Chrome profile and reports plainly; keep
replies short, one action per message, verify with status codes not screenshots.
Do not commit/push unless asked (already pushed `92e6016` earlier; these budget
files are still uncommitted).

## Checkpoint 17 — 07 Oct 2026 (budget columns deployed; value verification pending)

**Owner spec.** Show budget amounts for GMV Max and TTAM campaign rows. Show
`% used` only for a one-day range; calculate daily spend/current daily budget.
GMV Max budget lookups should be restricted to ON campaigns. Lifetime, unlimited,
and mixed TTAM modes show amount/mode but no one-day percentage. No TikTok
budget-update calls are made; successful GET results are cached in Neon.

**Implemented + deployed.** GMV Max campaign reports read the existing
`gmv.gmv_campaigns.budget` cache, then fetch `campaign/gmv_max/info` only for ON
campaigns in the report with no cached amount (max 15 per type/request); successful
lookups are stored and the UI says when active budgets remain to fetch. TTAM
campaign/get parses campaign budgets; campaigns without a finite campaign cap
fetch matching adgroups in 50-ID batches and sum compatible daily/lifetime child
budgets. The campaign table shows Budget/% used; expanded adgroups show their own
budget too. No schema migration or TikTok budget-update call was added.

**Verification.** TypeScript and Next 15.5.27 production build pass. Deployment
`dpl_DStCPLP6hYsXmWoQXqX7B2iJDmCn` succeeded. No database budget API values could
be authenticated/read by agent; only route/build behavior is verified. Owner
should compare an ON GMV Max daily campaign, TTAM campaign-level budget, and
TTAM adgroup-budget campaign against Ads Manager. If active GMV budgets remain
uncached, repeat Fetch to process another batch. Old-day % uses current budget
because no historical budget snapshots exist.

**Vibe / next window.** User clarified “% used only shows when one day is
selected” and accepted amount/mode without % for lifetime/unlimited/mixed. Keep
the panel read-only. Do not treat API field presence as proof that the owner's
campaigns return it; ask them to compare real rows before declaring verified.
The remaining Tailwind dev audit items (7) are separate; production audit is 0.

## Checkpoint 16 — 07 Oct 2026 (budget feature, pre-deploy)

**Owner request.** Show each visible GMV Max and TTAM campaign's budget on the
online dashboard, plus budget-use percentage only for a one-day selection.
GMV Max budget lookups are restricted to campaigns whose stored TikTok status is
ON. No budget modification/write behavior was requested or added.

**What changed.** GMV campaign report responses now include cached budget data;
when an ON campaign in the selected report has no cached amount, the endpoint
fetches `campaign/gmv_max/info` for up to 15 such campaigns per type/request and
caches successful values in the existing `gmv.gmv_campaigns.budget` column.
UI reports remaining active lookups so Fetch can continue filling. TTAM campaign
metadata now parses `budget`/`budget_mode`; if there is no finite campaign-level
budget, it queries matching ad groups in batches and sums only compatible daily
or lifetime budgets. TTAM ad-group drill rows also show their own budgets.

`% used` is calculated only when `startDate === endDate`, and only for
`BUDGET_MODE_DAY` / dynamic-daily amounts. Lifetime, unlimited, and mixed-mode
budgets show no percent. A historical one-day selection is compared with the
current budget, because no budget history is stored. Multi-day ranges still show
the current budget amount but no percent. No DB migration or TikTok budget write
was added.

**Verification.** `npx tsc --noEmit` passed and `npx next build` passed on
Next 15.5.27. Live account field values have NOT yet been compared against Ads
Manager. If TikTok omits a budget/mode, the UI shows `—` or `Mixed` rather than
inventing a percent. Owner should verify one ON GMV Max daily campaign, one TTAM
campaign-level budget, and one TTAM campaign whose budget comes from ad groups.
Production deployment remains pending this session's final handoff.

**Vibe.** Owner narrowed the requirement precisely: “% used only shows when one
day is selected” and limit GMV Max info calls to ON campaigns. Keep the UI
display-only and explain missing values plainly. Ask for Ads Manager comparison
after deploy; do not ask for secrets or budget-write permissions.

## Checkpoint 15 — 07 Oct 2026 (signed-out shell exposure fixed + redeployed)

**Owner report / intent.** Google OAuth and Vercel configuration were done;
owner said real login worked, then noticed a signed-out Chrome profile could
still see the dashboard layout. Treat that report as a real gate failure, not
as a cosmetic preference. Owner asked to fix it and said “go”.

**Root cause.** App Router is `online/src/app`, but Auth.js middleware had been
written at `online/middleware.ts`. Next 15 did not discover/build it (the built
`.next/server/middleware-manifest.json` had empty `middleware` and
`sortedMiddleware`). The APIs themselves had route-level allowlist checks, so
data endpoints were 401, but the dashboard client shell rendered unauthenticated.

**Fix + proof.** Moved it to `online/src/middleware.ts` and updated the relative
`auth.config` import. Rebuilt with Next 15.5.27; build output now lists
`ƒ Middleware`. Local no-cookie smoke: `/` = 307 with Location `/sign-in`,
`/api/hourly` = 401, `/api/access-list` = 401, `/api/health` = 200. Deployed to
Production (`dpl_FDpqCvXJprdiMg2qXSQ57dCAHEB9`, alias
`marketer-hw.vercel.app`). Live no-cookie smoke returned the same 307/401/200;
`/sign-in` and `/api/auth/providers` both returned 200. No Vercel protection
setting was changed by agent.

**Unique verification lesson / bug 56.** Prior local smoke logged root HTTP
200 and incorrectly called it “redirected”; curl was not following redirects,
so 200 meant middleware never ran. A successful HTML status alone does NOT
prove a redirect. Always inspect status + `Location`, confirm the built
middleware manifest is populated, and hit a protected data API without cookies.
For any repo with `src/app`, middleware belongs under `src/middleware.ts` on
this Next version.

**Still open.** Owner must retest real Google flow after this redeploy: admin
login + `/access`, allowlisted user sees data, non-allowlisted user is denied,
and a removed user gets denied on the next data request. There was an Edge build
warning from Jose `CompressionStream`/`DecompressionStream`; basic unauthenticated
production checks pass, but watch the actual authenticated callback/session.
Vercel Protection is an owner setting; do not toggle it from code. Current
`npm audit --omit=dev` = 0; full audit still has 7 Tailwind 3 build/dev findings
(5 high, 2 moderate), with Tailwind 4.3.3 as the major suggested fix. No Tailwind
upgrade, commit, or push.

**Vibe.** User's terse correction (“but the user that had not sign in, they can
see the dashboard layout”) was exactly the important security report. Own the
smoke-test mistake directly, don't defend the old result. Owner prefers one
concrete action at a time, plain words, and will handle portal settings. Next
window should lead with the verified fix and ask for the Google allowlist tests,
not redo OAuth setup.

## Checkpoint 14 — 07 Oct 2026 (Google OAuth implementation stage; historical, before Checkpoint 15 deploy)

**Owner order.** Continue Checkpoint 13: implement Google OAuth with an exact
email allowlist and an admin page to manage it. Owner chose a separate fixed
bootstrap admin email. Do not request its value in chat; owner sets
`AUTH_ADMIN_EMAIL` privately in Vercel.

**Implemented locally.** Auth.js Google provider (`online/auth.ts` + config and
route), Google verified-email check, JWT session (8h), middleware sign-in gate,
and live allowlist membership recheck on each dashboard data API. Fixed admin
only can use `/access` and `/api/access-list` to add/remove emails. Rows live in
`core.access_allowlist`; add/remove writes are audited to `core.audit`. The
bootstrap admin is displayed as a fixed row and cannot be removed there.
Webhook, cron, probe and campaign-sync endpoints are excluded from the login
middleware only because they retain their existing server-secret checks;
`/api/health` remains public and returns no business data. Preset POST keeps its
extra write-key check. DB pool initialization is now lazy so auth-only pages can
build without eagerly requiring Neon at module import.

**Verification.** `npx tsc --noEmit` + Next 15.5.27 production build pass.
Build warns about Auth.js/Jose `CompressionStream`/`DecompressionStream` imports
in Edge middleware; basic middleware smoke passes, but retest real sign-in on the
deployed app. Local HTTP smoke (dummy OAuth env): provider discovery 200, signed-
out access/data APIs 401, health 200, root 307 to `/sign-in`. After moving the
middleware, production deployment `dpl_FDpqCvXJprdiMg2qXSQ57dCAHEB9` succeeded;
live signed-out smoke: root 307 to `/sign-in`, `/api/hourly` 401,
`/api/access-list` 401, `/api/health` 200. Google sign-in and allowlist changes
still need owner end-to-end checks.

**Dependency review.** Next moved to 15.5.27 (React 18 peer-compatible) and
PostCSS to 8.5.29 with an override for Next's pinned copy. `npm audit --omit=dev`
is now clean (0). Full audit has 7 remaining findings (5 high, 2 moderate), all
in the Tailwind 3 build/dev dependency tree. `npm audit fix --dry-run` proposes
Tailwind 4.3.3 (major) and does NOT modify files; it was not applied. Remaining
decision: a Tailwind 4 migration vs separately tested overrides or acceptance
of documented build-only residual risk. Never use `npm audit fix --force`
blindly. Production deployment proceeded after owner approval; agent did not run
migrations or change portal settings. No commit or push.

**Owner setup / rollout order.** Owner reports migration 013 exists in both
Neon branches and Google/Vercel OAuth setup is complete. Agent did not access
those values or change portals. Production code is now deployed; remaining:
owner verifies sign-in, allowed/denied accounts, and removal revocation.
Vercel Protection blocks Google callbacks for non-team users: once the app gate
is deployed, owner may temporarily disable the Vercel wall for a controlled
test window. Restore it immediately if any signed-out/allowlisted/denied/removal
test fails; leave it off only after all app-level checks pass, if non-Vercel
employees need access.

**Deploy history.** First attempt returned `Not authorized`; owner completed
Vercel login, then requested retry. Successful production deployment followed.
No deployment settings were changed by agent; keep CLI tokens out of chat.

**Vibe.** Owner was decisive: “go”, then fixed-email allowlist plus admin page.
Keep the protocol: one action at a time, no secrets in chat. OAuth portal/Neon
setup is owner-reported complete. Production signed-out gate is now verified;
end-to-end Google allowlist tests remain. Production dependency audit is clean;
7 Tailwind build/dev findings remain for separate decision.

## Checkpoint 13 — 07 Oct 2026 (security: public exposure → wall → write guard; historical)

**What happened.** Owner tested prod from an incognito profile — it opened with
no login. Verified independently via server-side fetch: full dashboard HTML,
zero auth. The site had been PUBLIC (spend/GMV/campaigns + unguarded
`/api/ttam-presets` writes). Root cause: Deployment Protection was on
"Standard Protection" = previews only; production was uncovered. Fix: switched
to **All Deployments** (owner click, saved) — other profiles now hit the wall.
Step 2 built and owner-tested after deploy completed: Bearer `PRESET_WRITE_KEY` guard on preset writes
(dedicated key, never the cron secret; fail-closed 503 without it; reads stay
open behind the wall). Browser sends `NEXT_PUBLIC_PRESET_WRITE_KEY` — same
value in both vars. Commits from the parallel window landed mid-session
(`80faa1b`: Checkpoint 12 + bugs 41–50 + /start) — numbering continues here.

**Vibe.** Security arc inside a shipping day: owner found the hole themselves
("i can open from incognito") — take such reports at face value and verify
externally first, debate later. Mode-switching fatigue is real (~12 switches
across both windows); owner compensates with one-liners ("goo", "ok done").
"Explain like im 5" = I'm over-technical again: one analogy + one action.
Key saga took 4 rounds (401s) before the obvious emerged (deploy timing) —
state the boring hypothesis FIRST next time (env→save→deploy order), then dig.

**Bugs found + fixed (do not regress).**
51. **"Standard Protection" ≠ production.** Toggle ON but only previews covered;
    prod served publicly. LESSON: verify every gate from outside (incognito +
    logged-out fetch), never trust the toggle screenshot. Fixed = All Deployments.
52. **NEXT_PUBLIC_* bakes at build time.** Env added → deploy → still 401 means
    the live bundle predates the env. LESSON: env → Save → deploy, in that order;
    "unauthorized" with correct setup = check deploy timing before anything else.
53. **Vercel blocks sensitive-type NEXT_PUBLIC_ vars.** Fix = Config/plain type
    (browser-sent keys are Config by design; real secrets stay Secret type).
54. **Burned spare key.** Generated a replacement mid-debug that was never used —
    it sits in chat history. LESSON: generate only at switch-over, one key at a
    time; the unused string is dead, never paste it anywhere.

**NEXT SESSION (owner order): Google OAuth.** Replaces/augments the Vercel wall
with real accounts. Suggested shape: Auth.js + Google provider first (heaviest
value, least code); email/password only if per-person identity is truly needed —
full discussion + effort ladder is in this chat's 07 Oct scrollback. Start by
reading it, then Checkpoint 12 (parallel window) for the bot/protection state.

## Checkpoint 12 — 06→07 Oct 2026 (restructure Phase 2 land + Telegram bot down→fixed + /start status)

**Vibe this window (sync to this first).** Owner in pure shipping mode: terse
pings ("ok", "goo", "fix all", "push"), night-owl MYT hours, zero small talk.
Dynamic is split-brain and it works — owner owns every portal/dashboard/secret
surface (Vercel clicks, token pastes, `/fetch` taps, screenshots-as-proof),
agent owns everything in git. Never ask owner for a secret VALUE; always ask
for command OUTPUTS. Owner redacts in chat (`$token='bot'`) — that's discipline,
not evasiveness; work with masked values and verify via side-channels
(`getWebhookInfo.url` shows whether a placeholder went in literally). When the
owner says "my mistake" twice in a row, slow down and make the next command
copy-paste atomic (all vars + verify in ONE block). Short replies are not
rudeness, they're the protocol — match it: one action per message, facts first.

**What shipped.**

- Restructure Phase 2 landed under this folder's feet (`2-gmvmax/gmvmax-auto/`);
  `deploy_online.py` ROOT walks up 2 (verified resolves); `sheet-sync.py`
  sibling-`../tools` lookup now walks up (old depth broke under `2-gmvmax/`);
  `dashboard.py` needed NO change (sibling layout preserved, path resolves True).
- Bot commands (commits `7b02b1c`, `398edec`): `/start` → full system status
  (alive MYT + `SELECT 1` + `MAX(hour_slot)` + `MAX(date)`, each degrading
  independently, never leaks secrets); unknown `/commands` → hint reply;
  non-slash chatter stays ignored. Daily freshness formatted `YYYY-MM-DD`
  (was raw `Date.toString`). `tsc` exit 0. Redeployed by owner; `/start`
  live-verified 07 Oct 00:12 MYT — and immediately proved value: hourly stops
  at Oct 5 23:00 (~25h stale = stopped `GMVMaxCollector30m`, task action still
  points pre-move on owner's other PC — see plan.md NEXT SESSION note).
- Protection workaround (keep this): deployment stays behind Vercel
  Authentication; webhook URL carries `?x-vercel-protection-bypass=` (query
  works, Telegram can't send headers). Route ignores query params, still
  demands its own secret header — no exposure added.

**Bugs found + fixed (do not regress).**
41. **Secret drift after redeploy (401, pending pile-up).** `secret_token`
    registered at setWebhook time ≠ current `CRON_SECRET`. Diagnose FIRST with
    `getWebhookInfo` — `last_error_message` names it. Fix = re-setWebhook with
    re-COPIED secret (never retyped). LESSON: secret mismatch is the default
    suspect for silent bots; the info endpoint tells you before you guess.
42. **Protection 401 vs route 401 look identical in `getWebhookInfo`.**
    Distinguish with a bare POST (no headers, exactly what Telegram sends):
    JSON `{"error":"unauthorized"}` = route reached (env/secret issue);
    empty-body 401 = Vercel gate in front (protection issue). LESSON: replicate
    the caller's exact conditions, bypass headers included or not.
43. **Placeholder went live twice.** `PASTE_…`/`PUT_THE_…` registered literally
    (visible in `getWebhookInfo.url`). LESSON: every setWebhook must be
    followed by a getWebhookInfo read-back checking for the word PASTE —
    make it one atomic block, not two messages.
44. **PowerShell backtick-t ate doc text.** `` `tiktok `` in double-quoted
    strings became TAB+`iktok` (`2-gmvmax/README.md` said "iktok-…").
    LESSON: never build file text with backticks in PS strings — use the
    write tool for file content, always.
45. **TDZ on moved declarations.** New `/start` branch used `chatId` declared
    below it → would have 500'd every command. Caught on re-read before
    shipping. LESSON: after structural edits, re-read the WHOLE function
    (the folder rule already says this — this is why).
46. **Depth-hardcoded sibling lookup.** `dirname(MARKETER)/tools` broke one
    level deeper. Walk-up search replaces it (env override first, `isdir`
    gate). LESSON: never hardcode `..` counts for cross-repo paths.
47. **`collector_task.bat` double-stale.** Pointed at a previous PC's path AND
    the pre-move relative path. Fixed contents; scheduler task action on
    owner's other PC still open. LESSON: `.bat`/scheduler paths are part of
    every move — checklist them like code.
48. **Select-String is case-INsensitive by default.** Fake "clean" then fake
    hits. LESSON: always `-CaseSensitive`, or verify with python `re`.
49. **No-change needed is a finding, not a skip.** `dashboard.py` sibling
    math survives the pair-move — verified by executing the path logic, not
    by eyeballing. LESSON: prove negatives with runnable checks.
50. **Raw `Date` in chat output.** `MAX(date)` printed GMT-longform.
    LESSON: format every DB value at the boundary before it reaches chat.

## Checkpoint 11 — 06 Oct 2026 (M10 dashboard + M11 TTAM metrics/presets, all local-green, deploy decides)

**What shipped (tsc-clean, most undeployed at close).**

- M10 dashboard overhaul: Tailwind rewrite (sticky header, KPI cards, section cards;
  `tailwind.config.js` + `postcss.config.js` + `globals.css`); delivery pills green/grey;
  Sessions button LIVE-only; Status filter (All/ON+unknown/OFF) + ON-first sort
  everywhere (GMV/hourly/TTAM, charts keep cost order); Fetch spinner + drill
  spinners + 15s cooldown; v51-port calendar popup (preset rail, two-month grid,
  two-click/hover, future-disabled, 31-day cap); Dashboard|Presets nav tabs.
- M11 TTAM metrics: 3-level campaign/adgroup/ad drills (`ttam.ts`, on-demand,
  spend-first fail-open) + full 12-metric pulls + v3 OMTM scoring (`scoreTtamRow`,
  exact port) + flags/verdict (theory-v2 bands, provisional) + toggles + verdict
  filter + search + LEARNING guardrail (preset min_spend/min_impressions) +
  3-day rule (scores always, verdicts need ≥3d).
- Preset system: `012_ttam_presets.sql` (new `ttam` schema, applied dev+prod,
  seed active) + `/api/ttam-presets` (list/get/update/duplicate/activate/delete
  + scorer export) + `/presets` manager page (band/guardrail/notes editor,
    add/delete metric, export download) + TTAM-bar preset picker (no-refetch
    swap) + runtime custom-metric eval (`applyCustomScores`) + full-name tooltips.
- Probes: `/api/ttam-probe` (25 → 27 metrics, all OK all grains) filled the
  mapping table (`ttam-api-metrics-plan.md`, mirrored in plan dir).

**Bugs found + fixed (do not regress).**
36. **Client imports server chain.** Page imported `@/lib/ttam` → ads-credentials
    → `db.ts` → `pg` → `dns/net/tls` missing in browser build (Vercel red, tsc
    green). Fixed with pure `ttam-scores.ts` (zero imports). LESSON: client
    components import ONLY from leaf modules; tsc never catches this, only
    `next build` does. If Vercel says "Module not found: dns/net/tls", read the
    import trace bottom-up — the fix is always moving pure code, never polyfills.
37. **Parent+child dimension combos rejected (40002).** `campaign_id+adgroup_id`
    at ADGROUP grain and `adgroup_id+ad_id` at AD grain are invalid despite each
    dim being legal solo (probe proved solo OK). Fix: pull child grain alone,
    filter client-side by the get-list ID set. LESSON: probe single dims AND the
    exact combo before building drills.
38. **Edit-tool near-misses (3x).** Ate `from "./gmv"`, duplicated RootLayout,
    ate flagScore signature. All caught by re-reading the region (rule from bugs
    10/12/30 holds — no exceptions, even for "trivial" edits).
39. **Stale `.vercel/repo.json` after restructure.** Dashboard Root Directory was
    saved correctly but CLI kept the old `gmvmax-auto/online` path from local
    cache. Fixed by editing the gitignored cache file. LESSON: after any folder
    move, check `.vercel/repo.json` `directory` when the CLI path looks stale.
40. **Overstated API knowledge (mine).** Claimed integrated/get serves only
    spend/impr/clicks; owner pushed back; docs proved 25 metrics. LESSON: probe
    or read docs before declaring API limits — sparring works both ways.

**Open threads (next session).**

1. LQS verify: one ad's LQS vs xlsx "10-second LIVE views" (live_effective_views presumed).
2. TTAM quartile recalibration (needs weeks of data) → then "provisional" off.
3. FUTURE (in ttam-api-metrics-plan.md): compact mode, reason 2nd line, slim sub-rows, verdict-history snapshots, fetch-all generalization, monitor toggle.
4. A-vs-B preset sync still open (dashboard reads DB; scorer needs manual export).
5. Carried: 🔥 floor gate, OFF per-type, export demo (143,941 PROVISIONAL), shop approval, cron ping.
6. Commit ritual: this whole session (M10+M11 + plans + 012) is UNCOMMITTED — ask.

**Mood at close.** Long build day, owner in sprint mode (~8 plan/build switches,
screenshots for every eyeball). "Explain like im 5" = signal I'm over-technical:
drop to one analogy + one action. They verify with numbers, decide in one-liners.
Everything green locally; prod eyeball is the remaining thrill.

## Vibe — 01 Oct session (online M7 extras, read to sync)

> Next-you: read this first, then `plan.md`, then `masterplan.md` §9. You are picking up
> mid-P0 with a warm, hands-on owner. Tone below is the vibe, not just facts.

DONT DELETE THIS PART

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

## Vibe — 01 Oct session (online M7 extras, read to sync)

- Owner tested everything on the prod URL (`marketer-hw.vercel.app`), never local — local `.env.local` holds only a Vercel token, filling it is more hassle than deploying. Rhythm: I deploy → owner opens URL → pastes screenshot or one-line confirm ("454 rooms", "Statement executed successfully", "ok fixed"). Match it: deploy first, one browser/portal action per message, no terminal asks beyond copy-paste.
- Mid-session the user switched to Plan mode (twice): feasibility talk only, no code. Plan mode lifted at the end. Inside Plan mode we found the real explanations (cross-shop scope, 40001 token cause, restatement) by reasoning over screenshots, not code.
- Mood at close: satisfied ("ok good"), then curious — parity detective work with spreadsheets. Owner lights up when numbers tie; lead with the tie, then the delta.
- Open human thread: shops 3/4 tokens belong to another consortium part — owner pursuing Analyst access. Do not nag; the fallback ladder (partner access → URL+code paste → manual rows) is recorded.
- Secrets held: CRON_SECRET handled terminal-only; tokens never pasted. `package-lock.json` appeared untracked (left alone — ask before committing).

## Vibe / dynamic / energy — sync to this frequency

- Owner is Ikram (HIMWELLNESS, MY shop), non-DB beginner but fast executor: clicks through
  Neon/TikTok portals live and pastes back screenshots instead of words. Replies are short
  ("ok", "now", "ok done", screenshots). Match that: short replies, numbered steps, no lectures.
- Session rhythm was Q→do→screenshot→verify. Owner did every portal step same-session:
  Neon project `TIKTOK DATA` (SG) → dev branch → connection strings → `.local_secrets.json` →
  SQL Editor migrations → Business API app `TIKTOK GMV MAX` → Shop Partner Center Custom app.
  Never ask twice; give one action per message with the exact click path.
- Mood at close: momentum, not stuck. Neon is GREEN (2/7 both branches). Blockers are external
  waits (Business API approval), not code. Owner trusts file-first/offline behaviour —
  keep proving "works without Neon/keys" at every step.
- Secrets discipline held all session: keys went into gitignored `.local_secrets.json` only,
  verification printed key-names + lengths, never values. Owner once pasted prod-adjacent
  material pre-17 Sep (per NEON_NOTE invariant) — treat rotation as done/assumed, don't relitigate.
- Language: owner writes casual English + screenshots. Answer in short plain English.
  No emojis unless asked. PowerShell 5.1, Windows paths, `127.0.0.1` only.

## Where P0 stands (facts, 19 Sep 2026 night MYT)

- Skeleton LANDED + verified: `collector.py` (closed-window T-2h stub tick wrote
  `cache/snapshots.jsonl`), `dashboard/dashboard.py` (owns 8082, smoke 8099 OK:
  `/api/health` LOCAL-FILE, 1 snapshot), `dashboard.html` (picker, 30m/1h table,
  freshness + branch badge, greyed rules/approval, guardrails strip).
  Verify chain used: `py_compile OK` + `node --check JS_OK` + HTTP smoke + `git status`
  clean of secrets (`cache/` + `.local_secrets.json` ignored).
- Neon GREEN: project `TIKTOK DATA`, region AWS APAC-1 Singapore, branches `production`
  (default, never expires) + `dev` (child). Migrations `001_core, 002_acct, 003_gmv`
  written then FIXED by `004_fix_schemas.sql` (see Bugs). Verify: `acct`=2, `gmv`=7
  on BOTH branches via SQL Editor counts.
- Keys local only: `NEON_URL_DEV/PROD` (pooled, sslmode), `GMV_ENC_KEY` (token_urlsafe(32),
  43 chars), `SHOP_APP_KEY` (13) + `SHOP_APP_SECRET` (40). Presence-verified by lengths.
- Business API app `TIKTOK GMV MAX`: submitted, **PENDING APPROVAL** at
  `business-api.tiktok.com/portal/apps` — NON-ISSUE 20 Sep: this wait is expected,
  P0 holds on file-first, no action. Description = internal P0 read-only wording.
  Redirect `http://localhost:8082/callback` (see Bugs: IP form rejected). Scopes = All on
  Ad account management + Ads management + Reporting (covers GMV Max GETs; write scopes
  come with approval but P0 never POSTs). Sandbox ad account button locked until approval
  (3–7 day wait typical). Sandbox base `https://sandbox-ads.tiktok.com/open_api`.
- Shop Partner Center Custom app (MY market, eCommerce Management/Connectors, name
  `HIMWELLNESS GMV MAX INTERNAL`, redirect `http://localhost:8082/callback` else bare
  `http://localhost`, API ON): created, app_key/secret saved locally. This is the shop half
  of auth; Business API is the ads half.
- `plan.md` ticked for skeleton + Neon + ENC; app/sandbox/GET-wiring/ROI-lock still open.
  Per-schema roles (`acct_app`/`gmv_app`) DEFERRED to P1 (owner-only for P0). Heartbeat/
  silent->40m alert is P1. `ALLOW_WRITES=0` hard lock in collector.

## Current mood — 21 Sep (this session, read before touching code)

- Breakthrough day. Owner powered through approval -> sandbox -> prod OAuth (screenshot of consent screen) -> store ID -> campaign IDs, pasting terminal outputs back each time. Terse loop held: feasibility-first questions ("why lock?", "why lag?", "must I give each ID?") got words only; "ok go" built immediately.
- Two mid-session pivots handled cleanly: (1) zeros were wrong-account, not broken code — proved by probing all 3 advertisers; (2) plan-mode interlude for live-view scope, then build on "go". Owner trusts file-first/offline proofs; keep showing "works without X" at each step.
- Energy: late-session, get-it-landed. Sync cue: lead with numbers (owner lights up at ROI figures), keep portal steps to one action per message, never ask them to open terminal beyond copy-paste commands.

## Bugs found + fixed this session (do not regress)

1. **Unqualified table names (002/003).** Wrote `CREATE TABLE acct_tokens` after
   `CREATE SCHEMA acct` — tables landed in `public`, so `WHERE table_schema='acct'`
   returned 0 while Neon said "already exists". Owner screenshots proved it
   (schemas=3, core tables=3, acct/gmv counts=0, then "already exists" notices).
   Fixed by `004_fix_schemas.sql` (DROP public dupes + CREATE `acct.*`/`gmv.*`).
   LESSON: every DDL identifier in migrations must be schema-qualified (`acct.x`,
   `gmv.x`, `core.x`), including indexes and FK `REFERENCES gmv.gmv_shops(...)`.
   Add a grep check before any new migration: `rg "CREATE TABLE (?!acct\.|gmv\.|core\.)"`.
2. **Reserved word `window` as column.** `003` query 4 ERRORed: `win TEXT` vs `window`.
   `WINDOW` is reserved in Postgres. Renamed DB column to `win` ('30m'/'1h');
   file-cache JSON key stays `window`, collector maps `row["window"]→win` on insert.
   LESSON: never use `window`, `order`, `group`, `user` as bare columns. Prefer `win`,
   `sort`, `grp`. If a reserved word is unavoidable, quote `"window"` in DDL *and*
   every query — renaming is cheaper.
3. **Neon child-branch TTL default.** "Create child branch" checks
   `Automatically delete branch after → 1 day` by default → dev showed
   "expires Sep 20 10:36am +8". Fixed by setting expiration Never for persistent dev.
   LESSON: tell owner to uncheck auto-delete BEFORE creating persistent branches;
   default branch never expires, child branches do unless cleared.
4. **Business API redirect validator rejects IP loopback.** `http://127.0.0.1:8082/callback`
   (and trailing-slash variant) failed with misleading "beginning with http://" error.
   `http://localhost:8082/callback` (no trailing slash) accepted. LESSON: Business API =
   `localhost`, not `127.0.0.1` (Display-app Desktop rule does not transfer). Code still
   binds `127.0.0.1` (answers localhost too) — only the portal string uses localhost.
5. **`.local_secrets.json` phantom-save.** Owner said "pasted" but file didn't exist
   (only EXAMPLE). Cause: edited without Copy-Item first. LESSON: always start portal-key
   steps with `Copy-Item EXAMPLE→real + notepad real`, then verify by
   `Test-Path + key-names/lengths`, never values.
6. **Wired the wrong advertiser (zeros misread as broken code).** First prod
   token pointed at HIM COFFEE1 (0 spend). Fixed by listing ALL authorized
   advertisers (`GET /oauth2/advertiser/get/` with app_id+secret) and probing
   each one's report — money was on GMV MAX VOL2. LESSON: after any OAuth,
   probe every advertiser's spend before trusting numbers; store the map in
   `TIKTOK_ADVERTISERS`, keep previous ID as `_PREV`.
7. **Guessed wrong metric/dimension names.** `spend/gmv/CAMPAIGN_ID` →
   40002 "ERROR Message." (useless text). Correct: metrics
   `cost/orders/gross_revenue/roi`, dimensions `advertiser_id+stat_time_day`
   (a main dimension is mandatory), `store_ids` required (max 1). LESSON:
   TikTok errors are terse — change one param per probe; spec mirrors
   (api-evangelist yml, tiktok-ads-mcp docs) carry the real enums.
8. **GMV campaigns invisible to list APIs.** `/campaign/get/` (48 classic) +
   `/smart_plus/campaign/get/` (0) never return GMV Max rows — seeds from the
   owner's bulk export are the discovery mechanism. LESSON: verify emptiness
   on every candidate endpoint before building discovery UI; say so plainly
   and ask for IDs instead of digging further.
9. **`session_list` key, not `list`.** Session endpoint OK with empty
   `session_list` = no max-delivery sessions created (not an error).
   LESSON: dump raw response keys first (`ck.py` pattern) before coding
   parsers; treat empty-with-code-0 as data, not failure.
10. **Edit-tool chokes on non-ASCII anchors.** Em-dash in oldString failed
    repeatedly; ASCII hyphen worked. LESSON: anchor all edits on plain-ASCII
    substrings; verify with Read after structural edits (function-header
    clobbers happened twice this session: seeds/advertisers, checkpoint
    headers — both caught by re-read).
11. **Next 14 rejects `next.config.ts`.** Cloud build: "Configuring Next.js via
    'next.config.ts' is not supported" — replaced with `next.config.mjs`.
    LESSON: scaffold Next 14 with `.mjs` from the start.
12. **App Router needs root `layout.tsx`.** Build: "page.tsx doesn't have a root
    layout" — added minimal `src/app/layout.tsx`. LESSON: layout is mandatory,
    not optional, even for single-page scaffolds.
13. **Missing TS `target` breaks Map iteration.** `for (const [id, c] of map)`
    needs `target ES2017+` in tsconfig (hand-written one lacked it). LESSON:
    always set `target: ES2017` minimum.
14. **Dashboard Root Directory + CLI `--cwd` double-applies.** After setting Root
    Directory, deploys with `--cwd gmvmax-auto/online` built an empty dir
    (Framework `Other`, "No Output Directory public"). LESSON: with Root
    Directory set, deploy from repo root with NO `--cwd`. The Production
    Overrides banner ("differs from Project Settings") is the tell.
15. **Fresh-DB FK chain bites.** `/api/campaigns/sync` 500 on
    `gmv_campaigns_shop_id_fkey` — `gmv_shops` (and `core.shops`) empty.
    LESSON: sync upserts parents first (`core.shops` -> `gmv.gmv_shops`).
16. **Report API returns mixed types; DB map must scope by type.** ROAS showed
    live == product (12,599.45 twice, gmv doubled to 339k). LESSON: never trust
    `gmv_max_promotion_type` alone — filter by Neon's `promotion_type=$2` map
    (temp-marketplace does the same).
17. **PowerShell `$_` eaten by outer shell.** `powershell -c "...$_..."` from
    inside PowerShell expands `$_` first (`System.Char` x32). LESSON: run the
    command directly, no wrapper; single quotes if wrapping.
18. **`vercel curl` takes no `-H`.** Header parsed as URL ("Malformed input").
    LESSON: use dashboard Protection Bypass (`x-vercel-protection-bypass`)
    + plain `Invoke-RestMethod`/`curl.exe` for authed endpoints.
19. **`deploy_online.py` misses `npx` on Windows.** `subprocess.run(["npx",...])`
    without shell can't see `npx.cmd` ("npx not found" though Node exists).
    Fixed with `npx.cmd` + `shell=(os.name=="nt")`. LESSON: on Windows,
    subprocess needs the `.cmd` suffix or shell=True; PowerShell itself
    resolves fine, so direct `npx` in terminal always works.
20. **`await` inside a setState updater breaks the Next build.**
    `setSessions((p) => ({...await r.json()}))` compiled locally-unused but
    Vercel webpack failed ("await isn't allowed in non-async function").
    LESSON: await BEFORE setState, never inside the updater.
21. **Frontend merges must carry every new field.** `/api/gmv-max` returned
    `status:"ON"` correctly, UI showed "?" — the Total merge accumulator
    copied cost/gmv/orders but not `status`. LESSON: when adding a field to
    an API row, grep every merge/accumulator on the client and add it there too.
22. **Multi-shop token fallback lies.** `getAdsCredentials` returns ACCOUNT1's
    token for ANY advertiser (ignores `accessTokenEnv`), so shops 3/4 fail
    with 40001 "No permission to operate advertiser" — correct TikTok error,
    wrong token. LESSON: credential lookup must scope by advertiser first and
    error naming the missing env, never silently substitute another token.
23. **Hour-slot grid includes future zeros.** `stat_time_hour` returns the
    full-day grid — future hours come back as all-zero rows. "Drop newest 2
    slots" diffed zeros and Telegram'd an all-zero report. LESSON: detect
    the edge by activity (last slot with cost/gmv/orders > 0) and never store
    future slots; closed-window depth (edge-1 vs edge-inclusive + partial tag)
    is a product call, not a data call. Slots are MYT (verified).
24. **Hourly mixed-type PK overwrite.** Both LIVE + PRODUCT pulls returned
    rows for the same campaign_ids; second upsert overwrote the first on
    `(shop_id, campaign_id, hour_slot)`. Same root as bug 16. LESSON: filter
    every report pull by the Neon promotion_type map — no exceptions, new
    endpoints included. Rewrite-on-revise self-heals stored labels.
25. **Telegram 4096-char cap.** 202 campaigns × ~150 chars blows past it —
    send fails silently-ish. LESSON: top-N truncation + overflow line on every
    list message; rich 32k cap does not remove the need (legacy fallback).
26. **Rich `{html}` collapses newlines.** First rich messages arrived as a
    wall of text — HTML rendering eats raw `\n`. LESSON: `\n` → `<br/>` for
    the rich pipe only, legacy path keeps `\n` (classic parse_mode has no `<br/>`).
27. **Hourly-sync Hobby 60s timeout.** ~2,000 sequential upserts ran past the
    cap (predicted, then confirmed live). LESSON: batch multi-row upserts
    (500/chunk) for any per-row write loop on serverless; keep writes
    transaction-free so kills leave partial progress reruns continue.
28. **Vercel CLI token expires mid-session.** Two `Not authorized` deploy
    blocks, both fixed by owner `npx vercel login`. LESSON: expect expiry,
    never debug the deploy itself first — check auth first.
29. **Webhook 401 = secret mismatch.** `secret_token` typo vs CRON_SECRET;
    Telegram queues retries (5 pending = 5 duplicate syncs on fix). LESSON:
    re-copy secret never retype; set `drop_pending_updates=true` when
    re-registering to clear the storm.

## API note — GMV campaign name/ID mapping (21 Sep discussion, locked)

- Owner asked about a system that shows GMV campaigns by bracketed name
  (e.g. `[Dr Samhan Official1]`) without supplying IDs, and which API to use.
- Verified answer: `GET /campaign/gmv_max/info/` on the Business Marketing
  API is the ONLY endpoint returning the bracketed `campaign_name`, and it
  REQUIRES `campaign_id`. Direction is one-way: ID -> bracketed name.
- No public endpoint maps name -> ID: `/campaign/get/` returns classic rows
  only (zero GMV), `/smart_plus/campaign/get/` returns zero rows,
  `/gmv_max/report/get/` returns metrics with no names.
- Conclusion: any system showing bracketed names keeps its own ID -> name
  map (synced from Ads Manager / bulk export). Ours is `TIKTOK_GMV_CAMPAIGNS`
  {PRODUCT, LIVE} in `.local_secrets.json`. New campaigns = paste ID, rerun
  `live_view.py`. Revisit only if TikTok ships a GMV list endpoint.

## Session closeout — 04 Oct 2026 (M9 live, divergence check open)

> Next-you: read Checkpoint 8 first (facts), then this (frequency).

**Vibe.** Marathon portal-plus-build session. Owner ran every portal click same-day
(Neon 007/008/009 dev+prod, Partner Center draft→submit, Testing Tool maze,
BotFather, setWebhook, Vercel env, campaign resync question) while I shipped
~10 deploys. Loop held all day: deploy → one action → screenshot/short confirm.
Owner thinks in screenshots, decides in one-liners ("ok go", "still not sucess"
= keep digging). Match it: short replies, numbered steps, lead with numbers —
they light up when figures tie (143,941 vs 169,805 landed exactly that way).

**Standing orders now active.** (1) Sparring partner mode: never affirm blindly —
analyze assumptions, counterpoint, test reasoning, truth over agreement.
(2) Shop 1 only; shops 2–4 ignored until asked. (3) No suggestion engine —
POC only. (4) Export-method exact numbers = Thread 1, owner demos next session;
143,941 stays PROVISIONAL until then. (5) `1-MASTER/BIGMASTERPLAN.md` read-first
rule lives in MASTER-AGENTS (note: that file does not exist in repo — rule
dangles; do not chase it, use MASTER-PLAN instead).

**Discoveries (do not relitigate).**

- `stat_time_hour` exists on `gmv_max/report/get` (code 0 verified); 1-day span
  max; returns full-day grid incl. future zero slots; slots are MYT.
- Telegram Bot API 10.1+ Rich Messages are real and live on owner's client:
  sendRichMessage `{html}` fires but renders like legacy; real tables need
  block shapes (probe-verified: bold/string paragraph text, striped compact
  tables w/ is_header+align cells, divider, details-variants; `header` and
  `plain`-text unsupported). Probe endpoint `/api/tg-probe` self-deletes.
- Shop authorize still dead ("service does not exist" = review pending, also on
  seller-side OAuth URL). Testing-Tool path region-blocked. No repo documents
  the first authorize anywhere (consortium tokens were pasted out-of-band).
- Webhook 401 = secret_token typo vs CRON_SECRET (always re-copy, never retype);
  drop_pending_updates clears retry storms (5 queued = 5 duplicate syncs).
- Vercel CLI login expires mid-session (twice) — `npx vercel login`, redeploy.

**Open threads (next session).**

1. Telegram-vs-dashboard divergence: 4 structural causes mapped (OFF inclusion,
   unmapped handling opposite, grain scope, pull-time drift) — awaiting owner's
   number pair to name the culprit.
2. 🔥 floor not implemented: fire crowns max dGmv even when all ≤ 0 — needs
   dGmv > 0 gate.
3. Footnote date bug: "hu Oct 01" (sliced non-ISO string) — format properly.
4. OFF counts are shop-wide on both messages — split per-type.
5. Export-method demo (Thread 1) → relock ref rows.
6. Shop app approval watch → retry `shop_auth.py` when approved.
7. cron-job.org hourly ping still open; commit question open (all uncommitted).

**Mood at close.** Tired but green across the board — every deploy built first
try except tsc catches I fixed in minutes. Owner ended curious ("why fetch
only 14→15?", "why fire with no gmv?") — the sparring contract is working;
keep earning it with numbers, not adjectives.

## Checkpoint 10 — 04 Oct 2026 night (closeout: Total msg, buttons, delivery, probes, docs)

> Next-you: this session ran LONG (dozens of deploys, all green first-try except
> tsc catches). Start at Resume below, then Checkpoint 9 for the morning's context.

**Vibe / frequency.** Same terse loop all day: I deploy → owner tests on prod URL /
Telegram topic → screenshot or one-liner → I fix. Owner decides fast ("ok go",
"ok c", "ok try") and corrects fast ("not 10.00 → 0.20", "use 🔛", "2 per line,
dashboard on top"). Sparring mode held both ways: I talked them OUT of jar-only
hourly (kept candy+jar hybrid) and OUT of repo media folder (Vercel auth blocks
Telegram fetches); they talked ME out of over-engineering (URL buttons beat
callback photos for now). Match it: short replies, numbers first, one action per
message. Owner reads screenshots, not paragraphs. Plan mode was entered/exited
~6 times — each time the rule held (talk-only inside, build on "go").

**Standing orders (still active).** (1) Sparring partner mode. (2) Shop 1 only.
(3) No suggestion engine — POC only. (4) `1-MASTER/BIGMASTERPLAN.md` read-first
rule dangles (file does not exist — do not chase it). (5) `tiktok-creative-analysis/data/accounts.json`
got modified this session by SOMETHING (not us — never stage/commit it).

**What shipped after Checkpoint 9.**

- Total message (3rd): Live + Product jar rows, combined verdict, dashboard button.
- Chart buttons: top-7 movers as URL links (QuickChart per-campaign trends) + 📊 Dashboard on top, pairs below. Multi-buttons-blocks VERIFIED working. Callback-photo handler built (tap → inline chart photo) then parked dormant per owner (URL links won).
- Covers saga: raw.githubusercontent URLs good (verified 200 image/png), but in-blocks photo NUKED Product's tables while Live survived → fail-open split (photo as separate send). Then covers removed entirely per owner (detached look disliked). Lesson bottled (see Bugs).
- Heading/marked/quote redesign + verdict line B (`🔥 … · ⚠️ N stagnant` / `▪ steady hour`). Marked-as-object unprobed — accepted the fallback risk openly.
- ROI on Steady (`H·D`) + Earlier-today tables.
- `011_campaign_delivery.sql` + enum→label map (API speaks `CAMPAIGN_STATUS_*`; `ENABLE`=Active, `TTS_TT_ASSET_UNAVAILABLE`=Asset unavailable, + identity/product/auth codes) + Telegram `· Active` suffix + dashboard delivery line + account-row rollups (ON if any child ON, delivery badges, Identity hidden on collapsed per owner).
- Rich probe rounds 1–2 (9/10 pass; anchor EMPTY-alone is correct behavior), stripe verdict (desktop-only), `tg-rich-messages.md` batches 1–4 complete (~100 classes), `telegram_message.md` Works/Partial/Not-working sections.

**Bugs found + fixed (do not regress).**
30. **Edit-tool clobbers (twice).** Two edits ate neighboring lines (telegram.ts `sendDirect` signature; gmv.ts `interface` line) — oldString boundaries. Caught both by re-reading the region before verifying. LESSON (extends bug 10/12): re-read the edited region after EVERY structural edit, no exceptions; tsc only catches syntax, not lost declarations (the gmv.ts one WAS caught by tsc — missing interface — good).
31. **Unbalanced paren in hand-rolled sums.** Jar-header rewrite left `(... : 0;` — tsc red, fixed in one pass. LESSON: keep aggregates dead simple (`list.reduce`), never clever ternaries in message builders.
32. **In-blocks photo fails the WHOLE message.** Product cover fetch hiccup → entire rich send rejected → legacy fallback (tables lost), while Live rendered. LESSON: never put fallible media inside an all-or-nothing blocks send — covers travel as separate `sendPhoto` (fail-open) or not at all.
33. **Guessed rich type strings.** `section_heading`/`block_quotation`/etc. rejected — spec discriminators are `heading`/`blockquote`/etc. + `size` required + list items need `blocks[]` + map needs `location{}` + photo needs media object. LESSON: read the anchor sections first (they're all in the API page), probe second. All corrected shapes verified in round 2.
34. **github blob URL ≠ image bytes.** `.../blob/...?raw=true` serves HTML → Telegram rejects. `raw.githubusercontent.com/...` serves bytes. LESSON: verify media URLs by content-type header (`image/*`), never by "it opens in my browser".
35. **Plan-mode file rule.** Plan files live ONLY in `C:\Users\darkv\.opencode\plan` (outside repo, uncommitted by design) — `rich-probe-round2.md` stays there.

**Mood at close.** Owner ended on UI polish + "complex?" gut-check, then closeout ritual. Energy good — everything they asked to see today rendered. Next session opens with the dashboard redesign (owner deferred; Tailwind-vs-inline decision pending — I recommended polish-inline first).

**Resume.** (1) Dashboard redesign (deferred to next session). (2) 🔥 floor gate (dGmv>0). (3) OFF per-type split. (4) Export-method demo → relock ref rows (143,941 still PROVISIONAL). (5) Shop approval watch → retry `shop_auth.py`. (6) cron-job.org ping. (7) Commit/push ritual (this closeout included — ask).

## Checkpoint 9 — 04 Oct 2026 (M9b: divergence closed, jar+ROI+budget live)

- Divergence #1 CLOSED with 04-Oct same-minute proof (Live+Product excels + both dashboard shots + Telegram). LIVE: Excel 164.19/1,734.82/16 vs dash ~166.45 (+2.26 cost, GMV+ord exact). Product: Excel 122.71/1,088.91/10 vs dash ~119.81 (−2.90). Net −0.64 (~0.2%). Culprit = grain scope; OFF/unmapped ~0; RM2-3 = pull-time drift. Standing rule updated: BOTH cost+GMV revise intraday (old "cost stable" rule from 01 Oct flipped by today's data).
- `/fetch` split shipped: `/fetch` = day-so-far (`daily.ts` + `getShopReport`, ALL campaigns, ties dashboard) + `/fetch_hourly` = hour slice (existing path). Owner chose swap (old muscle-memory now returns day; footer points to `_hourly`).
- Hourly matured same day: candy `prev → cur (+diff ▲)` rows → jar cumulative rows (`10.00 → 10.20`) per owner ("how much spent now"); short names bracket+tail-4 + 🔛 (🔥/⚠️ override); 6-col table (Cost/GMV/ROI H·D/Ord/Bud); Hour + Day-so-far header lines (hybrid, keeps velocity + scale).
- Budget%: `010_campaign_budget.sql` (owner ran at least once) + list-sync fallbacks (all null — sample_keys PROVES list has no budget) + lazy `gmv_max/info` fill for movers ≤15 (fail-open, cached). Verified live: `2% 7k`, `1% 10k`, `21% 200`, `9% 1.5k`.
- Probe verdicts: bold `<b>` renders literally in rich cells (accepted≠rendered) → native whole-cell bold + plain names; stripes desktop-only (all 4 variants flat on mobile) → kept `striped+compact`. `?keep=1` mode added to tg-probe for eyeball batches.
- Footnote healed itself: `status as of Sun Oct 04 2026` (old "hu Oct 01" slice bug gone via synced_at path).
- Vibe: owner drives hard on formatting ("bold all new value", "use 🔛") — implement literally, probe when spec is ambiguous, show screenshots. Mobile-first eyeballs (wallpaper bleed hides stripes). Sparring held: talked them out of jar-only (kept candy+jar hybrid) and repo media folder (Vercel auth blocks Telegram fetches — file_id path instead).
- Resume: media/markdown probe batch (photo file_id + map + html shorthand) IF owner still wants; then 🔥 floor gate; OFF per-type split; export demo; shop approval watch; cron ping; commit question (all still uncommitted — ~10 deploys today, zero commits).

## Checkpoint 8 — 03 Oct 2026 (M9 hourly POC built, needs first sync)

- Grain check passed live: `stat_time_hour` + campaign_id returns hour slots (1-day span max) — no snapshot-diff fallback needed. Sparring gaps resolved per owner: rewrite-on-revise, Telegram every hour, LIVE dual view, %-guard RM50/RM200.
- Built + deployed green: `009_hourly.sql`, `hourly.ts` (closed-window drops newest 2 slots), `/api/cron/hourly-sync` + `/api/hourly`, dashboard `Hourly` metric, `telegram.ts` (skips cleanly without env). Telegram tokens empty locally (len 0) — owner provisions via BotFather.
- Resume: owner runs 009 dev→prod → triggers first hourly-sync → sets Telegram env + cron-job.org ping → eyeball Hourly view vs Ads Manager.
- First sync timed out past Hobby 60s (predicted): ~2,000 sequential upserts. Fixed with batched multi-row upserts (500/chunk), redeployed green. Partial rows persisted (no wrapping transaction) — reruns continue.
- First live run exposed 2 more bugs (prod read-only inspection): (a) TikTok returns full-day grid incl. future zero slots — "drop newest 2" diffed zeros; fixed with activity-edge detection (closed = strictly before edge-1). Slots are MYT (00–15 live at 15:49 MYT). (b) Mixed-type rows overwrote each other on the PK (same lesson as #16) — fixed with Neon map filter. Telegram now active-campaigns only. Deployed green; rewrite-on-revise self-heals the corrupted labels.
- Split + styled per owner: 2 Telegram messages (LIVE/Product, HTML parse_mode, arrows, all-active, 3900-char guard) + Chart.js graphs on Hourly view (per-type cost/gmv trend lines + latest-slot top-12 bars). Deployed green.
- Delivery moved to group topic per owner (DM retired for hourly): sender splits glued `-100xxx_30` form or reads TELEGRAM_THREAD_ID, passes message_thread_id on both pipes. Owner sets TELEGRAM_CHAT_ID (+ optional THREAD_ID) on Vercel; bot already a group member.
- Rich tables live (probe-verified shapes: bold/string paragraph text, striped compact tables with is_header/align cells; `header` block unsupported, probe self-deletes): hourly messages now title + totals + real table (movers, 40 cap) + steady footer via sendRichMessage blocks, legacy HTML fallback. Deployed green.
- Emoji mapping locked (stored in hourly.ts EMOJI const): 📹 LIVE / 📦 Product titles, 🔥 top GMV jump per type, ⚠️ stagnant (cost>=RM5, zero GMV), neutral ▲▼▪ (cost-up is bad, GMV-up is good — color carries judgment). Human headers ("12:00 → 13:00 MYT · pulled HH:MM MYT"). Deployed green.
- Collapsible Details probe: all 3 shape variants accepted (summary object/string/title). Wired steady list + earlier-today per-type slot totals into Details blocks inside both hourly messages. Deployed green.
- Real-time pivot per owner (lag rule dropped): edge = last active slot, newest pair tagged (partial); whole-message ON-filter (explicit OFF excluded, unknown stays, "excludes N OFF · status as of <sync></sync>" footnote); dashboard keeps all. Deployed green.
- On-demand `/fetch` in group topic: `/api/tg-webhook` (secret-token guard, reuses syncHourly, replies in-topic). Owner did privacy-mode + setWebhook. Deployed green.
- Unpacked per owner (rich first): sender tries sendRichMessage {html} (Bot API 10.1+, 32k cap), auto-falls back to legacy sendMessage; sync result reports telegram_mode (rich-html+rich-html, legacy mix, or false). Content restructured: type totals + movers (|d|>=RM1 or orders moved) + steady count. Deployed green.

## Checkpoint 7 — 03 Oct 2026 (M8 token parked, numerator locked manually)

- Shop-API token route PARKED: draft Custom app `HIMWELLNESS GMV MAX INTERNAL` region-blocks authorize even on MY seller login (4h duration shown, Authorize dead). Tried: Testing Tool app_key select (finance scope refused → switched to order API → still refused → Manage scope order-read added → authorize page → region restriction). Portal path exhausted for now; scaffold stays (`007_shop_tokens` applied dev, verified `to_regclass`; `/api/shop-gmv` deployed green, graceful unconfigured).
- Numerator LOCKED via Seller Center manual parity (shop 1, 24–27 Sep): shop GMV 143,941 / 1,016 orders vs ads-attributed 169,805 → shop −15.2% (84.8%). TRUE ROAS 3.26x (actual 2.81x) vs ads 3.85/3.32. Attributed LIVE+Product EXCEEDS whole-shop sales = double-claim overlap; guardrail ROAS read ~18% high. 3.26 is generous ceiling (shop GMV incl. organic).
- Vibe: owner drove portal end-to-end with screenshots (Seller → Partner → Testing Tool → authorize). Terse loop held. Lead with tie-then-delta worked ("ok").
- Resume: 007 on prod branch → strategy guardrail rebase to true ROAS (tiktok-strategy owner) → P1 dry-run decider.

## Checkpoint 6 — 01 Oct 2026 (M7 extras live, owner-verified)

- TTAM view + PROD badge + Fetched stamp → sessions drill (`/api/sessions`, 454 rooms on the RM82 spender, no error) → account rule relaxed (first-`[]`-anywhere; resync 202, `unbracketed: 0`) → ON/OFF pills (`006_status.sql` on prod+dev, field = `operation_status`, spender = ON) → Total split LIVE/Product sections. All deployed to `marketer-hw.vercel.app`, build green each time (one failed build: `await` inside setState updater — never again; one merge bug: Total-merge dropped `status`).
- Vibe: owner tests on prod URL (local env too sparse — `.env.local` lacks tokens), pastes screenshots + terse confirms. Keep online-first: deploy → one portal/browser action → paste back.
- Bugs 19–20: (19) `deploy_online.py` subprocess misses `npx.cmd` on Windows without shell → `npx.cmd` + `shell=(os.name=="nt")`, `py_compile` OK. (20) frontend merge maps must carry every new field (`status` lost in Total merge while raw API was correct — check merge accumulators on any new field).
- Resume: 24–27 Sep parity vs temp-marketplace (eyeball diff open) → full 4-shop cron (Hobby 60s risk) → rooms/creatives drill deeper → Shop-order GMV numerator (needs shop tokens). Uncommitted M7 code pending commit decision.

## Discoveries 01 Oct (do not relitigate)

- **Total = LIVE + PRODUCT, both systems.** Owner spreadsheet: product 10,521.20+6,256.59+1,363.12+936.49 = 19,077.40; live rows = 150,727.72; sum = 169,805.12. Per-account rows match ours row-for-row. Construction is identical (parallel fetch + sum).
- **GMV restates, cost doesn't.** Same campaign read 74,952.09 in one pull, 74,327.14 in a later pull (~0.8% intraday drift). Rule: never compare same-name numbers across different pull times — re-fetch same-time first.
- **Our split is lossless.** 8 live accounts sum to exactly the LIVE total (150,727.72), so a per-account gap vs their screen means restatement or row-vs-account grouping — never lost money.
- **Cross-shop scope (shop 1 clean).** `store_ids=[shop1]` excludes GMV from LIVE campaigns selling other shops' products. 24–27 Sep totals tie ⇒ ~zero leakage for shop 1. Matters only when expanding to shops 3/4.
- **40001 = wrong token, not no access.** `getAdsCredentials` returns ACCOUNT1's token for every advertiser (ignores `accessTokenEnv`); Vercel lacks ACCOUNT2/3 tokens (consortium owns those advertisers). Pending: per-shop-env fix + tokens (owner chasing Analyst access, else URL+code paste, else manual rows).

## Checkpoint 5 — 29 Sep 2026 (ONLINE Vercel + Neon live, M0–M7)

- Biggest milestone since P0: `gmvmax-auto/online/` (Next.js, Vercel project `marketer`,
  Root Directory `gmvmax-auto/online`, alias `marketer-hw.vercel.app`) + Neon `005_online.sql`
  applied on dev. Owner drove every portal step (Vercel link/env, Neon SQL Editor,
  redeploys); loop stayed terse: paste output -> fix -> redeploy -> verify.
- Proven live: shop 1 campaign sync = 202 campaigns / 29 first-bracket groups / 66
  unbracketed; report 24–27 Sep LIVE gmv 169.8k / cost 12.6k / roi 13.48 (net 10.11),
  1012 orders; ROAS split live 10,131.24 + product 2,468.21 + manual 31,527.35
  (18 campaigns) = 44,126.80, roas 3.85 / actual 3.32; cron single-shop wrote
  `gmv.daily_shop_metrics` 9-27 + guard-healed 9-28. Dashboard `/` mirrors the
  temp-marketplace screenshot (Shop/Metric/Date/Fetch + Metric-Value + expandable
  Account -> Campaigns). `plan.md` §7–§12 carry spec + todos (M0–M6 ticked, M7 code
  landed, browser parity check open).
- Secrets: `CRON_SECRET` + protection-bypass pasted in chat TWICE by owner (terminal
  instead of chat next time); rotated + redeployed same session. Vercel env now:
  `NEON_URL_PROD`, `TIKTOK_APP_ID/SECRET`, `TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN`,
  `CRON_SECRET` (Production). `git status` shows code/docs only (`.vercel/`, `.env*`
  ignored); everything still UNCOMMITTED — commit question open.
- Deferred mismatches (owner: fix later): (1) `Other` bucket dominates — this account's
  `[]` holds product labels (`[HIMC 3 + FREE GIFT]`, `[Kombo]`) or sits mid-name
  (`ot1 [Dr Samhan Official1]`), not shop accounts; §9 "bracket-at-start" rule may
  need relaxing to first-`[]`-anywhere. (2) Product spent RM2,468 with ~zero attributed
  GMV in-window — real underperformance or lag, nightly re-sync will tell.
  (3) Bracketed-account parity vs temp-marketplace eyeballed same, full diff open.
- Resume: commit? (`online/`, `005`, `plan.md` — no push until asked) -> full 4-shop
  cron (Hobby 60s risk, `?shopNumber=` escape hatch kept) -> rooms/creatives drill ->
  Shop-order GMV numerator for true ROAS (needs shop token store).

## Checkpoint 4 — 21 Sep 2026 (LIVE GMV wired, PRODUCT/LIVE split)

- Owner gave LIVE ID 1867832585793585 (VOL2): `ot1 [Dr Samhan Official1]`, budget RM10k, roas 20, 7d net ROI 14.3 / 300 orders. Session list parses (`session_list` key) but empty = no max-delivery sessions.
- Secrets split `TIKTOK_GMV_CAMPAIGNS` PRODUCT/LIVE groups; `live_view.py` prints LIVE first, accepts legacy flat map. Dashboard shows 5 campaigns.
- Resume: 48x30m scheduled snapshots accumulate (task live) -> P0 exit; then P1 dry-run decider.

## Checkpoint 3 — 21 Sep 2026 (live per-campaign view, Product GMV done)

- `live_view.py` + dashboard Live section + `/api/live` (UNLAGGED badge). Seeds (bulk-export IDs) beat discovery: list APIs return zero GMV campaigns (verified both classic + smart_plus).
- Account fix: was reading empty HIM COFFEE1; money is on GMV MAX VOL2 (20 Sep RM1,611/RM16.6k/108 ord). Prod advertiser switched locally, all 3 accounts mapped.
- Product GMV 7d net ROI: HIMCOFFEE 6.14, HAPPY HOUR 7.84, kombo 3.96, cocomax 3.83. Verified py/JS + 8099 smoke, secrets ignored.
- Resume: LIVE GMV Max campaign data (no LIVE seed yet — explore session/list + LIVE campaign discovery).

## Checkpoint 2 — 21 Sep 2026 (FIRST LIVE prod data, read-only)

- Prod OAuth done via new `prod_auth.py` (authorize URL -> 8082 /callback -> local exchange; token lengths-only). Keys renamed to portal labels `TIKTOK_APP_ID/SECRET`.
- Live spec found by probing: `store_ids` required + dimensions `[advertiser_id, stat_time_day]` + metrics `[cost, orders, gross_revenue, roi]`. First tick wrote `prod live 2026-09-21` (zeros - account quiet, path proven). Dashboard smoke PROD, 6 snapshots.
- Store ID lives in gitignored `.local_secrets.json` (+ EXAMPLE placeholder). `git status` shows code/docs only.
- Resume: ROI-lock (net vs gross) -> 48x30m snapshots -> P0 exit. Then campaign info/session list endpoints.

## Checkpoint 1 — 21 Sep 2026 (parked, file-first holds)

- Business app APPROVED; sandbox ad account + token created, saved locally (lengths-only OK).
- Live test proved TikTok **sandbox has no GMV Max endpoints** (both GMV paths plain 404 on `sandbox-ads`; same path on prod = JSON 40105, path exists). Collector keeps file-first stub — correct, not a bug.
- Shipped: `collector.py` sandbox GET attempt (stdlib, `ALLOW_WRITES=0`, stub fallback) + `.local_secrets.EXAMPLE.json` sandbox keys. Verified `py_compile` + stub tick + 8099 smoke. `git status` clean of secrets (only EXAMPLE/collector/CHANGELOG modified).
- Resume: prod read-only auth (advertiser OAuth + shop auth) → live `GET gmv_max/report/get` → 48×30m snapshots → P0 exit. Then ROI-lock.

## What next-you should do first (19 Sep baseline, superseded by checkpoint above)

1. WAIT (non-issue, 20 Sep): Business API approval still pending → hold P0 on
   file-first. Check approval status only when owner reports. If approved: create Sandbox Ad
   Account (name `gmvmax-sandbox`, MY/MYR/Asia_Kuala_Lumpur), record sandbox vs prod
   keys/redirects per `APP_CHECKLIST.md`, note read-only vs write scope.
2. Then wire P0 GETs in `collector.py` (sandbox base URL): `gmv_max/campaign/get`,
   `campaign/gmv_max/info`, `gmv_max/report/get`, session list. Keep `ALLOW_WRITES=0`,
   closed-window T-2h, quiet-hours skip, file-first dual-write.
3. Drive 48 consecutive 30m snapshots → dashboard freshness stamp → P0 exit.
   Then P1: dry-run decider (log only) + Telegram DM + lag measurement + ROI-lock.
4. P1 hardening: per-schema roles, heartbeat + silent->40m alert, `cryptography` Fernet
   cutover file→DB, monthly-spend reconciliation note (returns/cancels drift).

## Landmines / never-do

- Never print/paste secret VALUES (lengths + key-names only). Never commit
  `.local_secrets.json`, `cache/`, `tokens/`, `csvs/`, `__pycache__/`.
- Never edit applied migrations (001–004 frozen); new fix = 005+.
- Never `POST gmv_max/update` in P0 (collector asserts `ALLOW_WRITES==0`).
- Never act on newest report slot (lag 15m–2h) or undecided net-vs-gross ROI.
- Never bind `0.0.0.0`, never add npm/build, never touch `tester.py` / `docs/*` /
  `tiktok*.txt` / Pages source from this folder.
- Never create a second Business app to "speed up" approval (resets queue).
