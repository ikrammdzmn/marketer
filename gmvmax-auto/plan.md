# GMV Max Auto — P0 plan

Status: P0 skeleton landed (local file-first, 2026-09-19). Neon GREEN (dev+prod 2/7). Business API app PENDING approval; Shop Custom app created. Real GET wiring waits on approval.

## 1. Goal

Read-only visibility: Neon online + TikTok app paperwork moving + collector pulls GMV/spend/ROI into DB + skeleton dashboard renders it. No auto-adjust, no budget writes, no Telegram actions in P0.

## 2. Scope

### Neon (acct first, gmv second)

- [x] Create one Neon project, region Singapore, DEV + PROD branches (TIKTOK DATA, verified 2026-09-19)
- [x] `NEON_URL_DEV` / `NEON_URL_PROD` in env / gitignored file only, never in git
- [x] Numbered migrations: `core` (shops, users, audit) → `acct_tokens` (encrypted) + `acct_videos` → `gmv_shops, gmv_campaigns, gmv_snapshots_30m_1h, gmv_rules, gmv_approvals, gmv_action_logs, gmv_monthly_spend` (files written, not yet applied — needs Neon project)
- [x] Numbered migrations applied via 004_fix (acct=2, gmv=7 on dev+prod, `win` not `window`); per-schema roles deferred to P1 (owner-only for P0)
- [x] `GMV_ENC_KEY = secrets.token_urlsafe(32)` generated once, offline backup; `cryptography` Fernet approved for this folder only
- [ ] Heartbeat + `checker silent >40m` alert design noted (build in P1)
- [ ] Rotate any Production secret once pasted in chat

### TikTok app application checklist (paperwork, no code dependency)

- [x] New Business API app at `business-api.tiktok.com` (Display app cannot extend) — `TIKTOK GMV MAX` submitted 2026-09-19, PENDING approval; redirect `http://localhost:8082/callback` (IP form rejected); scopes All on Ad account + Ads + Reporting
- [x] Shop Open API Custom app (Partner Center, MY, eCommerce Connectors, `HIMWELLNESS GMV MAX INTERNAL`) created; `SHOP_APP_KEY/SECRET` in gitignored `.local_secrets.json`
- [ ] Record: sandbox vs prod keys/redirects, scopes requested (read-only first acceptable), advertiser OAuth + shop auth flow — sandbox ad account locked until Business approval
- [ ] Sandbox approved → note write-scope status (read-only vs write); P0 proceeds read-only either way

### Read-only collector (`collector.py`)

- [x] 30m pulls, Closed-window only (act on T-2h slot, never newest; lag 15m–2h) — stub tick verified 2026-09-19
- [x] Skip 02:00–06:00 MYT pull-actions (customizable later), cache + backoff, 1-shop rate fine (~48/day) — file cache working, real GET wiring waits on sandbox keys
- [ ] Endpoints: `GET campaign/gmv_max/info`, `GET gmv_max/report/get` (GMV/spend/ROI), session list; NO `POST update` in P0
- [x] Dual-write file + Neon first, dashboard serves memory/file cache (works offline) — file path done, Neon insert best-effort stub
- [ ] Lock net-vs-gross ROI definition before first rule (May-2026: ROI now includes affiliate/coupons/fees)

### Skeleton dashboard (`dashboard/`, clone tiktok-account pattern)

- [x] Python stdlib server + vanilla JS + Tailwind CDN, `127.0.0.1` only, one server at a time (owns 8082, smoke on 8099 OK 2026-09-19)
- [x] Campaign picker (LIVE + Product), 30m/1h table, data-freshness timestamp + API branch badge (DEV/PROD) — shows LOCAL-FILE until Neon keys set
- [x] 50d chart placeholder, rules/approval UI stubbed (greyed, P1/P2)
- [x] Strategy guardrails visible: ROI ≥7.0, CPA ≤RM21.18, scale ≤20–25%/24h, no edits 16:00–17:30, dead zones respected

## 3. Verify (per change)

`python -m py_compile` + `node --check` extracted JS + HTTP smoke on scratch port + kill servers + `git status` clean of secrets.

## 4. Exit criteria

Neon reachable from dashboard cache → collector writes 48 consecutive 30m snapshots → dashboard shows closed-window GMV/spend/ROI with freshness stamp → app sandbox read-only live.

## 5. Non-goals (P1+)

No decider writes, no Telegram actions, no approvals queue live, no monthly kill-switch enforcement, no email/PWA, no `acct` file→DB cutover.

## 6. Source of truth

Detail: `gmvmax-auto/masterplan.md` §9 phases (P0 first, on explicit go). Neon rollout: `tiktok-account/NEON_NOTE.md`.
