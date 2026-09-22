# DEV_NOTES.md — tiktok-shop session handoff

## Window 2026-09-21 — folder created (build mode)

Vibe: owner asked Shop-vs-Display split, then "add the plan in tiktok-shop/".
Chose NEW `tiktok-shop/` folder over extending `gmvmax-auto/` — Shop Seller
API is the third auth family (Display per-user, Business advertiser, Shop
seller). Keep it separate; join on Video ID later.

Facts: folder + `AGENTS.md` + `plan.md` + `.gitignore` landed. Shop Custom app
`HIMWELLNESS GMV MAX INTERNAL` already created (MY); keys live in
`gmvmax-auto/.local_secrets.json` today — move/copy to `tiktok-shop/` on first
wiring (lengths-only verify, never values). Business app `TIKTOK GMV MAX`
still pending approval. No code yet; read-only Seller wiring is next on
explicit go. Server port reserved: 8083.

Lessons: endpoint generations (`202405`/`202412`) move — verify path + scopes
in Partner Center before coding. Creator endpoints = per-creator auth trap;
use Seller endpoints for one-auth coverage.
