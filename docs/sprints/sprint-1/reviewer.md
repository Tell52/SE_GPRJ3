# Sprint 1 Review Record

Updated 2026-11-08 (Asia/Bangkok). This record distinguishes GitHub approval, technical verification and release acceptance. No teammate review text or personal contribution is inferred from a merge.

## Members and responsibilities

| Member | GitHub | Recorded work |
|---|---|---|
| Chutipon Homsuwan | JeenoXD | Authored #1, #3, #5 and #7; approved #2, #4 and #6 |
| Napat Tantipibulsap | Tell52 | Authored #2, #4 and #6; created Issues #1–8; approved #1, #3, #5 and #7; coordinates #8 |

## Feature PRs into sprint1

All seven PRs are merged into `sprint1`; every approval is from the other member. The source records are preserved in [GitHub PR evidence](../../evidence/sprint-1/issue8/github-pr-evidence.json). Approval comments are quoted faithfully below. They do not describe a specific technical check, so substantive review evidence remains incomplete.

| Issue / contract | Feature branch | PR / author | Teammate approval (Bangkok time) | Recorded comment / author response | Merge commit |
|---|---|---|---|---|---|
| #1 / specification, API, UI and T-01–19 design | `feature/issue1-docs` | [PR #10](https://github.com/Tell52/SE_GPRJ3/pull/10) / JeenoXD | [Tell52](https://github.com/Tell52/SE_GPRJ3/pull/10#pullrequestreview-5741506697), 2026-11-03 01:38:19 | “Thanks for preparing the documentation baseline krub”; acknowledgment recorded at [author response](https://github.com/Tell52/SE_GPRJ3/pull/10#issuecomment-6585217224); no technical finding documented | [`28be4c5`](https://github.com/Tell52/SE_GPRJ3/commit/28be4c5e6d105d9a24f7851d4ac9e2338b62fdef) |
| #2 / SYS-FOUND, AC-19 | `feature/issue2-foundation` | [PR #11](https://github.com/Tell52/SE_GPRJ3/pull/11) / Tell52 | [JeenoXD](https://github.com/Tell52/SE_GPRJ3/pull/11#pullrequestreview-5784127365), 2026-11-05 18:27:31 | “nice one bro very good job na”; acknowledgment recorded at [author response](https://github.com/Tell52/SE_GPRJ3/pull/11#issuecomment-6679313178); no technical finding documented | [`cf7ef4b`](https://github.com/Tell52/SE_GPRJ3/commit/cf7ef4bf55d65a8d40857fe9736a9c98cd265eb5) |
| #3 / F-01, AC-01–04 | `feature/issue3-auth` | [PR #12](https://github.com/Tell52/SE_GPRJ3/pull/12) / JeenoXD | [Tell52](https://github.com/Tell52/SE_GPRJ3/pull/12#pullrequestreview-5796882372), 2026-11-06 14:09:00 | “good job na”; acknowledgment recorded at [author response](https://github.com/Tell52/SE_GPRJ3/pull/12#issuecomment-6680288806); no technical finding documented | [`3a5f20b`](https://github.com/Tell52/SE_GPRJ3/commit/3a5f20b1d5ac91c86e7e92c716e2ee7f5adcf718) |
| #4 / F-02, AC-05–09 | `feature/issue4-events` | [PR #13](https://github.com/Tell52/SE_GPRJ3/pull/13) / Tell52 | [JeenoXD](https://github.com/Tell52/SE_GPRJ3/pull/13#pullrequestreview-5797396595), 2026-11-06 15:08:03 | “good job bro very nice”; acknowledgment recorded at [author response](https://github.com/Tell52/SE_GPRJ3/pull/13#issuecomment-6689249296); no technical finding documented | [`345459c`](https://github.com/Tell52/SE_GPRJ3/commit/345459c1aeb5e4f42ebbf3b2d62610c79d953ddc) |
| #5 / F-03, AC-10–15 | `feature/issue5-registration` | [PR #14](https://github.com/Tell52/SE_GPRJ3/pull/14) / JeenoXD | [Tell52](https://github.com/Tell52/SE_GPRJ3/pull/14#pullrequestreview-5799754924), 2026-11-06 18:58:57 | “nice bro”; no author response recorded; no technical finding documented | [`d1914a2`](https://github.com/Tell52/SE_GPRJ3/commit/d1914a2c8c51ab9645bdb77c2a781b3af5736fcc) |
| #6 / F-04, AC-16–17 | `feature/issue6-roster` | [PR #15](https://github.com/Tell52/SE_GPRJ3/pull/15) / Tell52 | [JeenoXD](https://github.com/Tell52/SE_GPRJ3/pull/15#pullrequestreview-5805731319), 2026-11-07 02:20:14 | “good job na bro very nice”; no author response recorded; no technical finding documented | [`7f5e4b2`](https://github.com/Tell52/SE_GPRJ3/commit/7f5e4b2de67d3555981ccec65e830253a4506f96) |
| #7 / SYS-UI, AC-18–19 | `feature/issue7-verification` | [PR #16](https://github.com/Tell52/SE_GPRJ3/pull/16) / JeenoXD | [Tell52](https://github.com/Tell52/SE_GPRJ3/pull/16#pullrequestreview-5814590126), 2026-11-08 02:37:03 | “nice bro”; no author response recorded; no technical finding documented | [`bc8b6ba`](https://github.com/Tell52/SE_GPRJ3/commit/bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4) |

The shared contracts are [specification.md](specification.md), [api-spec.md](api-spec.md), [ui-spec.md](ui-spec.md) and [tests.md](tests.md). Feature verification is recorded in tests.md; a passing automated test is not a teammate's review.

## Findings and resolution

| Finding | Evidence | Resolution / remaining action | Responsible party |
|---|---|---|---|
| #7 was still listed as in review | PR #16 merged on 2026-11-08 at 02:37 Bangkok time | Corrected here; integrated candidate is `bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4` | Tell52 coordinates; documentation prepared with AI assistance |
| M-01/M-02 were marked as expected without a completed execution record | tests.md and ai-use.md before #8; Tell52 confirmed on 2026-11-08 that these checks had not been completed and no JeenoXD M-02 evidence was available | Superseded by the explicitly attributed #8 verification in tests.md; no human execution is claimed | Codex verification at Tell52's request; human acceptance pending |
| Feature approvals contain no substantive technical checks | Seven linked approval comments above | Each reviewer must record what they actually checked, findings, and disposition; do not backdate or invent a historical review | Tell52 and JeenoXD |
| #2 originally bypassed the PR workflow | `d111892`, revert `d16684b`, PR #11 | Reverted and resubmitted through the feature PR; history preserved | Tell52 |
| Genuine specification/test-design-before-code evidence is required | Design `96d9a67` (2026-11-03), implementation `d111892` (2026-11-05) | Commit chronology verified; no history rewrite | Codex evidence audit |
| T-12 assertions must be identical between red and green | `5e373f0` and `d3d1c4a`; diff of both T-12 files is empty | Historical red/green logs retained; T-11/T-13 are not claimed as red-first | Codex evidence audit |

## Release PR (Issue #8)

| Item | Recorded state |
|---|---|
| Direction | `sprint1` → `main`; no separate feature branch for this release |
| Integrated candidate | `bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4` |
| Current main | `8a67e9fddcf23440b817741ab0768055d05d8c1c` at the #8 audit |
| Release PR | Not created; local draft in [release-pr-draft.md](../../evidence/sprint-1/issue8/release-pr-draft.md) |
| Release author / reviewer | Planned: Tell52 / JeenoXD; assignment and actual review pending |
| Checks | See [tests.md](tests.md) and [status.md](../../evidence/sprint-1/status.md); candidate results are not accepted-main verification |
| Accepted immutable commit / tag | Not available: no reviewed release merge or tag exists |
| Publication authorization | Tell52 retains commit/push; PR creation, merge and release publication require separate authorization |
| Issue #8 state | Open; local verification/evidence preparation in progress; not Done |

## Team contributions

| Issue | Author / owner | Reviewer | Pair work evidence | Contribution |
|---|---|---|---|---|
| #1 | JeenoXD | Tell52 | No pair work recorded | Product and sprint documentation; Tell52 prepared the issues |
| #2 | Tell52 | JeenoXD | No pair work recorded | Workspaces, schema, SQL constraints, migration, repeatable seed, local database setup and T-19 |
| #3 | JeenoXD | Tell52 | No pair work recorded | Passwords, sessions, CSRF, access control, login/app shell and T-01–04 |
| #4 | Tell52 | JeenoXD | No pair work recorded | Event create/publish/discovery, validation, responsive UI and T-05–09 |
| #5 | JeenoXD | Tell52 | No pair work recorded | Locked registration transaction, personal registrations/receipt, T-10–15 and T-12 red/green |
| #6 | Tell52 | JeenoXD | No pair work recorded | Owner-only roster API/UI, privacy checks, T-16–17 and responsive evidence |
| #7 | JeenoXD | Tell52 | Not established; separate reviews or AI runs do not establish pair work | E2E journey, API restart persistence, desktop/mobile evidence and stale-registration UI correction |
| #8 | Tell52 coordinates | JeenoXD planned | No pair session recorded | Candidate verification and release evidence prepared with Codex; human review and publication remain pending |

### Contribution summary

| Member | Approximate share | Basis |
|---|---|---|
| Chutipon Homsuwan | Not quantified; no verified time allocation | Authored #1/#3/#5/#7 and reviewed #2/#4/#6 |
| Napat Tantipibulsap | Not quantified; no verified time allocation | Authored #2/#4/#6, prepared issues, reviewed #1/#3/#5/#7 and coordinates #8 |

Commit counts are not a percentage of contribution. AI assistance is disclosed in [ai-use.md](ai-use.md); the author fields above identify accountable students.

## Process evidence and final board status

| Item | Evidence / state |
|---|---|
| Issues #1–7 | Closed on GitHub; all linked feature PRs merged into sprint1 |
| Issue #8 | Open on GitHub; release acceptance incomplete |
| Issue-state snapshot | [github-issue-status.json](../../evidence/sprint-1/issue8/github-issue-status.json) |
| Project-board columns / final screenshot | Not captured; GitHub issue state is not proof of a board column. Final capture must follow release acceptance |
| Accepted release reference | Pending approved release PR and main merge |
| Known process limitation | Seven approvals exist, but their comments do not yet satisfy substantive-review evidence |

### Sampled evidence chains

| Chain | Issue → feature branch | PR → teammate approval | Staging | Main / completeness |
|---|---|---|---|---|
| 1 | [#5](https://github.com/Tell52/SE_GPRJ3/issues/5) → `feature/issue5-registration` | [PR #14](https://github.com/Tell52/SE_GPRJ3/pull/14) → [Tell52 approval](https://github.com/Tell52/SE_GPRJ3/pull/14#pullrequestreview-5799754924) | `d1914a2`, ancestor of `bc8b6ba`; T-12 red/green retained | Main release pending; substantive review detail pending; not a completed chain |
| 2 | [#6](https://github.com/Tell52/SE_GPRJ3/issues/6) → `feature/issue6-roster` | [PR #15](https://github.com/Tell52/SE_GPRJ3/pull/15) → [JeenoXD approval](https://github.com/Tell52/SE_GPRJ3/pull/15#pullrequestreview-5805731319) | `7f5e4b2`, ancestor of `bc8b6ba`; T-16/T-17 retained | Main release pending; substantive review detail pending; not a completed chain |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Review, contribution and process evidence templates |
| 1.1 | 2026-11-05 | #2 implementation/evidence; human approval and integration not claimed |
| 1.2 | 2026-11-06 | #4 execution evidence |
| 1.3 | 2026-11-06 | #1–4 PR links and merge records; #5 added |
| 1.4 | 2026-11-06 | #5 merge confirmation and #6 local verification |
| 1.5 | 2026-11-07 | #6 merge and #7 review preparation |
| 1.6 | 2026-11-08 | Reconciled #1–7 with GitHub; replaced placeholders with verified facts or explicit pending states; corrected unsupported manual-test claims and recorded release gates |
