-- 019_ttam_basic_metrics.sql — duplicate the ACTIVE TTAM preset + BASIC trial metrics.
-- Adds IMP (impressions, expression `imp`) + CPM (expression `imp ? spend / imp * 1000 : null`,
-- invert) as `ttam-basic-v1` (inactive — owner activates via /presets after eyeballing).
-- Owner runs this in Neon SQL Editor on dev AND prod, pastes back counts.
-- Rule: schema-qualify every identifier; never edit after applying (new fix = 020+).
-- Idempotent: strips any pre-existing IMP/CPM rows before appending; ON CONFLICT DO NOTHING.

WITH src AS (
  SELECT ttam.presets.metrics, ttam.presets.guardrails, ttam.presets.notes
  FROM ttam.presets
  WHERE ttam.presets.active = true
  ORDER BY ttam.presets.updated_at DESC
  LIMIT 1
),
filtered AS (
  SELECT COALESCE(jsonb_agg(t.el ORDER BY t.ord), '[]'::jsonb) AS metrics
  FROM src, jsonb_array_elements(src.metrics) WITH ORDINALITY AS t(el, ord)
  WHERE (t.el ->> 'short' IS NULL OR UPPER(t.el ->> 'short') NOT IN ('IMP', 'CPM'))
)
INSERT INTO ttam.presets (preset_key, label, metrics, guardrails, notes, active)
SELECT
  'ttam-basic-v1',
  'TTAM + BASIC (IMP/CPM trial)',
  f.metrics || '[
    {"id":"imp","short":"IMP","name":"BASIC \u00b7 Impressions","k":1000,"s":5000,"invert":false,"enabled":true,"proxy":false,"expression":"imp ? imp : null","format":"numeric","inputs":["imp"]},
    {"id":"cpm","short":"CPM","name":"BASIC \u00b7 CPM","k":30,"s":15,"invert":true,"enabled":true,"proxy":false,"expression":"imp ? spend / imp * 1000 : null","format":"RM","inputs":["spend","imp"]}
  ]'::jsonb,
  s.guardrails,
  COALESCE(s.notes, '') || ' | 019: duplicated active preset + BASIC IMP/CPM trial metrics (inactive).',
  false
FROM src AS s CROSS JOIN filtered AS f
ON CONFLICT (preset_key) DO NOTHING;
