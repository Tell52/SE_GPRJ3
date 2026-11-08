# Sprint 1 release status

Snapshot: 2026-11-08, Asia/Bangkok. Issue #8 is **in preparation, not complete**.

| Acceptance item | State | Evidence / remaining action |
|---|---|---|
| Link #1–7 to contracts, branches and staging PRs | Recorded | [reviewer.md](../../sprints/sprint-1/reviewer.md), [GitHub records](issue8/github-pr-evidence.json) |
| Substantive teammate reviews and resolved findings | Incomplete | Seven approvals exist, but comments do not describe technical checks; each actual reviewer must supply their findings/disposition |
| Integrated staging build/regression/E2E | Pass | `bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4`: build; 100 server, 46 client and 2 E2E tests |
| Fresh-clone setup and keyboard walkthrough | Assistant verification passed; human acceptance pending | M-01: 180.779 s with documented environment deviations. M-02: desktop/mobile keyboard journeys. [Verification and limitations](issue8/verification.md) |
| Genuine design-before-code/TDD history | Recorded | Design `96d9a67` before implementation `d111892`; T-12 red `5e373f0`, green `d3d1c4a`, test-file diff empty |
| Reviewed release PR: sprint1 → main | Pending | [Local PR draft](issue8/release-pr-draft.md); PR not created; separate authorization required |
| Accepted immutable commit/tag and results | Pending | Main remains `8a67e9fddcf23440b817741ab0768055d05d8c1c`; candidate SHA is not an accepted release |
| At least two complete issue-to-main chains | Incomplete | #5/#6 chains traced through staging in reviewer.md; substantive review details and main release still needed |
| Final project-board capture | Pending | [Issue-state snapshot](issue8/github-issue-status.json) shows #1–7 closed and #8 open; it is not a Project column snapshot |
| Real student contributions, pair work and AI use | Recorded to available evidence | [reviewer.md](../../sprints/sprint-1/reviewer.md), [ai-use.md](../../sprints/sprint-1/ai-use.md); no invented pair session or percentage |

All changes in this preparation remain local and uncommitted for Tell52 to review. No push, PR creation, merge, tag or release publication was performed. The old issue-body references to `docs/contributions.md` and `docs/ai-use.md` are represented by the current sprint records linked above; no duplicate declarations were created.

Before closing #8, the students must add substantive review evidence, review/commit/push the prepared changes, authorize and complete the release PR with teammate approval, record the actual accepted main SHA/tag and verification, then capture the final board state and finish both evidence chains. Re-run applicable checks if the candidate application code changes.
