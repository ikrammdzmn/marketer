# tiktok-shop — plan

Status: folder created 2026-09-21. Shop Custom app created (MY), keys local.
Seller read-only wiring not started. No writes in P0.

## 1. Goal

One shop authorization → per-video sales + performance for ALL shoppable
videos (no 10-account login): `item_id/title/publish_time + vv_cnt +
GMV/direct-GMV + item_sold_cnt + CTR + completion_rate`.

## 2. Scope

### App + auth (paperwork, no code dependency)

- [x] Shop Partner Center Custom app (MY, eCommerce Connectors,
  `HIMWELLNESS GMV MAX INTERNAL`) created; `SHOP_APP_KEY/SECRET` in
  gitignored `.local_secrets.json` (lengths-only verify)
- [ ] Record sandbox vs prod keys/redirects (`http://localhost:8083/callback`),
  Seller scopes requested (read-only first acceptable)
- [ ] Shop authorize for MY shop (advertiser OAuth + shop auth); note token
  refresh + expiry behavior
- [ ] Rotate any Production secret once pasted in chat

### Read-only pull (P0)

- [ ] Confirm current Seller paths + scopes in Partner Center
  (`/affiliate_seller/` generations `202405`/`202412` move — verify live):
  `orders/search`, creator/marketplace search, video analytics list
- [ ] Creator endpoints (`/affiliate_creator/`) explicitly out of scope
  (per-creator auth = same 1-by-1 pain)
- [ ] Date-range pulls (start/end), pagination (page/per_page), product filter
  (`product_id`), zero-GMV include flag
- [ ] Closed-window only (lag; never newest slot); file-first `cache/` so
  dashboard works offline; Neon `shop_*` tables deferred to P1
- [ ] Join key = Video ID (`video.id` ↔ creative `video_id` ↔ `item_id`);
  display join to `tiktok-account/` organic + `gmvmax-auto/` spend/ROI

### Dashboard (clone pattern)

- [ ] Python stdlib server + vanilla JS + Tailwind CDN, `127.0.0.1` only,
  owns 8083 (smoke on scratch port)
- [ ] Video table (GMV/units/orders/views/refunds), product + creator filters,
  post-date filter, freshness timestamp
- [ ] Rules/approval UI stubbed grey (P1+)

## 3. Verify (per change)

`python -m py_compile` + `node --check` extracted JS + HTTP smoke on scratch
port + kill servers + `git status` clean of secrets.

## 4. Exit criteria

Shop authorize live → one pull returns all shoppable videos with GMV/units/
orders/views → dashboard renders with freshness stamp → Video-ID join proven
against one Display CSV.

## 5. Non-goals (P1+)

No inventory/order writes, no sample-approval automation (human gate),
no Neon cutover, no Telegram/email actions, no `tiktok-account/` edits.

## 6. Source of truth

Folder rules: `tiktok-shop/AGENTS.md`. Ads half: `gmvmax-auto/plan.md` +
`masterplan.md` §4. Guardrails owner: `tiktok-strategy/AGENTS.md`
(ROI ≥7.0, CPA ≤RM21.18). Accounts source:
`tiktok-creative-analysis/data/accounts.json`.
