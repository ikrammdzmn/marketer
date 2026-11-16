-- Cadangan skema PostgreSQL untuk Creative Analisis. Belum dijalankan terhadap pangkalan data sebenar.
-- Semua ID TikTok disimpan sebagai TEXT (melebihi 2^53). Wang dalam MYR, NUMERIC(14,2).

CREATE TABLE oauth_token (            -- satu baris; kunci baris semasa refresh (SELECT ... FOR UPDATE)
  id              TEXT PRIMARY KEY,   -- cth 'shop'
  access_token    TEXT NOT NULL,
  access_expires  TIMESTAMPTZ NOT NULL,
  refresh_token   TEXT NOT NULL,      -- berputar; simpan yang BARU setiap refresh
  shop_cipher     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Disyorkan: enkripsi pada lapisan aplikasi atau guna secret manager; jangan log nilai.

CREATE TABLE job_state (
  job        TEXT PRIMARY KEY,
  cursor     JSONB,
  last_ok    TIMESTAMPTZ,
  last_error TEXT
);

CREATE TABLE video (
  video_id         TEXT PRIMARY KEY,           -- = item_id Marketing API
  username         TEXT,
  caption          TEXT,
  duration_s       INT,
  hashtags         TEXT,
  products         TEXT,
  posted_from_id   TIMESTAMPTZ,                -- (id >> 32) saat unix; lihat docs/05
  posted_api       TIMESTAMPTZ,                -- post_time Shop API; zon masa perlu disahkan
  account_class    TEXT,                       -- terpaut | affiliate | internal (dikira, boleh dioverride)
  hook             TEXT,
  angle            TEXT,
  cover_url        TEXT,
  in_main1         BOOLEAN DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE video_day_ads (          -- daily_video_ads; daily_videos = WHERE orders > 0
  video_id    TEXT NOT NULL,
  date        DATE NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT '1858977225474178',
  orders      INT NOT NULL DEFAULT 0,
  gmv         NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost        NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks      BIGINT NOT NULL DEFAULT 0,
  cvr         NUMERIC(8,2),
  v2s         NUMERIC(8,2),
  p25         NUMERIC(8,2),
  PRIMARY KEY (video_id, date)
);
CREATE INDEX ON video_day_ads (date);

CREATE TABLE video_day_organic (      -- organic_daily
  video_id   TEXT NOT NULL,
  date       DATE NOT NULL,
  views      BIGINT NOT NULL DEFAULT 0,
  ctr        NUMERIC(10,6),
  gmv        NUMERIC(14,2),
  sku_orders INT,
  imp        BIGINT,                    -- impression PRODUK; NULL = belum ditarik
  clicks     BIGINT,
  PRIMARY KEY (video_id, date)
);
CREATE INDEX ON video_day_organic (date);

CREATE TABLE campaign_day (           -- product / live
  kind          TEXT NOT NULL CHECK (kind IN ('product','live')),
  campaign_id   TEXT,
  campaign_name TEXT NOT NULL,
  date          DATE NOT NULL,
  cost          NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders        INT NOT NULL DEFAULT 0,
  gmv           NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, campaign_name, date)
);

CREATE TABLE ads_manager_day (
  campaign_id   TEXT,
  campaign_name TEXT NOT NULL,
  jenis         TEXT,
  objective     TEXT,
  date          DATE NOT NULL,
  spend NUMERIC(14,2), impressions BIGINT, clicks BIGINT, plays BIGINT,
  p25 BIGINT, p100 BIGINT, engaged BIGINT, likes BIGINT, shares BIGINT, follows BIGINT,
  PRIMARY KEY (campaign_name, date)
);

CREATE TABLE live_room (
  room_id TEXT PRIMARY KEY,
  started TIMESTAMPTZ,                -- (room_id >> 32) saat unix
  gmv NUMERIC(14,2), orders INT, cost NUMERIC(14,2), views BIGINT, follows INT
);

CREATE TABLE video_insight (
  video_id TEXT PRIMARY KEY,
  hook     JSONB,   -- [[bm,en],...]
  stay     JSONB,
  win      JSONB,
  built_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE config (key TEXT PRIMARY KEY, value JSONB);  -- margin 0.35, ambang, senarai internal
