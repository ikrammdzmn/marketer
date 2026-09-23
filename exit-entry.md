# exit-entry.md — marketer repo exit + entry runbook

> Exit = strip this PC to a commit-safe state before handoff / decommission.
> Entry = rebuild on a new PC from `git clone` to working dashboards.
> Conventions: `1-MASTER/MASTER-AGENTS.md` + root `AGENTS.md`. Secrets: lengths-only, never values, never in git/chat.

Repo: `https://github.com/ikrammdzmn/marketer.git`, branch `main`.
Shell: Windows PowerShell 5.1 (`;` / `if ($?)` chaining, no `&&`). Localhost (`127.0.0.1`) only. No npm/build.

---

## 0. What lives where (do NOT delete the wrong thing)

Tracked (keep, commit): all code, docs, `*.EXAMPLE.json`, `tiktok-creative-analysis/data/*.json`, `sample-data/`, `source-file/*.xlsx`, `docs/*.html`, `tiktok*.txt`, `migrations/001-004.sql`.

Untracked / gitignored (safe to delete on exit, recreate on entry):

| # | Path | What | Covered by |
|---|---|---|---|
| 1 | `tiktok-account/.local_secrets.json` | TikTok client key + secret | `tiktok-account/.gitignore` |
| 2 | `tiktok-account/dashboard/tokens/` | 10x access + refresh tokens | `tiktok-account/dashboard/.gitignore` |
| 3 | `tiktok-account/dashboard/csvs/` | video/profile caches | `tiktok-account/dashboard/.gitignore` |
| 4 | `tiktok-account/sync/.sheet_id.json` | 44-char spreadsheet ID | `tiktok-account/.gitignore` |
| 5 | `tiktok-account/sync/logs/` | runtime logs (may not exist) | `tiktok-account/.gitignore` |
| 6 | `gmvmax-auto/.local_secrets.json` | NEON_URL_DEV/PROD, GMV_ENC_KEY, TikTok/Shop, Telegram | `gmvmax-auto/.gitignore` |
| 7 | `gmvmax-auto/cache/` | collector file cache | `gmvmax-auto/.gitignore` |
| 8 | `tiktok-creative-analysis/data/*.backup-*.json` | saver backups (≤10 kept) | `tiktok-creative-analysis/.gitignore` |
| 9 | `**/__pycache__/` | python bytecode | each `.gitignore` |

Outside repo (exit only if decommissioning):

| Path | What |
|---|---|
| `%USERPROFILE%\.config\spreadsheet-mcp\service-account.json` | Google SA private key (crown jewel #2) |
| env `GOOGLE_SHEETS_CRED` | absolute path to above |
| `C:\Users\PC CUSTOM\Documents\github\tools\` | sibling private repo `ikrammdzmn/tools`, branch `main`, contains `spreadsheet-mcp/` + `.venv/` + `credentials/` |
| `~/.gemini/config/mcp_config.json` | Antigravity MCP client config (second client, see §4) |

---

## 1. EXIT — step by step (strip PC, stay commit-safe)

### 1.1 Stop servers

```powershell
Get-Job | Stop-Job; Get-Job | Remove-Job
# also close any `dashboard.py` / `server.py` console windows
```

### 1.2 Confirm what will be deleted (read-only)

```powershell
git status --short
git status --ignored --short
```

Expect `!!` lines for rows 1-9 above. `git status --short` (non-ignored) must already be clean before you start deleting. If a secret path ever shows in `--short` without `!!`, stop and fix `.gitignore` first.

### 1.3 Delete local runtime + secrets (repo tree only)

```powershell
Remove-Item -LiteralPath "tiktok-account\.local_secrets.json" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "gmvmax-auto\.local_secrets.json" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "tiktok-account\sync\.sheet_id.json" -Force -ErrorAction SilentlyContinue
Get-ChildItem -LiteralPath "tiktok-account\dashboard\tokens" -Filter "*.json" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -LiteralPath "tiktok-account\dashboard\csvs" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Remove-Item -LiteralPath "tiktok-account\sync\logs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "gmvmax-auto\cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "tiktok-creative-analysis\data\accounts.backup-*.json" -Force -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
```

Do NOT delete: `.local_secrets.EXAMPLE.json` files, `data/accounts.json`, `catalog.json`, `targets.json`, `sample-data/`, `source-file/`, `docs/`, `tiktok*.txt`, migrations.

### 1.4 Verify clean

```powershell
git status --short
# expect: empty (nothing to commit, working tree clean)
git status --ignored --short
# expect: only `!!` lines, no `M` / `A` / `??` with secret names
```

### 1.5 Full decommission only (handoff / wipe / suspect-PC incident)

1. Preserve evidence first if incident: copy `C:\ProgramData\AnyDesk\connection_trace.txt`, `file_transfer_trace.txt`, `%APPDATA%\AnyDesk\ad.trace` to USB (see `SECURITY.md` §5).
2. Check OneDrive scope: if `Documents\github` is OneDrive-synced, tokens + client secret already sit in Microsoft cloud — note for owner (see `SECURITY.md` §4.1).
3. Rotate from a CLEAN device, never the suspect PC: TikTok portal revoke + relink, Google/Microsoft passwords + 2FA, AnyDesk unattended OFF. SA key rotation + Sheet re-share only if doubt remains.
4. Then delete outside-repo secrets: SA json, `GOOGLE_SHEETS_CRED` env, `../tools/` clone if required.

---

## 2. ENTRY — step by step (new PC to working)

### 2.1 Install base tools

1. Install: Git, Python 3 (3.14 verified), Node 24 (only for `node --check`, no `npm install` ever), `uv` via winget.
2. `uv` needs a FRESH shell after install before first use.
3. No `requirements.txt` in this repo — core apps are stdlib-only. Two exceptions:
   - `gmvmax-auto` only: `pip install cryptography` (Fernet, approved, no hand-rolled AES).
   - `tiktok-account/sync` google libs: come from the `spreadsheet-mcp` uv env, never system python.

```powershell
python --version
node --version
uv --version
```

### 2.2 Clone repos

> NEVER create the `marketer/` folder yourself first — an existing name forces
> git to nest the clone as `marketer-1/` (23 Sep rename mess). Let git create it.

```powershell
Test-Path "C:\Users\PC CUSTOM\Documents\github\marketer"  # must be False; if True, stop and clear it first
git clone https://github.com/ikrammdzmn/marketer.git "C:\Users\PC CUSTOM\Documents\github\marketer"
cd "C:\Users\PC CUSTOM\Documents\github\marketer"
git clone <tools-repo-url> "C:\Users\PC CUSTOM\Documents\github\tools"
# branch main, contains spreadsheet-mcp/ (27 Sheets tools, uv, stdio, localhost-only)
```

Nested upstream `.git` inside `spreadsheet-mcp` points to `dudegladiator` — never push there.

### 2.3 Google service account (MCP + sync backend)

1. Human (Workspace): lift BOTH key-creation constraints (managed + legacy), enable BOTH Sheets + Drive APIs via full `/apis/library/` URLs.
2. Create SA JSON key, save to `%USERPROFILE%\.config\spreadsheet-mcp\service-account.json` (outside all repos).
3. Set user env `GOOGLE_SHEETS_CRED` = that absolute path. Restart IDE/shell.
4. Human creates the Sheet, Shares as Editor to the SA email. SA cannot create sheets (403 expected — not a bug).
5. Verify (with `chcp 65001` for UTF-8): `check_setup.py` "No credentials file" proves nothing (it only checks `./credentials/`); real check is `auth.get_sheets_service()`. Status GREEN 20 Sep on shared-sheet read/write.
6. `git ls-remote` may need one retry on empty; git stderr progress is not an error.

### 2.4 MCP client config (two clients, two files, same runner)

opencode — edit `marketer/opencode.json` (already correct, secret-free by design):

```json
{
  "mcp": {
    "google-sheets": {
      "type": "local",
      "command": ["uv", "--directory", "C:\\Users\\PC CUSTOM\\Documents\\github\\tools\\spreadsheet-mcp", "run", "spreadsheet-mcp"],
      "enabled": true,
      "environment": { "GOOGLE_SERVICE_ACCOUNT_FILE": "{env:GOOGLE_SHEETS_CRED}" }
    }
  }
}
```

Antigravity — ask IDE first, edits `~/.gemini/config/mcp_config.json` (`mcpServers` + `args[]` + `env`), never `opencode.json`. Never use `GOOGLE_APPLICATION_CREDENTIALS` (server var is `GOOGLE_SERVICE_ACCOUNT_FILE`). Restart IDE after any config change.

> 23 Sep fix: bare `"uv"` fails with `mcp connect failed / Connection closed` when the OpenCode `serve --service` process predates the WinGet User-scope PATH (`uv` in User PATH only, never Machine PATH) or a new `GOOGLE_SHEETS_CRED`. Harden to the absolute WinGet path with forward slashes (single `\` is invalid JSON): `C:/Users/<you>/AppData/Local/Microsoft/WinGet/Packages/astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe/uv.exe`. Then fully restart IDE/OpenCode + Refresh MCP. Log proof: `%USERPROFILE%\.local\share\opencode\log\opencode.log` shows `mcp connect failed` with no server stderr; manual `uv run spreadsheet-mcp` stdio `initialize` still returns `Google Sheets 1.25.0`.

### 2.5 Per-PC secrets (recreate, never copy over chat)

```powershell
Copy-Item "tiktok-account\.local_secrets.EXAMPLE.json" "tiktok-account\.local_secrets.json"
Copy-Item "gmvmax-auto\.local_secrets.EXAMPLE.json" "gmvmax-auto\.local_secrets.json"
notepad "tiktok-account\.local_secrets.json"
notepad "gmvmax-auto\.local_secrets.json"
```

- `tiktok-account/.local_secrets.json`: Sandbox Client Key + Secret (Production keys fail pre-approval with `client_key` — use Sandbox until app approved).
- `gmvmax-auto/.local_secrets.json` keys: `NEON_URL_DEV`, `NEON_URL_PROD`, `GMV_ENC_KEY`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- `tiktok-account/sync/.sheet_id.json`: auto-created on first sync; env `SHEET_ID` wins. Prefer file over `--spreadsheet-id` flag on shared machines (flag echoes to console + Task Manager).
- Verify by key-NAMES + lengths only. `git status --short` must never show these files.

### 2.6 First run per folder

```powershell
# creative analysis (static, no secrets)
python tiktok-creative-analysis/server.py
# open http://127.0.0.1:8000/  (file:// blocks bundled fetch; :8000 saver on, http.server fallback = Save disabled)

# tiktok-account dashboard (owns 8080)
python tiktok-account/dashboard/dashboard.py
# open http://127.0.0.1:8080/ -> Link each of 10 accounts once (login as that exact account -> Authorize)
# names authoritative: tiktok-creative-analysis/data/accounts.json (exact `name` match)
# fallback tester only: python tiktok-account/tester.py --account X --port 8081  (FROZEN, do not modify)

# sync bridge (menus + dry-run preview + live run)
# SETUP BOTH, USE marketer: daily use lives in marketer/tiktok-account/sync/,
# tools/spreadsheet-mcp is dependency only (uv venv with google libs).
powershell -File tiktok-account/sync/run-sync.ps1
# engine: sheet-sync.py (path-imports dashboard.py, never duplicates logic)

# gmvmax-auto (owns 8082)
python gmvmax-auto/dashboard/dashboard.py
# collector: 30m read-only pulls, closed-window T-2h, skip 02:00-06:00 MYT, ALLOW_WRITES=0
```

No portal repeat: app registration, `docs/terms.html` + `privacy.html`, `tiktok*.txt` domain verify (`.../marketer/` URL-prefix, `Domain`/DNS impossible on github.io), Sandbox 10 target users, redirect URIs, scopes (`user.info.basic,profile,stats + video.list`) already cover every PC because `127.0.0.1` = this machine.

Neon (`gmvmax-auto`): child branches default 1-day auto-delete (uncheck for persistent dev). Migrations `001-003` FROZEN (have bugs) + `004_fix_schemas.sql` applied dev+prod — never edit applied files, new fix = `005+`, schema-qualify EVERY identifier (`acct.x`, `gmv.x`, `core.x`), `win` not `window`. Business API redirect uses `http://localhost:PORT/callback` (IP form rejected); sandbox ad account locked until app approval.

### 2.7 Verify after every change (folder rule)

```powershell
python -m py_compile <touched.py>
node --check <touched.js>
# HTTP smoke on a scratch port, expect 200, then stop servers:
Get-Job | Stop-Job; Get-Job | Remove-Job
```

---

## 3. Per-folder config cheat-sheet

| Folder | Port | Deps | Secrets | Gitignore |
|---|---|---|---|---|
| root | — | `uv`, git | SA key (outside), `GOOGLE_SHEETS_CRED` | none (frozen `docs/`, `tiktok*.txt`) |
| `tiktok-creative-analysis/` | 8000 | stdlib only, CDN Tailwind/SheetJS/Chart.js | none (backups only) | `data/*.backup-*.json`, `__pycache__/` |
| `tiktok-account/dashboard/` | 8080 | stdlib only | `.local_secrets.json`, `tokens/`, `csvs/` | root + `dashboard/.gitignore` (`tokens/ csvs/ __pycache__/`) |
| `tiktok-account/sync/` | — | spreadsheet-mcp uv env | `.sheet_id.json`, `SHEET_ID` env | `sync/.sheet_id.json`, `sync/logs/`, `sync/__pycache__/` |
| `gmvmax-auto/` | 8082 | stdlib + `cryptography` | `.local_secrets.json` (Neon x2, enc key, TikTok/Shop, Telegram) | `.local_secrets.json`, `cache/`, `__pycache__/` (+ `dashboard/.gitignore`) |
| `tiktok-strategy/` | — | browser localStorage | none | none |
| `tiktok-event/` | 8931 (test) | none, PIN = courtesy not security | none | none (folder currently untracked — do not stage unasked) |
| `tiktok-live/` `gmvmax/` `docs/` | — | none | none | none |

Cross-folder contracts: accounts source = `tiktok-creative-analysis/data/accounts.json`; guardrails owner = `tiktok-strategy/AGENTS.md` (ROI ≥7.0, CPA ≤RM21.18, scale ≤20-25%/24h, freeze 16:00-17:30, dead 02:00-08:00, surge 25th-2nd); API separation = Display/Login (`tiktok-account`) vs Business/Shop (`gmvmax-auto`), scopes not interchangeable.

---

## 4. Commit-safe checklist (before every `git add`)

```powershell
git status --short
```

Must NEVER show: `tokens/`, `csvs/`, `cache/`, real `.local_secrets.json` (`.EXAMPLE` is fine), `.sheet_id.json`, `logs/`, `__pycache__/`, `*.backup-*.json`. All are gitignored. If one appears, fix `.gitignore` first. Commit/push only when asked; messages say what changed.
