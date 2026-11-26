# MarketScope exploration — discussion log

Status: started 2026-09-22. Folder created for TikTok MarketScope shop data exploration.
Source of truth for guardrails: `tiktok-strategy/AGENTS.md` (ROI ≥7.0, CPA ≤RM21.18).
Join keys (if we connect later): Video ID ↔ `tiktok-account/` Display ↔ `gmvmax-auto/` spend ↔ `tiktok-shop/` GMV.

## 1. What access do you have?
- [ ] MarketScope entry point: Shop Center web UI? TikTok Shop Partner Center? Separate MarketScope portal?
- [ ] Scope: 1 MY shop only, or category/market-wide benchmarks too?
- [ ] Format available: CSV/XLSX export, copy-paste table, screenshots, or API?
- [ ] Date range + granularity available (daily/weekly, lag?)

## 2. What tables/fields do you see?
Paste a header row (no secrets, no order IDs if sensitive):
- e.g. `date | product | impressions | clicks | GMV | units | ...`
- Which is shop-attributed vs market-wide?

## 3. Questions you want answered
- [ ] Q1:
- [ ] Q2:
- [ ] Q3:

## 4. Log
- 2026-09-22: folder + file created. Awaiting: access type + sample header + first question.
- 2026-11-26: access confirmed (Market Scope web UI via browse tab, Dr Samhan MY, Lite). Scope: TTMS audiences, TTAM (Ads Manager) audience check, Seller Center customer analysis. Decisions: rolling-window packages only; Consideration 7D pushed first; Conversion 30D for exclusion; Shop and Ad audiences added; no new Seller Center skill yet (fold into knowledge, create a skill only if reads repeat). Records: `findings.md` (screen facts), `audience-catalog.md` (package status, dated), `seller-center-customer-profile.md` (customer snapshot, dated). Procedure: `skills/tiktok-audience-upkeep/`.
- 2026-11-26: open questions: Interests / Purchase intention / Creator interactions options not tested in detail. Ad audience estimate error (retry/simplify) unresolved. Owner to confirm deletion of `TTMS CONSIDERATION – OUDATED` (23198575).
- 2026-11-26 — PARKED, revisit next session: Market-range shop audience (`TTMS - SHOP MARKET CLICK - 30D - 26NOV26`). Settings agreed: Data range Market; Product category Specific (Health/Beauty); Item keyword 2–3 competitor terms (e.g. `tongkat ali`, `kopi kuat`, `energy coffee`); Action Click; Any; 30 days. Open: which categories and keywords; check size and sample titles before relying on it; keep separate from brand groups and exclude buyers/Shop groups in Ads Manager.
