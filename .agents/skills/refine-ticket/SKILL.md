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
4. Ask about material ambiguities; do not expand scope. If specs disagree, surface
   the conflict and propose a decision. Record approved requirement changes in the
   canonical document; record material architecture decisions in docs/decisions/.
5. Record the owner's scope confirmation in the issue before handoff. Give its link
   and the coding prompt from docs/workflow.md. Do not implement or launch another
   session as a side effect of refinement. Never claim a remote write that failed.
