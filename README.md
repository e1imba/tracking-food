# Tracking Food

Private food and symptom journal with Google sign-in for any Google account.
Mobile-first web app; each account has its own session and future private journal.

## Project documentation
- [Functional specification](docs/functional-spec.md)
- [Technical specification](docs/technical-spec.md)
- [Agent instructions](AGENTS.md)
- [Setup and next steps](docs/setup.md)
- [Engineering decision guide](docs/engineering-laws.md)

## Local setup

Use **Node.js 24** (see `.nvmrc`) and its bundled npm. With nvm installed:

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
# Fill in local Google OAuth credentials and AUTH_SECRET (see below).
npm run dev
```

Open http://localhost:3000. The home page `/` requires a valid session and redirects
to `/login` otherwise. No database is needed; the protected home page contains no
journal data. Public
`GET /api/health` returns HTTP 200 and only `{"status":"ok"}`; it is a static
application liveness check and does not test a database or other dependencies.

## Google OAuth on localhost

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a
   project and configure Google Auth Platform branding and audience. Choose
   **External** so unrelated Google accounts can sign in. Request only basic
   identity scopes (`openid`, `email`, `profile`). The app has no account allowlist.
   Google may impose its own audience restrictions: while the OAuth project is in
   Testing, add both manual-test accounts as test users. To allow arbitrary Google
   accounts without updating a test-user list, set the OAuth audience to
   **In production** as permitted by Google. This OAuth setting does not host or
   deploy this application. Workspace administrator policies may also apply.
2. Create an OAuth client of type **Web application**. Set the authorized origin
   to `http://localhost:3000` and the authorized redirect URI to exactly
   `http://localhost:3000/api/auth/callback/google`.
3. Copy `.env.example` to `.env.local`. Set `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET` from that client. Generate `AUTH_SECRET` with
   `openssl rand -base64 32` and paste the result into `.env.local`.
   Keep `AUTH_URL=http://localhost:3000`. Restart `npm run dev` after edits.
4. Use **localhost**, not `127.0.0.1`, for this manual flow; Google validates the
   exact callback URI. Keep secrets local and use a dedicated development OAuth
   client. HTTPS hosting and its configuration are outside this issue.

Manual verification (requires the real local OAuth client; never put it in CI):

1. In a fresh browser profile, open `/` directly. Expect `/login`, then choose
   **Nastavi preko Google-a**. Expect Google's account chooser. Sign in with account
   A for the first time and confirm the protected home shows A's email, with no
   registration or password form in the application.
2. Refresh `/` and confirm the session remains active. Select **Odjavi se**;
   expect `/login`. Open `/` directly and refresh: both must require sign-in.
3. Sign in with A again, using the same button and chooser. In a separate browser
   profile, repeat with a different Google account B. Both must work without
   changing application configuration; signing out A must leave B signed in.
4. Cancel or deny Google consent and confirm no protected access is granted and
   sign-in remains available. If an OAuth error is returned, the login page shows
   a generic retry message.
5. Session lifetime is controlled by **`SESSION_MAX_AGE_SECONDS`** in
   `src/lib/auth/config.ts` (default 7 days). For a short manual expiry check,
   temporarily reduce this constant, restart, sign in anew, wait past the lifetime
   plus Auth.js's 15-second clock tolerance, and reopen `/`. Expect `/login`.
   Restore the constant to 7 days. Existing tokens retain their issued expiry.

Auth.js stores an encrypted JWT in an HttpOnly, SameSite=Lax cookie, Secure on
HTTPS. Its session endpoint can renew a valid session for the configured lifetime;
home-page refresh alone does not renew the cookie. Logout ends the application
session in that browser and leaves the Google session intact. Persistent users
and database sessions are not required. See [ADR-001](docs/decisions/001-google-auth.md).

## Commands and checks

```sh
npm run lint       # ESLint, including Next.js and TypeScript rules
npm run typecheck  # Generate Next.js route types and check strict TypeScript
npm run test       # Vitest healthcheck, auth guard and session policy tests
npm run build     # Production build
npm run start     # Serve the production build
```

Playwright checks route protection, valid/expired/forged sessions, independent
accounts, refresh and logout at desktop and mobile widths, plus the public healthcheck:

```sh
npx playwright install --with-deps chromium  # First-time browser/system setup
npm run build
npm run test:e2e
```

The test command starts its own local production server on `127.0.0.1:3000` with
synthetic credentials and stops it afterward. Keep port 3000 free; an existing
server is never reused. Tests mint synthetic encrypted JWTs in the test process;
there is no test login/provider in application code. These checks require no real
Google credentials or network requests to Google and do not test Google's UI or
actual OAuth callback. Perform the manual checks above separately.
All checks, including Playwright tests, are required
by `.github/workflows/ci.yml`; missing scripts fail CI.

In environments that block Playwright browser downloads, an installed Chromium
can be used with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
CI uses Playwright's matching browser version by default.

## Environment handling

Authentication requires `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and
`AUTH_URL` in `.env.local` (ignored by Git); never commit credentials or health records. Only
non-secret browser-visible values may use the `NEXT_PUBLIC_` prefix, because
Next.js embeds those values in client bundles. `.env.example` contains no secrets.
Builds, public health checks and CI need no real credentials. Missing/invalid auth
configuration must never grant access to the protected page.

## Stack and scope

Next.js App Router · React · strict TypeScript · Auth.js/Google · Tailwind CSS · Vitest · Playwright.
Direct dependencies are pinned in `package.json`, with the full dependency tree
locked in `package-lock.json`; use `npm ci` for reproducible installs.
ESLint 9 is pinned because Next.js's bundled lint plugins currently declare
support through ESLint 9. Revisit this pin when those plugins support ESLint 10;
npm currently marks ESLint 9 as deprecated.

Auth.js v5 is pinned to `5.0.0-beta.32`, which declares Next.js 16/React 19 support
and uses asynchronous request APIs. Recheck compatibility and auth regressions on
upgrade. PostgreSQL/Drizzle persistence, persistent user records and journal
workflows are deferred until journal storage is implemented. Future reads/writes
must enforce ownership on the server. Decide hosting and backups/restore before
real personal data is stored.

## Development workflow
See [Codex session workflow](docs/workflow.md) for refinement, coding, review and copyable prompts.

Use feature branches and pull requests. Only the repository owner approves merges, deployment, production access and destructive database changes.

Do not add real health information, secrets or production credentials to the repository.
