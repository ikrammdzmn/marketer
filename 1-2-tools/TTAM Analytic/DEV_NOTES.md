# DEV_NOTES.md — TTAM Analytic (Tampermonkey) handoff

> Newest first. Parked 17 Oct 2026 — awaiting owner Kill/Scale for sample-13,
> then userscript v1.

## Checkpoint 1 — 17 Oct 2026 (masterplan + sample-13 locked, parked)

Vibe: tail-end of a long probe arc; owner parked deliberately ("ok park here.
wrap up"). Next-you: don't build the script until thresholds exist — washes
mean nothing with null bands.

Facts: `masterplan.md` (local-only wash, header-name parsing, K/W/S classes +
pill/legend, MutationObserver), `plan.md` checklist, `thresholds.json`
v1-sample-13 (all 13 keys probe-OK; only `impressions` pre-filled from
`ttam-basic-v1`; keeps BOTH 6s variants — `engaged_view` true sfv +
`video_watched_6s` plain fallback). Excluded: `assisted_*` (probe FAIL).
Pattern source: `g-sheet_tools/SHEET HIGHLIGHT` (crosshair.user.js v1.4).

Open (owner): Kill/Scale for 12 blank metrics (or first 2–3 rules) → build
`ttam-highlight.user.js` v1 → eyeball on live Campaign table → `feature.md` +
`CHANGELOG.md` here.
