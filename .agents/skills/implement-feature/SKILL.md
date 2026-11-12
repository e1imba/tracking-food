---
name: implement-feature
description: Implement an agreed issue, open a PR, or address review feedback in its coding session.
---

# Implement a feature

1. Read AGENTS.md, both canonical specifications, docs/workflow.md and the current
   issue including its discussion. Confirm agreed scope and acceptance criteria;
   surface unresolved blockers or specification conflicts before dependent work.
2. Inspect the current repository and use a dedicated feature branch. Implement
   the smallest change meeting the criteria. Use database-change/write-tests skills
   when relevant. Do not introduce speculative scope or abstractions.
3. Add meaningful tests appropriate to the change. Run available lint, typecheck,
   tests and build; disclose unavailable/skipped checks and actual failures.
   Documentation-only changes need documentation checks, not invented app tests.
4. Inspect the diff and open a linked PR using the repository template. Map the
   delivered behavior to acceptance criteria and report verification and risks.
5. When asked to address review, read the latest PR comments and branch. Check each
   finding against code and current project rules, fix valid findings, explain any
   disagreement in the PR thread and rerun relevant checks. Summarize unresolved
   findings for the next independent review; never dismiss them silently.
6. Do not merge, deploy or launch a reviewer automatically. Return the PR link and
   handoff prompt. If publishing fails, report it explicitly.
