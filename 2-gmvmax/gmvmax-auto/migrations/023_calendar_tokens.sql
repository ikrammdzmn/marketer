-- 023_calendar_tokens.sql -- per-user Google Calendar OAuth tokens (read-only agenda).
-- Owner runs on dev + prod. Tokens are user secrets: never SELECT these rows
-- into chat/logs; the API only ever returns event titles/times. Never edit
-- after apply; next = 024+.
CREATE TABLE IF NOT EXISTS core.calendar_tokens (
  email TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  expiry TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
