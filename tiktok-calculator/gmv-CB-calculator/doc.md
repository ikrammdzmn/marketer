# TikTok GMV Max Creative Boost Capacity & Risk Calculator

## 1. Overview & Objective

This calculator determines **how many ad creatives can be safely boosted or introduced** into an active **TikTok Shop GMV Max (Product Campaign)** without:

1. Breaching a user-defined **Minimum Floor ROI / ROAS** (even on a slump day).
2. Dropping below historical baseline revenue (**3-day average / 3-day lowest slump sales**).

It utilizes a **Stress-Tested Buffer Model** (Interpretation 2) combined with a **Top-Line Sales Goal** (Interpretation 3) tailored to TikTok GMV Max's aggregated reporting.

---

## 2. Core Operational Philosophy & Rules

- **Worst-Case Assumption (Option A):** All newly boosted creatives are assumed to make **RM 0.00** during initial testing. Any testing cost is absorbed solely by the profit margin of the baseline ads.
- **Stress Test (Slump Protection):** Calculations scale against the **lowest single day** in the 3-day rolling window (`MIN`) rather than just the average, preventing sudden performance drops (e.g., Day 3 dips) from pushing ROI below the threshold.
- **Aggregated GMV Max Attribution:** Because GMV Max pools revenue at the campaign/product level and cannot isolate individual creative sales on the fly, the calculator generates **Total Dashboard Campaign Sales Goals** for quick end-of-day checks.
- **Staggered Launch Rule:** To prevent algorithmic shock and budget cannibalization, never launch all allowed creatives at once. A maximum of **3 to 4 creatives per 24–48 hours** is recommended.

---

## 3. Spreadsheet Architecture

### Legend

- **Blue Cells:** Headers & Metric Descriptions.
- **Yellow Cells:** User Inputs (Editable).
- **Green Cells:** Automated Outputs & Calculations.

---

### Section 1: 3-Day Performance Log (Rows 1 to 5)

| Cell      | Column Header / Row     |    Type     | Formula / Example Value                                                                | Description                            |
| :-------- | :---------------------- | :---------: | :------------------------------------------------------------------------------------- | :------------------------------------- |
| **A1:F1** | Table Headers           |    Text     | `DAY`, `REVENUE`, `COST (BASE)`, `COST (WITH BOOST)`, `ROI (BASE)`, `ROI (WITH BOOST)` | Daily performance log headers          |
| **A2:F2** | Day 1                   | Data / Calc | `Day 1` \| `1581.47` \| `163.69` \| `213.20` \| `=B2/C2` \| `=B2/D2`                   | Historical log (Day -3)                |
| **A3:F3** | Day 2                   | Data / Calc | `Day 2` \| `1886.03` \| `177.12` \| `225.96` \| `=B3/C3` \| `=B3/D3`                   | Historical log (Day -2)                |
| **A4:F4** | Day 3                   | Data / Calc | `Day 3` \| `1520.10` \| `164.16` \| `262.70` \| `=B4/C4` \| `=B4/D4`                   | Historical log (Yesterday)             |
| **A5**    | **AVERAGE**             |    Text     | `AVERAGE`                                                                              | Row label                              |
| **B5**    | Average Revenue         |    Calc     | `=AVERAGE(B2:B4)`                                                                      | 3-Day Average Gross Revenue            |
| **C5**    | Average Base Cost       |    Calc     | `=AVERAGE(C2:C4)`                                                                      | Baseline ad spend without extra boosts |
| **D5**    | Average Cost with Boost |    Calc     | `=AVERAGE(D2:D4)`                                                                      | Total ad spend including active boosts |
| **E5**    | Average Base ROI        |    Calc     | `=B5/C5`                                                                               | Baseline ROAS                          |
| **F5**    | Average Boosted ROI     |    Calc     | `=B5/D5`                                                                               | Current active ROAS                    |

---

### Section 2: Controls & User Inputs (Rows 7 to 8)

| Cell        | Parameter               |        Type        | Default / Example | Note / Description (Column C)                                  |
| :---------- | :---------------------- | :----------------: | :---------------: | :------------------------------------------------------------- |
| **A7 / B7** | **Target Minimum ROI**  | **Input (Yellow)** |      `6.00`       | Lowest acceptable ROAS limit (e.g. break-even/profit floor).   |
| **A8 / B8** | **Budget per Creative** | **Input (Yellow)** |     `RM 5.00`     | Daily test budget allocated for each new video (RM 5 – RM 10). |

---

### Section 3: Decision & Risk Engine (Rows 10 to 19)

| Cell   | Metric Label (Col A)                            | Formula (Col B)                        | Description / Tooltip (Col C)                                                 |
| :----- | :---------------------------------------------- | :------------------------------------- | :---------------------------------------------------------------------------- |
| **10** | **Lowest Sales in 3-Day Window**                | `=MIN(B2:B4)`                          | Worst sales day in the last 3 days (used for the stress test).                |
| **11** | **Safe Creatives to Boost (Stress-Tested)**     | `=MAX(0, INT(((B10 / B7) - D5) / B8))` | Max new ads to test without dropping below target ROI, even on a slump day.   |
| **12** | **Worst-Case Projected Sales**                  | `=B10`                                 | Minimum sales expected if today slumps and all new ads make RM 0.             |
| **13** | **Worst-Case Total Ad Spend**                   | `=D5 + (B11 * B8)`                     | Total daily spend if all new test ads spend their full budget.                |
| **14** | **Worst-Case Net Retained Cash**                | `=B12 - B13`                           | Guaranteed cash in pocket after ad costs on a worst-case day (Sales − Spend). |
| **15** | **Stress-Tested Floor ROI**                     | `=IF(B13=0, 0, B12 / B13)`             | Guaranteed lowest possible ROI if all new ads fail.                           |
| **16** | **Target Sales Needed to Maintain Current ROI** | `=(B11 * B8) * F5`                     | Sales new ads must make to prevent your current ROI from dropping.            |
| **17** | **Total Target Daily Campaign Sales**           | `=B13 * F5`                            | Total sales needed on GMV Max dashboard to maintain current average ROI.      |
| **18** | _(Blank separator)_                             | —                                      | —                                                                             |
| **19** | **Automated Action & Safety Guidance**          | _(See dynamic formula below)_          | Automated daily instructions for the media buyer.                             |

---

### Dynamic Guidance Formula for Cell `B19`

Paste this formula into cell **`B19`** and ensure **Text Wrapping** is turned ON:

```excel
=IF(F5 < B7, "🚨 STOP: 3-day average ROI is already below target.", IF(B11 = 0, "⏸️ AT CAPACITY: Do not add creatives today.", "• ✅ Safe to boost " & B11 & " creative(s) (Launch 3-4 today)." & CHAR(10) & "• New Boosters Target: +RM " & TEXT(B16, "#,##0.00") & " sales." & CHAR(10) & "• Total Dashboard Sales Goal: RM " & TEXT(B17, "#,##0.00") & " (to keep " & TEXT(F5, "0.00") & "x ROI)." & CHAR(10) & "• Hard Sales Floor: RM " & TEXT(B13 * B7, "#,##0.00") & " (never drop below " & TEXT(B7, "0.00") & "x ROI)."))
```

_(Note: In the screenshot, Row 17 is Total Target Daily Campaign Sales, so `B19` references `B17` for the dashboard goal)._

---

## 4. Current State Snapshot (Based on Active Data)

- **Current Baseline Inputs:**
  - 3-Day Average Revenue: `RM 1,662.53`
  - 3-Day Lowest Slump Revenue: `RM 1,520.10`
  - Current Average Cost (with Boost): `RM 233.95`
  - Current Campaign ROI: `7.11x`
  - User Target Minimum ROI: `6.00x`
  - Budget per Creative: `RM 5.00`
- **Calculator Outputs:**
  - **Safe Creatives to Boost:** **`3 creatives`**
  - **Worst-Case Total Spend:** `RM 248.95`
  - **Stress-Tested Floor ROI:** `6.11x` (Safely above the 6.00x floor)
  - **New Boosters Target Sales:** `+RM 106.59`
  - **Total Campaign Dashboard Target:** `RM 1,769.13`
  - **Hard Sales Floor:** `RM 1,493.72`

---

## 5. Instructions for Future AI Agents

If continuing work from this document:

1. **Respect Formula Coordinates:** Refer directly to the cell coordinates and formulas listed in Section 3.
2. **Preserve Conservative Logic:** New creative tests must always assume zero immediate revenue ($0) for capacity sizing unless explicitly directed otherwise.
3. **Keep GMV Max Realities in Mind:** Always remember that GMV Max dynamically allocates budget and reports aggregated numbers. Avoid recommending manual bid isolation or creative-level silo budgeting.

```

```
