# Sprint 1 Review Record

Authors never approve their own PRs. Each review records a specific check, question, finding or reason for approval, and how the author responded. Requested changes follow PR Review, Fixing, PR Review on the same branch.

| Member | GitHub | Role in reviews |
|---|---|---|
| Chutipon Homsuwan | JeenoXD | `<author of / reviewer of>` |
| `<teammate name>` | Tell52 | `<author of / reviewer of>` |

## Feature PRs into `sprint1`

| Issue | Branch | PR | Author | Reviewer | Review comment (specific check or finding) | Author response | Checks rerun | Result |
|---|---|---|---|---|---|---|---|---|
| #1 Documentation baseline | `feature/issue1-docs` | `<link>` | `<name>` | `<name>` | `<e.g. checked every AC-01 to AC-19 maps to a T test; questioned capacity cap DEC-03>` | `<response>` | `<ID consistency check>` | `<Approved / changes requested then approved>` |
| #2 Foundation | `feature/issue2-foundation` | Feature PR into sprint1 | User authorized Codex commit | Pending teammate | Review not performed | Corrected accidental direct push with revert; feature submitted for PR review | [T-19 execution](../../evidence/sprint-1/issue2-foundation.md) | Automated results recorded; peer review, M-01 and merge pending |
| #3 Authentication | `feature/issue3-auth` | `<link>` | `<name>` | `<name>` | `<e.g. replayed old cookie after logout; checked no hash in responses>` | `<response>` | `<T-01 to T-04>` | `<result>` |
| #4 Events | `feature/issue4-events` | `<link>` | `<name>` | `<name>` | `<comment>` | `<response>` | `<T-05 to T-09>` | `<result>` |
| #5 Registration | `feature/issue5-registration` | `<link>` | `<name>` | `<name>` | `<e.g. verified T-12 red then green with unchanged assertions; asked about lock vs serializable>` | `<response>` | `<T-10 to T-15>` | `<result>` |
| #6 Roster | `feature/issue6-roster` | `<link>` | `<name>` | `<name>` | `<comment>` | `<response>` | `<T-16, T-17>` | `<result>` |
| #7 Verification | `feature/issue7-verification` | `<link>` | `<name>` | `<name>` | `<comment>` | `<response>` | `<T-18, M-01, M-02>` | `<result>` |

## Release PR (Issue #8)

| PR | From | To | Author | Reviewer | Acceptance checks on staging | Accepted commit / tag |
|---|---|---|---|---|---|---|
| `<link>` | `sprint1` | `main` | `<name>` | `<name>` | `<full suites, M-01 fresh clone>` | `<SHA>` / `<tag>` |

## Team Contributions

Record actual work only. An equal number of commits is not required; both members must understand the design, tests and released behaviour.

### Contribution by issue

| Issue | Author(s) | Reviewer | Pair work | Main contribution |
|---|---|---|---|---|
| #1 Documentation baseline | `<name>` | `<name>` | `<yes/no, what>` | `<e.g. drafted SRS and contracts; reviewed decisions>` |
| #2 Foundation | `<name>` | `<name>` | `<>` | `<>` |
| #3 Authentication | `<name>` | `<name>` | `<>` | `<>` |
| #4 Events | `<name>` | `<name>` | `<>` | `<>` |
| #5 Registration | `<name>` | `<name>` | `<>` | `<>` |
| #6 Roster | `<name>` | `<name>` | `<>` | `<>` |
| #7 Verification | `<name>` | `<name>` | `<>` | `<>` |
| #8 Release | `<name>` | `<name>` | `<>` | `<>` |

### Summary

| Member | Approximate share | Areas |
|---|---|---|
| Chutipon Homsuwan | `<%>` | `<>` |
| `<teammate name>` | `<%>` | `<>` |

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
| #1 | `feature/issue1-docs` | `<link>` | `<name>` | Backlog |
| #2 | `feature/issue2-foundation` | Feature PR into sprint1 | Pending teammate | Not Done: peer review, M-01 and merge pending. GitHub board was not changed. |
| #3 | `feature/issue3-auth` | `<link>` | `<name>` | Backlog |
| #4 | `feature/issue4-events` | `<link>` | `<name>` | Backlog |
| #5 | `feature/issue5-registration` | `<link>` | `<name>` | Backlog |
| #6 | `feature/issue6-roster` | `<link>` | `<name>` | Backlog |
| #7 | `feature/issue7-verification` | `<link>` | `<name>` | Backlog |
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
