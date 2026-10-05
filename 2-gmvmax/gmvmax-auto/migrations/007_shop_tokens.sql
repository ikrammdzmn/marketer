-- 007_shop_tokens.sql — shop-order GMV numerator, shop 1 only (new file, never edit 001-006).
-- Shop Open API token store (per-shop, DB-first, env fallback). Shop 1: 7495609155379170274.
-- Apply via Neon SQL Editor (dev first, verify, then prod).

CREATE SCHEMA IF NOT EXISTS credentials;

CREATE TABLE IF NOT EXISTS credentials.shop_tokens (
  shop_id TEXT PRIMARY KEY,
  shop_number INTEGER NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_in BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_tokens_number ON credentials.shop_tokens (shop_number);
