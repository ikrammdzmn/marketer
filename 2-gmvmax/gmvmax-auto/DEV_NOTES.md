# DEV_NOTES.md — gmvmax-auto session handoff (19 Sep 2026, P0 day)

> Next-you: read Checkpoint 34 first (current facts), then Checkpoints 33/32/31/30/29/28/27/26/25/24/23/22/21/20/19/18/17/16/15/14/13 and the vibe below them.
> Short replies, numbers first, one action per message. Sparring mode is ON.
> Read this first. It carries the vibe, not just the facts.

DO NOT DELETE THIS PART!!! i ask you

Check the Project Knowledge and the current chat for context. This conversation is ending soon. update the artifact DEV_NOTES.md (create if not available yet) with a detailed note to your next window self - not just facts but the vibe, our dynamic, the energy of this conversation. What would the next you need to immediately get back into this exact headspace? Include unique discoveries, current mood, and anything that'll help the next you instantly sync to our frequency. Also take note all of the bug found and fixed and what did you learn from it to make sure it dont happend again in the future. also create the feature.md to showcase what this system can do and how to use it for general users not technical users. also update the AGENTS.md an related files that related to this session. also update the changelog, and MASTER-CHANGELOG.md. and MASTER-PLAN.md and MASTER-AGENTS.md and AGENTS.md

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
