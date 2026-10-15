-- 026_allowlist_display_name.sql — cosmetic display name for allowlisted accounts.
-- Run on dev first, verify, then prod. Never edit after applying; next change = 027+.
-- Email stays the login key; display_name is shown in the UI instead of the raw email.

ALTER TABLE core.access_allowlist ADD COLUMN IF NOT EXISTS display_name TEXT;
