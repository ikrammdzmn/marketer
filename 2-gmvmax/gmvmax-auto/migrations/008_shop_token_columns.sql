-- 008_shop_token_columns.sql — align shop token store with proven shape
-- (temp-marketplace credentials.refresh_tiktokshops_token). New file, never edit 001-007.
-- Adds display name, shop cipher (required by /order/202309/orders/search),
-- and expiry columns for auto-refresh. Apply via Neon SQL Editor (dev first, then prod).

ALTER TABLE IF EXISTS credentials.shop_tokens ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE IF EXISTS credentials.shop_tokens ADD COLUMN IF NOT EXISTS shop_cipher TEXT;
ALTER TABLE IF EXISTS credentials.shop_tokens ADD COLUMN IF NOT EXISTS access_token_expire_in BIGINT;
ALTER TABLE IF EXISTS credentials.shop_tokens ADD COLUMN IF NOT EXISTS refresh_token_expire_in BIGINT;
