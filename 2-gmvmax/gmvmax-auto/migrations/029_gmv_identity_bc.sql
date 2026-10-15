-- 029_gmv_identity_bc.sql — per-BC identity recovery for the affiliate tail
-- Diagnosis Oct 2026: 76 LIVE campaigns parked as identity_unmapped — each HAS
-- an identity, but under a different BC than the store map (27 names). The
-- info response carries identity_authorized_bc_id per campaign; the reader
-- fetches one identity map per BC (<=4/Fetch) to resolve them.
-- This migration stores that BC and re-queues the 76 exactly once.
-- Tolerate pre-029 DBs. Never edit applied files.

ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS identity_bc TEXT;
UPDATE gmv.gmv_campaigns
SET enrich_tried_at = NULL, enrich_fail = NULL
WHERE enrich_fail = 'identity_unmapped';
