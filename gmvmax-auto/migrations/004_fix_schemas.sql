-- 004_fix_schemas.sql — fix P0 mistakes: tables landed in public + reserved `window` col.
-- P0 has no real data yet, so DROP public dupes and recreate schema-qualified.
DROP TABLE IF EXISTS public.acct_tokens CASCADE;
DROP TABLE IF EXISTS public.acct_videos CASCADE;
DROP TABLE IF EXISTS public.gmv_shops CASCADE;
DROP TABLE IF EXISTS public.gmv_campaigns CASCADE;
DROP TABLE IF EXISTS public.gmv_snapshots CASCADE;
DROP TABLE IF EXISTS public.gmv_rules CASCADE;
DROP TABLE IF EXISTS public.gmv_approvals CASCADE;
DROP TABLE IF EXISTS public.gmv_action_logs CASCADE;
DROP TABLE IF EXISTS public.gmv_monthly_spend CASCADE;

CREATE TABLE IF NOT EXISTS acct.acct_tokens (
  account TEXT PRIMARY KEY,
  token_ciphertext TEXT NOT NULL,
  linked_as TEXT,
  mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct.acct_videos (
  account TEXT NOT NULL,
  video_id TEXT NOT NULL,
  snapshot_ts TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (account, video_id, snapshot_ts)
);
CREATE INDEX IF NOT EXISTS idx_acct_videos_ts ON acct.acct_videos (account, snapshot_ts DESC);

CREATE TABLE IF NOT EXISTS gmv.gmv_shops (
  shop_id TEXT PRIMARY KEY REFERENCES core.shops(shop_id),
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS gmv.gmv_campaigns (
  campaign_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES gmv.gmv_shops(shop_id),
  kind TEXT NOT NULL CHECK (kind IN ('LIVE','PRODUCT')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE: `window` is a Postgres reserved word — column is `win` ('30m'/'1h').
CREATE TABLE IF NOT EXISTS gmv.gmv_snapshots (
  campaign_id TEXT NOT NULL REFERENCES gmv.gmv_campaigns(campaign_id),
  ts TIMESTAMPTZ NOT NULL,
  win TEXT NOT NULL CHECK (win IN ('30m','1h')),
  spend NUMERIC,
  gmv NUMERIC,
  roi NUMERIC,
  roi_basis TEXT NOT NULL DEFAULT 'gross_pending_lock',
  raw JSONB,
  PRIMARY KEY (campaign_id, ts, win)
);
CREATE INDEX IF NOT EXISTS idx_gmv_snapshots_ts ON gmv.gmv_snapshots (campaign_id, ts DESC);

CREATE TABLE IF NOT EXISTS gmv.gmv_rules (
  rule_id TEXT PRIMARY KEY,
  spec JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gmv.gmv_approvals (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_id TEXT NOT NULL,
  action JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited')),
  decided_by TEXT
);

CREATE TABLE IF NOT EXISTS gmv.gmv_action_logs (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_id TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  action JSONB NOT NULL,
  result JSONB
);

CREATE TABLE IF NOT EXISTS gmv.gmv_monthly_spend (
  shop_id TEXT NOT NULL,
  month TEXT NOT NULL,
  spend NUMERIC NOT NULL DEFAULT 0,
  cap NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, month)
);
