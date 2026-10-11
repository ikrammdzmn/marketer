-- 022_creative_identity.sql -- Ads Identity ID per TikTok account (owner-typed, display + Germeni matching).
-- Owner runs on dev + prod. Never edit after apply; next = 023+.
ALTER TABLE creative.accounts ADD COLUMN IF NOT EXISTS identity_id TEXT NOT NULL DEFAULT '';
