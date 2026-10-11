-- 024_calendar_settings.sql -- agenda exclude-keyword list (one row, id = 1).
-- Owner runs on dev + prod. Never edit after apply; next = 025+.
-- (023_calendar_tokens.sql is skipped — per-user OAuth was dropped.)
CREATE TABLE IF NOT EXISTS core.calendar_settings (
  id INT PRIMARY KEY,
  hidden TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO core.calendar_settings (id, hidden) VALUES (1, '[]') ON CONFLICT (id) DO NOTHING;
