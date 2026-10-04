-- 010_campaign_budget.sql — daily budget per GMV campaign for Telegram budget% lines.
-- Source: gmv_max/campaign/get response (field varies by account — captured
-- with fallbacks in syncShopCampaigns). NULL = unknown (row omits bud part).
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC;
