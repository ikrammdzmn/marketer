-- 005_online.sql — online Vercel module (new file, never edit 001-004).
-- Adds ads-token store, [] account cache on campaigns, daily metrics rollup.
-- Apply on DEV first via Neon SQL Editor, verify counts, then PROD.

CREATE SCHEMA IF NOT EXISTS credentials;

CREATE TABLE IF NOT EXISTS credentials.refresh_ads_tokens (
  advertiser_id TEXT PRIMARY KEY,
  label TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_in BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend campaign cache: account parsed from [Account] prefix, promotion type, advertiser.
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS promotion_type TEXT;
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS advertiser_id TEXT;
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_gmv_campaigns_account ON gmv.gmv_campaigns (account);

-- Daily rollup per shop (one row per shop per date).
CREATE TABLE IF NOT EXISTS gmv.daily_shop_metrics (
  shop_number INTEGER NOT NULL,
  shop_name TEXT NOT NULL,
  date DATE NOT NULL,
  gmv NUMERIC NOT NULL DEFAULT 0,
  live_cost NUMERIC NOT NULL DEFAULT 0,
  product_cost NUMERIC NOT NULL DEFAULT 0,
  manual_spend NUMERIC NOT NULL DEFAULT 0,
  spend_before_tax NUMERIC NOT NULL DEFAULT 0,
  spend_after_tax NUMERIC NOT NULL DEFAULT 0,
  roas_before_tax NUMERIC NOT NULL DEFAULT 0,
  roas_after_tax NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_number, date)
);
CREATE INDEX IF NOT EXISTS idx_gmv_daily_shop_metrics_date ON gmv.daily_shop_metrics (shop_number, date DESC);

-- Unbracketed campaigns to rename (shown under Other, never hidden).
CREATE OR REPLACE VIEW gmv.v_unbracketed_campaigns AS
  SELECT gmv.gmv_campaigns.campaign_id, gmv.gmv_campaigns.name, gmv.gmv_campaigns.account
  FROM gmv.gmv_campaigns
  WHERE gmv.gmv_campaigns.name IS NULL OR gmv.gmv_campaigns.name NOT LIKE '[%]%';
