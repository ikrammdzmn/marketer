-- 027_gmv_account_api.sql — LIVE TT-account display names (bracket stays source of truth)
-- Verified Oct 2026: report tt_account_name/identity_id return "0" (permission
-- wall, doc :4531/:4547); but campaign/gmv_max/info carries identity_list and
-- gmv_max/identity/get (advertiser_id + store_id + store_authorized_bc_id)
-- resolves identity_id -> display_name/user_name (probe: fcba7163 -> Dr. Samhan).
-- All writers MUST tolerate pre-027 DBs (account_api/account_user/identity_id
-- may not exist until the owner runs this on dev+prod). Never edit applied files.

ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS account_api TEXT;
ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS account_user TEXT;
ALTER TABLE gmv.gmv_campaigns ADD COLUMN IF NOT EXISTS identity_id TEXT;
