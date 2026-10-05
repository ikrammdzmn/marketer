# Sales Performance Analysis System (mirror tiktok-creative-analysis)

Status: DRAFT (for discussion, no code yet)
Date: 2026-10-05 | Period in scope: 2026-10-01 to 2026-10-05 | Shop: Him.DrSamhan

## 1. Goal
One static local tool to answer: where loss is, what to cut, what to boost — combining TTAM (manual, 0 sales) + GMV Max (where sales are) + Ad Accounts Overview (tax/blended ROAS). Same UX as `tiktok-creative-analysis`: upload/drag-drop xlsx, KPIs, sortable tables, CSV export, localhost only.

## 2. Inputs (verified 05 Oct)
- `TTAM`: `GMV MAX VOL2-Campaign Report-2026-10-01 to 2026-10-05.xlsx` (Sheet1, 54 rows incl. Total row, 21 cols). Real spend = `Total of 52 results` row RM20,667.83 (matches dashboard RM20,576.11). Cols: Campaign name, Primary/Secondary status, Budget, Spend, CPC(destination), CPM, Impressions, Clicks(destination), CTR(destination), Conversions, Cost per conversion, CVR. Zero sales conversions — judge on CPM/Impr/CTR/CPC only.
- `GMV Max` (screenshots, no xlsx yet): Total GMV 61,515.45 / Cost 6,618.21 / 529 orders / ROI 9.29x. LIVE 44,493.14 / ~4,001 / 366 orders / 11.10x. PRODUCT 17,022.31 / 2,617.17 / 163 / 6.50x. Account splits captured (Live: Official1 20.13x, Dr.Samhan 12.93x, HIMCoffeedrsamhan 5.49x, mallegacy00 9.39x, Official3 2.04x, aff4 2.98x, VINCA 7.14x, aff5 2.49x; Product: MAIN1 6.56x, cocomax 4.18x, Kombo 7.26x, HAPPY HOUR 79.29x).
- `Ad Overview` (screenshots): Gross RM27,183.25 / Net RM31,532.57 (SST+WHT RM4,349.32) / Blended 2.42x / Actual 2.08x / Visitors 8,171. Channel: LIVE 14.7% (3,990.54), PRODUCT 9.6% (2,616.60), TTAM 75.7% (20,576.11). Guardrail: ROI >= 7.0 (tiktok-strategy).
- Unusable: `ExportAds_V2_7_GMV MAX VOL2_20261005100951.xlsx` — config-only (163 cols, no Spend/GMV), exclude from loader.

## 3. Scope (v1)
- [ ] Build in `sales-performance-analysis/` mirroring creative-analysis: `index.html` + `app.js` (vanilla IIFE) + `style.css` + `server.py` (127.0.0.1 only) + `start-server.bat` + `data/*.json` + `source-file/` + `plan.md` + `CHANGELOG.md` + `feature.md` + `DEV_NOTES.md`. No npm/build.
- [ ] Loader `rowsOfWorkbook` normalises 2 dialects to one row shape (never branch downstream): (a) TTAM campaign-report dialect, (b) GMV Max report dialect (once user supplies xlsx; until then manual screenshot seed). Total-row (`Total of N results`) excluded from rows, kept as cross-check total.
- [ ] TTAM view: KPIs (spend, impr, avg CPM, clicks, avg CPC, CTR) + table (Campaign, Status, Spend, Impr, CPM, Clicks, CTR, CPC, Conv=0) sorted by Spend/CPM + verdicts: Cut if CPM>4 or CPC>3 or Spend>800 with CTR~0; Keep if CPM<1.2 or CTR>2%.
- [ ] GMV Max view: KPIs (GMV, cost, orders, ROI) + tables Live/Product by Account (Cost, GMV, Orders, ROI) + verdicts vs 7.0: Boost >=7, Watch 6-7, Cut <6 (exact names preserved, e.g. `Dr Samhan Official3`, `[him cocomax]`).
- [ ] Consolidated header: gross/net/tax inputs (manual for v1, auto later) + blended vs GMV-Max-only ROAS to show TTAM drag (75.7% spend, 0 sales).
- [ ] Export filtered to CSV (full campaign/account names, no truncation) + period label `2026-10-01 to 2026-10-05`.
- [ ] Verify: `node --check app.js` + `python -m py_compile server.py` + HTTP smoke on fresh port (200s); `app.js?v=N` bump per JS change; LF via `.gitattributes`.

## 4. Out of scope (v1)
Multi-period compare/trend, tax auto-calc, Him Clinic split, pixel fix for `CI - LIVE - BASE` 0-conv tracking. Parked until user supplies next-period files.

## 5. Open questions for user
1. GMV Max xlsx available, or keep screenshot-seed for v1?
2. TTAM verdict thresholds ok (CPM>4 cut, CPM<1.2 keep), or tune?
