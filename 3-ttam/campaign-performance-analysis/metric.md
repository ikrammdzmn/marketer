# Custom Metrics v3 — TikTok Ads Manager (Focused View + LIVE)

Date: 2026-10-05 | Source: `source-file/GMV MAX VOL2-Campaign Report-2026-10-01 to 2026-10-05 (1) TEST COLUMN.xlsx` (Sheet1, 67 rows, MYR) | Scored: `source-file/GMV MAX VOL2-SCORED-v3.xlsx` (67x45, value+flag+OVERALL)
Related: Sales Performance Analysis System `plan.md` (at `1-1-sales\sales-performance-analysis\`)

## 1. Column mapping (use consistently)
- Hook/ACS/CES/VVES/RVS/HRQ/RES/BC = `6-second focused views` (Focused View objective)
- `6-second video views` = sanity check only, not in formulas
- LIVE family = `LIVE views` + `10-second LIVE views`
- All spend = RM (MYR). Rates use decimals in, x100 for % out.

## 2. 6s focused vs 6s video (2026-10-05)
- **6s focused views** = watch >=6s (or full if <6s) OR like/follow/share/click/hashtag/music/anchor within first 6s. Only on Focused View objective. = paid views + paid interactions.
- **6s video views** = played >=6s (or full if <6s). No interaction shortcut.
- Rule: use `6-second focused views (paid views)` for hook formulas to avoid double-counting interactions already in EDS/CES.

## 3. Final spec v3 (paste-ready TSV)
No | Metric | explaination | format | formula (RM, decimals in)
1 | Enter Room Rate Impression (ERRI) | Live / Imp ( <0.003%K >0.015%S ) | (in %) | Live views / Impressions x 100
2 | HOOK POWER SCORE (HPS) | 6sfv / imp ( <20%K >35%S ) | (in %) | 6sfv / impressions x 100
3 | ATTENTION COST SCORE (ACS) | spend / 6sfv ( >RM0.025K <RM0.008S ) | (in RM) | spend_RM / 6sfv
4 | CONSIDERATION EFFICIENCY SCORE (CES) | (HR x PVR x EDS) / AC ( <15K >60S ) | (numeric) | 10000 x (6sfv/imp) x (profile/imp) x ((shares+comments+follows)/likes) / (spend_RM/6sfv)
5 | ENGAGEMENT DEPTH SCORE (EDS) | (Sh+Com+Fol)/Likes ( <5%K >20%S ) | (in %) | (paid shares + paid comments + paid follows) / paid likes x 100
6 | VIDEO VIEW EFFICIENCY SCORE (VVES) | (HR x AWT)/AC ( <100K >400S ) | (numeric) | ((6sfv/impressions) x avg play time) / (spend_RM/6sfv)
7 | RETENTION VALUE SCORE (RVS) | AWT / AC ( <500K >1500S ) | (numeric) | Avg play time ÷ (spend_RM ÷ 6sfv)
8 | HOOK REACH QUALITY (HRQ) | 6sv / reach ( <25%K >40%S ) | (in %) | 6sfv / reach x 100
9 | REACH EFFICIENCY SCORE (RES) | (HRQ x10)/CPR ( <400K >1200S ) | (numeric) | ((6sfv/reach) x 10) / (spend_RM/reach)
10 | LIVE QUALITY SCORE (LQS) | 10s / spend x100 ( <1K >3S ) | (numeric) | 10s live views / spend_RM x 100
11 | BC EFFICIENCY (BCE) | (HR x PVR)/AC ( <20K >60S ) | (numeric) | 1000 x ((6sfv/impressions) x (profile/impressions)) / (spend_RM/6sfv)

Typo fixed: #6 EFFECIENCY → EFFICIENCY.

## 4. What was fixed from v1/v2
- #3: $ → RM, removed x100 and % (currency, not rate).
- #4: `6svv` count → `6svv/imp` rate; `(comments x shares x follows)` → `(shares+comments+follows)` (multiply zeroed score); added 10000 scaler (raw 0.0007 never hit 5-30).
- #5: denominator `paid follows` → `paid likes`, +x100.
- #9: `x100` → `x10` (=10/ACS; old 100/ACS overshot 100-600 band 10x).
- #11: `100` → `1000` scaler (100x gave 0.8-type scores); added band.
- #10: added band; spend → RM.
- Bands recalibrated to quartiles (v2 theory underestimated Focused View rates): HPS 25-45→20-35, HRQ 2-12→25-40, ACS 0.15/0.05→0.025/0.008, RVS reverted 100-300→500-1500, RES 100-600→400-1200, BC 2-8→20-60, LQS 100/400→1/3, CES 5-30→15-60, ERRI new 0.003/0.015.
- K = Kill, S = Scale (assumed, media-buying convention).

## 5. Validation on real export (66 ads, BATCH 295-308 sample)
Medians: HPS 30.6% | ACS RM0.01 | HRQ 38.4% | VVES 295 | RVS 937 | RES 926 | CES 39 | EDS 10.2% | BC 41 | LQS 0 | ERRI 0.005%.
- Keepers fit: EDS, VVES, RVS.
- LIVE failing: LQS med 0, ERRI med 0.005% (views 0-2 per ad, max LQS 4.5) — video→LIVE bridge near zero this period.
- Examples: B308 HPS 19.4%=KILL, CES 23.6=WATCH, VVES 122=WATCH; B301 HPS 36.7%=SCALE, CES 800=SCALE (EDS 24.8% + cheap ACS 0.0027), B302 EDS 0%=KILL (0 eng).

## 6. Next
Rebuild TikTok custom metrics from §3 only after user locks v3. Scored flags in `GMV MAX VOL2-SCORED-v3.xlsx` are validation, not Ads Manager import.
