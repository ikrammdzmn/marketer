# AGENTS.md — campaign-performance-analysis (Metric Scorer, 11 OMTM)

Static TikTok campaign scorer. Pure HTML/CSS/vanilla JS — **no npm, no build,
no framework**. Keep it that way.

## Files

- `index.html` — UI markup + CDN scripts (Tailwind Play `darkMode: 'class'`,
  SheetJS 0.20.3). Anti-flash dark-mode script in `<head>`.
- `app.js` — all logic, single vanilla IIFE. No modules, no transpiling.
  Registry-driven: loads `presets/index.json` manifest → preset file →
  scores rows. Legacy `metrics.json` (dual v2/v3 schema) is fallback only.
- `style.css` — extras only; layout via Tailwind classes.
- `metrics.json` — legacy default registry (dual-band schema, 11 OMTM).
  Do not extend; new presets go in `presets/`.
- `presets/index.json` — manifest `{default, presets[{id,file,label}]}`.
  New preset = new JSON here + one manifest line. No code change.
- `presets/vol2-focused-v3.json` — flat single-band schema, calibrated to
  GMV MAX VOL2 01–05 Oct quartiles (default). `presets/theory-v2.json` —
  original theory bands. Flat metric shape:
  `{id,name,short,format,inputs,expression,invert,enabled,params,band:{k,s}}`.
- `server.py` — local-only server (stdlib, 127.0.0.1, default port **8123**).
  Static files + `/api/version` + `/health`. :8000 belongs to
  tiktok-creative-analysis — never take it.
- `start-server.bat` — double-click launcher (opens :8123, runs server.py).
- `source-file/*.xlsx` — input exports, read-only. Never hand-edit.
- `metric.md` — v3 formula spec + validation numbers (source of truth).
- `metric-plan.md` — multi-campaign/registry plan + status.
- `feature.md` — non-technical user guide. `DEV_NOTES.md` — session handoff.
- `.gitignore` — `__pycache__/` + `*.backup-*.json` stay out of git.

## Run / verify

```bash
python server.py            # :8123, localhost only
# open http://localhost:8123  (file:// breaks fetch of presets/xlsx)
```

After EVERY change: `node --check app.js` + `python -m py_compile server.py`
(if touched) + HTTP smoke on a fresh port (200s for `index.html`, `app.js`,
`presets/index.json`). Bump `app.js?v=N` in index.html per JS change.
`;` chaining (no `&&`), always stop background servers.

## Rules

1. **Bands from quartiles, never theory.** Every band ships with the medians
   that justify it (see `metric.md` §5). Recalibrate per campaign.
2. **Ingest drops `Total of N results` rows** (`/^total of/i`) — they double
   spend and poison medians. Never branch downstream on dialect.
3. **OVERALL reads enabled flags only.** New metric → auto-included;
   unticked → excluded from table/verdict/CSV. LIVE pair (LQS/ERRI) stays a
   separate track from VV verdicts.
4. **Expressions are evaluated** (`Function` + `with`, local-only). Add-metric
   form must validate on a real row: unknown identifiers and non-finite
   results rejected with a message, never scored.
5. **Overrides keyed per preset** (`metric-presets-overrides-v1`); schema
   changes get a new key the same session, never a silent migration.
6. **Display changes stay on the page** unless export changes are requested.
   Replies: short. Code only on explicit go.
