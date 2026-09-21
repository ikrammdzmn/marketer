# SECURITY.md - marketer repo security notes (21 Sep 2026)

> Threat model + review findings + open incident. Secrets appear
> lengths-only or truncated here, never values. Remote AnyDesk IDs are
> truncated to last 4 digits - full IDs live in local logs only, not git.

## 1. Scope and threat model

Covered: `tiktok-account/` login + sync (TikTok Display API OAuth,
per-account tokens, `sheet-sync.py` Sheets bridge), Google service-account
key, spreadsheet sharing. Out of scope: TikTok portal account hardening
(owner's job, see checklist below), office network hardware.

Design facts (verified in code, not assumed):

- Dashboard (`dashboard.py`) and `tester.py` bind `127.0.0.1` only. No LAN
  exposure: nobody on the Wi-Fi can reach the login flow.
- TikTok OAuth uses PKCE-hex challenge, form-encoded token exchange,
  128-bit state popped on use, single-use codes. `/callback` verifies the
  logged-in `@username` against the slot and saves nothing on mismatch
  until explicit override (`/confirm-link` checkbox ack).
- Tokens (`dashboard/tokens/*.json`: access + refresh) and client secret
  (`.local_secrets.json` or env) are local files. No remote attack surface
  exists in this system - theft requires the laptop, its cloud backup, or
  pasted secrets.

Crown jewels, ranked:

1. TikTok portal login (owns the app: can revoke/reissue everything).
2. Google service-account key (`~/.config/spreadsheet-mcp/service-account.json`).
3. TikTok refresh tokens (`dashboard/tokens/`, 10 accounts).
4. Spreadsheet ID (44 chars, unguessable; useless without the SA key).

Safety net: TikTok portal token revocation kills all 10 sessions at once;
relink restores. Damage window ends at revocation.

## 2. Secrets inventory (verified 21 Sep 2026, both repos)

| Secret | Lives at | Git cover | Tracked? |
|---|---|---|---|
| TikTok client key/secret | `.local_secrets.json` or env | `tiktok-account/.gitignore` | No |
| TikTok tokens (10) | `dashboard/tokens/*.json` | `dashboard/.gitignore` | No |
| Video/profile caches | `dashboard/csvs/` | `dashboard/.gitignore` | No |
| Spreadsheet ID | `sync/.sheet_id.json` or env | `tiktok-account/.gitignore` | No |
| SA private key | `~/.config/spreadsheet-mcp/` (outside repos) | N/A (never in tree) | No |
| MCP configs | `opencode.json`, `~/.gemini/...` | secret-free by design | No |

Rule: lengths-only in git/chat/docs. Real values in untracked files or env.

## 3. Low-risk register

### 3a. TikTok script + sync system (all verified 21 Sep)

- No secrets in git (both repos scanned: tokens, csvs, secrets, keys).
- Localhost-only servers (dashboard + tester).
- Tokens never printed/logged (all prints grepped; only "All tokens healthy.").
- No command injection (launcher passes arg arrays, no Invoke-Expression;
  tab titles quoted via `_q()`).
- `tester.py` FROZEN keeps client_secret in memory only, never on disk.
- OAuth hygiene holds (see section 1).
- Error paths truncate server messages (no token material in outputs).
- Dashboard merge preserves hyperlinks, drops footers/serials (v14-v16).
- Drive scope note: `spreadsheet-mcp/auth.py` requests spreadsheets +
  drive; sync uses Sheets only. Drive scope is dead weight - removal is a
  one-line change, pending owner approval.

### 3b. Office PC system (verified 21 Sep unless marked TODO)

- Defender healthy (real-time on, current sigs, quick scan same day).
  Full + offline scan still TODO.
- Task Scheduler clean (vendor tasks only: NVIDIA, OneDrive, Zoom,
  Google, PowerToys, IObit, SoftLanding) + one user-style SHUTDOWN timer.
- Run keys (HKCU + HKLM) clean, all legitimate.
- Token files: default Windows ACLs (owner + admins only). Correct for a
  single-user laptop; no chmod needed.
- SA key outside all repos; env fallback empty; no key files in trees.
- RustDesk dormant since Apr 2026 (no recent logs). Parsec idle heartbeat
  only (Cloudflare backend, no sessions, no Sep-21 activity).

## 4. Open risks (low, tracked)

1. **OneDrive scope (PENDING owner check).** Tokens + client secret live
   under `Documents\github`. If OneDrive syncs `Documents`, refresh tokens
   sit in Microsoft cloud. Check OneDrive backup settings.
2. **`--spreadsheet-id` echo (accepted).** Explicit CLI values appear in
   console + Task Manager process list. Prefer `.sheet_id.json` (default);
   never pass the flag on shared machines.
3. **Sheet sharing (PENDING owner check).** Open the Sheet Share dialog:
   who else has access to ALL ACCOUNT DATA? Remove anyone unneeded.
4. **Sheet tampering (PENDING owner check).** Version history: edits
   outside your runs?

## 5. Incident 21 Sep 2026: night AnyDesk sessions (OPEN)

Evidence only (log paths below; remote IDs truncated):

- 00:27 - incoming session from Android device (ID ...0898), via
  unattended-access profile, ~25s, full permissions incl. clipboard +
  file manager. No file transfer logged that night. Owner confirms: not
  them, no app-foreground activity on the phone at that hour.
- 01:46 - AnyDesk GUI launched from scratch on an already-awake PC
  (no reboot/wake events overnight). 01:48 - PC dialed out to the same
  phone ID, failed (phone offline), quit 01:52. Owner confirms: nobody
  in the office.
- Second visitor ID ...8572: 12 daytime sessions (7/13/14/15/17 Sep).
  Owner to confirm whether known.
- Ruled out: reboot, wake event, scheduled tasks, Run keys, RustDesk,
  Parsec. Security logon events need admin to read (TODO).
- Log paths: `C:\ProgramData\AnyDesk\connection_trace.txt`,
  `file_transfer_trace.txt`, `%APPDATA%\AnyDesk\ad.trace`.

Interpretation: two unattended sessions, no human at either end, both
directions. Treat as compromise until physical presence (office
01:40-01:55 CCTV/access) or phone-side cause (old device holding the
same AnyDesk identity, malware) is confirmed.

Containment (in order): PC offline -> preserve 3 log files to USB ->
rotate secrets from a CLEAN device (AnyDesk password/off, TikTok
revoke+relink, Google/Microsoft passwords, 2FA) -> Defender offline
scan -> reinstall path if doubt remains (then rotate SA key + re-share
Sheet). Never type new passwords into the suspect PC.

## 6. Pending checks (todo)

Assistant-run (read-only), blocked earlier by owner "include only":

- [ ] BitLocker status (needs admin shell).
- [ ] RDP state + SMB share inventory.
- [ ] Firewall profile review.
- [ ] Chrome extension audit (5 IDs on file, names unresolved).
- [ ] MCP configs for embedded secrets.

Owner hands/eyes:

- [ ] OneDrive scope (section 4.1).
- [ ] Sheet Share dialog + Version history (section 4.3/4.4).
- [ ] TikTok in-app authorized devices + login alerts, per account.
- [ ] Email 2FA for TikTok/Google/Microsoft/GitHub accounts.
- [ ] Old phone: powered off / AnyDesk removed?
- [ ] Office CCTV/access 01:40-01:55 Sep 21.
- [ ] Screen-lock timeout on office PC.
- [ ] Defender full + offline scan.
- [ ] Confirm visitor ID ...8572 known or unknown.
- [ ] Recovery plan: SA key backup location, 10-account relink runbook.

## 7. Standing rules

1. Lengths-only for all secrets, everywhere (git, chat, screenshots).
2. `.sheet_id.json` over `--spreadsheet-id` on shared machines.
3. Unattended remote access OFF unless actively needed; unique password
   when on; remove remote tools not in use (this box has had three).
4. Re-verify sections 2-3 after any incident; keep this file current.
