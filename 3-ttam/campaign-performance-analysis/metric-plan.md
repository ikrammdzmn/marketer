# Next: multi-campaign support for Metric Scorer

Status: PARTIAL 2026-10-05 (presets + registry built; auto-recalibrate still open)
Date: 2026-10-05 | Scorer: `index.html` + `app.js?v=4` + `server.py` (:8123) | Spec: `metric.md` v3

Goal: scorer works for any campaign, not just GMV MAX VOL2 01–05 Oct.

## Why needed
- v3 bands are calibrated to one dataset (Focused View, VOL2, 01–05 Oct quartiles).
- Other campaigns/objectives (LIVE, Product, Reach, different periods) will mis-flag KILL/SCALE.

## Scope
1. Band presets per campaign/objective: `{ campaign, objective, bands v*, updatedAt }`, selectable in UI, default v3-VOL2. DONE 05 Oct: `presets/` (manifest + one JSON per preset, flat schema) + UI Preset switcher + per-preset localStorage overrides.
2. Auto-recalibrate: compute p25/med/p75 per metric from loaded file, propose K/S bands, preview verdict shift (KILL/WATCH/SCALE counts) before saving. OPEN.
3. Persist presets locally (server.py saver or localStorage fallback); export/import JSON.
4. Validate: load 2nd campaign file, confirm verdict distribution sane (not all-KILL/all-SCALE).

## Metric registry (add/remove metrics per preset)
- `metrics.json` per preset: array of `{ id, name, short, inputs[], expression, scaler, bands{K,S}, format, enabled }`.
- Scorer computes only `enabled` metrics; each yields `value + flag` columns.
- Add metric = define inputs + expression + scaler + bands (UI form, validated: no divide-by-zero, unknown columns rejected).
- Remove = untick `enabled` (kept in registry for history, excluded from table/OVERALL/CSV).
- OVERALL verdict rule reads only enabled flags; LIVE pair (LQS/ERRI) stays a separate track by default.
- Seed registry = current 11 OMTM (ERRI/HPS/ACS/CES/EDS/VVES/RVS/HRQ/RES/LQS/BCE).

## Out of scope
- No Ads Manager API import; xlsx upload only.
- No change to 11 formulas/scalers, only bands.
