# Strategy Log — 2026-11-19 — HIMCOFFEE MAIN 1 ROAS + Creative Boost

Campaign: `[HIMCOFFEE MAIN 1] 1858977225474178` (advertiser GMV MAX VOL2 7505228077656621057)
Product: `1729556489100298210` (HIMCoffee)
Post: `7701710332477132040` (#himcoffee / dailycartmy)

## Baseline (21 Oct – 17 Nov 2026, TikTok MCP `gmv_max_report_get`)
- Campaign total: Cost RM15,278.09 / Revenue RM123,525.04 / 1,413 orders / ROI 8.09
- Target: Budget RM1500/day, ROAS bid 9.5 (`campaign_gmv_max_info_get`)
- Daily spend RM213–984, daily ROI 6.9–9.5 (only 31 Oct hit 9.55)
- Sheet `PER CREATIVE ANALYSIS`: Post cost RM1.98 / 130 impr / 11 clicks / 2 orders / ROI 123.73 / `Explored / Performing`
- Live API creative grain: Post ID not in top-500 spenders for same window (tail creative, UI vs API `-1` bucket difference noted)

## Verdict
- `VO_MIN_ROAS` throttling: target 9.5 > achievable 8.09 → system under-delivers to protect ROI.
- Guardrail: ROI ≥ 7.0 (`1-knowledge/tiktok-strategy/`). 8.0 stays compliant.
- Proposal (PENDING approval, NOT applied): lower ROAS 9.5 → 8.0 to unlock full RM1500 delivery, relearn, then step up 8.5 → 9.0.

## Action applied
- Creative Boost session `1882256721833105` (`CREATIVE_NO_BID`)
  - item_id 7701710332477132040, budget RM10/day
  - `2026-11-19 12:03 MYT → 2026-11-22 12:03 MYT` (API UTC 04:03:48 → 04:03:58)
  - Verified via `campaign_gmv_max_session_list_get` + `session_get`
  - 9x older RM6 boosts from 2026-11-01 still listed — review if still active.

## Tracking
- Review date: 2026-11-23 (after boost ends 22 Nov)
- APPROVED 19 Nov: agent auto-pulls on 23 Nov, owner approves decisions only. ROAS 9.5→8.0 still PENDING (no TikTok mutation done).
- Watch: campaign daily spend vs RM1500, campaign ROI vs 8.0/9.5, boosted post impr / 2s / 6s / CTR / orders
- Judge boost on delivery signals, not ROI (n≈RM30).
- If boosted post delivers + ROI ≥7.0 → keep in rotation; if 0–2 orders → kill boost, keep `Explored/Performing` organic only.

## Evidence
- Sheet: `ADS ID` / `PER CREATIVE ANALYSIS` gid 1633498843
- MCP: `auth_advertiser_get`, `gmv_max_campaign_get`, `campaign_gmv_max_info_get`, `gmv_max_report_get` (campaign×day, product, item_id, item_id×day), `campaign_gmv_max_session_list_get/get`
- Notion: MARKETER (WORK) + Tasks + Events (calendar) entries created same day.
