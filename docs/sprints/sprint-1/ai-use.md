# AI Use Declaration (Deliverable 1)

The single AI use declaration for Deliverable 1, covering AI assisted work and the human verification we actually did.

| Member | AI tools used | Purpose |
|---|---|---|
| Chutipon Homsuwan | Claude (Anthropic) via claude.ai | Drafting documentation, design and test proposals, implementation assistance (#1, #3, #5) |
| Napat Tantipibulsap | Codex | Drafting GitHub Issues #1 to #8, implementation assistance (#2, #4) |

How AI was used: drafting documentation from the handout and theme brief, proposing designs and tests, and assisting implementation. All AI output was reviewed and edited by us. Completion is supported by test output, commits and reviews we checked ourselves, never by AI claims. Automated test runs by AI tools are execution evidence (recorded in [tests.md](tests.md)), not human verification. Both members understand the design, tests and released behaviour.

## Key Prompts

| Prompt | Context / My Reflection |
| --- | --- |
| Draft Parts A to E aligned with Issues #1 to #8 | Asked Claude to write the SRS, decisions, features, traceability, SDS, plan and Sprint 1 specification, API, UI and test files using the IDs already in the Issues. My Reflection (Chutipon): Claude's first drafts did not match Issue #1 (different file layout and IDs). I compared each file against the Issue #1 text myself and had it restructured: supporting records merged into the SRS, tests.md and reviewer.md, one ai-use.md, and loose notes moved into tables. |
| Issue #2: build the foundation from the repository docs on `feature/issue2-foundation`, ask about conflicts, leave commit and push to the user | Codex built the client/server structure, Prisma migration and seed, local PostgreSQL Compose and T-19 tests. We decided Docker Compose is used only for the local database; app deployment stays in Lab 5. My Reflection (Tell52): `<to be written by Tell52>` |
| Issue #3: implement F-01 (login, me, logout with server side sessions and CSRF) from the Sprint 1 specification, with T-01 to T-04 | Claude wrote the session, CSRF and role middleware, auth routes, login page, route guards and app shell, and the API and UI tests. My Reflection (Chutipon): I set up my own local databases from the README, ran `npm test` myself (31 server and 9 client tests passed) and fixed setup problems along the way (missing `.env.test`, mismatched database password). I decided client tests live in `client/tests/` and had the config changed to match. |
| Issue #4: pull `sprint1`, create `feature/issue4-events`, implement the current docs, ask before conflicting requirements or changes to teammate code, leave commit and push to the user | Codex asked first, then built F-02 (create, publish, discover) API, UI and tests in separate event files, ran the build, the PostgreSQL test suite and a desktop and mobile smoke run. Tell52 confirmed the field limits, the own registration summary (DEC-13) and the changes to `app.ts`, `App.tsx` and `App.test.tsx`. My Reflection (Tell52): `<to be written by Tell52>` |
| Issue #5: implement F-03 (atomic registration, my registrations, receipt) with T-10 to T-15, writing T-12 first as the TDD test | Claude wrote T-12 first and showed it failing, then added the rule (`registration-rules.ts`), the locked transaction, routes, register button, receipt and My registrations, and the API and UI tests. It removed the row lock on purpose to confirm T-13 catches overbooking. My Reflection (Chutipon): `<what you checked yourself, e.g. ran the T-12 red and green commits, read the FOR UPDATE transaction, tried registering twice>` |

## Human verification

| Work | What we verified ourselves | Evidence |
|---|---|---|
| Documentation (Parts A to E) | Chutipon compared every file against the Issue #1 text and requested fixes before PR #10 was merged. Tell52: `<what you checked in the PR #10 review>` | [PR #10](https://github.com/Tell52/SE_GPRJ3/pull/10) |
| #2 Foundation | Chutipon set up the project from a fresh clone following the README (env files, Compose databases, migrate, seed) and ran `npm test` successfully. Tell52: `<what you checked in Codex's work before PR #11>` | [issue2-verification.txt](../../evidence/sprint-1/issue2-verification.txt), [PR #11](https://github.com/Tell52/SE_GPRJ3/pull/11) |
| #3 Authentication | Chutipon ran `npm test` on his own machine: 31 server and 9 client tests passed, 0 failed or skipped. Tell52: `<what you checked in the PR #12 review>` | [issue3-npm-test.txt](../../evidence/sprint-1/issue3-npm-test.txt), [PR #12](https://github.com/Tell52/SE_GPRJ3/pull/12) |
| #4 Events | Tell52 confirmed the design decisions before Codex wrote code. Chutipon reviewed and merged PR #13: `<what you checked>`. Tell52: `<what you checked in Codex's work>` | [issue4-events.md](../../evidence/sprint-1/issue4-events.md), [PR #13](https://github.com/Tell52/SE_GPRJ3/pull/13) |
| #5 Registration | Chutipon: `<e.g. committed T-12 alone and saw it fail, then saw it pass with the same files; ran npm test>`. Tell52: `<what you checked in the #5 PR review>` | [issue5-t12-red.txt](../../evidence/sprint-1/issue5-t12-red.txt), [issue5-t12-green.txt](../../evidence/sprint-1/issue5-t12-green.txt), [issue5-npm-test.txt](../../evidence/sprint-1/issue5-npm-test.txt), `<#5 PR link>` |

## Limits and corrected AI mistakes

| Issue | What happened | How we handled it |
|---|---|---|
| #1 | Claude drafted the documents from an outdated summary of Issue #1, so file names, ID ranges and record files did not match the real issue. | Pasted the full Issue #1 text and had every file restructured to match it before committing. |
| #2 | Codex misread a push request and pushed directly to `sprint1` (`d111892`) instead of opening a feature PR. | Reverted without rewriting history (`d16684b`) and resubmitted through PR #11. Details in [foundation evidence](../../evidence/sprint-1/issue2-foundation.md). |
| #3 | Claude's file delivery used duplicate names (`auth.ts`, `api.ts`), and two client test files ended up in the wrong folder, so the first client test run failed. | Placed each file by its full path, moved the tests to `client/tests/` and updated the Vitest config; all tests then passed. |
| #4 | Codex's first UI test run failed one test: it tried to focus a field while the field was still disabled. Its first smoke run also imported a file that did not exist. | Codex fixed both; the same assertion and the smoke run then passed ([initial output](../../evidence/sprint-1/issue4-initial-test.txt)). Codex also appended its #4 notes to these docs outside the tables, which were moved into rows in #5. |
| #5 | Claude's first register UI showed "Full" twice and left a stale "1 places left" after losing the race for the last place. | Fixed: the page now switches to Full and hides the button; grammar fixed to "1 place left"; UI tests added for both. |
