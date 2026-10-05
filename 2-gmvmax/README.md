# 2-gmvmax

GMV Max domain home (restructure Phase 2, 05 Oct 2026).

- `gmvmax-auto/` — auto budget-adjust service + Vercel `online/` (`marketer-hw.vercel.app`). Deploys: `python 2-gmvmax/gmvmax-auto/deploy_online.py` from repo root; dashboard Root Directory is `2-gmvmax/gmvmax-auto/online`.
- `tiktok-creative-analysis/` — creative analytics; authoritative `data/accounts.json`.
- `tiktok-account/` — Display API dashboard (8080) + `sync/` Sheets bridge. Reads `../tiktok-creative-analysis/data/accounts.json` live (sibling layout preserved).
- `tiktok-calculator/`, `tiktok-live/` — moved Phase 1.
- `tiktok-shop-hourly` lives at `../1-1-sales/tiktok-shop-hourly/` (doc link, no duplicate code).
