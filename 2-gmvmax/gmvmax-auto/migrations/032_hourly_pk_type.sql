-- 032_hourly_pk_type.sql — add promotion_type to the hourly PK (live/product share fix).
-- Live-15min + product-hourly interleave on the same (shop, campaign, slot):
-- without type in the PK one type silently overwrites the other when the
-- campaign map is stale. Owner: run in Neon SQL Editor on DEV then PROD
-- (IF EXISTS / IF NOT EXISTS, safe rerun). Never edit applied files; next = 033.

ALTER TABLE gmv.hourly_campaign_metrics
  DROP CONSTRAINT IF EXISTS hourly_campaign_metrics_pkey;

ALTER TABLE gmv.hourly_campaign_metrics
  ADD CONSTRAINT hourly_campaign_metrics_pkey
  PRIMARY KEY (shop_id, campaign_id, hour_slot, promotion_type);