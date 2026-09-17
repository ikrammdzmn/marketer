# plan.md — tiktok-event status checklist

> The user reads this file. Tick per change.

## DONE (2026-09-17)

- [x] Analysed `raci_campaign_dashboard.tsx` (React+Firebase, Canvas globals) + `tiktok-prd` (PRD v1.0.0)
- [x] Explained 3 build options; user chose **Option A: vanilla single-file, local-only**
- [x] Built `index.html` — Timeline (2026–2030, KPI) + Worksheet (month pills, campaign CRUD)
      + 5T/3M Blueprint view/edit + phased RACI table + phase dates + dropdown reorder
      + search/status/PIC filters + legend + workload bars + local PIN seats (10 max)
      + CSV (active + full-month) + audit line + toasts + confirm modal
- [x] Verified: HTML parse OK, inline-JS `node --check` OK, HTTP 200 smoke test
- [x] Docs: `AGENTS.md`, `DEV_NOTES.md`, `feature.md`, this `plan.md`

## BACKLOG (needs explicit go)

- [ ] Structured due-date field (free text today → TBD display only, no overdue engine)
- [ ] C/I columns (board is R/A only per PRD scope)
- [ ] Shared realtime seats (Hybrid Firebase via CDN + real security rules) — only if
      multi-laptop collaboration pain appears
- [ ] Mobile card layout (desktop-first today; tables scroll horizontally)
- [ ] Commit decision — `tiktok-event/` untracked; ONLY when asked
