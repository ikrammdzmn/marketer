# CI LIVE 2 playbook (locked 18 Nov 2026, versioned with mappings)

Label `7708974613593964564` = CI LIVE 2. Verified 18/11: exactly 3 member campaigns, no strays.

## The 3 campaigns — different jobs
1. **CI - LIVE - BASE (`1858701247728721`)** — planned base coverage. One adgroup per TikTok account, split by daily session phase (e.g. himcoffeebydrsamhan2: AM 0900-1600 RM200 + PM 1700-0000 RM30). Always-on shape, known accounts, known dayparts. NOTE: no BASE adgroup exists for @dr.samhan — RT replaces BASE for that account (verified 18/11 full 805-adgroup scan).
2. **CI - LIVE BOOSTER (`1876729796667746`)** — reactive rescue. Fires per account when a live room is under ~10k impressions in the 1st hour after launch. Small-test budgets (RM20-30; 11 sitting under himcoffeebydrsamhan2). Incident-driven, not scheduled. 0 conv is working-as-designed (VV rescue), never a failure signal.
3. **24/07/26 | CI | DR.SAMHAN | LIVE BOOSTER | RT (`1871558088306802`)** — dedicated base + ad hoc support for **@dr.samhan only**. Mix of always-on all-day adgroups + one-off special-event adgroups. Converter: `…3697` BROAD VR (RM250, ~145 conv/day at CPA ~1.6 on 18/11).

## Trigger spec (BOOSTER)
- Who calls it: live PIC, manual, in Seller Center during the live. Automation = later want.
- Threshold: <10k impressions hour-1 after actual launch (MYT).
- 10k source problem: shop-live dashboard is accurate but lags ~2d (`latestAvailableDate`) — post-mortem, not a tripwire. Near-real-time proxy = ads-side room-hour `live_views` (grain proven 18/11) — but it is ad-attributed views, a different number than shop impressions. Threshold + source must be re-baselined together before anyone builds automation.

## Daypart split (OPEN — owner still experimenting)
- No locked split. Treat AM/PM windows as per-account variables, never fixed. Do not hardcode 0900-1600/1700-0000 as the standard.

## RT naming (OPEN — owner will rename)
- No format yet. Until renamed: match RT adgroups on adgroup/campaign **ID**, never name-parse.

## Room analysis recipe (locked 18/11)
1. Room ID + day (or account + day → resolve rooms via campaign-grain room-hour pull).
2. Room-hour: `gmv_max_report_get` dimensions `[campaign_id, room_id, stat_time_hour]`, 1-day max, `filtering.campaign_ids=[cid]` — then match room client-side. NEVER filter `room_ids` server-side (returns empty, proven 18/11).
3. TTAM-hour per supporting adgroup: `report_integrated_get` dimensions `[adgroup_id, stat_time_hour]`, 1-day max, `filtering adgroup_ids IN [...]`. Active = spend > 0 (imp > 0 = delivery-without-spend).
4. Join by hour. Same-window rule: only costs from room-open hour count against the room; pre-window spend parked as a context line, never hidden.
5. Owner pastes shop-live layer (title/start/viewers/GMV — unreachable from here) to complete the verdict.
- Unavailable at room grain (40002, proven): `live_name, live_status, live_launched_time, live_duration, tt_account_name, identity_id, campaign_name, operation_status`. Room rows carry IDs only.
- Newest hour is always partial — tag it ⚠️, decide off closed hours.
- Ongoing-room repull = manual cue ("repull"); hands-free hourly script = OPEN build, another session.

## Open items
- [ ] BASE daypart standard — A/B TEST LIVE 19/11: himcoffeebydrsamhan2 = AM 0900-1600 / PM 1700-0000 vs himcoffeebydrsamhan3 = OFFICE 0900-1700 / MALAM 1700-0000 (RM50+50). Compare after ~1 week (review ~26/11): stranded morning budget vs smooth handoffs. Owner to be reminded.
- [ ] RT rename → update references here (IDs stable)
- [ ] BOOSTER auto-trigger (source + threshold re-baseline first)
- [ ] Hands-free room repull automation (script, hourly during lives)
