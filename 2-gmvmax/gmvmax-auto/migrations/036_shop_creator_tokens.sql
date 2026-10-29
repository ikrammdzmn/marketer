-- 036_shop_creator_tokens.sql — per-creator token store for the Analytics app
-- (creator.data.live.read.public scope: Live Room APIs on AFFILIATE rooms,
-- which 28001022-deny the seller token by design).
-- Grain: one row per (shop_id, creator_open_id). Creators re-grant
-- individually via the temp /shop-auth/grant page (10-min admin-minted
-- links); tokens refresh the same way as shop tokens when a refresh_token
-- is present. Readers tolerate pre-036 DBs (empty creator list + clear
-- "run 036" signal instead of a crash).
-- Owner runs on dev + prod. Never edit after apply; next = 037+.

CREATE SCHEMA IF NOT EXISTS credentials;

CREATE TABLE IF NOT EXISTS credentials.shop_creator_tokens (
  shop_id TEXT NOT NULL,
  creator_open_id TEXT NOT NULL,
  creator_user TEXT,
  creator_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  access_token_expire_in BIGINT,
  refresh_token_expire_in BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, creator_open_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_creator_tokens_shop
  ON credentials.shop_creator_tokens (shop_id);
