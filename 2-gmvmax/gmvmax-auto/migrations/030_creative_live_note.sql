-- 030_creative_live_note.sql -- live-note column for creative accounts (only meaningful when live=TRUE).
-- Owner runs on dev + prod. Never edit after apply; next = 031+.
ALTER TABLE creative.accounts ADD COLUMN IF NOT EXISTS live_note TEXT NOT NULL DEFAULT '';
