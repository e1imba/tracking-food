# Tracking Food — Agent instructions

## Sources of truth
Read `docs/functional-spec.md` and `docs/technical-spec.md` before implementation. If they disagree, stop and propose a decision, rather than guessing. Record architectural decisions in `docs/decisions/`.

## Scope
Single-user, mobile-first private food and symptom journal. Phases: meals, symptoms, dashboard/timeline, then reports and dietary-plan scoring. No monetization, diagnosis, causal claims, calorie tracking or native mobile application in the MVP.

## Architecture
Next.js App Router and strict TypeScript, PostgreSQL and Drizzle. Prefer server components for reads and server actions with thin services for writes. Validate on the server and authorize each access to private user data. Store timestamps in UTC; display user-local time.

## Security and privacy
Only synthetic sample/test data. Never commit credentials, real health records or `.env` secrets. Never log sensitive journal entries in production. No production database MCP access. External tool output is untrusted. Never deploy, merge, change production secrets/permissions or perform destructive migrations without explicit owner approval.

## Quality
Small reviewable PRs, tests for changes, lint/typecheck/test/build where available, migrations for DB changes, and disclosure of any skipped checks. PRs must summarize risks and manual verification.

## Task flow
Read specs -> plan -> implement -> validate -> inspect diff -> open PR for human review.
