# TTAM live metrics from presets — plan + checklist

> Mirror of the session plan (plan dir). Single source for this track lives
> here; the plan-dir copy is the handoff snapshot.

## Goal
TTAM campaign / adgroup / ad levels in GMV Max Online fetch the metrics that
the Metric Scorer presets define, so the dashboard shows the same numbers as
`3-ttam/campaign-performance-analysis` without xlsx uploads.

## Key facts (verified 06 Oct)
- `report/integrated/get` BASIC serves: cost (`spend/cpc/cpm`), delivery
  (`impressions/clicks/ctr/reach/frequency`), conversion set, result set,
  video (`video_play_actions/video_watched_2s/video_watched_6s/average_video_play`),
  engagement (`likes/comments/shares/follows/profile_visits`).
- Preset input → API metric (likely): `spend→spend`, `imp→impressions`,
  `reach→reach`, `sfv→video_watched_6s`, `likes/com/sh/fol/prof→likes/comments/
  shares/follows/profile_visits`, `awt→average_video_play`. Unconfirmed:
  `live/live10` (live metrics may be dimension-restricted).
- Preset bands do NOT transfer (VOL2 GMV quartiles ≠ TTAM manual). Formulas
  yes, bands no.

## Score formulas + units (code truth: `scoreTtamRow` in `src/lib/gmv.ts`, surfaced read-only in `/presets`)

| Short | Unit | Formula (raw keys: spend, imp, clicks, reach, sfv, prof, likes, sh, com, fol, awt, live, live10) |
|---|---|---|
| ERRI | % | `imp ? live / imp * 100 : 0` |
| HPS | % | `HR * 100` where `HR = sfv / imp` |
| ACS | RM (4dp) | `sfv ? spend / sfv : 999` (invert: high KILL) |
| CES | numeric | `cesX * HR * PVR * EDSraw / ACS`, `cesX = 10000`, `PVR = prof / imp` |
| EDS | % | `EDSraw * 100` where `EDSraw = (sh + com + fol) / likes` |
| VVES | numeric | `(HR * awt) / ACS` |
| RVS | numeric | `awt / ACS` |
| HRQ | % | `reach ? sfv / reach * 100 : 0` |
| RES | numeric | `((sfv / reach) * resX) / (spend / reach)`, `resX = 10` |
| LQS | numeric | `spend ? live10 / spend * 100 : null` (null until 10s-live metric confirmed) |
| BCE | numeric | `bcX * HR * PVR / ACS`, `bcX = 1000` |
| IMP | numeric | `imp ? imp : null` (custom, null-safe: empty rows stay WATCH) |
| CPM | RM (2dp) | `imp ? spend / imp * 1000 : null` (custom, invert) |

Dashboard renders units via `formatScore` (`src/lib/ttam-scores.ts`) from each
preset row's `format`, falling back to the built-in map above. Custom metrics
evaluate their own DB `expression` client-side (`applyCustomScores`); `: null`
(not `: 0`) keeps fail-open rows on WATCH.

## OMTM original (ground reference, 10 Oct — preset `ttam-omtm-original-v1`, inactive)

Verbatim transcription of the owner's "One Metric That Matters" table (full
names, original formulas/bands/formats). Seeded by `020_ttam_omtm_original.sql`
(owner runs dev+prod). View in `/presets` (click the row) or trial it via
Activate — rollback is the previous preset. This is theory-v1-era: bands match
theory-v2, but EDS/ACS/CES predate the v2 fixes, so expect odd flags — that is
the reference behaving as written, not a bug.

| # | Full name | Bands (K / S) | Unit | Formula as implemented |
|---|---|---|---|---|
| 1 | Enter Room Rate Impression | — (unset → WATCH) | % | `imp ? live / imp * 100 : null` |
| 2 | HOOK POWER SCORE | <25 / >45 | % | `imp ? sfv / imp * 100 : null` |
| 3 | ATTENTION COST SCORE | >0.05 / <0.01, invert | % | `sfv ? spend / sfv * 100 : null` ⚠ bands look raw-scale vs ×100 formula |
| 4 | CONSIDERATION EFFICIENCY SCORE | <5 / >30 | numeric | `((prof/imp) * sfv * ((com*sh*fol)/likes)) / (spend/sfv)` ⚠ multiplicative pre-fix (v2: additive + ×10000) |
| 5 | ENGAGEMENT DEPTH SCORE | <5 / >20 | % | `(sh + com + fol) / fol` ⚠ source explanation says ÷ likes |
| 6 | VIDEO VIEW EFFECIENCY SCORE | <100 / >400 | numeric | `((sfv/imp) * awt) / (spend/sfv)` |
| 7 | RETENTION VALUE SCORE | <500 / >1500 | numeric | `awt / (spend/sfv)` |
| 8 | HOOK REACH QUALITY | <2 / >12 | % | `sfv / reach * 100` |
| 9 | REACH EFFICIENCY SCORE | <100 / >600 | numeric | `((sfv/reach) * 100) / (spend/reach)` |
| 10 | LIVE QUALITY SCORE | — (unset → WATCH) | numeric | `live10 / spend * 100` |
| 11 | BC EFFICIENCY (Brand Consideration) | — (unset → WATCH) | numeric | `100 * ((sfv/imp) * (prof/imp)) / (spend/sfv)` |

Sample check (spend 120, imp 4000, sfv 1000…): ERRI 1.5, HPS 25, ACS 12
(→KILL vs 0.05 band — the flagged mismatch), EDS 2 (→KILL vs k5), CES 3125.
Empty rows evaluate `null` → WATCH, never false-KILL.

## OMTM v3 RM (trial, 10 Oct — preset `ttam-omtm-v3-rm`, inactive)

Trial candidate to replace theory-v1 once proven on live distributions.
v3-engine formulas, RM cost basis, full names, explicit units per row.
Seeded by `021_ttam_omtm_v3.sql` (owner runs dev+prod). Trial via `/presets`
Activate — rollback is the previous preset.

| Full name | Bands (K / S) | Unit | Formula as implemented |
|---|---|---|---|
| Enter Room Rate Impression | <0.3 / >1.5 | % | `imp ? live / imp * 100 : null` |
| HOOK POWER SCORE | <20 / >35 | % | `imp ? sfv / imp * 100 : null` |
| ATTENTION COST SCORE | >0.025 / <0.008, invert, RM | RM (4dp) | `sfv ? spend / sfv : null` (strict by owner call) |
| CONSIDERATION EFFICIENCY SCORE | <5 / >30 | numeric | `cesX * HR * PVR * EDSraw / ACS`, `cesX = 10000` |
| ENGAGEMENT DEPTH SCORE | <5 / >20 | % | `EDSraw * 100` |
| VIDEO VIEW EFFICIENCY SCORE | <20 / >80 | numeric | `(HR * awt) / ACS` (RM-recalibrated from v3 100/400) |
| RETENTION VALUE SCORE | <100 / >300 | numeric | `awt / ACS` (RM-recalibrated from v3 500/1500) |
| HOOK REACH QUALITY | <25 / >40 | % | `sfv / reach * 100` |
| REACH EFFICIENCY SCORE | <80 / >240 | numeric | `((sfv/reach) * 10) / (spend/reach)` (RM-recalibrated from v3 400/1200) |
| LIVE QUALITY SCORE | <1 / >3 | numeric | `live10 / spend * 100` (distribution will tell — live metric is presumed proxy) |
| BC EFFICIENCY (Brand Consideration) | <20 / >60 | numeric | `bcX * HR * PVR / ACS`, `bcX = 1000` |

Sample check (spend 120, imp 4000, sfv 1000, awt 8, reach 3000…): ERRI 1.5
WATCH, HPS 25 WATCH, ACS 0.12 KILL (strict by design), CES 104 SCALE,
EDS 25 SCALE, VVES 16.7 KILL, RVS 66.7 KILL, HRQ 33 WATCH, RES 83 WATCH,
LQS 33 SCALE, BCE 42 WATCH. Empty rows → `null` → WATCH.

Vs Theory v1: RM (not $) costs; focused-6s named, no proxy `~`; LQS uses
`×100` (SCALE-risks unless live10 counts are tiny — watch it); moved bands
are priors until quartile recalibration (standing M11 item), then lock.

## Presets in system (Neon `ttam.presets` — confirm live active flag in `/presets`)

| Key | Label | Content | Seeded active | Source |
|---|---|---|---|---|
| `ttam-manual-theory-v1` | TTAM Manual Theory v1 (provisional) | 11 built-ins, v3 engine + v2 bands, $ costs | yes | `012_ttam_presets.sql` |
| `ttam-basic-v1` | TTAM + BASIC (IMP/CPM trial) | active-preset copy + IMP (`imp`, k1000/s5000) + CPM (`spend/imp*1000`, invert, k30/s15 RM) | no | `019_ttam_basic_metrics.sql` |
| `ttam-omtm-original-v1` | One Metric That Matters (original, reference) | §OMTM original verbatim (full names) | no | `020_ttam_omtm_original.sql` |
| `ttam-omtm-v3-rm` | OMTM v3 (RM trial) | §OMTM v3 RM (full names, explicit units) | no | `021_ttam_omtm_v3.sql` |

Formulas are visible read-only under each row in `/presets` (DB expression,
else built-in transcription) with the raw-input legend on top. Activate moves
the pill instantly (optimistic UI, `e58882e`); the green pill marks the live
preset — dashboard + verdicts follow it with no refetch.

## Open decision (owner)
- New metrics may be added via the scorer `index.html` manager. Two paths:
  A. Dashboard reads the preset JSON (default from `presets/index.json`
     manifest) at runtime/build — new metrics flow in if their inputs are
     API-covered, else flagged uncovered.
  B. Integrate the metric manager UI into GMV Max Online (bigger).
- Default: A. Decide before step 4.

## Steps
1. Probe: one live `integrated/get` call per grain (CAMPAIGN/ADGROUP/AD)
   with the full candidate metric list (`/api/ttam-probe`). Confirm exact
   names before building (one wrong name fails the whole call).
2. Mapping table: preset input → confirmed API metric (§Mapping).
3. Extend the 3 TTAM pulls (`src/lib/ttam.ts` + `fetchManualSpend` rows in
   `src/lib/gmv.ts`) with confirmed metrics. Fail-open: on non-zero code,
   retry spend-only.
4. Expression evaluation: port the scorer's expression engine (or hardcode
   the covered OMTM formulas) for dashboard-computed metrics.
5. UI: new columns per covered metric at all 3 TTAM levels. Uncovered inputs
   show as n/a, never block the row.
6. Docs: folder `plan.md` tick + `feature.md` + `DEV_NOTES.md` bugs/lessons.

## Checklist
- [x] Probe CAMPAIGN grain — confirm names (06 Oct: all 25 OK)
- [x] Probe ADGROUP grain — confirm names (06 Oct: all 25 OK)
- [x] Probe AD grain — confirm names (06 Oct: all 25 OK)
- [x] Mapping table filled (§Mapping)
- [ ] Decide A vs B (preset sync)
- [x] Campaign pull extended + fail-open (TTAM_METRICS + spend-only retry)
- [x] Adgroup pull extended + fail-open
- [x] Ad pull extended + fail-open
- [x] Expression engine ported / formulas hardcoded (scoreTtamRow, v3 exact; sfv proxied + labeled, LQS n/a)
- [x] UI columns at 3 levels (Impr + 11 scores, ~ labels, footnote)
- [ ] `tsc` clean + redeploy + eyeball prod
- [x] Re-probe live_effective_views / live_unique_views → wire LQS (both OK; LQS wired to live_effective_views as PRESUMED proxy)
- [x] Drill dimension fix: campaign_id/adgroup_id rejected as combo dims at ADGROUP/AD grain (40002) — pull id-dim only, filter client-side
- [ ] Verify LQS: compare one ad's LQS vs xlsx "10-second LIVE views" column
- [x] Score toggles (11 scores, hidden leave verdict)
- [x] Flags (KILL/WATCH/SCALE colors) + OVERALL verdict w/ reason, theory bands provisional
- [x] 3-day rule: shorter ranges fetch scores, verdict cells show "not enough data"
- [x] LEARNING guardrail (preset min_spend/min_impressions, DB-backed read path)
- [x] Manager UI (list/select/duplicate/activate, band+guardrail+notes editor, scorer JSON export)
- [x] Dedicated /presets page (Dashboard|Presets tabs, manager moved out of dropdown)
- [x] Delete preset (confirm, active-blocked) + add/delete metric rows (dynamic columns, export fields)
- [x] Custom metrics auto-evaluate (preset expression × raw API metrics, client-side, fail-open null)
- [x] Verdict filter + search (client-side, all 3 TTAM levels)
- [x] LEARNING reason suffix (LEARNING·spend/imp + actuals on hover)
- [x] Calendar port (v51 pattern: popup + preset rail + two-month grid + two-click/hover, future-disabled, 31-day cap)
- [ ] `tsc` clean + redeploy + eyeball prod (manager + LEARNING chips)
- [x] Docs updated 06 Oct (DEV_NOTES Cp11 + feature + AGENTS + CHANGELOGs + plan milestones; M10/M11)
- [x] Score units render (%/RM/numeric via `formatScore`, DB format wins) + formulas read-only in `/presets` + formula tables in docs (`e58882e`, deployed)
- [x] Activate pill flips instantly (optimistic UI + no-store fetches, `ab3f8da`, deployed)
- [x] 019 BASIC trial preset (IMP/CPM) + 020 OMTM-original reference + 021 OMTM-v3-RM trial seeded (migrations written + verified; owner runs dev+prod, trials via Activate)
- [ ] Owner runs 019/020/021 dev+prod → trials BASIC / v3 via Activate → quartile recalibration from live distributions, then lock
- [ ] FUTURE: compact score mode, verdict reason second line, slim sub-rows, verdict-history snapshots
- [ ] FUTURE: fetch-all generalization — pull the full 27-metric probe set on every TTAM pull + pass all inputs to the evaluator, so any API metric becomes a self-serve preset column with no code
- [ ] FUTURE: `monitor` toggle per metric — grey display value, no flag, excluded from verdict (for display-only columns; avoids K=0/S=0 false-SCALE)

## Mapping (probe 06 Oct: all OK at CAMPAIGN/ADGROUP/AD unless noted)
| preset input | API metric | CAMPAIGN | ADGROUP | AD |
|---|---|---|---|---|
| spend | spend | OK | OK | OK |
| imp | impressions | OK | OK | OK |
| clicks | clicks | OK | OK | OK |
| reach | reach | OK | OK | OK |
| sfv | video_watched_6s (PROXY — plain 6s, not focused) | OK~ | OK~ | OK~ |
| likes/com/sh/fol/prof | likes/comments/shares/follows/profile_visits | OK | OK | OK |
| awt | average_video_play | OK | OK | OK |
| live | live_views | OK | OK | OK |
| live10 | live_effective_views (PRESUMED — verify vs xlsx 10s column) | OK | OK | OK |
