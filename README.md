# Tracking Food

Private, single-user food and symptom journal. Mobile-first web app.

## Project documentation
- [Functional specification](docs/functional-spec.md)
- [Technical specification](docs/technical-spec.md)
- [Agent instructions](AGENTS.md)
- [Setup steps](docs/setup.md)

## Local setup

Use **Node.js 24** (see `.nvmrc`) and its bundled npm. With nvm installed:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. No database, authentication credentials or environment
file is needed. The responsive starter page contains no journal data. Public
`GET /api/health` returns HTTP 200 and only `{"status":"ok"}`; it is a static
application liveness check and does not test a database or other dependencies.

## Commands and checks

```sh
npm run lint       # ESLint, including Next.js and TypeScript rules
npm run typecheck  # Generate Next.js route types and check strict TypeScript
npm run test       # Focused Vitest healthcheck test
npm run build     # Production build
npm run start     # Serve the production build
```

Playwright checks the starter page at desktop and mobile widths and the public
healthcheck:

```sh
npx playwright install --with-deps chromium  # First-time browser/system setup
npm run build
npm run test:e2e
```

The smoke command starts a local production server on `127.0.0.1:3000` and stops
it afterward. Locally it can reuse an already running app at that address, including
`npm run dev`; CI always starts its own production server. Keep port 3000 free
when testing the production build. All checks, including smoke tests, are required
by `.github/workflows/ci.yml`; missing scripts fail CI.

In environments that block Playwright browser downloads, an installed Chromium
can be used with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
CI uses Playwright's matching browser version by default.

## Environment handling

This scaffold requires no environment variables. Keep future local secrets in
`.env.local` (ignored by Git); never commit credentials or health records. Only
non-secret browser-visible values may use the `NEXT_PUBLIC_` prefix, because
Next.js embeds those values in client bundles. A future `.env.example` must use
placeholders only. Builds and tests must continue to use synthetic data.

## Stack and scope

Next.js App Router · React · strict TypeScript · Tailwind CSS · Vitest · Playwright.
Direct dependencies are pinned in `package.json`, with the full dependency tree
locked in `package-lock.json`; use `npm ci` for reproducible installs.
ESLint 9 is pinned because Next.js's bundled lint plugins currently declare
support through ESLint 9. Revisit this pin when those plugins support ESLint 10;
npm currently marks ESLint 9 as deprecated.

PostgreSQL/Drizzle persistence, authentication and journal workflows are deferred
to later issues. Authentication must be decided before protected access or
deployment, and backups/restore before real personal data is stored.

## Development workflow
See [Codex session workflow](docs/workflow.md) for refinement, coding, review and copyable prompts.

Use feature branches and pull requests. Only the repository owner approves merges, deployment, production access and destructive database changes.

Do not add real health information, secrets or production credentials to the repository.
