-- 012_ttam_presets.sql — TTAM preset store (bands + guardrails + notes).
-- Owner runs this in Neon SQL Editor on dev AND prod, pastes back counts.
-- Rule: schema-qualify every identifier; never edit after applying (new fix = 013+).

CREATE SCHEMA IF NOT EXISTS ttam;

CREATE TABLE IF NOT EXISTS ttam.presets (
  id SERIAL PRIMARY KEY,
  preset_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  metrics JSONB NOT NULL,
  guardrails JSONB NOT NULL DEFAULT '{"min_spend":30,"min_impressions":1000,"min_days":3}',
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: theory-v2 bands (provisional for TTAM manual — recalibrate from TTAM
-- quartiles later). invert=true only on ACS. proxy=true where inputs are
-- API proxies (plain-6s for focused views; live_effective_views presumed).
INSERT INTO ttam.presets (preset_key, label, metrics, guardrails, notes, active)
VALUES (
  'ttam-manual-theory-v1',
  'TTAM Manual Theory v1 (provisional)',
  '[
    {"id":"erri","short":"ERRI","name":"Enter Room Rate Impression","k":0.003,"s":0.015,"enabled":true,"proxy":false},
    {"id":"hps","short":"HPS","name":"Hook Power Score","k":25,"s":45,"enabled":true,"proxy":true},
    {"id":"acs","short":"ACS","name":"Attention Cost Score","k":0.05,"s":0.01,"invert":true,"enabled":true,"proxy":true},
    {"id":"ces","short":"CES","name":"Consideration Efficiency Score","k":5,"s":30,"enabled":true,"proxy":true},
    {"id":"eds","short":"EDS","name":"Engagement Depth Score","k":5,"s":20,"enabled":true,"proxy":false},
    {"id":"vves","short":"VVES","name":"Video View Efficiency Score","k":100,"s":400,"enabled":true,"proxy":true},
    {"id":"rvs","short":"RVS","name":"Retention Value Score","k":500,"s":1500,"enabled":true,"proxy":true},
    {"id":"hrq","short":"HRQ","name":"Hook Reach Quality","k":2,"s":12,"enabled":true,"proxy":true},
    {"id":"res","short":"RES","name":"Reach Efficiency Score","k":100,"s":600,"enabled":true,"proxy":true},
    {"id":"lqs","short":"LQS","name":"Live Quality Score","k":1,"s":3,"enabled":true,"proxy":true},
    {"id":"bce","short":"BCE","name":"BC Efficiency","k":0.5,"s":2,"enabled":true,"proxy":true}
  ]',
  '{"min_spend":30,"min_impressions":1000,"min_days":3}',
  'Seed 06 Oct: theory-v2 bands as provisional starting point for TTAM manual. Recalibrate from TTAM quartiles after a few weeks of data.',
  true
)
ON CONFLICT (preset_key) DO NOTHING;
