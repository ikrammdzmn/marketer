# DEV_NOTES — campaign-performance-analysis (Metric Scorer, 11 OMTM)

Date: 2026-10-05 (Mon, afternoon session) | Folder now: `3. TTAM/campaign-performance-analysis/` (moved from `sales-performance-analysis/` same day)

## Vibe / dynamic — read this first, next-me

The owner is a hands-on TikTok media buyer (Malaysia, MYR, shop Him.DrSamhan, GMV MAX VOL2).
They think in **ad budgets, not code**. They talk in bursts — "ok", "go", "ok build" —
and they mean it: short prompt = execute now, don't lecture. Keep every reply SHORT.
They want **paste-ready artifacts** (TSV blocks for Google Sheets, exact file paths),
not explanations. When they say "ask question before explain", actually ask first —
they will correct you fast and respect you for checking.

Energy of this session: started in spreadsheets (a hand-rolled table of 11 custom
TikTok metrics with copy-paste errors), turned into logic review, turned into a real
local tool, turned into a registry + preset system, ended with repo restructuring
and this ritual write-up. Fast, iterative, zero wasted motion. They caught my bad
assumption with real data mid-session (see B1) — that moment built the trust the
rest of the session ran on. **Always let their export win over your theory.**

They switch agents Plan↔Build deliberately. In Plan mode: words only, plans go to
`C:\Users\darkv\.opencode\plan` ONLY when asked. In Build: code on "go".
They move files manually sometimes (`source-file/`, `plan.md` → `1.1 Sales/`) —
after any manual move, re-verify paths (bundled fetch URLs, doc cross-refs).

Guardrails that matter to them: ROI ≥7.0, CPA ≤RM21.18 live in `tiktok-strategy/`
(never re-derive). K = Kill, S = Scale (their media-buying shorthand, confirmed
by usage not by asking). Currency is MYR, never $.

## What this tool is (30-second sync)

Upload a TikTok campaign-report xlsx → scores every ad group on 11 One-Metric-
That-Matters formulas (hook rate, attention cost, consideration efficiency…),
flags each KILL/WATCH/SCALE, rolls up to one OVERALL verdict + reason, ranks the
kill list for a budget cut %, exports CSV. Two input dialects collapsed on ingest:
raw test columns in, scored table out — toggleable. Bands come from JSON presets
(`presets/`, one file per campaign + manifest), metrics from a JSON registry
(`metrics.json`) with an in-UI manager (enable/disable, K/S edit, add-metric).
Local only: `python server.py` = :8123 (NOT :8000 — that port belongs to
tiktok-creative-analysis; see B5).

## Unique discoveries (don't re-learn these)

1. **Focused View rates are 3-4x what theory says.** Real export: HPS median 30.6%
   (range 19-36%), HRQ median 38.4%. My "8% hook is good" mental model was for
   generic video views, not Focused View (which counts early interactions as views).
   All v2 bands were garbage against real data. Rule now: **recalibrate every new
   campaign from its own p25/med/p75 before trusting any band.**
2. **LIVE bridge is dead this period.** LQS median 0, ERRI median 0.005% (0-2 live
   views per ad). 48/66 ads KILL on LQS. Keep LIVE flags on a separate track or
   they nuke every VV verdict — this is structural, not a bug.
3. **CES is the closest thing to a single OMTM** (HR×PVR×EDS÷AC) but BC alone
   misses kills (B306, B302 prove it). OVERALL rule: KILL if CES=KILL or
   (ACS=KILL AND (HPS|VVES)=KILL); SCALE only if hook+cost clean AND (CES|VVES)
   scales AND EDS alive.
4. **Cutting 50% (~RM2,842 of RM5,684) needs 33 ad groups** — the 11 KILLs are
   only RM949. Kill-list order (verdict→CES→ACS) is the product, not the flags.
5. **Token discipline matters to them.** Full 67×45 sheet reads cost ~8-12k tokens.
   The tool's kill-list-only view exists partly for this — default to KILL/WATCH
   slices when they ask from chat.

## Bugs found + fixed (honest log)

- **B1 (mine, logic): hypothetical 8%-hook example + v2 bands.** Real data showed
  19-36%. Fixed by quartile recalibration (v3). Lesson: never ship bands without
  running them against a real export; say "I was wrong" promptly.
- **B2 (theirs, formula): CES used raw 6svv count × multiplied engagement**
  (`comments × shares × follows` → any zero zeroes the score). Fixed: rates +
  additive EDS + ×10000 scaler. Lesson: check units (rate×count) and zero-traps
  in every composite.
- **B3 (theirs): EDS denominator `paid follows` → `paid likes`.** Copy error.
- **B4 (theirs): RES ×100 → ×10 (=10/ACS), BC ×100 → ×1000.** Scalers must put
  medians in the WATCH band, else the band is decoration.
- **B5 (mine, tooling): scorer + creative tool both on :8000** — browser showed
  the wrong tool. Fixed: scorer defaults :8123 + loud bind error + bat note.
  Lesson: every local tool gets its own port on creation; test the .bat path,
  not just `server.py <port>`.
- **B6 (mine): `&&` chaining in PowerShell 5.1.** Use `;`. Known repo rule,
  slipped anyway — re-read MASTER-AGENTS §1 before shelling.
- **B7 (workflow): xlsx moved to `source-file/`, bundled fetch 404'd.**
  Fixed URL + bumped `app.js?v`. Lesson: bundled paths live in ONE obvious
  constant; bump the `?v=` cache-buster on every app.js change (repo rule).
- **B8 (data): `Total of N results` row included in stats** — doubled spend
  (RM11,368 vs RM5,684) and poisoned medians. Ingest now skips `/^total of/i`.
  Lesson: TikTok exports bury a total row; always filter it first.
- **B9/B10 (mine): localStorage override schema changed single→per-preset;**
  regAdd/regReset/vBands handlers briefly wrote the old shape. Fixed in the
  preset-split pass. Lesson: when a persisted schema changes, migrate or
  namespace the key the same session (did: `metric-presets-overrides-v1`).

## To never repeat (checklist taped to monitor)

1. Bands from quartiles, not theory. Show medians next to every band you propose.
2. One port per tool; fail loudly on bind; test the double-click path.
3. `;` not `&&`; fresh port per smoke test; stop background servers.
4. `app.js?v=N` bump per JS change; `node --check` + `py_compile` + HTTP 200s.
5. Drop `Total of` rows on ingest, always.
6. Copy exact Read strings for edit anchors; grep touched identifiers after.
7. Commit/push only when asked. Secrets never in git/chat (lengths-only).

## Open threads for next window

- `plan.md` (Sales Performance Analysis System draft) — owner moved to
  `1-1-sales\sales-performance-analysis\plan.md` (restructure Phase 1). `metric.md` §"Related:
  plan.md" will dangle; fix the ref when convenient.
- Auto-recalibrate (metric-plan.md §Scope-2: p25/med/p75 → proposed bands with
  verdict-shift preview) is still unbuilt — highest-value next feature.
- `GMV MAX VOL2-SCORED-v3.xlsx` in `source-file/` was the validation artifact;
  tool now supersedes it (no writer in-app; CSV export only).
- Old empty `sales-performance-analysis/` dir handle may linger — harmless,
  git-ignored-empty; delete manually if seen.
- Nothing committed this session (owner's rule) — `3. TTAM/` tree is untracked.
