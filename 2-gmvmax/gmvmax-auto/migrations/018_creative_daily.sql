-- 018_creative_daily.sql — nightly per-creative rows for PRODUCT GMV Max (Phase A).
-- Grain: one row per (date, campaign, item). Rewrite-on-revise (TikTok restates).
-- Owner runs on dev + prod. Never edit after apply; next = 019+.
CREATE TABLE IF NOT EXISTS creative.daily_rows (
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  item_group_id TEXT NOT NULL DEFAULT '',
  item_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  tt_account TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  cost NUMERIC NOT NULL DEFAULT 0,
  orders INT NOT NULL DEFAULT 0,
  gmv NUMERIC NOT NULL DEFAULT 0,
  roi NUMERIC NOT NULL DEFAULT 0,
  cpo NUMERIC NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  click_rate NUMERIC NOT NULL DEFAULT 0,
  conv_rate NUMERIC NOT NULL DEFAULT 0,
  v2s NUMERIC NOT NULL DEFAULT 0,
  v6s NUMERIC NOT NULL DEFAULT 0,
  vp25 NUMERIC NOT NULL DEFAULT 0,
  vp50 NUMERIC NOT NULL DEFAULT 0,
  vp75 NUMERIC NOT NULL DEFAULT 0,
  vp100 NUMERIC NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, campaign_id, item_id)
);
