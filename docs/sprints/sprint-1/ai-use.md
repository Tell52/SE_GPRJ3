# AI Use Declaration (Deliverable 1)

The single AI use declaration for Deliverable 1, covering AI assisted work and the human verification we actually did.

| Member | AI tools used | Purpose |
|---|---|---|
| Chutipon Homsuwan | Claude (Anthropic) via claude.ai | Drafting documentation, design and test proposals, implementation assistance |
| `<teammate name>` | `<tool>` | Drafting GitHub Issues #1 to #8, `<other>` |

How AI was used: drafting documentation from the handout and theme brief, proposing designs and tests, and assisting implementation. All AI output was reviewed and edited by us. Completion is supported by test output, commits and reviews we checked ourselves, never by AI claims. Both members understand the design, tests and released behaviour.

## Key Prompts

| Prompt | Context / My Reflection |
| --- | --- |
| Draft Parts A to E aligned with Issues #1 to #8 | Asked Claude to write the SRS, decisions, features, traceability, SDS, plan and Sprint 1 specification, API, UI and test files using the IDs already in the Issues. My Reflection: `<what you checked or changed, e.g. reviewed DEC-01 to DEC-12, changed ...>` |
| Issue #2: pull sprint1, create feature/issue2-foundation, follow repository docs, ask about conflicts, leave commit/push to the user | Codex assisted with the application foundation, Prisma migration/seed, isolated PostgreSQL Compose, tests and execution records. The user resolved the Docker scope conflict on 2026-11-05: local database Compose is included, application deployment is deferred. Human reflection/review of the implementation is pending. |
| `<Issue #3: sessions and CSRF>` | `<context>`. My Reflection: `<>` |
| `<Issue #4: events>` | `<context>`. My Reflection: `<>` |
| `<Issue #5: registration concurrency, T-12 TDD>` | `<context>`. My Reflection: `<>` |
| `<Issue #6: roster>` | `<context>`. My Reflection: `<>` |
| `<Issue #7: E2E and restart check>` | `<context>`. My Reflection: `<>` |

## Human verification

Issue #2 clarification (2026-11-05): automated tool execution is recorded in [foundation evidence](../../evidence/sprint-1/issue2-foundation.md). It is not human verification. The earlier general declaration does not establish that this implementation has received teammate review or passed M-01. After receiving the change summary, the user explicitly authorized Codex to commit and push directly to `sprint1`; Codex does not act as the approving reviewer.

| Work | What we verified ourselves | Evidence |
|---|---|---|
| Documentation (Parts A to E) | `<e.g. checked every AC maps to a T test; reviewed DEC-01 to DEC-12>` | `<review link>` |
| Implementation | `<e.g. read and ran tests, inspected assertions and stored rows>` | `<test output / PR>` |

## Limits and rejected suggestions

`<e.g. AI suggestions we rejected and why>`
