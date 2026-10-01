-- 006_status.sql — campaign on/off status (new file, never edit 001-005).
-- Adds raw API row + normalized status to the campaign cache.
-- Apply via Neon SQL Editor (dev first, verify, then prod).

ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE IF EXISTS gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS raw JSONB;
CREATE INDEX IF NOT EXISTS idx_gmv_campaigns_status ON gmv.gmv_campaigns (status);
