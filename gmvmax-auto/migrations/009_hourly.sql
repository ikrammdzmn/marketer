-- 009_hourly.sql — hourly per-campaign metrics, shop 1 POC (new file, never edit 001-008).
-- Grain: TikTok stat_time_hour slot ("2026-10-03 07:00:00") stored as TEXT to
-- avoid timezone assumptions; rewrite-on-revise via upsert. Closed-window
-- enforced in code (newest 2 slots dropped). Apply via Neon SQL Editor
-- (dev first, verify, then prod).

CREATE TABLE IF NOT EXISTS gmv.hourly_campaign_metrics (
  shop_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  hour_slot TEXT NOT NULL,
  promotion_type TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  gmv NUMERIC NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  pulled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, campaign_id, hour_slot)
);
CREATE INDEX IF NOT EXISTS idx_hourly_slot ON gmv.hourly_campaign_metrics (shop_id, hour_slot DESC);
