# Draft title

Release Sprint 1: event publication, registration and private organizer roster (#8)

# Draft description

## Scope

Release `sprint1` into `main` for the assessed Sprint 1 workflow: authentication, Organizer event creation/publication, Participant discovery and atomic registration, personal receipts, and the owner's private registration roster. Includes #1–7, their specification/test records and release evidence.

Verified application candidate: `bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4`. The documentation/evidence changes prepared for #8 are still uncommitted; this SHA is not the final release head or an accepted main commit.

## Validation

- Fresh remote clone with new isolated PostgreSQL volumes: setup, build and full checks completed in 180.779 seconds on a prepared Windows machine.
- `npm run build`: passed.
- `npm test`: 100 server and 46 client tests passed, no failures/skips.
- `npm run test:e2e`: 2 desktop/mobile journeys passed, including duplicate/full handling and restart persistence.
- Assistant-operated keyboard walkthrough: passed at 1440×900 and 390×844, including focus, labels, busy/empty/loading/error/retry and success states. Human acceptance is pending.
- T-12 red/green history retained; test files unchanged between the two commits.

Evidence: `docs/evidence/sprint-1/issue8/verification.md`, `docs/sprints/sprint-1/tests.md` and `docs/sprints/sprint-1/reviewer.md`.

## Known limitations and open release gates

- Existing teammate approvals on feature PRs do not document substantive checks. Reviewers must record actual technical findings/disposition; this draft does not supply reviews on their behalf.
- Setup timing excludes prerequisite installation and uses an isolated Compose project/ports. README's default branch and review-status paragraphs remain stale.
- M-01/M-02 evidence was produced by Codex, not a student-run manual session or a screen-reader audit.
- T-11/T-13 were not red-first; only T-12 is claimed as TDD evidence. Heavy registration contention can return retryable 503 after the bounded transaction wait.
- Cancellation, deadlines, editing, event cancellation, attendance/reporting, application containers, CI/CD and deployment are outside Sprint 1.
- Accepted-main SHA/tag, final verification and final board capture remain pending.

## Requested teammate review

The actual reviewer should confirm the scope and issue-to-contract links, inspect the API's ownership/privacy and capacity rules, examine the genuine red/green history, review/rerun the applicable checks, and record specific observations and any corrective actions. The author must not approve their own PR.

Keep #8 open until the substantive review, approved release merge, immutable accepted reference, final results, two complete issue-to-main chains and board capture are recorded. This file is a local draft only; no PR has been created.
