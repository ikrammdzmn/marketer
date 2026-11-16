-- 039_general_bands.sql — system-wide ROI color bands (editable in /presets General tab).
-- Single active row (key='roi'): cutoffs tick_at > green_at > yellow_at > red_at.
-- Below red_at = red + warning icon. Readers tolerate pre-039 DBs via
-- hardcoded GENERAL_BANDS_DEFAULT in ttam-scores.ts — never fail-open blank.
-- Owner runs on dev + prod. Never edit after apply; next = 040+.

CREATE TABLE IF NOT EXISTS core.general_bands (
  key TEXT NOT NULL PRIMARY KEY,
  tick_at NUMERIC NOT NULL DEFAULT 10,
  green_at NUMERIC NOT NULL DEFAULT 7.5,
  yellow_at NUMERIC NOT NULL DEFAULT 5,
  red_at NUMERIC NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT INTO core.general_bands (key, tick_at, green_at, yellow_at, red_at, updated_by)
VALUES ('roi', 10, 7.5, 5, 4, 'seed')
ON CONFLICT (key) DO NOTHING;
