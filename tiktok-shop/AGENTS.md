# AGENTS.md — tiktok-shop folder conventions

Shop-only system: per-video sales + performance via TikTok Shop Open API
(Affiliate Seller family). Separate from `tiktok-account/` (Display/Login Kit,
organic per-account OAuth) and `gmvmax-auto/` (Business Marketing API, ads).
Official APIs only — no scrapers.

## Stack

- Python stdlib + vanilla JS + Tailwind CDN. `127.0.0.1` only, never `0.0.0.0`.
- No npm, no build. One server at a time (owns 8083; use `--port` scratch for smoke).

## Files

- `AGENTS.md` — this file.
- `plan.md` — status checklist. Tick it per change; the user reads this file.
- `DEV_NOTES.md` — private handoff notes between sessions (vibe + facts).
- `feature.md` — end-user guide (non-technical). Update it when behavior changes.
- `.gitignore` — `.local_secrets.json`, `cache/`, `__pycache__/`.
- `.local_secrets.EXAMPLE.json` — keys template (real file never in git).
- `cache/` — gitignored runtime (file-first snapshots, works offline).

## Auth model (do not re-derive)

- 1 MY shop = 1 shop authorization. Seller endpoints (`/affiliate_seller/`)
  authorize against the shop — covers ALL affiliate/shoppable videos selling
  our products, no per-account TikTok login.
- Creator endpoints (`/affiliate_creator/`) authorize per creator account —
  out of scope here (same 1-by-1 pain as Display; do not use).
- Shop Custom app: `HIMWELLNESS GMV MAX INTERNAL` (Partner Center, MY market,
  eCommerce Connectors). Keys live in gitignored `.local_secrets.json` or env.
- Endpoint paths are versioned (`202405`/`202412` generations move) — always
  confirm current path + scopes in Partner Center before shipping.

## Data contract

- One row per shoppable video: `item_id + title + publish_time + vv_cnt +
  GMV/direct-GMV + item_sold_cnt + CTR + completion_rate`.
- Join key to Display + GMV Max = Video ID (`video.id` ↔ creative `video_id`
  ↔ affiliate `item_id`).
- Shoppable-only: pure organic non-shop videos carry zero GMV by definition.
  Organic likes/comments/shares/post-time stay authoritative in
  `tiktok-account/` (Display `video.list`).

## Rules

1. Secrets never in git/chat: `SHOP_APP_KEY/SECRET`, shop tokens. Verify by
   key-names + lengths only. `git status` must never show them.
2. Sandbox first; read-only first. Never POST inventory/order actions in P0.
3. Reports lag — closed-window pulls only, never act on newest slot.
4. After EVERY change: `python -m py_compile` + `node --check` extracted JS +
   HTTP smoke on scratch port, then kill servers.
5. Replies: short. Feasibility questions get words only; code only on
   explicit "proceed/go/build".
