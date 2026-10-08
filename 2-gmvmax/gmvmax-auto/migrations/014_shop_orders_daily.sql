-- 014_shop_orders_daily.sql — shop-truth columns on the daily cache.
-- The Shop GMV tab toggle (Shop truth | Ads attributed) needs per-day
-- shop-order numbers from cache; nightly-sync only stored ads-attributed.
-- Owner: run in Neon SQL Editor on DEV then PROD (IF NOT EXISTS, safe rerun).
-- Never edit applied files; next migration = 015.

CREATE SCHEMA IF NOT EXISTS gmv;

-- Self-sufficient: dev branches may never have received 005 (recreated
-- child branches lose tables), so create the full table when absent.
-- IF NOT EXISTS = safe rerun on PROD where 005 already applied.
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
  shop_order_gmv NUMERIC NOT NULL DEFAULT 0,
  shop_order_count INTEGER NOT NULL DEFAULT 0,
  shop_cancelled_gmv NUMERIC NOT NULL DEFAULT 0,
  shop_cancelled_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_number, date)
);
CREATE INDEX IF NOT EXISTS idx_gmv_daily_shop_metrics_date ON gmv.daily_shop_metrics (shop_number, date DESC);

-- Belt-and-braces for DBs where 005 created the table without shop cols.
ALTER TABLE gmv.daily_shop_metrics ADD COLUMN IF NOT EXISTS shop_order_gmv NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE gmv.daily_shop_metrics ADD COLUMN IF NOT EXISTS shop_order_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gmv.daily_shop_metrics ADD COLUMN IF NOT EXISTS shop_cancelled_gmv NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE gmv.daily_shop_metrics ADD COLUMN IF NOT EXISTS shop_cancelled_count INTEGER NOT NULL DEFAULT 0;
