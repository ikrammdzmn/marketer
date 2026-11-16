-- 038_creative_organic.sql — Seller Center organic tables (creative-analysis handoff port).
-- Grain mirrors docs/03-data-dictionary.md: organic_daily (video_id, date),
-- organic_meta per video_id, ads_manager_day (campaign_name, date),
-- live_room per room_id. IDs are TEXT (TikTok IDs exceed 2^53).
-- imp/clicks NULL = not yet pulled (today's data), never 0-fill.
-- Rewrite-on-revise everywhere (Shop restates intraday). Reruns safe.
-- Owner runs dev + prod. Never edit after apply; next = 039+.

CREATE TABLE IF NOT EXISTS creative.video_day_organic (
  video_id TEXT NOT NULL,
  date DATE NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  ctr NUMERIC(10,6),
  gmv NUMERIC(14,2),
  sku_orders INT,
  imp BIGINT,
  clicks BIGINT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (video_id, date)
);
CREATE INDEX IF NOT EXISTS video_day_organic_date_idx
  ON creative.video_day_organic (date);

CREATE TABLE IF NOT EXISTS creative.video_meta (
  video_id TEXT NOT NULL PRIMARY KEY,
  username TEXT,
  caption TEXT,
  duration_s INT,
  hashtags TEXT,
  products TEXT,
  posted_api TIMESTAMPTZ,
  posted_from_id TIMESTAMPTZ,
  account_class TEXT,
  hook TEXT,
  angle TEXT,
  cover_url TEXT,
  in_main1 BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creative.ads_manager_day (
  campaign_name TEXT NOT NULL,
  date DATE NOT NULL,
  campaign_id TEXT,
  jenis TEXT,
  objective TEXT,
  spend NUMERIC(14,2),
  impressions BIGINT,
  clicks BIGINT,
  plays BIGINT,
  p25 BIGINT,
  p100 BIGINT,
  engaged BIGINT,
  likes BIGINT,
  shares BIGINT,
  follows BIGINT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_name, date)
);
CREATE INDEX IF NOT EXISTS ads_manager_day_date_idx
  ON creative.ads_manager_day (date);

CREATE TABLE IF NOT EXISTS creative.live_room (
  room_id TEXT NOT NULL PRIMARY KEY,
  started TIMESTAMPTZ,
  date DATE,
  gmv NUMERIC(14,2),
  orders INT,
  cost NUMERIC(14,2),
  views BIGINT,
  follows INT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
