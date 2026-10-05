# AGENTS.md — 0.0 TIKTOK master info hub

> Index only, no code. Master pointer for the TikTok ads ecosystem.
> Conventions: `1-MASTER/MASTER-AGENTS.md`. Status: `1-MASTER/MASTER-PLAN.md`.

## What lives here

- `gmvmax/` — knowledge only, no code (`gmvmax.md` algo realities + `product/exploration-status.md` canonical stages + `product/*.xlsx`).

## Ecosystem (stays at root, only pointed to from here)

- `tiktok-creative-analysis/` — authoritative `data/accounts.json`.
- `tiktok-account/` — Display API dashboard + `sync/` Sheets bridge.
- `gmvmax-auto/` — auto budget-adjust service (P0 live).
- `tiktok-shop/`, `tiktok-shop-hourly/`, `tiktok-live/`, `tiktok-calculator/`, `tiktok-strategy/`, `tiktok-event/`.

## Rules

1. No code in this hub — index docs only.
2. Do not duplicate guardrails (`tiktok-strategy/AGENTS.md` owns ROI ≥7.0, CPA ≤RM21.18) or account lists — link only.
3. Localhost only. No npm/build. Secrets never in git/chat. Commit/push only when asked.
