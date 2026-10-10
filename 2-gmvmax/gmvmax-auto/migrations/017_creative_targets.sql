-- 017_creative_targets.sql — SOP targets for the creative module (single row).
-- Owner runs on dev + prod. Seeded from the local tool's targets.json (20/null/null).
-- Never edit after apply; next = 018+.
CREATE TABLE IF NOT EXISTS creative.targets (id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), top_n INT NOT NULL DEFAULT 20, min_impr INT NULL, max_cpm NUMERIC NULL);
INSERT INTO creative.targets (id, top_n, min_impr, max_cpm) VALUES (1, 20, NULL, NULL) ON CONFLICT (id) DO NOTHING;
