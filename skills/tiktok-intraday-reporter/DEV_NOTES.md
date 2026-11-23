# DEV_NOTES — tiktok-intraday-reporter (mandatory, append-only)

## Checkpoint 36 — 19 Nov daypart A/B test parked (review ~26/11)
- BASE split test live: `.2` AM/PM vs `.3` OFFICE/MALAM (RM50+50, both ENABLED 19/11). Winner = less stranded budget, smoother handoffs. REMIND owner to review ~26/11.

## Checkpoint 35 — 18 Nov session wrap (room analysis era)
- Headspace: owner in live ops seat, driving per-room reads on real sessions. Vibe stayed: prove with pulls, plain words on verdicts, never silent-truncate.
- Shipped (uncommitted): ci-live2-playbook + room-hour/adgroup-hour recipe + same-window rule + Checkpoint 34. Live cases: `…2082` 17/11, `…2721` 18/11 ongoing (API 14.23/3/159 vs dashboard SKU 3/219 — dashboard wins, API lags).
- Lesson: dashboard counts SKU orders, API counts orders — state which when they disagree.
- Open: commit playbook batch when owner says so; push `bad8230` still pending; 4 playbook opens (daypart, RT rename, BOOSTER auto-trigger, hands-free repull).

## Checkpoint 34 — 18 Nov CI LIVE 2 playbook + room analysis filed
- New `references/ci-live2-playbook.md`: label `7708974613593964564` = 3 campaigns (BASE planned / BOOSTER <10k-hr1 rescue / RT dr.samhan-only), verified membership 18/11. No BASE adgroup for dr.samhan (RT replaces it — full 805 scan).
- Room recipe locked: room-hour + adgroup-hour joins, same-window attribution with pre-window context line, `room_ids` server-filter bug, room-grain 40002 fields, newest-hour-partial tag, manual-cue repull.
- Proved live: `…2082` 17/11 (AM pre-heat + PM/BOOSTER cover, 29.28→636) and `…2721` 18/11 ongoing (14:00-open, RT 14:00-forward 229.70 vs room 53→106→159; dashboard SKU 3/219 wins over API lag).
- Open: BASE daypart standard, RT rename (match on ID till then), BOOSTER auto-trigger (re-baseline source+threshold), hands-free repull script.
- Uncommitted: SKILL.md pointer + playbook + this checkpoint (Checkpoint 33 commit `bad8230` still unpushed).

## Checkpoint 33 — 18 Nov wrap (commit + shop truth online)
- Headspace: owner driving, tight verify loops; sparring held on budgets/labels/tables. Vibe: lock rules, prove with data, never silently truncate.
- Shipped: skill committed `bad8230` (9 files, unpushed); report template + top-10/remainder + ended-with-spend locked; mapping v1.2 CLEAN; vol2-registry; TTAM impressions + Post ID + campaign-column + -1 exclusion rules; direct Neon read-only verified (prod shop 16/11: 27236.2/189 vs ads 28187.82/192); creative top-30 by GMV + snowflake post dates.
- Lessons: (1) verify page totals before claiming counts; (2) sort server-side; (3) one short table per message; (4) ACTIVE roster vs bucket labels are different jobs — check both directions every pull.
- Open: TTAM adgroup 16-30 with ROI; ENABLED audit beyond first 100; other 4 advertisers on demand; v1.3 on next label change; push `bad8230` when owner says so.

## Checkpoint 32 — 18 Nov direct Neon read-only works + refetch locked
- Path: node + online/node_modules/pg, creds from .local_secrets.json (never in chat). Dev SELECT 1 green, prod `daily_shop_metrics` green.
- Latest shop day 16/11: shop 27236.2/189 vs ads 28187.82/192 (matches our pull exactly). Lag ~1d.
- Contract: you name date, I refetch shop vs ads on demand. Temp scripts in opencode temp dir.

## Checkpoint 31 — 18 Nov TTAM tables carry impressions
- Owner rule: every TTAM campaign/adgroup table shows `impressions` (verified green in BASIC report). Locked in SKILL.md.

## Checkpoint 30 — 18 Nov top-10 + remainder rule
- Owner rule: tables show TOP 10 by spend; remainder line "+N more, say next" when truncated. Locked in SKILL.md template.

## Checkpoint 29 — 18 Nov yesterday 17/11 full-day pull
- Freshness DRIFT: new ENABLED 1882087572083762 TARIK - REACH - TOFU not in ACTIVE (11 vs 12). Stale 0. Notify owner, snapshot v1.3 on fix.
- GMV 2628.24/192/28187.82 ROI 10.72. TTAM 3522.98/163 conv. Ended-with-spend: none.

## Checkpoint 28 — 17 Nov wrap (full-spender + creative deep-dive)
- Headspace: user driving pulls, strict table rendering + full-name rules; sparring on budget/pacing kept scope tight.
- Shipped (uncommitted): report template + ended-with-spend, Post ID + campaign-column + -1-exclusion rules, mapping v1.2 CLEAN, vol2-registry, full-spender 43-adgroup sweep, MAIN 1 creative top-30 + snowflake post dates.
- Lessons: (1) verify page_info.total before claiming counts (5 vs 33,512); (2) sort_field=GMV DESC server-side for top-N; (3) snowflake decode for post dates, dashboard posted_api wins ties; (4) seller organic = creative source of truth, ads grain = cost/ROI side.
- Open: TTAM 16-30 creative ROI table; paginate ENABLED beyond 100; map other 4 advertisers on demand.

## Checkpoint 27 — 17 Nov exclude -1 product card from creative reading
- Owner: `item_id="-1"` is product-card unattributed bucket — always filter out before creative ranking/tables. Overrides earlier keep-and-label.
- Clean top 30 pulled (page_size 31 sorted GMV DESC, drop -1, take 30). #30 = 7703126901409254657 rev 406.97 DELIVERING.

## Checkpoint 26 — 17 Nov creative tables carry Post ID
- Owner rule: every creative row shows verbatim 19-digit `item_id` + title + account. Locked in SKILL.md.

## Checkpoint 25 — 17 Nov adgroup tables carry campaign column
- Owner rule: every adgroup row shows its campaign (short names in tables). Locked in SKILL.md display rule.

## Checkpoint 24 — 17 Nov full-spender sweep RM0.01
- GMV 15/15 delivered (Live 10 + Product 5). TTAM campaigns 10/10. Adgroups 43/43 all ENABLED, ended 0.
- Full-spender rule: no top-N truncation on request; deliver in one-table-per-message batches.

## Checkpoint 23 — 17 Nov refresh pull (afternoon)
- Freshness 11/11 clean. GMV 1425.81/108/15245 ROI 10.69. TTAM 1467.14/110 conv.
- Ended-with-spend: none (adgroups verified all ENABLED). BROAD VR 173.93/250=69.6% near-threshold.

## Checkpoint 22 — 17 Nov 0000-1305 pull, labels clean
- Freshness 11/11 clean, missing 0. GMV 1346.21/103/14409 ROI 10.7. TTAM 1399.77/110 conv.
- Ended-with-spend today: none (GMV 14, adgroups 38, all ENABLED). Ad >=70%: PM 0000-0800 103.3%, AM 0000-0730 97%.

## Checkpoint 21 — 17 Nov ended-with-spend in every report
- Template order locked: freshness → Live → Product → TTAM camp → TTAM ad >=70% → ended table. Definition A. One table per message.

## Checkpoint 20 — 17 Nov ended-with-spend view works (definition A)
- Today 17 Nov: GMV 15 spenders, TTAM 10 campaigns + 42 adgroups — ALL ENABLED, ended lists empty.
- Proof on 16 Nov: 3 DISABLED adgroups spent anyway (CA CLICK 110.92, CA VR 84.02, creative CA CLICK 16.53 — all LIVE BOOSTER RT). Restate/lag, not live delivery.
- Method: day-grain report (STATUS_ALL for GMV) + status join as-of-now. Deleted = best-effort.

## Checkpoint 19 — 17 Nov TABLE BUG locked, do not repeat
- Symptom: 2 wide tables per message render as raw pipes, newlines stripped. Single short table renders fine.
- Rules: one table per message; short display names in tables; full names verbatim in code block/skill file; `|` → `/`, `_` stripped for display.

## Checkpoint 18 — 17 Nov 0000-1246 pull
- GMV 1253.28/94/12835.4 ROI 10.24. Top Official8 463.73/2000=23.2% ROI 13.92. None >=70%.
- TTAM 1313.96/106 conv. Adgroups >=70%: PM 0000-0800 103.3%, 0000-0730 96.7% (both CI-BASE, 0 conv, ENG/VV mix). Converter BROAD|VR 161.4/250=64.6% 106 conv CPA 1.52 OK.

## Checkpoint 17 — 17 Nov wrap (session arc: probes → tables → labels)
- Headspace: fast on-demand pulls, user driving windows; sparring kept scope to campaign-level + TTAM adgroups. Mood: ship templates, lock versions, notify on label drift.
- Shipped (uncommitted): SKILL.md v2, references/vol2-registry.md, ttam-taxonomy v1, ttam-mapping v1.0/v1.1/v1.2 (v1.2 CLEAN 11/11), windows/pacing/display-table rules, 16 Nov full-day anchors. No deploys (chat-only skill).
- Lessons: (1) never trust flat 70% without time context; (2) `adgroup_get` defaults page_size 10 — always paginate before budget sums; (3) `|` in TTAM names breaks markdown tables — display `/`, keep raw in probes; (4) report filter `campaign_label_ids` needs stringified array; (5) ACTIVE label vs bucket labels are different jobs — check both directions.
- Open: paginate ENABLED beyond first 100 for full audit; half-day/office presets use same template on demand; remap to v1.3 on next label change.

## Checkpoint 16 — 17 Nov mapping v1.2 CLEAN 11/11
- ACTIVE 11/11, missing 0, stale 0 (page 1). Snapshot v1.2. SKILL latest → v1.2.

## Checkpoint 15 — 17 Nov mapping v1.1, 1 label missing
- ACTIVE 7→10. 3 fixed. Still missing: 1879541507655026 VV - Affiliate Awareness. Stale 0. Snapshot v1.1. SKILL latest → v1.1.

## Checkpoint 14 — 17 Nov TTAM mapping v1.0-171126 1928 + LABEL ALERT
- Labels readable: `campaign_label_get` lists 6; members via `report_integrated_get` filter `campaign_label_ids` (stringified array).
- ALERT: ACTIVE label (7) missing 4 ENABLED: VV - Affiliate Awareness, Brand consideration, AFFILIATE / MOFU / CONSIDERATION, CI - LIVE - BASE — includes top spenders. Stale: 0 (page 1 only).
- Snapshot `references/ttam-mapping-v1.0-171126-1928.md`. Fallback LABEL-MISSING 🟡 locked.

## Checkpoint 13 — 17 Nov VOL2 locked
- New `references/vol2-registry.md`: store, 5 ENABLED product, 17 ENABLED live, budget sources, 16 Nov anchors. Single-advertiser only — others empty / unverified.
- SKILL.md v2. Next: map remaining advertisers only on demand.

## Checkpoint 12 — 17 Nov table rendering fixed
- Markdown tables break on raw `|` in TTAM names. Display rule: `|` → `/` for tables only.
- 16 Nov full-day confirmed rendering x3 (TTAM, Live, Product). Template locked.

## Checkpoint 11 — 16 Nov full-day 0000-2359
- GMV 2401.86/166/24325 ROI 10.13 (17 campaigns). LIVE 1889.93, PRODUCT 511.93.
- TTAM 3556.58/164 conv. Top CI-BASE 1040.79, Brand 1009.49, BOOSTER 928.36 (164 conv CPA 5.66).
- Adgroup >=70% everywhere in CI cluster (many 100%+). Only converter BROAD|VR 101.4% = 🚀 draft, rest 🟡.

## Checkpoint 10 — 16 Nov Live GMV Max 0000-1637
- 17 ENABLED live: cost 1345.76 / 80 / 12768 ROI 9.49. None >=70%. Top 353.91/2000=17.7% ROI 15.22.
- 6 zero-delivery. 3x ANALYZE (ROI<7 + spend>=50): HIMCoffee 236.74 ROI 6.55, HIMCoffee3 104 ROI 4.24, HIMCoffee2 57.41 ROI 1.93.

## Checkpoint 9 — 16 Nov 1637 active Product GMV Max
- 5 ENABLED product: cost 313.71 / 24 / 2443 ROI 7.79. None >=70%. cocomax ROI 1.5 analyze, Kombo 5.17 watch.
- Filter `gmv_max_promotion_types:["PRODUCT"]` works, 360 hour-rows. Full names + Shop suffix per display rule.

## Checkpoint 8 — 16 Nov 0000-1630 pull
- GMV: 1635.93 / 98 / 14227 ROI 8.7. No campaign >=70%. Closest 52% (1869303538266546 ROI 4.24, 1866854345414898 ROI 1.93).
- TTAM: 2446.09 / 160 conv. Adgroup >=70%: BROAD|VR 252/250=100.8% 160 CPA 1.57 UPSCALE draft; 8x CI-LIVE 80-100%; G1 117.4% CHECK.
- Partial hour 16:00 included (1630 pull). Day progress 68.75% — 70% now = on-pace.

## Checkpoint 7 — 16 Nov 2026 TTAM adgroup default locked
- Owner approved adgroup breakdown default for TTAM. SKILL.md v1 locked.
- Rule: ENABLED adgroups only, paginate all pages, flag >=70% per-adgroup. Campaign rollup alone hides G1-type cases.
- Next: apply template to half-day/office windows on demand.

## Checkpoint 6 — 16 Nov 2026 0000-1500 analysis
- GMV 00-15: cost ~1403, 83 ord, rev ~13020, ROI 9.28. Top LIVE 1872923783900322 309.06/2000=15.5% ROI 14.86; 1868025191505938 214.15/660=32.4% ROI 6.09. Top PRODUCT 1858977225474178 93.41/1500=6.2% ROI 6.03; 1876722216770962 78.55/2000=3.9% ROI 13.49. None >=70%.
- TTAM 00-15: spend 2047.3 conv 138. LIVE BOOSTER RT 633.2/1300=48.7% 138 conv CPA 4.59 good. Brand consideration 561/1000=56.1% 0 conv (BC obj, not sales). CI-BASE 556/1480=37.6%. AFFILIATE 119.6/230=52%. Highest 62% Reach-Affiliate small budget. None >=70%.
- Day progress 15/24=62.5% — 37-62% = on track, not fast. 70% rule not triggered.
- Next: lock half-day/office template with this shape.

## Checkpoint 5 — 16 Nov 2026 morning template v1 (budget pagination bug found)
- Morning 0000-0900 top GMV: 1868025191505938 cost 87.51 ROI 10.07 13.3% OK; 1872923783900322 cost 74.82 ROI 23.4 3.7% OK. None >=70%.
- TTAM top: Brand consideration 231.15/500=46.2% OK; CI-LIVE-BASE 63.73/120=53.1% OK; AFFILIATE 37.76/40=94.4% CHECK — BUT budget partial (page_size default 10). True budget 230 → 16.4% OK. Fix: paginate `adgroup_get` all pages before sum.
- Template rule: GMV flag UPSCALE? only if pct>=70 + ROI>=7 else ANALYZE; TTAM flag CHECK if pct>=70 (conv lag). Draft-only.
- Next: fix budget sum pagination, add half-day + office presets, lock template in SKILL.md.

## Checkpoint 4 — 16 Nov 2026 budget probe green
- TTAM budget = sum ENABLED adgroups. 1871674073350642 = 230 (40+50+40+20x5). Mode DYNAMIC_DAILY.
- GMV Max budget = `target_roi_budget` (e.g. 1862612348807426 = 2000.00, cost 266.11 = 13.3%). `max_delivery_budget 0` when unused.
- 70% now computable. Next: build morning/half-day template with budget column.

## Checkpoint 3 — 16 Nov 2026 morning sample + taxonomy v1
- Morning 0000-0900 2026-11-16 GMV MAX VOL2: GMV cost 318.81 orders 24 rev 3897 ROI 12.22 (435 hour-rows); TTAM spend 415.93 conv 0 (90 hour-rows).
- Blocker for 70%: TTAM `campaign_get` shows `budget:0 BUDGET_MODE_INFINITE` — budget lives at adgroup level. GMV Max `campaign_get` has no budget field. Need `adgroup_get` (TTAM) + GMV Max budget source probe before 70% is real.
- Taxonomy v1 locked in references/ttam-taxonomy.md. Other 4 advertisers: 7336853270385770498 empty, 7696424643196026886 empty, rest partial — likely per-advertiser creds / no campaigns. Note 40001 = wrong token, not no access.
- Next: probe adgroup budgets + GMV Max budget field, then build morning/half-day template.

## Checkpoint 2 — 16 Nov 2026 probes green
- Product hourly GREEN: `gmv_max_report_get` ["campaign_id","stat_time_hour"] 2026-11-16, 4944 rows. e.g. 1862612348807426 10:00 cost 57.59 rev 1183 ROI 20.54.
- Live hourly GREEN: same grain + `filtering {gmv_max_promotion_types:["LIVE"]}`, 4584 rows. Campaign-level Live readable intraday. Room minute still out (lags ~2d).
- TTAM hourly GREEN (new): `report_integrated_get` needs `report_type:"BASIC"` + `data_level:"AUCTION_CAMPAIGN"` + ["campaign_id","stat_time_hour"], 1-day max. e.g. 1871674073350642 AFFILIATE|MOFU 12:00 spend 13.85. Corrects earlier assumption.
- Taxonomy sample (GMV MAX VOL2, 20 rows): `AFFILIATE | MOFU | CONSIDERATION`, `24/07/26 | CI | DR.SAMHAN | LIVE BOOSTER | RT`, `L2/L3/L5/L6 | date | MOFU | VV/BC | WINNING ADS | BROAD/CA`, `VV/Reach - Affiliate Awareness`, `Reach - fake product awareness`. Need full pull to lock classifier.
- Next: full campaign-name pull all 5 advertisers, fill taxonomy, test morning/half-day pulls + daily budget for 70% calc.

## Checkpoint 1 — 16 Nov 2026 scaffold
- Agreed: on-demand chat, campaign-level only, draft-only recs.
- Windows locked as param presets (see references/windows.md). Post-office = 1700-2359 + hourly table, 7 slices kept as aliases.
- Pacing: 70% flat + time-now context. ELI5 accepted.
- Probes pending: TTAM hourly, Live hourly, campaign-name taxonomy pull.
- Plan: `C:\Users\darkv\.opencode\plan\tiktok-intraday-reporter.md`
- Next: run probes, fill taxonomy, test pull on GMV MAX VOL2 hourly + morning.
