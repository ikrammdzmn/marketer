-- 021_ttam_omtm_v3.sql — OMTM v3 (RM) trial preset, INACTIVE ground-forward candidate.
-- v3-engine formulas, RM cost basis, full names, explicit units per row.
-- Bands: CES 5/30 + EDS 5/20 carried from theory-v2; ERRI 0.3/1.5, VVES 20/80,
-- RVS 100/300, RES 80/240 recalibrated for RM denominators (v3 $ bands would
-- mass-KILL); HPS 20/35, ACS RM 0.025/0.008 (strict, owner call), HRQ 25/40,
-- LQS 1/3, BCE 20/60. ACS is the only invert. All rows null-guarded so
-- fail-open rows stay WATCH. Key `ttam-omtm-v3-rm`.
-- Owner runs this in Neon SQL Editor on dev AND prod, pastes back counts.
-- Rule: schema-qualify every identifier; never edit after applying (new fix = 022+).
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO ttam.presets (preset_key, label, metrics, guardrails, notes, active)
VALUES (
  'ttam-omtm-v3-rm',
  'OMTM v3 (RM trial)',
  '[
    {"id":"erri-v3","short":"ENTER_ROOM_RATE_IMPRESSION","name":"Enter Room Rate Impression","k":0.3,"s":1.5,"invert":false,"enabled":true,"proxy":false,"expression":"imp ? live / imp * 100 : null","format":"%","inputs":["live","imp"]},
    {"id":"hps-v3","short":"HOOK_POWER_SCORE","name":"HOOK POWER SCORE","k":20,"s":35,"invert":false,"enabled":true,"proxy":false,"expression":"imp ? sfv / imp * 100 : null","format":"%","inputs":["sfv","imp"]},
    {"id":"acs-v3","short":"ATTENTION_COST_SCORE","name":"ATTENTION COST SCORE","k":0.025,"s":0.008,"invert":true,"enabled":true,"proxy":false,"expression":"sfv ? spend / sfv : null","format":"RM","inputs":["spend","sfv"]},
    {"id":"ces-v3","short":"CONSIDERATION_EFFICIENCY_SCORE","name":"CONSIDERATION EFFICIENCY SCORE","k":5,"s":30,"invert":false,"enabled":true,"proxy":false,"expression":"sfv && imp && likes && ACS && ACS !== 999 ? cesX * HR * PVR * EDSraw / ACS : null","format":"numeric","inputs":["sfv","imp","prof","sh","com","fol","likes","spend"],"params":{"cesX":10000}},
    {"id":"eds-v3","short":"ENGAGEMENT_DEPTH_SCORE","name":"ENGAGEMENT DEPTH SCORE","k":5,"s":20,"invert":false,"enabled":true,"proxy":false,"expression":"likes ? EDSraw * 100 : null","format":"%","inputs":["sh","com","fol","likes"]},
    {"id":"vves-v3","short":"VIDEO_VIEW_EFFICIENCY_SCORE","name":"VIDEO VIEW EFFICIENCY SCORE","k":20,"s":80,"invert":false,"enabled":true,"proxy":false,"expression":"sfv && ACS && ACS !== 999 ? (HR * awt) / ACS : null","format":"numeric","inputs":["sfv","imp","awt","spend"]},
    {"id":"rvs-v3","short":"RETENTION_VALUE_SCORE","name":"RETENTION VALUE SCORE","k":100,"s":300,"invert":false,"enabled":true,"proxy":false,"expression":"ACS && ACS !== 999 ? awt / ACS : null","format":"numeric","inputs":["awt","spend","sfv"]},
    {"id":"hrq-v3","short":"HOOK_REACH_QUALITY","name":"HOOK REACH QUALITY","k":25,"s":40,"invert":false,"enabled":true,"proxy":false,"expression":"reach ? sfv / reach * 100 : null","format":"%","inputs":["sfv","reach"]},
    {"id":"res-v3","short":"REACH_EFFICIENCY_SCORE","name":"REACH EFFICIENCY SCORE","k":80,"s":240,"invert":false,"enabled":true,"proxy":false,"expression":"reach && spend ? ((sfv / reach) * 10) / (spend / reach) : null","format":"numeric","inputs":["sfv","reach","spend"]},
    {"id":"lqs-v3","short":"LIVE_QUALITY_SCORE","name":"LIVE QUALITY SCORE","k":1,"s":3,"invert":false,"enabled":true,"proxy":false,"expression":"spend && live10 ? live10 / spend * 100 : null","format":"numeric","inputs":["live10","spend"]},
    {"id":"bce-v3","short":"BC_EFFICIENCY","name":"BC EFFICIENCY (Brand Consideration)","k":20,"s":60,"invert":false,"enabled":true,"proxy":false,"expression":"sfv && imp && ACS && ACS !== 999 ? bcX * HR * PVR / ACS : null","format":"numeric","inputs":["sfv","imp","prof","spend"],"params":{"bcX":1000}}
  ]',
  '{"min_spend":30,"min_impressions":1000,"min_days":3}',
  'OMTM v3 RM trial 10 Oct (inactive): v3-engine formulas, RM costs, full names, explicit units. ERRI 0.3/1.5, VVES 20/80, RVS 100/300, RES 80/240 recalibrated for RM (v3 $ bands would mass-KILL); ACS 0.025/0.008 strict per owner; HPS 20/35 unproven vs focused-6s hypothesis. Recalibrate from live quartiles after weeks of data, then lock.',
  false
)
ON CONFLICT (preset_key) DO NOTHING;
