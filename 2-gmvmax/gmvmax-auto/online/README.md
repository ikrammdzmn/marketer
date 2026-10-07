# him-gmv-online (gmvmax-auto/online)

Vercel + Neon online module. Local Python (`collector.py`, `live_view.py`, 8082) stays frozen.

Env (Vercel dashboard only, never git): `NEON_URL_PROD`, `TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN`, `TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN`, `TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN`, `CRON_SECRET`.

## Google sign-in and access management

- Google OAuth uses Auth.js. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, and `AUTH_ADMIN_EMAIL` in Vercel Production (and Preview
  when testing). `AUTH_ADMIN_EMAIL` is the fixed bootstrap administrator; do not
  put its value in git or chat.
- In Google Cloud OAuth settings, add the authorized redirect URI
  `https://marketer-hw.vercel.app/api/auth/callback/google`.
- Run `../migrations/013_access_allowlist.sql` on Neon dev, verify, then prod.
  The bootstrap admin can then sign in and manage permitted Google emails at
  `/access`. The list is stored in `core.access_allowlist`; additions/removals
  are recorded in `core.audit`.
- Dashboard data APIs check the current allowlist on every request, so removing
  an email denies its next data request even if that browser still has a session.
  The webhook and cron routes remain protected by their existing server secrets.
- Vercel Deployment Protection currently blocks users before app sign-in, including
  OAuth callback requests from people outside the Vercel team. Keep it enabled
  until the migration, env vars, and app gate are deployed. For real Google-user
  tests, the owner must then temporarily turn off the Vercel wall in a controlled
  window; the app middleware and API allowlist checks remain active. If any test
  fails, immediately restore Vercel Protection. Leave it off only after all
  signed-out, allowed, denied, and removal tests pass (unless every user is also
  intended to be a Vercel team member).
- Dependency status: Next is 15.5.27 (React 18 supported) and PostCSS is 8.5.29
  with an override for Next's pinned copy; `npm audit --omit=dev` is clean. Full
  audit still reports 7 Tailwind 3 build/dev findings. The suggested Tailwind 4
  fix is a major migration; review/test it separately. Do not use `--force` as
  an automatic fix.
