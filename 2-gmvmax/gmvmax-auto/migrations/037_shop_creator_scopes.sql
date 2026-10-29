-- 037_shop_creator_scopes.sql — prove-what-was-granted columns on the creator
-- token store. The creator exchange carries no username (only open_id, and
-- seller_name is empty on this flow), so rows otherwise show "@?". Storing
-- the granted scope list + user_type names WHAT each grant unlocks
-- (expect creator.data.live.read.public on Live Data grants).
-- Nullable + writers tolerate pre-037 DBs (fail-open: empty string).
-- Owner runs on dev + prod. Never edit after apply; next = 038+.

ALTER TABLE credentials.shop_creator_tokens
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT '';
