# AGENTS.md — Himwellness TikTok Shop Growth OS

> **Context Document for AI Agents, Developers, and Media Buyers**  
> **Brand:** Himwellness Sdn Bhd (Malaysia)  
> **Application:** `himwellness-playbook.html` (Single-File Interactive Media Buying App)  
> **Target Revenue:** RM 1,050,135 / month (~RM 35,004 GMV / day)  
> **Hero SKU:** HIMCoffee (Vitality / Men's Energy | AOV: RM 148.29)  
> **Secondary SKUs:** HIMcoco max, HerCoffee  
> **Authority Anchor:** `Him.DrSamhan` (Dr. Samhan brand trust)

---

## 1. Executive Summary & Application Purpose

The **Himwellness Growth OS** (`himwellness-playbook.html`) is an offline-capable, interactive web application built specifically for the in-house TikTok Shop Media Buyer.

It translates a high-level monthly revenue target (**RM 1,050,135**) into daily operational workflows, algorithmic guardrails, real-time ad schedules, and creative briefing formulas. It bridges the gap between **TikTok Ads Manager (TTAM)**, **Product GMV Max**, and **Live GMV Max** under strict Malaysian e-commerce and tax constraints.

---

## 2. Business & Platform Constraints (Agent Guardrails)

Any AI agent or operator interacting with this account must strictly follow these rules:

1. **Target ROI Locked at $\ge$ 7.0:**
   - TikTok Shop platform fees, commissions, payment gateway fees, and vouchers total roughly **25%**.
   - **Rule:** Never suggest lowering Product GMV Max Target ROI below 7.0.
   - **Max CPA Anchor:** At AOV of RM 148.29, $\text{Max Allowable CPA} = \frac{\text{RM } 148.29}{7.0} = \mathbf{RM\ 21.18}$.
2. **GMV Max Campaign Structure (1 SKU = 1 Continuous Campaign):**
   - Product GMV Max is strictly limited to **1 continuous campaign per Product ID**. Duplicate listings/SKUs cannot be created because the listing already contains variants (1 Box, 2 Boxes, 3 Boxes + Shaker).
   - Live GMV Max is limited to **1 continuous campaign per account**.
   - Horizontal campaign scaling must happen inside **TTAM**, which allows unlimited campaigns.
3. **TTAM Has No Direct VSA Conversion Objective:**
   - In this setup, TTAM does not support direct TikTok Shop Video Shopping Ad (VSA) checkout conversion.
   - TTAM functions strictly as a **Traffic / Shop Profile Feeder Engine** to warm up custom audiences that GMV Max converts at $\ge$ 7.0 ROI.
4. **Malaysian Digital Tax Drag (~16% Effective):**
   - SST (8%) + Cross-Border Withholding Tax (WHT ~10%) require dashboard ROAS to maintain **$\ge$ 2.38x Gross** to secure a true **2.0x Net Cash-Out ROAS**.

---

## 3. Web Application Capabilities & Modules

The web app is structured into four primary modules accessible via tabs, backed by persistent browser `localStorage`:

### Module 1: Interactive 15-Strategy Playbook (`#view-strategies`)

- **Features:**
  - Displays all 15 proprietary media-buying strategies with deep explanations and bulleted operational workflows.
  - Real-time search filter by title, summary, or workflow keyword.
  - Dropdown filtering by Module (Funnel & Bidding, Creative & SLA, Live & Payday).
  - Interactive "Mark Done / Active" checklist with state saved in `localStorage` (`him_checks`).
- **Strategy Coverage:**
  1. _TTAM Feeder Funnel:_ Bypassing the RM 450 GMV Max spend choke at ROI 7.0.
  2. _3-Tier TTAM Segmentation:_ Dedicated ABO campaigns (LAL 1%, Shift-Workers, Wives).
  3. _Golden-Window Dayparting:_ Targeting 11–13h, 18–20h, and 21–23:30h.
  4. _Affiliate Pruning Scorecard:_ Strict CPA $\le$ RM 21.18 decision matrix.
  5. _Dead-Zone Defense:_ Suppressing delivery at 02:00–08:00 and freezing changes at 16:00–17:30.
  6. _"Rugi Beli Satu" Brief:_ Pushing the 3-Box Bundle (RM 199) to lift AOV to RM 180+.
  7. _Third-Party POV Matrix:_ Wife and blue-collar angles bypassing medical claims.
  8. _Creative Metric Scorecard:_ 2s View Rate $\ge$ 25%, 6s View Rate $\ge$ 12%, CTR $\ge$ 1.8%, CVR $\ge$ 3.5%.
  9. _Creative Injection Timing:_ Activating new ads at 10:30 AM or 17:30 PM (Tuesdays/Fridays).
  10. _Affiliate 48h Filter:_ Organic view screening ($>$ 1,000 views) and 365-day Spark codes.
  11. _Live GMV Max Surge:_ Surging ad spend by +20% at 20:30 PM for the 22:00 peak.
  12. _AI Stream Visual Overlays:_ OBS trust banners and permanent 3-Box pinning.
  13. _Audience Asset Stacking:_ Staged scaling from LAL 1% to LAL 1%–2% from 180D seeds.
  14. _In-Listing Variant Ordering:_ Setting Option 1 as `[Paling Laris] 3 Kotak Jimat`.
  15. _Payday Mega-Surge:_ Accumulation (1st–24th) vs Payday Rush (25th–2nd @ RM 60k/day).

---

### Module 2: Affiliate Video Diagnostic Calculator (`#view-calculator`)

- **Purpose:** Evaluates videos auto-ingested into Product GMV Max from the 25-affiliate roster.
- **Input Parameters:**
  - `Cost / Spend (RM)`
  - `SKU Orders`
  - `Gross Revenue (RM)`
  - `2-Second View Rate (%)`
- **Automated Decision Logic:**
  | Decision Badge | Condition | Algorithmic Rationale |
  | :--- | :--- | :--- |
  | **🚀 CLICK BOOST** | `ROI` $\ge$ 7.0 AND `Orders` $\ge$ 3 AND `CPA` $\le$ RM 22.00 | High-volume profitable winner. Prioritizes impression share. |
  | **❌ REMOVE / EXCLUDE** | `Orders` == 0 AND `Spend` $\ge$ RM 50.00 | Zero-conversion budget drain. At RM 50+ spend with 0 sales, 7.0 ROI is impossible. |
  | **❌ REMOVE / EXCLUDE** | `Orders` $>$ 0 AND (`CPA` $>$ RM 28.00 OR `ROI` $<$ 5.0) | Margin bleeder. Loses net cash after platform 25% take rate. |
  | **⏸️ LEAVE ALONE** | Everything else (Spend $<$ RM 50 or stable metrics) | In exploration phase. Allows system to gather sufficient conversions. |

---

### Module 3: Creative SLA & One-Click Script Generator (`#view-sla`)

- **Purpose:** Bridges media buying data with creative production. Provides copy-pasteable video briefs engineered for high click-through rates.
- **Included Script Templates:**
  1. **"Rugi Beli Satu" (Bundle 3 Boxes):** Loss-aversion hook comparing 1 box vs 3 boxes + shaker to lift basket size.
  2. **"Isteri Prihatin" (Wife POV):** Targets female shoppers buying vitality coffee for overworked husbands; bypasses TikTok medical/sexual wellness policy bans.
  3. **"Abang Lori & Shift-Worker":** Blue-collar framing; positions HIMCoffee as a healthy stamina replacement for canned energy drinks.
- **Functionality:** Built-in clipboard integration (`navigator.clipboard`) with instant visual feedback.

---

### Module 4: Malaysian Real-Time Dayparting Engine (`#view-dayparting`)

- **Purpose:** Real-time clock operating on **Malaysia Time (MYT / UTC+8)** that evaluates the exact current time against verified conversion data.
- **Live Status Indicator (Updates every 30 seconds):**
  - `02:00 – 05:00`: **[DEAD ZONE 1]** Deep Sleep. Suppress all ad spend.
  - `06:00 – 08:00`: **[DEAD ZONE 2]** Morning Routine. Keep TTAM OFF.
  - `11:00 – 13:00`: **[GOLDEN WINDOW 1]** Lunch Rush Active. High conversion.
  - `16:00 – 17:30`: **[AFTERNOON LULL]** Workday wrap-up. Freeze budget/bid modifications.
  - `18:00 – 20:00`: **[GOLDEN WINDOW 2]** Evening efficiency spike (ROAS up to 15x).
  - `21:00 – 23:30`: **[MEGA-PEAK 3]** Prime bedtime rush (Peaks at 22:00 at RM 6k–RM 8k). Live GMV Max surge active.

---

## 4. Operational Instructions for AI Agents Advising the Marketer

When an agent is asked to analyze data or give recommendations based on this app:

1. **When evaluating CPA:** Always compare against the benchmark of **RM 21.18**. If an ad group has a CPA of RM 30, state clearly that it is operating below the required 7.0 Target ROI.
2. **When asked about scaling budgets:** Never suggest scaling an existing GMV Max campaign by more than **20%–25% per 24 hours**. Never suggest scaling during the 16:00–17:30 dip or after 23:00.
3. **When analyzing Creative Fatigue:** Check the view rate funnel in this order:
   - 2s view rate $<$ 25% $\rightarrow$ Flag as **Hook Problem**.
   - 6s view rate $<$ 12% $\rightarrow$ Flag as **Body Pacing Problem**.
   - CTR $<$ 1.8% $\rightarrow$ Flag as **CTA / Beg Kuning Direction Problem**.
   - CVR $<$ 3.5% $\rightarrow$ Flag as **Price / Variant Expectation Mismatch**.
4. **When advising on the Payday Timeline:** Keep spend conservative (RM 3k–RM 3.5k/day) from the 1st to the 24th of the month. Instruct the marketer to execute the **Payday Surge (RM 7k–RM 8.5k/day)** strictly between the **25th and the 2nd**.

---

## 5. File & Tech Specifications

- **File:** `himwellness-playbook.html`
- **Architecture:** Standalone HTML5, CSS3, ES6 JavaScript.
- **Dependencies:** Tailwind CSS (via CDN: `cdn.tailwindcss.com`), Google Fonts (`Inter`). Zero build steps or npm packages required.
- **Persistence:** Browser `window.localStorage` (`him_checks` key).
- **Timezone Anchor:** Pure client-side UTC offset calculation forcing `UTC+8` (Malaysia Standard Time) regardless of user's physical machine timezone.
