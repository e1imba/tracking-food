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

## Engineering decision guide — Laws of Software Engineering
Use the principles collected in Dr Milan Milanovic's *Laws of Software Engineering* (2026) as **context-sensitive heuristics**, not mandatory rules. The project copy of the book is in the owner's TrackerFood library; agents may not have direct access to it, so apply the operational rules below without claiming to have read that copy.

- **Gall's Law:** build and validate the smallest useful end-to-end workflow before extending scope. Prioritize meal entry -> persistence -> history -> edit/delete; then symptoms, then dashboard.
- **KISS / YAGNI:** choose the simplest design meeting current acceptance criteria. Do not add microservices, a separate REST API, generic abstractions, queues, AI, PWA, mobile client, or speculative extensibility without a demonstrated requirement.
- **Tesler's Law / Principle of Least Astonishment:** absorb avoidable complexity in the application so that meal and symptom entry remains predictable and fast. Default to current local time with retroactive editing; never silently overwrite data or imply medical causation.
- **Technical Debt / Boy Scout Rule:** acknowledge necessary shortcuts with their reason and a concrete revisit trigger. Improve code in the area being changed; avoid unrelated rewrites.
- **Testing Pyramid:** prioritize focused domain tests, integration tests for DB access and authorization, and a small set of critical end-to-end paths. Do not optimize for a coverage percentage in isolation.
- **First-Principles Thinking / Sunk Cost Fallacy:** evaluate tools and abstractions against actual constraints and evidence; past implementation effort is not itself a reason to keep a poor choice.

### Decision timing
For each non-trivial proposal, state **DECIDE NOW**, **DEFER (with explicit trigger)**, or **NOT NEEDED**, and briefly explain the relevant trade-off.
- Decide auth before protected access or deployment; decide schema and migration details before persisting meals; decide backups and restore before storing real personal data.
- Decide autocomplete semantics while implementing that interaction based on example meal entries.
- Defer mobile API, PWA, AI, diet scoring, reports, new architectural services, and extra MCP integrations until the corresponding real user requirement exists.
- Balance competing principles against concrete acceptance criteria, privacy, data integrity, and observed usability. Never use a principle to override security obligations.

When suggesting architecture or feature work in issues/PRs, include only material decisions and their triggers; do not produce ceremony or ADRs for trivial implementation details. Keep the owner's current phase and scope as the primary source of truth.

## Task flow
Read specs -> plan -> implement -> validate -> inspect diff -> open PR for human review.
