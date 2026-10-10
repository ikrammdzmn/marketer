-- 020_ttam_omtm_original.sql — OMTM original table as an INACTIVE ground-reference preset.
-- Verbatim transcription of the owner's 10 Oct "One Metric That Matters" table
-- (full names, original formulas/bands/formats). Key `ttam-omtm-original-v1`.
-- Source inconsistencies are KEPT as given and flagged in notes + plan doc:
-- ACS bands (0.05/0.01) vs x100 formula scale; EDS /follows vs explanation's
-- /likes; CES multiplicative pre-fix; ERRI/LQS/BCE bands unset (those rows
-- carry no k/s: dashboard flags default WATCH, and /presets Save requires
-- adding bands first). Owner runs this in Neon SQL Editor on dev AND prod.
-- Rule: schema-qualify every identifier; never edit after applying (new fix = 021+).
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO ttam.presets (preset_key, label, metrics, guardrails, notes, active)
VALUES (
  'ttam-omtm-original-v1',
  'One Metric That Matters (original, reference)',
  '[
    {"id":"erri-o","short":"ENTER_ROOM_RATE_IMPRESSION","name":"Enter Room Rate Impression","invert":false,"enabled":true,"proxy":false,"expression":"imp ? live / imp * 100 : null","format":"%","inputs":["live","imp"]},
    {"id":"hps-o","short":"HOOK_POWER_SCORE","name":"HOOK POWER SCORE","k":25,"s":45,"invert":false,"enabled":true,"proxy":false,"expression":"imp ? sfv / imp * 100 : null","format":"%","inputs":["sfv","imp"]},
    {"id":"acs-o","short":"ATTENTION_COST_SCORE","name":"ATTENTION COST SCORE","k":0.05,"s":0.01,"invert":true,"enabled":true,"proxy":false,"expression":"sfv ? spend / sfv * 100 : null","format":"%","inputs":["spend","sfv"]},
    {"id":"ces-o","short":"CONSIDERATION_EFFICIENCY_SCORE","name":"CONSIDERATION EFFICIENCY SCORE","k":5,"s":30,"invert":false,"enabled":true,"proxy":false,"expression":"imp && sfv && likes ? ((prof / imp) * sfv * ((com * sh * fol) / likes)) / (spend / sfv) : null","format":"numeric","inputs":["sfv","imp","prof","sh","com","fol","likes","spend"]},
    {"id":"eds-o","short":"ENGAGEMENT_DEPTH_SCORE","name":"ENGAGEMENT DEPTH SCORE","k":5,"s":20,"invert":false,"enabled":true,"proxy":false,"expression":"fol ? (sh + com + fol) / fol : null","format":"%","inputs":["sh","com","fol"]},
    {"id":"vves-o","short":"VIDEO_VIEW_EFFICIENCY_SCORE","name":"VIDEO VIEW EFFECIENCY SCORE","k":100,"s":400,"invert":false,"enabled":true,"proxy":false,"expression":"imp && sfv ? ((sfv / imp) * awt) / (spend / sfv) : null","format":"numeric","inputs":["sfv","imp","awt","spend"]},
    {"id":"rvs-o","short":"RETENTION_VALUE_SCORE","name":"RETENTION VALUE SCORE","k":500,"s":1500,"invert":false,"enabled":true,"proxy":false,"expression":"sfv ? awt / (spend / sfv) : null","format":"numeric","inputs":["awt","spend","sfv"]},
    {"id":"hrq-o","short":"HOOK_REACH_QUALITY","name":"HOOK REACH QUALITY","k":2,"s":12,"invert":false,"enabled":true,"proxy":false,"expression":"reach ? sfv / reach * 100 : null","format":"%","inputs":["sfv","reach"]},
    {"id":"res-o","short":"REACH_EFFICIENCY_SCORE","name":"REACH EFFICIENCY SCORE","k":100,"s":600,"invert":false,"enabled":true,"proxy":false,"expression":"reach && spend ? ((sfv / reach) * 100) / (spend / reach) : null","format":"numeric","inputs":["sfv","reach","spend"]},
    {"id":"lqs-o","short":"LIVE_QUALITY_SCORE","name":"LIVE QUALITY SCORE","invert":false,"enabled":true,"proxy":false,"expression":"spend ? live10 / spend * 100 : null","format":"numeric","inputs":["live10","spend"]},
    {"id":"bce-o","short":"BC_EFFICIENCY","name":"BC EFFICIENCY (Brand Consideration)","invert":false,"enabled":true,"proxy":false,"expression":"imp && sfv ? 100 * ((sfv / imp) * (prof / imp)) / (spend / sfv) : null","format":"numeric","inputs":["sfv","imp","prof","spend"]}
  ]',
  '{"min_spend":30,"min_impressions":1000,"min_days":3}',
  'Ground reference 10 Oct: OMTM original table verbatim (full names, inactive). Flags kept as given: ACS band-vs-x100 scale mismatch; EDS /follows differs from its own explanation (/likes); CES multiplicative pre-fix; ERRI/LQS/BCE bands unset (WATCH by default, add bands in /presets before Save).',
  false
)
ON CONFLICT (preset_key) DO NOTHING;
