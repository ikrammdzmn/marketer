-- 025_shop_analytics_tokens.sql — token store for the second Shop Custom app
-- (Analytics & Reporting category: LIVE minute performance). Mirrors the
-- 007/008 shop_tokens shape so the server auth callback can persist per-app
-- tokens without touching the working orders path. New file, never edit 001-024.
-- Apply via Neon SQL Editor (dev first, verify, then prod). Writers tolerate
-- pre-025 DBs (env fallback + clear "run 025" error instead of a crash).

CREATE SCHEMA IF NOT EXISTS credentials;

CREATE TABLE IF NOT EXISTS credentials.shop_analytics_tokens (
  shop_id TEXT PRIMARY KEY,
  shop_number INTEGER NOT NULL,
  display_name TEXT,
  shop_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  shop_cipher TEXT,
  access_token_expire_in BIGINT,
  refresh_token_expire_in BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_analytics_tokens_number
  ON credentials.shop_analytics_tokens (shop_number);
