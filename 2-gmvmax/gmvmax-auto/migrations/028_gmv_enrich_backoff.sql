-- 028_gmv_enrich_backoff.sql — stop unresolvable campaigns hogging lookup slots
-- Symptom Oct 2026: account backlog drained 2/Fetch instead of ~15 because
-- campaigns that can never resolve (unlimited budgets with no budget value,
-- affiliate/unauthorized identities outside the identity map) retried every
-- Fetch at top-spend priority, starving the resolvable tail.
-- Writers stamp enrich_tried_at + enrich_fail on every attempt; readers sort
-- never-tried/stale (>7d) first so failures back off weekly instead of blocking.
-- Tolerate pre-028 DBs (columns may not exist until the owner runs this).
-- Never edit applied files.

ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS enrich_tried_at TIMESTAMPTZ;
ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS enrich_fail TEXT;
