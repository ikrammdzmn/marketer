-- 011_campaign_delivery.sql — delivery state per GMV campaign (Active / Not delivering / ...).
-- Source: campaign/get `secondary_status` (fallback `delivery_status`), stored raw.
-- Distinct from `status` (ON/OFF toggle from `operation_status`).
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS delivery TEXT;
