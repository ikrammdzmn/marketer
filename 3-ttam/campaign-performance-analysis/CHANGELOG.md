# Changelog — campaign-performance-analysis (Metric Scorer)

Newest first. One line per release. Uncommitted until the owner says commit.

## 05 Oct 2026

- v4: presets split — one JSON per preset (`presets/vol2-focused-v3.json` flat
  v3 + `presets/theory-v2.json` flat v2 + `presets/index.json` manifest) +
  UI Preset switcher; loader supports flat + legacy-dual schemas; Bands toggle
  auto-disables on flat presets; overrides/adds keyed per preset id
  (`app.js?v=4`)
- v3: metric registry — `metrics.json` seed (11 OMTM with v2+v3 bands/params) +
  registry-driven scoring (expressions validated on real rows) + in-UI manager
  (enable/disable, K/S edit, add-metric form, localStorage presets) +
  Scored/Raw/Kill table renders only enabled metrics (`app.js?v=3`)
- v2: port fix — server default `:8000` → `:8123` (creative tool owns :8000) +
  loud bind error + bat note; bundled loader repointed to `source-file/`
  (`app.js?v=2`)
- v1 (NEW track): scorer built — upload/drag-drop campaign xlsx, 11 OMTM with
  quartile-calibrated v3 bands, KILL/WATCH/SCALE flags + OVERALL verdict/reason,
  kill-list ordered by verdict→CES→ACS with 50/30/20% cut simulator, CSV export
  (verified: `node --check` + HTTP 200s)
