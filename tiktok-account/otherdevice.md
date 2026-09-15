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
