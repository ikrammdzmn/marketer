# Run the TikTok dashboard on another PC

Each laptop holds its own tokens. The repo carries code + docs only —
relinking on the new PC is expected and takes ~10 minutes.

## 1. Clone (new PC)

```powershell
git clone <your-repo-url>
cd marketer
python --version   # needs Python 3
```

No portal changes needed: Sandbox target users and redirect URIs
(`http://127.0.0.1:8080/callback` = this machine's own loopback) already cover
any PC.

## 2. Add the keys file (not in git, recreate per PC)

```powershell
Copy-Item "tiktok-account\.local_secrets.EXAMPLE.json" "tiktok-account\.local_secrets.json"
notepad "tiktok-account\.local_secrets.json"
```

Paste the **Sandbox** Client Key + Secret, Save. Never commit this file.
(If only Production keys are at hand, logins will fail with `client_key` —
use Sandbox until the app is approved.)

## 3. Start + link (once per account)

```powershell
python tiktok-account/dashboard/dashboard.py
```

Open `http://127.0.0.1:8080/` → Link each account once (log in as that exact
TikTok account → Authorize) → select → Refresh from TikTok → Export CSV.

- One tester/dashboard per port: dashboard owns 8080. Fallback tester needs
  `--port 8081` (and that URI added once in Sandbox Desktop).
- Shutdown/restart needs NO relink — `dashboard/tokens/` persists on disk.
  Relink only on refresh-token death (~1yr), revoke, or scope change.

## 4. Shortcut: copy tokens from the old PC (no relink)

Tokens are bearer files, not machine-bound. USB stick only (never
chat/email/cloud), wipe the stick after. The app key must be the SAME
one the tokens were issued under (refresh flow uses it).

Copy (portable):
- `tiktok-account/dashboard/tokens/*.json` (the 10 logins)
- `tiktok-account/.local_secrets.json`
- `tiktok-account/sync/.sheet_id.json` (sync only)
- service-account JSON to `%USERPROFILE%\.config\spreadsheet-mcp\`
  (sync/MCP only) + set `GOOGLE_SHEETS_CRED` to its local path
- `gmvmax-auto/.local_secrets.json` (GMV Max only, if used there)

Clone fresh, never USB-copy:
- `marketer/` + `tools/` repos (`.venv/` rebuilds on first `uv run`)
- `csvs/` caches (rebuild on first pull)

Per-PC (see root `exit-entry.md` ENTRY):
- `uv` via WinGet, IDE started after install, Python 3, Git
- `opencode.json` MCP paths carry the old PC's username - edit locally,
  never commit that hunk; same for Antigravity `mcp_config.json`

Verify: dashboard shows all linked, one Refresh works, `git status
--short` shows none of the copied files. Do NOT run live sync from
both PCs at once. Check OneDrive scope first (`SECURITY.md` 4.1) -
synced Documents means secrets already in Microsoft cloud. Copying
defers relink, not abolishes it (Sec 3 still applies on token death).

## 5. Do NOT repeat (already done once, shared)

- TikTok app registration (category, description, URLs, terms/privacy).
- Domain verification (`.../marketer/` prefix).
- Sandbox creation + its 10 target users.
- Sandbox redirect URIs (Desktop `8080`, Web URL) and scopes
  (`user.info.basic,profile,stats + video.list`) — same URIs work on every PC
  because `127.0.0.1` always means "this machine".
- All code fixes (PKCE-hex, form-encoded token, flat token parse,
  per-account OAuth state).

## 6. Commit-safe checklist (before every `git add`)

`git status --short` must NEVER show: `tokens/`, `csvs/`,
`.local_secrets.json` (real one — `.EXAMPLE` is fine), `__pycache__/`.
All are gitignored. If one appears, stop and fix `.gitignore` first.
