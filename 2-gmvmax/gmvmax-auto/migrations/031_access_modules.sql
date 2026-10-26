-- 031_access_modules.sql -- per-user module scopes for permission control (deny-by-default).
-- Owner runs on dev + prod. Never edit after apply; next = 032+.
-- 'all' = full access (pre-031 behavior, also the default for existing rows).
-- Scoped users store a comma-separated module list, e.g. 'accounts' or 'accounts,catalog'.
ALTER TABLE core.access_allowlist ADD COLUMN IF NOT EXISTS modules TEXT NOT NULL DEFAULT 'all';
