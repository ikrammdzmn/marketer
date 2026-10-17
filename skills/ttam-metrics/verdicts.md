# Verdicts — numbers behind All Metrics cols E/F/G (Kill/Scale/Watch)

Source of truth for numbers: `Guardrails` tab + Metric Scorer preset
`3-ttam/campaign-performance-analysis/presets/vol2-focused-v3.json`.
Sheet cells hold rule text; this file holds the constants.

## Owner guardrails (never re-derive)

- Target ROI >= 7.0 (AOV RM148.29 -> Max CPA = 148.29 / 7 = RM21.18)
- Affiliate BOOST: ROI >= 7.0 AND Orders >= 3 AND CPA <= RM22
- Affiliate REMOVE: Orders == 0 AND Spend >= RM50 (7.0 ROI impossible)
- Affiliate REMOVE: Orders > 0 AND (CPA > RM28 OR ROI < 5.0)
- Creative bars: 2s view rate >= 25% (hook) | 6s >= 12% (pacing) |
  CTR >= 1.8% (CTA) | CVR >= 3.5% (price/variant)
- Scale cap +20-25% per 24h; never scale 16:00-17:30 or after 23:00
- CPL: Max CPL = 21.18 x lead close rate (TBD until owner sets rate)

## Verdict templates by category

- ROAS family: Kill < 5.0 (+Spend>=50) | Scale >= 7.0 (+Orders>=3) |
  Watch 5.0-6.9 or Spend<50
- CPA-capped costs (conversion/purchase/result/qualified): Kill > RM28
  or (0 sales + Spend>=50) | Scale <= RM21.18 + ROI>=7 |
  Watch RM21.18-28 or Spend<50
- Lead/registration/messaging costs: Kill 0 sales + Spend>=50 |
  Scale under CPL cap + closes | Watch Spend<50 (cap TBD)
- CPM/CPC: Kill top-quartile + 0 sales + Spend>=50 |
  Scale at/under band + ROI>=7 | Watch high but Spend<50/converting
  (bands TBD — see Quartile calibration below)
- CTR: Kill < 1.8% + Spend>=50 + 0 sales | Scale >= 1.8% + ROI>=7
- CVR: Kill < 3.5% + Spend>=50 + 0 sales | Scale >= 3.5% + ROI>=7
- Other rates: Kill bottom-quartile + Spend>=50 + 0 sales (bands TBD)
- Order-bearing counts: Kill 0 events + Spend>=50 |
  Scale >= 3 orders + ROI>=7 + CPA<=22 (BOOST mirror) | Watch 1-2/Spend<50
- Delivery counts (Spend/Impressions/Reach/Frequency/Clicks/Views):
  Kill Spend>=50 + 0 sales (pair w/ CPA) | Scale delivers + ROI>=7
- Values/revenue: Kill RM0 + Spend>=50 | Scale lifts ROI>=7
- OMTM: pre-filled from v3 k/s bands (ACS inverted)

## OMTM v3 bands (vol2-focused-v3, calibrated)

ERRI k0.003/s0.015(%) | HPS k20/s35(%) | ACS k0.025/s0.008(RM, inv) |
CES k15/s60 | EDS k5/s20(%) | VVES k100/s400 | RVS k500/s1500 |
HRQ k25/s40(%) | RES k400/s1200 | LQS k1/s3 | BCE k20/s60.
Inputs: spend/imp/reach/sfv(6s focused paid views)/awt/prof/likes/
sh+com+fol/live/live10. K = Kill side, S = Scale side.

## Quartile calibration (open until export arrives)

Targets: CPM, CPC (destination), CTR (destination), CVR, Result rate,
Cost per result + rate-type metrics. Method in READ ME tab.
After calibration: replace "top/bottom-quartile" verdict text with hard
numbers + record export dates in READ ME.
