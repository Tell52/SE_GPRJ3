# Sprint 1 Review Record

Authors never approve their own PRs. Each review records a specific check, question, finding or reason for approval, and how the author responded. Requested changes follow PR Review, Fixing, PR Review on the same branch.

| Member | GitHub | Role in reviews |
|---|---|---|
| Chutipon Homsuwan | JeenoXD | Author of #1, #3, #5; merged PR #11 and #13 |
| Napat Tantipibulsap | Tell52 | Author of #2, #4; merged PR #10 and #12 |

## Feature PRs into `sprint1`

| Issue | Branch | PR | Author | Reviewer | Review comment (specific check or finding) | Author response | Checks rerun | Result |
|---|---|---|---|---|---|---|---|---|
| #1 Documentation baseline | `feature/issue1-docs` | [PR #10](https://github.com/Tell52/SE_GPRJ3/pull/10) | JeenoXD | Tell52(merged) | `<what Tell52 checked>` | `<response>` | ID consistency check | Merged `28be4c5` |
| #2 Foundation | `feature/issue2-foundation` | [PR #11](https://github.com/Tell52/SE_GPRJ3/pull/11) | Tell52 (Codex) | JeenoXD (merged) | `<what JeenoXD checked>` | Accidental direct push reverted (`d16684b`) and resubmitted via PR | [T-19 execution](../../evidence/sprint-1/issue2-foundation.md) | Merged `cf7ef4b` |
| #3 Authentication | `feature/issue3-auth` | [PR #12](https://github.com/Tell52/SE_GPRJ3/pull/12) | JeenoXD (Claude) | Tell52 (merged) | `<what Tell52 checked>` | `<response>` | T-01 to T-04: server 31, client 9 passed | Merged `3a5f20b` |
| #4 Events | `feature/issue4-events` | [PR #13](https://github.com/Tell52/SE_GPRJ3/pull/13) | Tell52 (Codex) | JeenoXD (merged) | `<what JeenoXD checked>` | `<response>` | [T-05 to T-09, smoke](../../evidence/sprint-1/issue4-events.md) | Merged `345459c` |
| #5 Registration | `feature/issue5-registration` | [PR #14](https://github.com/Tell52/SE_GPRJ3/pull/14) | JeenoXD (Claude) | Tell52 | `<e.g. checked T-12 red then green with unchanged files; read the FOR UPDATE transaction>` | `<response>` | T-10 to T-15 | Merged `d1914a2`; confirmed by Tell52 on 2026-11-06 |
| #6 Roster | `feature/issue6-roster` | [PR #15](https://github.com/Tell52/SE_GPRJ3/pull/15) | Tell52 (Codex) | JeenoXD (merged) | `<what JeenoXD checked>` | `<response>` | T-16/T-17; server 100 and client 46 passed; [evidence](../../evidence/sprint-1/issue6-roster.md) | Merged `7f5e4b2` |
| #7 Verification | `feature/issue7-verification` | `<PR link>` | JeenoXD (Claude) | Tell52 | `<e.g. ran npm run test:e2e and looked at the screenshots; did M-01 fresh clone>` | `<response>` | T-18 desktop and mobile, M-01, M-02 | `<result>` |

## Release PR (Issue #8)

| PR | From | To | Author | Reviewer | Acceptance checks on staging | Accepted commit / tag |
|---|---|---|---|---|---|---|
| `<link>` | `sprint1` | `main` | `<name>` | `<name>` | `<full suites, M-01 fresh clone>` | `<SHA>` / `<tag>` |

## Team Contributions

Record actual work only. An equal number of commits is not required; both members must understand the design, tests and released behaviour.

### Contribution by issue

| Issue | Author(s) | Reviewer | Pair work | Main contribution |
|---|---|---|---|---|
| #1 Documentation baseline | JeenoXD (with Claude) | Tell52 | No | Parts A to E and sprint records, matched to Issues #1 to #8; Tell52 wrote the Issues (with Codex) |
| #2 Foundation | Tell52 (with Codex) | JeenoXD | No | Project structure, schema, migration, seed, local PostgreSQL, T-19 |
| #3 Authentication | JeenoXD (with Claude) | Tell52 | No | Sessions, CSRF, role middleware, login, app shell, T-01 to T-04 |
| #4 Events | Tell52 (with Codex) | JeenoXD | No | Event create, publish, discovery API and UI, T-05 to T-09, smoke run |
| #5 Registration | JeenoXD (with Claude) | Tell52 | No | Locked registration transaction, register UI, receipt, My registrations, T-10 to T-15, T-12 TDD |
| #6 Roster | Tell52 (with Codex) | JeenoXD | No | Owner-only roster API, responsive UI, T-16/T-17 and evidence |
| #7 Verification | JeenoXD (with Claude) | Tell52 | `<yes/no: M-01 and M-02 are done by the reviewer>` | Playwright journey (T-18) at desktop and mobile with API restart, `npm run test:e2e`, M-01/M-02 records |
| #8 Release | `<name>` | `<name>` | `<>` | `<>` |

### Summary

| Member | Approximate share | Areas |
|---|---|---|
| Chutipon Homsuwan | `<%>` | `<>` |
| Napat Tantipibulsap | `<%>` | `<>` |

## Process Evidence Index

Screenshots of Issues, PRs, reviews, history and board are stored under `docs/evidence/sprint-1/` and linked here. At least two complete chains (Issue, branch, PR, review, `sprint1`, `main`) must be shown.

### Release reference

| Item | Value |
|---|---|
| Accepted release commit / tag | `<commit SHA>` / `<tag>` |
| Release PR (`sprint1` into `main`) | `<link>` |
| Final board status | `<screenshot or link>` |

### Issue status

| Issue | Branch | PR into `sprint1` | Reviewer | Status |
|---|---|---|---|---|
| #1 | `feature/issue1-docs` | [PR #10](https://github.com/Tell52/SE_GPRJ3/pull/10) | Tell52 | Merged into `sprint1` (`28be4c5`) |
| #2 | `feature/issue2-foundation` | [PR #11](https://github.com/Tell52/SE_GPRJ3/pull/11) | JeenoXD | Merged into `sprint1` (`cf7ef4b`); M-01 still pending |
| #3 | `feature/issue3-auth` | [PR #12](https://github.com/Tell52/SE_GPRJ3/pull/12) | Tell52 | Merged into `sprint1` (`3a5f20b`) |
| #4 | `feature/issue4-events` | [PR #13](https://github.com/Tell52/SE_GPRJ3/pull/13) | JeenoXD | Merged into `sprint1` (`345459c`) |
| #5 | `feature/issue5-registration` | [PR #14](https://github.com/Tell52/SE_GPRJ3/pull/14) | Tell52 | Merged into `sprint1` (`d1914a2`) |
| #6 | `feature/issue6-roster` | [PR #15](https://github.com/Tell52/SE_GPRJ3/pull/15) | JeenoXD | Merged into `sprint1` (`7f5e4b2`) |
| #7 | `feature/issue7-verification` | `<PR link>` | Tell52 | In review |
| #8 | `sprint1` into `main` | `<link>` | `<name>` | Backlog |

### Sampled evidence chains

| Chain | Issue | Branch | PR into `sprint1` | Review screenshot | Release PR into `main` | Files |
|---|---|---|---|---|---|---|
| 1 | `<#>` | `<branch>` | `<link>` | `<file>` | `<link>` | `docs/evidence/sprint-1/<file>.png` |
| 2 | `<#>` | `<branch>` | `<link>` | `<file>` | `<link>` | `<file>` |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Review, contributions and process evidence templates |
| 1.1 | 2026-11-05 | Record #2 local implementation/evidence without claiming human approval, commit, PR or integration. |
| 1.2 | 2026-11-06 | Record #4 evidence (written by Codex during #4). |
| 1.3 | 2026-11-06 | Filled PR links, authors, mergers and merge commits for #1 to #4 from git history; review comments left for the reviewers to write; added #5. |
| 1.4 | 2026-11-06 | Tell52 confirmed #5 merged via PR #14; record #6 local work and checks without claiming human review or integration. |
| 1.5 | 2026-11-07 | #6 merged via PR #15 (merge `7f5e4b2`); added #7; GitHub usernames in the content, full names in the member tables. |
