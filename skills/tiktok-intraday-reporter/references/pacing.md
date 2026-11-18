# Pacing

`spent_pct = spend / daily_budget` at report time.

Budget sources (verified 16 Nov 2026):
- TTAM: campaign `budget=0 INFINITE` — sum ENABLED `adgroup_get` `budget` per campaign. e.g. 1871674073350642 = 230 (40+50+40+20x5). Mode `BUDGET_MODE_DYNAMIC_DAILY_BUDGET`.
- GMV Max: `gmv_max_report_get` `dimensions:["campaign_id"]` metrics `max_delivery_budget,target_roi_budget,roas_bid,bid_type`. e.g. 1862612348807426 `target_roi_budget 2000.00`, cost 266.11 = 13.3% — use `target_roi_budget` when `max_delivery_budget 0`.


- Rule: `spent_pct >=70% + ROI>=7.0 = consider upscale (draft)`, else analyze.
- Always show `time now` alongside. 70% at 0900 = too fast (RM7 of RM10 by breakfast). 70% at 1700 = on track.
- Guardrails: ROI>=7.0, CPA<=RM21.18. Count rule: `Spend>=RM50 + 0 sales` before kill talk.
- Intraday ROI revises (cost + GMV restate). Morning ROI>=7 often fades. Recommend, don't mutate.
