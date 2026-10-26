-- 033_ttam_hourly.sql — TTAM campaign cache, shop 1 (day grain, refreshed hourly).
-- Campaign grain only (adgroup/ad stay on-demand live, never cron).
-- Grain is DATE, not hour: integrated/basic hour support is unverified, so
-- each hourly fetch rewrites today's row (rewrite-on-revise, like 009/015).
-- Scores stay computed on read via ttam-scores.ts; only raw metrics stored.
-- Owner: run in Neon SQL Editor on DEV then PROD (IF NOT EXISTS, safe rerun).
-- Never edit applied files; next migration = 034.

CREATE SCHEMA IF NOT EXISTS gmv;

CREATE TABLE IF NOT EXISTS gmv.ttam_hourly_campaign (
  shop_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  date DATE NOT NULL,
  spend NUMERIC NOT NULL DEFAULT 0,
  impressions NUMERIC NOT NULL DEFAULT 0,
  clicks NUMERIC NOT NULL DEFAULT 0,
  reach NUMERIC NOT NULL DEFAULT 0,
  engaged_view NUMERIC NOT NULL DEFAULT 0,
  video_watched_6s NUMERIC NOT NULL DEFAULT 0,
  average_video_play NUMERIC NOT NULL DEFAULT 0,
  likes NUMERIC NOT NULL DEFAULT 0,
  comments NUMERIC NOT NULL DEFAULT 0,
  shares NUMERIC NOT NULL DEFAULT 0,
  follows NUMERIC NOT NULL DEFAULT 0,
  profile_visits NUMERIC NOT NULL DEFAULT 0,
  live_views NUMERIC NOT NULL DEFAULT 0,
  live_effective_views NUMERIC,
  full_metrics BOOLEAN NOT NULL DEFAULT TRUE,
  pulled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, campaign_id, date)
);
CREATE INDEX IF NOT EXISTS idx_gmv_ttam_hourly_campaign_date
  ON gmv.ttam_hourly_campaign (shop_id, date DESC);
