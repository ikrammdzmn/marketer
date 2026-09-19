-- 002_acct.sql — acct schema (tiktok-account owns). Encrypted tokens, never plaintext.
CREATE SCHEMA IF NOT EXISTS acct;

-- NOTE: token_ciphertext is Fernet-encrypted (GMV_ENC_KEY). Never add plaintext token columns.
CREATE TABLE IF NOT EXISTS acct_tokens (
  account TEXT PRIMARY KEY,
  token_ciphertext TEXT NOT NULL,
  linked_as TEXT,
  mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_videos (
  account TEXT NOT NULL,
  video_id TEXT NOT NULL,
  snapshot_ts TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (account, video_id, snapshot_ts)
);
CREATE INDEX IF NOT EXISTS idx_acct_videos_ts ON acct_videos (account, snapshot_ts DESC);

-- Role (run once as owner):
-- CREATE ROLE acct_app WITH LOGIN PASSWORD '<secret>';
-- GRANT USAGE ON SCHEMA acct TO acct_app;
-- GRANT ALL ON acct_tokens, acct_videos TO acct_app;
