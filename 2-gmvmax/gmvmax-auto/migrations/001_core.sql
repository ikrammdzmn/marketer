-- 001_core.sql — core schema (shared, entire repo). Numbered, never edit after apply.
CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.shops (
  shop_id TEXT PRIMARY KEY,
  region TEXT NOT NULL DEFAULT 'MY',
  currency TEXT NOT NULL DEFAULT 'MYR',
  tz TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.users (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.audit (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail JSONB
);
