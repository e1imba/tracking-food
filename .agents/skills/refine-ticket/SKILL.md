---
name: refine-ticket
description: Refine an idea through chat into a small agreed GitHub issue before implementation.
---

# Refine a ticket

1. Read AGENTS.md, docs/functional-spec.md, docs/technical-spec.md and docs/workflow.md.
   Apply the Laws heuristics in AGENTS.md; read the owner's book if actually available,
   otherwise disclose the limitation rather than inventing quotations.
2. Check existing issues and code to avoid duplicate work. Open an issue in refinement
   when requested; update that issue as the conversation resolves behavior.
3. Keep the issue short: goal, scope, 3–5 observable acceptance criteria, relevant
   specification references, and only material technical decisions or blockers.
   Criteria describe delivered behavior, not a list of implementation steps.
4. Compare the request with the current code, tests and configuration on the
   target branch, and with the relevant sections of both specifications. Identify
   what is already decided and which gaps or conflicts affect the ticket.
   - Ask functional questions about user-visible behavior, access, edge cases or
     acceptance criteria when the sources leave a material choice open. For access
     changes, check who can sign in and whose data each account can access.
   - Ask technical questions about architecture, dependencies, data, security or
     verification when the choice affects scope, risk or future work.
   - Ground each question in a concrete finding from the repository or a
     specification. Give a recommendation and explain what the answer changes.
     Ask only about decisions the owner needs to make. When a category has no
     open decisions, briefly state the existing decision or a proposed default.
   Record confirmed answers in the ticket, approved requirement changes in the
   canonical specification, and material architecture decisions in docs/decisions/.
5. Record the owner's scope confirmation in the issue before handoff. Give its link
   and the coding prompt from docs/workflow.md. Do not implement or launch another
   session as a side effect of refinement. Never claim a remote write that failed.
