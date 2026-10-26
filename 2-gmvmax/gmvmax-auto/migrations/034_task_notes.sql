-- 034_task_notes.sql — shared dated task notes (owner + agent write channel).
-- TTAM review dates, kill/scale calls, general reminders. Displayed merged
-- with Google events on /calendar. created_by marks who added the row.
-- Owner: run in Neon SQL Editor on DEV then PROD (IF NOT EXISTS, safe rerun).
-- Never edit applied files; next migration = 035.

CREATE TABLE IF NOT EXISTS gmv.task_notes (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'general' CHECK (kind IN ('ttam', 'gmv', 'general')),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL DEFAULT 'owner' CHECK (created_by IN ('owner', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gmv_task_notes_date
  ON gmv.task_notes (date);
