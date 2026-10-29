-- 035_creative_item_meta.sql — TikTok post publish time per creative (true Time posted).
-- Grain: one row per item_id (Post ID). posted_at is immutable once known.
-- Enrichment is fail-open (ad/get create_time, file/video/ad/info, gmv_max/video/get).
-- Owner runs on dev + prod. Never edit after apply; next = 036+.
CREATE TABLE IF NOT EXISTS creative.item_meta (
  item_id TEXT PRIMARY KEY,
  posted_at TIMESTAMPTZ NULL,
  source TEXT NOT NULL DEFAULT '',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
