# TTAM taxonomy (v1 locked 16 Nov 2026 from GMV MAX VOL2 full pull)

Source: `campaign_get` 100 rows, adv 7505228077656621057. Buckets by name prefix + objective:

1. `AFFILIATE` — `AFFILIATE | MOFU | CONSIDERATION` (VV), `AFFILIATE - Brand consideration` (BC), `VV/Reach - Affiliate Awareness`. High spend today.
2. `FUNNEL L0-L6` — `L0 REACH TOFU`, `L1 VV TOFU`, `L2 VV MOFU CONSIDERATION`, `L3 VV MOFU HIGH INTENT`, `L5/L6 BC MOFU WINNING ADS BROAD/CA`. Mostly DISABLE except L0.
3. `CI / LIVE BOOSTER` — `CI - LIVE BOOSTER`, `CI - LIVE - BASE`, `CI - FOLLOW`, `24/07/26 | CI | DR.SAMHAN | LIVE BOOSTER | RT`, `02/06/26 | CI | LIVE TRAFFIC`. objective ENGAGEMENT.
4. `SEEDING EVENT` — `seeding event D/M reach/vv`. All DISABLE. Ignore in daily.
5. `TOFU/BROAD` — `Reach (TOFU) - New Audience`, `TOFU CI - TPV`, `MOFU CI - TPV`, `VV (MOFU) Retargetting`. Mostly DISABLE.
6. `PRODUCT_SALES oddballs` — `16/04/26 | SALES | PUSH VISITOR`, `Invisible Funnel TOFU/MOFU`. DISABLE.

GMV Max naming separate (via `gmv_max_campaign_get`):
- PRODUCT: `[bracket product]` e.g. `[TARIX]`, `[HIMCoffee]`, `[Kombo]`, `[him cocomax]`. 15 total.
- LIVE: `ot1 [Handle] @handle date` affiliates + `[Store] @store date` official. ENABLE heavy.

Rule: TTAM bucket = prefix before `|` else full name. Report order: AFFILIATE, FUNNEL, CI/LIVE, rest.
