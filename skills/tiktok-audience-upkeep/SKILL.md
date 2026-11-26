---
name: tiktok-audience-upkeep
description: Keep TikTok Market Scope (TTMS) audience packages current: builder options and settings, the 60-day auto-update cutoff, pushing to Ads Manager, deleting outdated packages, and the Eymdvz x work reminder. Load before creating, pushing, renaming or deleting TTMS audiences.
---

# TTMS audience upkeep (repo-local)

Market Scope (TTMS) builds audience packages. Ads Manager (TTAM) uses them
only after **Push**. Creation and push happen in the Market Scope UI; the
TikTok Ads MCP only reads what is pushed. Reminder steps are in the global
`calendar-reminders` skill.

Status and sizes live in `1-knowledge/marketscope/audience-catalog.md` (dated).
Screen facts live in `1-knowledge/marketscope/findings.md`. Do not copy
snapshot numbers into this file.

## Build rules (verified 26 Nov 2026)

- **ACC audience, rolling window.** `Audience selection → ACC audience`,
  `Type: Total`, `Date range: In the past N days`. Never `Specific period`:
  fixed-range packages stop updating ("can't be updated").
- **Stage per package.** Consideration only for retargeting; Conversion only
  for exclusion; Awareness only for reach. All three are ticked by default:
  untick the ones you don't need.
- **Existing audiences tab is a trap.** A package built from an existing
  audience inherits that package's frozen data. Build from ACC or the condition itself.
- **Video interactions** has a category picker only (no action or date).
  Large (about 19M for two categories); skip unless needed.
- **Ad audience**: Type `Touchpoints` → Middle funnel (all 9 formats for
  retargeting), Action `Click`, Frequency `Any`, `In the past 30 days`.
  Clear any pre-filled Touchpoints ID before choosing. The Upper funnel holds
  Topview and reach formats; keep it out of retargeting.
- **TikTok Shop audience**: Data range `Brand`; Action `Click` (warm) or
  `Add to cart` (hot); Frequency `Any`; `In the past 30 days`.
- **Size estimate** may show "Oops, Something went wrong". Retry, simplify,
  reload, or create and check the size after processing.
- **Processing** can take up to 48 hours. Don't push until the size appears.
- **Name**: `TTMS - <STAGE or SOURCE> - <WINDOW> - <DDMMMYY>`, e.g.
  `TTMS - CONSIDERATION - 7D - 26NOV26`.
- **Navigation**: a feature-tutorial popup ("Got it") blocks sidebar clicks.
  Dismiss it, or use the direct URLs in `findings.md`.

## Auto-update

- Options: `Update now`, or `Auto-update every N days`. Auto-update turns off
  after **60 days** and must be turned back on.
- Set: 7-day packages every 7 days; 30-day packages every 15 days.
- Calendar titles for audience events start with `#audience` (blue style in the marketer-hw calendar, verified deploy 26 Nov 2026).
- Reminder: Google Calendar **Eymdvz x work** (darkvadez00 account), repeating every 60 days from 26 Nov 2026, 6 occurrences, Asia/Kuala_Lumpur. Created with `calendar-reminders` (global). Calendar ID: `0fd3eb32b1d6271eded66bcec40d4e60bc632a8df7356abfb0c9e5ec0b393e28@group.calendar.google.com`.

## Steps

1. Confirm the window and stage match the build rules and `audience-catalog.md`.
2. Check the size estimate. Size must be above zero before push.
3. Push only available, correct packages. Record the push in `audience-catalog.md` as a new dated snapshot.
4. Check Ads Manager with `dmp_custom_audience_list_get`. GMV MAX VOL2 (`7505228077656621057`) holds the current pushed package.
5. Delete outdated packages only after owner confirmation. Deletion is permanent.

## Boundaries

- Creating, pushing, renaming, deleting: UI or explicit owner go only.
- Health-ad claims: check Malaysian rules and TikTok health policy before scaling.
