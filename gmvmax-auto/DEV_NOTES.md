# DEV_NOTES.md — gmvmax-auto session handoff (19 Sep 2026, P0 day)

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
- Real-time pivot per owner (lag rule dropped): edge = last active slot, newest pair tagged (partial); whole-message ON-filter (explicit OFF excluded, unknown stays, "excludes N OFF · status as of <sync>" footnote); dashboard keeps all. Deployed green.
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
