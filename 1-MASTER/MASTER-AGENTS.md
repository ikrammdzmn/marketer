# MASTER-AGENTS.md — shared agent conventions (marketer repo)

Single source for the rules every folder obeys. Folder `AGENTS.md` files keep
only their own specifics and point here — do not duplicate these. Stable
invariants only; fast-moving status lives in `MASTER-PLAN.md` / changelogs.
Note: folder files have NOT been trimmed yet (deliberately — dedupe happens
gradually when each folder is next touched, to avoid churn breakage).

additional prompt Do not delete this part
-Read 1-MASTER/BIGMASTERPLAN.md, then read relevant folders AGENTS.md, DEV_NOTES.md, plan.md, — then continue

## 1. Runtime (all folders)

- No npm, no build, no framework unless a folder's own AGENTS.md explicitly
  approves an exception. Static HTML/CSS/vanilla JS or Python stdlib.
- Localhost only: bind `127.0.0.1`, never `0.0.0.0`. No auth gates exist —
  never expose a server to LAN.
- Windows PowerShell 5.1 shell: `;` / `if ($?)` chaining (no `&&`), fresh port
  per test, always stop background servers.

## 2. Secrets

- Nothing secret in git, chat screenshots, or error pastes. Tokens, CSVs,
  `.local_secrets.json` stay gitignored/untracked. A pasted production secret
  is rotated, not cleaned.
- `docs/*.html`, `tiktok*.txt`, GitHub Pages source: frozen unless the TikTok
  app form changes (they back app review / OAuth / domain verification).

## 3. Git

- Commit/push only when asked. Never commit secrets. `git status` must never
  show them.
- Commit messages say what changed (never `massive update` again).

## 4. Docs discipline (every folder)

- `plan.md` — live status checklist, ticked per change (the user reads it).
- `feature.md` — non-technical user guide, updated when UI behaviour changes.
- `DEV_NOTES.md` — private session handoff (vibe + facts + bugs + lessons).
- `CHANGELOG.md` (folder) + `1-MASTER/MASTER-CHANGELOG.md` (rollup) — one line
  per release, same session. Counters keep rising, never renumber.
- Replies: short. Feasibility questions ("just answer, do not edit") get words
  only; code only on explicit "proceed/go/build".

## 5. Editing

- Copy exact strings from Read output for edit anchors, never retype.
- After each edit, grep touched identifiers and re-read the region.
- New cell affordance in one table → apply to every sibling renderer the same
  session (grep the hook); single-table affordances ship as bug reports (v38).
- Verify like the folder demands (e.g. `node --check` + HTTP smoke on a fresh
  port); temp scripts live in the opencode temp dir and are deleted after.

## 6. Cross-folder contracts

- **Accounts source:** `tiktok-creative-analysis/data/accounts.json` is
  authoritative (exact `name` match). Never duplicate the list — `tiktok-account`
  reads it live; future schemas resolve against it.
- **Business rules source:** `tiktok-strategy/AGENTS.md` owns ROI ≥7.0, CPA
  ≤RM21.18, scale ≤20–25%/24h, no changes 16:00–17:30, dead zones 02:00–08:00,
  payday surge 25th–2nd. Automation MUST obey these — never re-derive.
- **API separation:** `tiktok-account` = Display/Login Kit (own videos).
  `gmvmax-auto` = Business Marketing API + Shop Open API (ads/budget). Scopes
  are NOT interchangeable; different dev apps, keys, approvals.
- **User's entries are authoritative:** account names, spellings, catalog labels
  — never invent or "fix" unasked. Pasted lists may carry invisible Unicode;
  byte-verify before writing.
- **Display-only by default:** page changes stay on the page unless export
  changes are requested.

## 7. Folder index (specifics live in each folder's AGENTS.md)

- `tiktok-creative-analysis/` — static creative analytics (multi-file compare,
  bulk dialect, insight engine, SOP bars, `?insight` links, picker chips).
- `tiktok-account/` — Display API dashboard (`dashboard/`; `tester.py` FROZEN; link-mismatch guard + throttled/merged pulls + stream progress popup + fetched_at; releases in `CHANGELOG.md`) + `sync/` daily Sheets bridge (own AGENTS.md: path-import reuse, `X()` retry, dry-run purity, lengths-only secrets).
- `tiktok-strategy/` — Growth OS playbook (guardrails owner, §6 above).
- `tiktok-event/` — RACI board, vanilla single-file (`raci_campaign_dashboard.tsx`
  FROZEN as spec source; localStorage only; PIN is courtesy, not security).
- `gmvmax/` — knowledge only, no code.
- `gmvmax-auto/` — P0 skeleton live (Neon GREEN, apps in flight): stdlib collector (closed-window, `ALLOW_WRITES=0`) + 8082 dashboard + `001–004` migrations (schema-qualified, `win` col). Business app pending, Shop app created. Docs: `DEV_NOTES.md` (handoff) + `feature.md` (user guide). Folder rules §5–7 carry portal lessons (branch TTL, localhost redirect).
- Sibling `../tools/` (private GitHub `ikrammdzmn/tools`, branch `main`) — local MCP runners. `spreadsheet-mcp`
  (27 Sheets tools, `uv`, stdio `127.0.0.1` only, IGNORED clone; nested upstream
  `.git` → `dudegladiator`, never push there). Secrets at
  `%USERPROFILE%\.config\spreadsheet-mcp\service-account.json`, env
  `GOOGLE_SHEETS_CRED` → server var `GOOGLE_SERVICE_ACCOUNT_FILE` (never
  `GOOGLE_APPLICATION_CREDENTIALS`). Two clients, two files: opencode reads
  `marketer/opencode.json` (`mcp` + `command[]` + `{env:}`), Antigravity reads
  `~/.gemini/config/mcp_config.json` (`mcpServers` + `args[]` + `env`).
  Restart IDE after config change. `check_setup.py` needs UTF-8
  (`chcp 65001`) and only checks `./credentials/` — a "No credentials file"
  from it proves nothing; verify via `auth.get_sheets_service()`. Git stderr
  progress is not an error; winget `uv` needs a fresh shell; `ls-remote`
  needs one retry on empty. Workspace: lift BOTH key-creation constraints
  (managed + legacy), enable BOTH Sheets + Drive APIs via full
  `/apis/library/` URLs, SA cannot create sheets (403 expected) — human
  creates + shares as Editor. Status GREEN 20 Sep on shared-sheet read/write.
