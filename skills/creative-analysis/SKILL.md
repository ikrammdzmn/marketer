---
name: creative-analysis
description: Rules of the local creative-analysis tool + online creative module. Load before creative-side work.
---

# Creative analysis skill (repo-local, verified-only)

Local tool: `2-gmvmax/tiktok-creative-analysis/` — static HTML/vanilla JS,
no npm/build. `server.py` binds `127.0.0.1` only. Online module: `/creative`
tab (probe, rows sync, Manage popup). `app.js?v=N` bump per change.

## Data rules (do not re-derive)

- `accounts.json` is authoritative (exact `name` match only; username/ID/
  note display-only). Never invent names or "fix" spellings unasked.
  Pasted lists may carry invisible Unicode joiners — byte-verify first.
- `Product Card` = true catalogue rows (blank account + Product-card type /
  no video / no campaign). `Unknown account` = blank-account real videos
  (normal verdicts). Never merge them.
- 19-digit Post IDs exceed 2^53 — compare as Numbers, display may round.
- No CPM column in source (derive Cost÷Impr×1000). No ROI column in bulk
  dialect (derive Revenue÷Cost).
- Two dialects normalized in `rowsOfWorkbook`: standard 24-col creative
  export vs bulk (`Video title/Video ID/Campaign name/Campaign ID/
  Product ID`, `Video ID='N/A'` catalogue rows, `~`+hours filenames).
  Never branch downstream on dialect except the file badge.
- Join key everywhere: `keyOf(postId, account, creative)`.
- Status taxonomy (canonical: `1-knowledge/0-0-tiktok/gmvmax/product/
  exploration-status.md`): 10 stages; `Available` = rows minus the 5
  exclusion states. Status-by-day: one column per file, never summed.
- Insight engine: file-adaptive benchmarks (median CPM, top-20 min impr,
  median 2s rate/AOV, p90 ROI) — thresholds in code, never hardcoded.
- Ratio totals recomputed from summed bases per metric, never summed ratios.
- `MAX_FILES = 31` single constant drives all gates + labels.

## Editing rules (this folder bites)

- Anchors: copy exact strings from Read output; ASCII-only anchors.
- Re-read the region after EVERY edit; grep touched identifiers.
- New cell affordance → ALL sibling renderers same session
  (`renderTop`/`renderCompare`/`renderTrend`/modal/preview).
- CHANGELOG line per release, counter never renumbers. `feature.md` +
  `plan.md` ticked per change. Commit/push only when asked.
- Never hand-edit `source-file/*.xlsx`.

## Online creative module (Phase A state)

- `/api/creative-probe` rounds 1–6 (grains, metrics, membership, identity,
  creative `item_id` dual-filter). `/api/creative-sync` (Neon IDs, ≤7d,
  scoped picker default himcoffee) + `creative.daily_rows` (018).
- Manage popup: SOP strip + grouped accounts + catalog, edit toggle,
  column chips (localStorage), changed-only stamps, JSON/CSV export.
- Ceiling: revenue/ROI per creative ✅ (round 6), Time-posted ❌,
  Creative-source ❌, secondary status = derived.

## Evidence index

Local `DEV_NOTES.md` (v38–v54 arc, bugs 1–50+), `plan.md`, online
Checkpoints 31+ and rounds 1–6 pastebacks.
