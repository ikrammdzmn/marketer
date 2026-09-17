# GMV Max Auto-Adjustment — Masterplan

> Single source of truth for this project. Decisions below are locked unless explicitly changed.
> Status: PLAN LOCKED, P0 not started. Dashboard + auto-adjust for internal team.

## 1. Goal & users
- Internal team tool for 1 TikTok Shop (Malaysia, MYR, GMT+8 Asia_Kuala_Lumpur).
- Both LIVE GMV Max + Product GMV Max. Focus v1: **budget adjustment only** (daily budget via API, calendar-month cap enforced locally).
- Modes: dashboard (30m + 1h performance review) + hybrid auto-adjust (small auto, big needs approval) + full manual override when user disagrees with suggestion.
- Extensible: custom thresholds, custom checker timing, custom guardrail %, kill-switch, max spend — all customizable later. More custom adjustment types in future.

## 2. Locked decisions (from Q&A)
1. Triggers: ROAS/GMV/spend + budget/pacing + creative/product signals. Thresholds fully customizable.
2. Actions v1: change budget only (daily native, monthly as local kill-switch/pacing).
3. Autonomy: hybrid (auto small, human approval big). Approver: owner. Pending queue with Approve / Edit (custom budget) / Reject.
4. Guardrails: yes, customizable later (% per step, daily cap, cooldown, min ROAS, monthly cap, 02:00–06:00 pause window customizable).
5. Monthly: calendar month (not rolling). Monthly cap = local logic: `month_spent >= cap → downscale to min / pause` + daily pacing `remaining/days_left`.
6. Quiet hours: pause/scale-down 02:00–06:00 MYT, customizable.
7. Notifications: Telegram DM now (group later) + browser/PWA + email. LINE skipped. Telegram needs no TikTok approval (BotFather BOT_TOKEN + CHAT_ID).
8. History: 50 days snapshots, backtest view (spend vs GMV vs actions).
9. Tech: no stack yet — reuse `tiktok-account/dashboard` pattern (Python stdlib server + vanilla JS + Tailwind CDN, 127.0.0.1 first). Checker interval customizable.
10. DB: Neon (Singapore region) for entire repo. Start from zero. `acct` schema first (migrate tiktok-account), `gmv` second.
11. Token storage: prototype may use `.local_secrets.json`/env; production uses Neon encrypted (see §5).

## 3. What we learned about GMV Max (from gmvmax.md + docs)
- 1 continuous campaign per SKU (Product) and 1 per account (LIVE). No horizontal duplication. Variants under one listing share one campaign; new listings needed for separate bundles.
- High Target ROI (≥7.0 to cover ~25% fees) chokes spend (~RM450/d example): algorithm harvests warm traffic only, refuses cold. Raising budget alone will NOT raise spend in this state.
- Creative auto-ingestion: system pulls attached/affiliate videos; buyer levers are Boost / Remove only. Favorite-child problem (1-2 videos eat all spend). Funnel columns: Exploration status, Cost, SKU orders, CPA, 2s view, CTR, CVR.
- TTAM ↔ GMV Max symbiosis: TTAM feeds warm traffic, GMV Max closes. GMV Max alone at high ROI cannot scale.
- LIVE with AI stream 16h, no in-stream deals → dashboard dayparting required (surge 20:30–23:30, dial back midnight, dead 02:00–05:00).
- May-2026 update: GMV Max ROI now includes seller costs (affiliate commission, coupons, platform fees). Must lock whether thresholds use net or gross ROI.
- Attribution: Product = 1-day window, same-day orders; LIVE = session-based, learning resets per session. Reports lag 15m–2h — never act on newest slot.

## 4. API capability (Marketing API + Shop Open API)
- New Business API app required (`business-api.tiktok.com`). Current Display app (`video.list`, Login Kit) cannot be extended — different product, auth, approval.
- Endpoints: `GET campaign/gmv_max/info`, `POST campaign/gmv_max/update` (budget), `GET gmv_max/report/get` (GMV/spend/ROI), session list/update, shop/product lookup, creative boost sessions.
- Deprecated: old Video/Product/LIVE Shopping Ads (Jul-2025 migration) — GMV Max is the only Sales-objective format. Old `gmv max ads reports` deprecated in favor of `/gmv_max/report/get/`.
- Auth: advertiser OAuth + shop authorization for MY shop. Sandbox first (separate keys/redirects like before). Write scope stricter — may get read-only first.
- Rate: 30m pulls (~48/day × campaigns) fine for 1 shop with caching + backoff.

## 5. Shared Neon design (entire repo)
- One Neon project (SG), multiple schemas: `core` (shops, users, audit) / `acct` (tiktok-account) / `gmv` (this project) / reserve `strategy`, `creative`.
- `acct_*`: tokens (encrypted), video snapshots. `gmv_*`: shops, campaigns, snapshots_30m_1h, rules, approvals, action_logs, monthly_spend.
- Roles per schema (`acct_app`, `gmv_app`), DEV vs PROD branches (`NEON_URL_DEV`/`NEON_URL_PROD`), numbered migrations, indexes on `(campaign_id, ts)`, 50d TTL.
- Encryption: generate `GMV_ENC_KEY = secrets.token_urlsafe(32)` once, store in env/gitignored file (backup offline), `pip install cryptography` Fernet encrypt-before-insert, rotate pasted Production secret in portal immediately. Prototype may keep tokens in files; P1 moves to encrypted Neon.
- Cache: checker writes Neon; dashboard caches to memory/file every 5m; UI serves cache (works offline). Pooler 1–5 conns, 5s timeout, heartbeat every 5m (free-tier sleep), "checker silent >40m" Telegram alert.

## 6. Architecture (new folder `gmvmax-auto/`, sibling to `tiktok-account/`)
- `auth.py` — advertiser + shop OAuth + refresh → Neon encrypted.
- `collector.py` — 30m/1h pulls, Closed-window only (T-2h), skip 02–06 (custom), store snapshots.
- `decider.py` — custom rules; special-case `low spend + high ROI` → suggest ROI/creative review, not +budget.
- `actor.py` — single-process lock + cooldown + idempotency key; auto if delta ≤ X%, else pending.
- `notify.py` — Telegram `sendMessage` + email; browser/PWA push later (needs HTTPS/VAPID).
- `dashboard/` — clone pattern: campaign picker, 30m/1h table, rule editor, approval queue + manual budget box, 50d chart, branch badge.
- `tester.py`-equivalent stays file-based fallback; new work in `dashboard/`.

## 7. Guardrails (customizable)
max %/step, daily cap, cooldown mins, min ROAS hold, monthly calendar cap kill-switch, quiet-hours action (budget-to-min preferred over pause to avoid LIVE relearn).

## 8. Ranked risks
- P0 (blocks writes): app write approval; lag guard (closed window); single actor + idempotency; key backup + secret rotation; monthly tracker + kill-switch + heartbeat.
- P1 (reliable auto): net-vs-gross ROI lock; choke detection; 02–06 budget-to-min; dual-write file+DB + cache-serve.
- P2 (later): favorite-child/TTAM insight-only; group chat + PWA; 50d UI polish; stdlib-vs-cryptography tradeoff.
- Shared-DB risks: blast radius (per-schema roles), noisy neighbor (indexes/TTL), migration collisions (numbered files), DEV/PROD mix-up (branch badge), sleep/cold-start (heartbeat), cost (rollups only).

## 9. Phases + verify
- P0: Neon project + schemas + app application checklist + read-only collector + skeleton dashboard.
- P1: dry-run decider (log only) + Telegram DM + lag measurement.
- P2: write-enabled + approvals + monthly cap + quiet hours.
- P3: email/PWA, group chat, 50d backtest, `acct` cutover file→DB.
- Verify each phase: `py_compile` + `node --check` + HTTP smoke on scratch port, one server at a time, `git status` clean of secrets.

## 10. Approach review (is it good? what's missing?)
- Good: budget-only v1 + hybrid + manual override limits blast radius; Neon-first on `tiktok-account` de-risks learning; 30m/1h + 50d gives audit trail; Telegram DM fastest path.
- Overlooked: lock net-vs-gross ROI before coding rules; decide pause-vs-min for quiet hours (prefer min); add dry-run week with zero writes; add monthly-spend reconciliation (returns/cancels drift); keep email fallback (phone = SPOF); show API branch + data-freshness timestamp in UI so you never trust stale lagged rows.

## 11. Open items
Folder name `gmvmax-auto/` assumed. Next: P0 checklist + Neon `acct` dual-write. P0 NOT started per owner instruction.

## 12. New-session handoff (read these first)
If starting a fresh chat, attach/read in this order:
1. This file (`gmvmax-auto/masterplan.md`) — decisions + plan.
2. `gmvmax/gmvmax.md` — raw GMV Max operational realities.
3. `tiktok-account/AGENTS.md` + `tiktok-account/NEON_NOTE.md` — folder conventions + Neon ownership (`acct` schema, tester frozen, encryption rules).

## Appendix A — Full Q&A history (verbatim decisions)
- A0 Initial ask: explain GMV Max + API read/adjust possible? Check approach completeness, ask questions, recheck + suggest, confirm plan, no answer until allowed. → Agent held full analysis, read folder listing only.
- A1 Goal Q: educate / dashboard+auto-adjust / full auto → A: Dashboard + auto-adjust.
- A2 Data source Q: manual UI / already API / no access → A: No API access yet.
- A3 Users Q: internal / external / both; LIVE+Product? → A: Internal team.
- A4 Proceed Q: review gmvmax/ now? → A: Hold, more context.
- A5 Owner: "want system can automatically make adjustment if needed."
- A6 Triggers Q (multi): ROAS/GMV/spend, budget/pacing, creative/product → A: all three + future custom.
- A7 Actions Q (multi): budget / ROAS target / pause-scale / other → A: Change budget only.
- A8 Autonomy Q: full auto / human approval / hybrid → A: Hybrid (Recommended).
- A9 Guardrails Q: yes / no / need suggestion → A: Yes, set guardrails.
- A10 Agent summary + asked guardrail values + "go" permission. Owner: "what additional question you can ask to me?"
- A11 Agent round-2 groups: thresholds, scope, API/data, safety/workflow, tech. Owner answers: (1) thresholds customizable later; (2) both LIVE+Product, 1 shop, budget focus; (3) no dev app yet, maybe company has other-app approval, will apply via tiktok-account project, Neon DB; (4) owner approves, %/kill-switch/max customizable later, browser+PWA/email notify, "what do you mean by line?"; (5) no tech stack, checker timing customizable. + "ask another question".
- A12 Agent: LINE = LINE Messaging API push (TH common), skip if PWA+email enough; read tiktok-account AGENTS/plan/DEV_NOTES/feature + gmvmax.md. Asked round-3: region/currency/tz, daily vs lifetime, Neon tables, permission to read, approval UI, secret pattern, history need.
- A13 Owner: (1) MY/MYR/GMT+8; (2) daily + monthly; (3) Neon from zero, no experience; (4) read first, update app scope if needed; (5) review later, want manual edit if dissatisfied; (6) explain each choice; (7) yes history. + Telegram bot? + 30m/1h review. + "ask another".
- A14 Agent: Display app cannot be extended (new Business + Shop app needed); token choices A/B/C with C required long-term; Telegram yes via BotFather; monthly = local kill-switch/pacing; lag warning. Asked: calendar vs rolling month, checker hours, DM vs group, history length, "go research"?
- A15 Owner: calendar month; pause 02–06 (custom later); DM now group later; 50d; "ok go".
- A16 Agent web research (GMV Max API create/update/report, Shop Open API, MY benchmarks) + plan proposal P0–P3. Owner: Neon for entire repo ok?
- A17 Agent: yes with dual-write + schemas core/acct/gmv. Owner: (1) ok network (2) explain (3) guide encryption (4) explain.
- A18 Agent: tester frozen rationale; Fernet guide (SG region, token_urlsafe key, cryptography lib, rotation, offline backup); cache-serve latency. Owner: risks/roadblocks?
- A19 Agent: API approval, lag/attribution, algo choke, actor race, monthly drift, Neon, compliance. Owner: rank it.
- A20 Agent: P0/P1/P2 ranking. Owner: Neon multi-project multi-schema risks?
- A21 Agent: core/acct/gmv + 6 shared-DB risks + mitigations. Owner: add it, review plan.
- A22 Agent: final plan review. Owner: new folder + new TikTok app?
- A23 Agent: yes, `gmvmax-auto/` sibling + Business API app. Owner: put all discussion in new folder, Neon tiktok-account first, file masterplan.md, re-check approach, ask questions, recheck, suggest, confirm plan, no answer until allowed (+ read tiktok-account).
- A24 Agent (plan-mode read-only): cannot write until build mode; proposed masterplan.md outline + NEON_NOTE.md; asked folder name, Q&A depth, Neon order. Owner: also add agent note in tiktok-account for Neon long-term.
- A25 Agent: proposed NEON_NOTE.md outline, asked filename + AGENTS.md pointer. Owner: "ok go on" (build mode).
- A26 Created `gmvmax-auto/masterplan.md` + `tiktok-account/NEON_NOTE.md`, approach review, asked P0 permission. Owner: add full QnA history too, don't start P0. → This appendix added, P0 not started.
