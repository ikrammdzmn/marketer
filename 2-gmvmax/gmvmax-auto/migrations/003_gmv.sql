-- 003_gmv.sql — gmv schema (this project). P0 read-only snapshots; rules/approvals stubbed for P1/P2.
CREATE SCHEMA IF NOT EXISTS gmv;

CREATE TABLE IF NOT EXISTS gmv_shops (
  shop_id TEXT PRIMARY KEY REFERENCES core.shops(shop_id),
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS gmv_campaigns (
  campaign_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES gmv_shops(shop_id),
  kind TEXT NOT NULL CHECK (kind IN ('LIVE','PRODUCT')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Closed-window snapshots only (collector writes T-2h slots, never newest).
CREATE TABLE IF NOT EXISTS gmv_snapshots (
  campaign_id TEXT NOT NULL REFERENCES gmv_campaigns(campaign_id),
  ts TIMESTAMPTZ NOT NULL,
  window TEXT NOT NULL CHECK (window IN ('30m','1h')),
  spend NUMERIC,
  gmv NUMERIC,
  roi NUMERIC,
  roi_basis TEXT NOT NULL DEFAULT 'gross_pending_lock',
  raw JSONB,
  PRIMARY KEY (campaign_id, ts, window)
);
CREATE INDEX IF NOT EXISTS idx_gmv_snapshots_ts ON gmv_snapshots (campaign_id, ts DESC);

CREATE TABLE IF NOT EXISTS gmv_rules (
  rule_id TEXT PRIMARY KEY,
  spec JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gmv_approvals (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_id TEXT NOT NULL,
  action JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited')),
  decided_by TEXT
);

CREATE TABLE IF NOT EXISTS gmv_action_logs (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_id TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  action JSONB NOT NULL,
  result JSONB
);

CREATE TABLE IF NOT EXISTS gmv_monthly_spend (
  shop_id TEXT NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM (calendar month, Asia/Kuala_Lumpur)
  spend NUMERIC NOT NULL DEFAULT 0,
  cap NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, month)
);

-- Role (run once as owner):
-- CREATE ROLE gmv_app WITH LOGIN PASSWORD '<secret>';
-- GRANT USAGE ON SCHEMA gmv TO gmv_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA gmv TO gmv_app;
