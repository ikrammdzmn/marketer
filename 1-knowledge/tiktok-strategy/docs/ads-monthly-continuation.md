# ADS Monthly — continuation pointer (cross-PC)

> Monthly ops state lives in Notion. This file is the repo pointer so any PC / chat can resume without re-pulling.
> Guardrails stay frozen in `../AGENTS.md` + `broad-strategy.md` (archive). This file = volatile monthly state only.

## Notion
- Workspace: `EMD's Notion` / user `EM DVZ`
- Parent: `MARKETER (WORK)` `41933d518ddd80988348d4a59bb24355`
- DB `ADS MONTHLY`: https://app.notion.com/p/41933d518ddd8152a4caca3883174d27
- Data source: `collection://41933d51-8ddd-81c8-82fd-000b22cae356`
- Ops page (hourly SCALE/SLOW/DEAD): https://app.notion.com/p/41933d518ddd8189842ef4bb463874fb?pvs=204
- Views: `SEP 2026 — 3 Types`, `OCT 2026 — 3 Types`, `NOV 2026 — 3 Types`, `Board — Status`
- Schema: `Name | Month [2026-09/10/11/12] | Type [STRATEGY BETUL/CHALLENGE/NEXT SURPASS] | Area [PRODUCT/LIVE/TTAM/Creative/Hourly] | Evidence | Campaign ID | Action | Status [Keep/Watch/Kill/Todo/Done] | Canva link`

## Canva sources
- Sept Q3: https://canva.link/vcpaidfp5agqqd2 → design `DAHX3v-txpo` (29 pages), slides 21-27 seeded (9 rows)
- Oct: https://canva.link/0miaca5r6l1bzsf → design `DAHa9p9aEuE` (13 pages), slides 10-13 seeded + updated to Target 1,057,560 / 105,756 / ROAS10

## TikTok (verified 15 Nov 2026)
- Grant: `auth_advertiser_get` OK, 5 advertisers
- Focus adv `7505228077656621057` (GMV MAX VOL2), store `Dr Samhan MYLCQHLWW9 7495609155379170274`, BC `7420347515893071888`
- Report window: `2026-10-16 to 2026-11-15`, store_ids single
- Guardrails: ROI ≥7.0, CPA ≤RM21.18 (ROAS10 needs CPA ≤14.83 at AOV 148.29)

## 2026-11-17 — Tarix launch plan recorded (UNPROVED TikTok-manager suggestion)

7 `NEXT SURPASS` rows in Notion `ADS MONTHLY` (Month 2026-11), all tagged unapproved:
1. Awareness reach beg kuning soft launch (VV+reach, capture audience) — ONGOING / Watch
2. Video seeding launching (capture audience) — Todo
3. Video winning by GMV Max / organic (VV+reach) — Todo
4. Upscale Live GMV Max Dr Samhan event day RM5k start — Todo
5. CI live RTL broad RM2k + retargeting from awareness/seeding — Todo
6. CI live VTL CTL videos broad + retargeting — Todo
7. Creative boost SKU Tarix (top GMV / CTR+impression + Seller Center organic) — Todo

## 2026-11-17 — current TTAM technique table added

Observed feeder technique (GMV MAX VOL2, 30d to 15 Nov 2026):

| Layer | What runs | Objective | Setup |
|---|---|---|---|
| TOFU cold | L0 REACH BATCH 1-27 (RM20, BROAD), Reach/VV Affiliate Awareness, Reach fake | REACH / VV | Smart+, FROM_NOW |
| TOFU→MOFU | L1 VV TOFU, L2 VV MOFU | VV | Smart+, BROAD |
| MOFU intent | L3 VV HIGH INTENT, L5/L6 BC WINNING ADS (CA + BROAD) | VV / BC | Smart+, RM20-500 |
| MOFU affiliate | AFFILIATE\|MOFU G1-G5 + EVENT (RM20-40), AFFILIATE-BC, Brand | VV / BC | 7-8 adgroups DELIVERY_OK |
| Bridge live | CI LIVE BASE / BOOSTER (1-2 jam AM/PM) | ENGAGEMENT | Live-triggered |
| Event burst | seeding event reach+vv pairs, then off | REACH + VV | Short-burst |

No `PRODUCT_SALES` in TTAM — sales in GMV Max only.

## Last state (15 Nov)
- Nov: BETUL 4 (MAIN1 8.20, cocomax 7.15, HAPPY 16.84, LIVE winners, TTAM feeder) / CHALLENGE 4 (Kombo 2.93, VINCA 2.20, VV mismatch, no dayparting) / NEXT 2 — 11 rows + Oct ref
- Oct: 7+1 rows, updated to new slides (Kombo cut, catalogue 3-box, LIVE event-only + reset+1d, TTAM 7d RM1.4k seeding)
- Sep: 9 rows from Q3 slides 21-27

## Open threads
- Pull TTAM `report/integrated/get` (CPC/CTR) + GMV Max 2s/6s/CTR/CVR for creative score
- Auto-sync `1-1-sales/tiktok-shop-hourly` → Notion Hourly table (now manual)
- Verify Brand RM1000/d + fix VV `NOT_DELIVERED` + pause CI BOOSTER 49x `TIME_DONE`
- Punished adv `7391329013215821840` 2x `ADVERTISER_ACCOUNT_PUNISH` — keep sales on VOL2
