-- 015_shop_hourly_orders.sql — per-hour shop-truth cache for the Hourly shop tab.
-- One row per shop per date per hour (rewrite-on-revise, like 009_hourly).
-- Owner: run in Neon SQL Editor on DEV then PROD (IF NOT EXISTS, safe rerun).
-- Never edit applied files; next migration = 016.

CREATE SCHEMA IF NOT EXISTS gmv;

CREATE TABLE IF NOT EXISTS gmv.shop_hourly_orders (
  shop_number INTEGER NOT NULL,
  shop_name TEXT NOT NULL,
  date DATE NOT NULL,
  hour SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  shop_gmv NUMERIC NOT NULL DEFAULT 0,
  shop_orders INTEGER NOT NULL DEFAULT 0,
  unparseable_orders INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_number, date, hour)
);
CREATE INDEX IF NOT EXISTS idx_gmv_shop_hourly_orders_date ON gmv.shop_hourly_orders (shop_number, date DESC);
