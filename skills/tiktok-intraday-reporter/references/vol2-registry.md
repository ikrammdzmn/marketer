# VOL2 registry — locked 17 Nov 2026 (canonical example, not global)

Advertiser: GMV MAX VOL2 `7505228077656621057`
Store: Dr Samhan `7495609155379170274` / code `MYLCQHLWW9` / BC `7420347515893071888` (KOPI DR SAMHAN 1) / MY / ACTIVE / `is_gmv_max_available=true`

## GMV Max (verified via `gmv_max_campaign_get` + `gmv_max_report_get`)
- PRODUCT: 15 total, 5 ENABLED 16 Nov: `[TARIX] 20261108151423` 1881270931829810, `[HAPPY HOUR] 20260919-0944` 1876722216770962, `[Kombo] 20260623152650` 1868770682058769, `[him cocomax] 20260602153651` 1866868749870162, `[HIMCOFFEE MAIN 1] new 2026- 03-07 1246` 1858977225474178
- LIVE: 100 sampled page 1, 17 ENABLED 16 Nov (top): `ot1 [Dr.Samhan] @dr.samhan _20260726211456` 1862612348807426, `ot1 [Dr Samhan Official 8] @drsamhanofficial8 20260808115511` 1872923783900322, `ot1 [HIMCoffee] @himcoffeedrsamhan 20260703184618` 1868025191505938, plus 14 more in Checkpoint 10
- Budget: `target_roi_budget` (fallback `max_delivery_budget`). Hourly: `["campaign_id","stat_time_hour"]` 1-day max. Full-day 16 Nov anchor: GMV 2401.86 / 166 / 24325.49 ROI 10.13 (LIVE 1889.93, PRODUCT 511.93)
- PRODUCT names carry no @handle — display appends `| Shop: Dr Samhan (MYLCQHLWW9)`. LIVE names carry `[Name] @username date` verbatim.

## TTAM (verified via `campaign_get` + `adgroup_get` + `report_integrated_get BASIC`)
- Taxonomy v1: see `ttam-taxonomy.md` (AFFILIATE, FUNNEL L0-L6, CI/LIVE BOOSTER, SEEDING, TOFU/BROAD). Do not duplicate here.
- Budget: campaign `budget=0 INFINITE` — use sum ENABLED adgroups, paginate all pages (`page_size` default 10 lies). Hourly: `report_type:"BASIC"` + `AUCTION_CAMPAIGN/ADGROUP` + hour dim, 1-day max.
- Full-day 16 Nov anchor: TTAM 3556.58 / 164 conv (all 164 from LIVE BOOSTER RT, CPA 5.66). Adgroup >=70% everywhere in CI cluster — only converter = 🚀 draft.
- Tables: `|` → `/` for display only.

## Other advertisers (not locked)
`7336853270385770498` empty, `7696424643196026886` empty on `campaign_get` 16 Nov — per-advertiser creds or no campaigns. Do not assume VOL2 rules global. `40001` = wrong token, not no access.
