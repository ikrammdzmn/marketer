-- 013_access_allowlist.sql — Google sign-in allowlist managed by a fixed bootstrap admin.
-- Run on dev first, verify, then prod. Never edit after applying; next change = 014+.

CREATE TABLE IF NOT EXISTS core.access_allowlist (
  email TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT access_allowlist_email_lower CHECK (email = lower(email)),
  CONSTRAINT access_allowlist_email_nonempty CHECK (length(trim(email)) > 0),
  CONSTRAINT access_allowlist_email_length CHECK (length(email) <= 254)
);

REVOKE ALL ON TABLE core.access_allowlist FROM PUBLIC;
