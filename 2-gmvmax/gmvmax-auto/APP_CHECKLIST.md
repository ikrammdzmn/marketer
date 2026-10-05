# APP_CHECKLIST.md — TikTok app paperwork (P0, no code dependency)

> Display app (`video.list`, Login Kit) CANNOT be extended. New app required.

- [ ] Create Business API app at `business-api.tiktok.com` (sandbox + prod tracked separately)
- [ ] Record sandbox keys/redirects (`127.0.0.1` desktop flow); prod keys/redirects separately
- [ ] Request scopes: read-only first acceptable (`campaign/gmv_max/info`, `gmv_max/report/get`, session list). Note write-scope status: read-only / write-approved
- [ ] Shop Open API authorization for MY shop (advertiser OAuth + shop auth)
- [ ] Sandbox read-only live → paste NOTHING secret in chat; store in `.local_secrets.json` (gitignored) or env
- [ ] If any Production secret was pasted in chat before 2026-09-17 → rotate in portal immediately

P0 proceeds read-only either way. Writes (P2) need write-scope approval. Approval-pending = expected non-issue (20 Sep): wait, file-first continues.
