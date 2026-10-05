# DEV_NOTES.md — Sales Performance Analysis System handoff (05 Oct 2026, MYT)

> Read this first. It carries the vibe, not just the facts.

## The headspace to sync into

Fast, terse, owner-led loop with a Malay-speaking marketer doing 1–5 Oct sale review (Him.DrSamhan). Rhythm: "here is data, dont do analysis yet, wait until i approve" → drops screenshots + xlsx → "ok proceed" → wants loss/cut/boost with FULL campaign names → "mark that no conversion happen in TTAM" → "based on CPM, impression" → "what roi if we exclude L3" → "are possible to create a system like tiktok-creative-analysis" → plan-only discipline ("plan only, dont build yet", "use folder sales-performance-analysis", "where is it?", moved plan himself to `1.1 Sales\Sales Performance Analysis System\plan.md`). Match it: short replies, numbers first, full names never truncated, no build until explicit "go". Owner validates visually from screenshots, not code.

## Current mood — 05 Oct evening (analysis + plan draft, zero code)

Trust is high, energy is wrap-up: owner asked for the full session-ritual docs (this file + feature.md + AGENTS + changelogs + MASTER rollups). No code was built — only manual analysis + `plan.md` drafted then moved by owner. Next self: do NOT start building; confirm folder + GMV Max xlsx question first. Sync cue: lead with cut/boost verdict + RM math; keep TTAM = 0 sales explicit every time or owner corrects you.

## Facts (1–5 Oct, verified this session)
- Ad Overview: gross RM27,183.25 / net RM31,532.57 (SST+WHT RM4,349.32, x1.16) / blended 2.42x / actual 2.08x / GMV 65,692 (588 orders) / visitors 8,171. Channel: LIVE RM3,990.54 (14.7%), PRODUCT RM2,616.60 (9.6%), TTAM RM20,576.11 (75.7%). Shop row Him.DrSamhan: GMV 58,839.34 / 7,672 visitors / 2.16x / 1.87x. Guardrail ROI >= 7.0 (tiktok-strategy).
- TTAM report: `GMV MAX VOL2-Campaign Report-2026-10-01 to 2026-10-05.xlsx` (Sheet1, 54 rows incl Total, 21 cols). Real spend = `Total of 52 results` RM20,667.83 (9.23M imp, avg CPM 2.24). Zero sales conversions — the 892 in `24/07/26 | CI | DR.SAMHAN | LIVE BOOSTER | RT` is traffic, not sales.
- GMV Max (screenshots only): total 61,515.45 / 6,618.21 / 529 / 9.29x. LIVE 44,493.14 / ~4,001 / 366 / 11.10x. PRODUCT 17,022.31 / 2,617.17 / 163 / 6.50x. Boost: Official1 20.13x, Dr.Samhan 12.93x, mallegacy00 9.39x, VINCA 7.14x, [Kombo] 7.26x, [HAPPY HOUR] 79.29x. Cut: Official3 2.04x, aff5 2.49x, aff4 2.98x, HIMCoffeedrsamhan live 5.49x (RM978), [cocomax] 4.18x, [MAIN1] 6.56x watch.
- L3 exclusion math: drop `L3 | 30/06/26 | MOFU | VV | HIGH INTENT | BEG KUNING` (RM7,120.38) → gross RM20,062.87, net RM23,272.93; consolidated 2.42x→3.27x (actual 2.08x→2.82x); shop row 2.16x→2.93x (actual 1.87x→2.53x). Still < 7.0.
- Plan: `1.1 Sales/Sales Performance Analysis System/plan.md` (DRAFT, owner-moved). Distinct from `3. TTAM/campaign-performance-analysis/` Metric Scorer (11 OMTM, :8123). Do not merge unasked.
- Old spots: `sales-performance-analysis/plan.md` (draft copy) + empty `sales-performance-analysis/` dir + `analysis/` xlsx copies — owner-moved; leave alone until told to clean.

## Bugs found & fixed (lesson each)
1. **openpyxl `read_only=True` lied (1 col, no dims)** — same as creative-analysis #22. Lesson: inspect with plain `load_workbook(data_only=True)`, never read_only.
2. **PowerShell ate inline scripts** — f-string with `|` → `ExpressionsMustBeFirstInPipeline`; `head`/`ls -lh` don't exist. Lesson: `write` temp .py via tool, run, delete; `Get-ChildItem`, `;` chaining only.
3. **Config export mistaken for performance** — `ExportAds_V2_...xlsx` is 163-col setup (Campaign ID/Name/Budget/Audience), zero spend/GMV cols. Lesson: header-scan for cost/spend/gmv/roas/roi before any analysis.
4. **Total-row double count** — summing all rows gave RM41,335 = Total row + parts. Lesson: drop `Total of N results` from sums, keep as cross-check.
5. **Attribution gap** — GMV Max GMV (61,515) > shop GMV (58,839); LIVE cost 4,001 vs 4,007. Lesson: flag mismatch, never subtract to fake TTAM ROAS.
6. **Conversions ≠ sales** — LIVE BOOSTER 892 conv with no GMV col. Lesson: without GMV/Orders col, mark TTAM conv as traffic and state 0 sales explicitly.
