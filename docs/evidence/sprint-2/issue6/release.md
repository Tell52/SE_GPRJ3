# Sprint 2 release verification · #55

## Version under assessment

The application under test is [`085e1bf`](https://github.com/Tell52/SE_GPRJ3/commit/085e1bf448447d71d9f1255a4646fa4c693777f8) on `sprint2`. This is an immutable reference for reproducing the Sprint 2 candidate after Sprint 3 changes. The #55 working branch adds release evidence and test harness changes. The accepted release on `main` will be identified by its own merge SHA.

## Review and integration

| Issue | Reviewed PR | Reviewer | Merge into sprint2 |
|---|---|---|---|
| [#50](https://github.com/Tell52/SE_GPRJ3/issues/50) | [#63](https://github.com/Tell52/SE_GPRJ3/pull/63) | JeenoXD | [1e75308](https://github.com/Tell52/SE_GPRJ3/commit/1e75308) |
| [#51](https://github.com/Tell52/SE_GPRJ3/issues/51) | [#64](https://github.com/Tell52/SE_GPRJ3/pull/64) | JeenoXD | [7fc2cd9](https://github.com/Tell52/SE_GPRJ3/commit/7fc2cd9) |
| [#52](https://github.com/Tell52/SE_GPRJ3/issues/52) | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) | Tell52 | [a4bc2be](https://github.com/Tell52/SE_GPRJ3/commit/a4bc2be) |
| [#53](https://github.com/Tell52/SE_GPRJ3/issues/53) | [#66](https://github.com/Tell52/SE_GPRJ3/pull/66) | JeenoXD | [5a867d5](https://github.com/Tell52/SE_GPRJ3/commit/5a867d5) |
| [#54](https://github.com/Tell52/SE_GPRJ3/issues/54) | [#67](https://github.com/Tell52/SE_GPRJ3/pull/67) | Tell52 | [085e1bf](https://github.com/Tell52/SE_GPRJ3/commit/085e1bf) |

- #52 added capacity tests in [f36d726](https://github.com/Tell52/SE_GPRJ3/commit/f36d726), implemented F-07 in [5d40127](https://github.com/Tell52/SE_GPRJ3/commit/5d40127) and received [teammate approval](https://github.com/Tell52/SE_GPRJ3/pull/65#pullrequestreview-6089212530). Compare [red server output](../issue3-red-server.txt) with [green server output](../issue3-green-server.txt).
- #54 added cancellation tests in [22d8723](https://github.com/Tell52/SE_GPRJ3/commit/22d8723), implemented F-08 in [b693780](https://github.com/Tell52/SE_GPRJ3/commit/b693780) and received [teammate approval](https://github.com/Tell52/SE_GPRJ3/pull/67#pullrequestreview-6090206749). Compare [red server output](../issue5-red-server.txt) with [green server output](../issue5-green-server.txt).

## Integrated completion table

The run used the dedicated local PostgreSQL 16 test service and Chrome. Run the following PowerShell commands from the repository root. The test harness applies migrations and resets the test database. A separate screenshot directory preserves the accepted Sprint 1 evidence.

```powershell
docker compose --profile test up -d --wait db-test
npm.cmd run build
npm.cmd test
$env:JOURNEY_EVIDENCE_DIR = Join-Path ([IO.Path]::GetTempPath()) ('sprint2-regression-' + [guid]::NewGuid())
npm.cmd run test:e2e
```

| Check | Passed | Failed | Skipped | Output |
|---|---:|---:|---:|---|
| Server and client production build | 1 | 0 | 0 | [Build log](build.txt) |
| Server unit and PostgreSQL API | 144 | 0 | 0 | [Vitest output](tests.txt) |
| Client | 58 | 0 | 0 | [Vitest output](tests.txt) |
| Chrome desktop and mobile | 14 | 0 | 0 | [Playwright output](e2e.txt) |

T-18 ran on both viewports. An organizer published a capacity-one event, a participant booked it, duplicate and full bookings were rejected, and the organizer retrieved the roster. After restarting the API, the participant retrieved the same saved registration. No unresolved application defect was observed in these checks.

### Captured Sprint 2 demonstrations

Both [demonstrations](../../../../e2e/tests/sprint2-release.spec.ts) ran on desktop and mobile. The following captures show the desktop run.

- **Participant cancellation.** The saved receipt reloaded as participant-cancelled. A direct repeat POST returned 409 INVALID_STATE. [Receipt screenshot](receipt.png) · [HTTP result](receipt.json)
- **Event owner access.** The owner saved a new location. A different authenticated organizer sent a PATCH with a valid CSRF token and received 404 NOT_FOUND. Reloading the owner form returned the original owner's saved edit. [Form screenshot](saved-edit.png) · [HTTP result](saved-edit.json)

### Feature acceptance criteria

Each row was exercised against the candidate above. All rows share the release identity recorded in the acceptance section below. The [test specification](../../../sprints/sprint-2/tests.md) gives fixtures and expected results.

| Criterion | Implementation | Executed test | Observed outcome | Reviewed PR |
|---|---|---|---|---|
| F-05 / AC-20 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registrations.ts) | [T-20](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/registrations.test.ts) | One of two concurrent cancellations succeeded at start −1 ms. One seat became available and the cancelled receipt survived reload. | [#64](https://github.com/Tell52/SE_GPRJ3/pull/64) |
| F-05 / AC-21 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registrations.ts) | [T-21](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/registrations.test.ts) | At start and start +1 ms cancellation returned 409 and preserved the receipt. | [#64](https://github.com/Tell52/SE_GPRJ3/pull/64) |
| F-05 / AC-22 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registrations.ts) | [T-22](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/registrations.test.ts) | Rebooking produced a new ID. A second participant took the released seat and the first received EVENT_FULL. | [#64](https://github.com/Tell52/SE_GPRJ3/pull/64) |
| F-05 / AC-23 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registrations.ts) | [T-23](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/registrations.test.ts) | Another participant received 404. Session, role and CSRF checks preserved the active row. | [#64](https://github.com/Tell52/SE_GPRJ3/pull/64) |
| F-06 / AC-24 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registration-rules.ts) / [edit](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-24](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | The owner set, changed and cleared the deadline. Reload and unrelated edits preserved the expected value. | [#66](https://github.com/Tell52/SE_GPRJ3/pull/66) |
| F-06 / AC-25 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registration-rules.ts) / [edit](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-25](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | Invalid deadlines and moving start before the saved deadline returned 400. Cross-owner and participant edits failed. | [#66](https://github.com/Tell52/SE_GPRJ3/pull/66) |
| F-06 / AC-26 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registration-rules.ts) / [edit](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-26](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | With early, start-equal and null deadlines the API accepted cutoff −1 ms and rejected equality and +1 ms without consuming capacity. | [#66](https://github.com/Tell52/SE_GPRJ3/pull/66) |
| F-06 / AC-27 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/registration-rules.ts) / [edit](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-27](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | The upcoming event stayed visible with a closed message. Direct booking was rejected and an earlier receipt stayed ACTIVE. | [#66](https://github.com/Tell52/SE_GPRJ3/pull/66) |
| F-07 / AC-28 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-28](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | Valid draft and published edits survived reload. Invalid mixed edits returned 400 and saved no fields. | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) |
| F-07 / AC-29 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-29](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | Capacity 1 and 1000 succeeded. With three active registrations, 3 succeeded and 2 returned CAPACITY_BELOW_ACTIVE. | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) |
| F-07 / AC-30 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-30](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | Increases succeeded before the stored end and failed at end and end +1 ms. | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) |
| F-07 / AC-31 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-31](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) | Both lock orders and concurrent bookings maintained ACTIVE count ≤ capacity. | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) |
| F-07 / AC-32 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-32](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-editing.test.ts) / [cancelled state](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-cancellation.test.ts) | Participant and non-owner edits failed. Editing a cancelled event returned INVALID_STATE. | [#65](https://github.com/Tell52/SE_GPRJ3/pull/65) |
| F-08 / AC-33 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-33](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-cancellation.test.ts) | Cancellation updated the event and active receipts together and preserved previous participant cancellation metadata. | [#67](https://github.com/Tell52/SE_GPRJ3/pull/67) |
| F-08 / AC-34 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-34](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-cancellation.test.ts) | Owner and participant reads returned saved cancellation states. Discovery omitted the event and new booking returned 404. | [#67](https://github.com/Tell52/SE_GPRJ3/pull/67) |
| F-08 / AC-35 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-35](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-cancellation.test.ts) | Both lock orders and concurrent races ended with a cancelled event and zero active registrations. | [#67](https://github.com/Tell52/SE_GPRJ3/pull/67) |
| F-08 / AC-36 | [service](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/src/services/events.ts) | [T-36](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/server/tests/api/event-cancellation.test.ts) | Participant and non-owner cancel requests returned 403 and 404. Event and registrations were preserved. | [#67](https://github.com/Tell52/SE_GPRJ3/pull/67) |

## Acceptance and deployment record

| Milestone | Evidence |
|---|---|
| Local Sprint 2 candidate | `085e1bf448447d71d9f1255a4646fa4c693777f8` |
| CI for that SHA | [GitHub Actions query](ci.json) returned zero workflow runs. The [CI workflow](https://github.com/Tell52/SE_GPRJ3/blob/085e1bf448447d71d9f1255a4646fa4c693777f8/.github/workflows/ci-docker.yml) triggers automatically for PRs targeting staging or main. |
| #55 PR into sprint2 | Pending commit, teammate review and integration. Rerun the checks below on its merge SHA. |
| Release PR from sprint2 into main | Pending. Record the reviewed PR, passing CI run, accepted main SHA or tag, and regression results on that version before closing #55. |
| Integrated Deliverable 2 on GCP | Pending a deployed candidate. Record its CI run and SHA, deployed image digest, Cloud Run revision and URL. Match the digest to the CI image, repeat publish → register → roster on the deployed service, then sign in again after a revision restart or rollout and retrieve the same receipt and roster. Record observed IDs and results. |
