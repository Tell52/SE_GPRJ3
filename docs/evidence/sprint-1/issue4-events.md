# Issue #4 local implementation and verification

Date: 2026-11-06 (Asia/Bangkok). Branch: `feature/issue4-events`, created after a fast-forward pull of `sprint1` at `3a5f20b`. Results refer to the uncommitted working tree, not a new commit. No commit, push, PR or merge was performed.

## Approved decisions and changes

- User approved using the current Sprint 1 field limits and clarified AC-07/T-07: participant event detail may return only the caller's own `myRegistration: { id, status }` or null. No roster or other participants' data is returned.
- Before editing teammate code, the user approved `server/src/app.ts` (mount router), `client/src/App.tsx` (route event screens) and `client/tests/App.test.tsx` (event-list mocks). Existing auth assertions remain intact. New routes, services, validation, screens, styles and tests are separate files; auth implementation, database schema and migrations were not changed.
- Event creation ignores spoofed ownership/status fields and derives ownership from the session. Publication uses a conditional update in a transaction; repeated/concurrent publication cannot overwrite the first publication. Discovery is ordered by start and includes only future published events. Responses explicitly select public fields and aggregate ACTIVE counts.
- UI includes loading, empty, field/server/network errors, first-invalid-field focus, pending buttons, publication confirmation, Bangkok time input/display and responsive cards/tables.
- [GitHub issue #4](https://github.com/Tell52/SE_GPRJ3/issues/4) description was updated with these decisions and authorization status. Verified the same description in the issue card on [SE_GPRJ3 Sprint 1 Project](https://github.com/users/Tell52/projects/13). Connector write returned 403; the logged-in browser successfully saved the update. Project status remains Specified; it was not changed.

## Commands and actual results

| Command | Result | Evidence |
|---|---|---|
| `npm run build` | Exit 0: Prisma generation, server TypeScript and client production build | [Build output](issue4-build.txt) |
| `npm test` | Exit 0: server 76 passed, client 22 passed, 0 failed/skipped | [Final test output](issue4-npm-test.txt) |
| `node --import tsx e2e/scripts/issue4-smoke.mjs` | Exit 0: desktop 1440x900 and mobile 390x844 create/publish/discover journeys; both published rows checked in PostgreSQL; no horizontal overflow or page errors | [Smoke output](issue4-smoke.txt) |
| `git diff --check` | Passed | Local whitespace check |

API cases in `server/tests/api/events.test.ts` cover T-05–09, session/CSRF coverage for all five event endpoints, invalid IDs, boundary validation, private drafts, own-registration summary, count/order filtering, concurrent publish and rejected-state invariance. `server/tests/unit/events.test.ts` covers event input validation. `client/tests/Events.test.tsx` covers creation/publication and UI states; existing auth UI assertions still run.

The initial test run passed all 76 server cases but failed 1 of 22 client cases: the field focus was attempted while the input was still disabled after a server validation error. An effect now focuses the first invalid field after inputs are enabled. The same assertion passes in the final run. [Initial output](issue4-initial-test.txt). The first smoke launch referenced a non-emitted compiled test helper; the runner was corrected to import the existing source helpers through `tsx`, then both viewports passed.

## Screenshots (real UI and PostgreSQL)

The smoke runner creates synthetic users and events in `event_planner_test`, then cleans the test tables and closes its servers. Development data is not used or reset.

| Step | Desktop | Mobile |
|---|---|---|
| Validation | [Desktop](issue4-desktop-validation.png) | [Mobile](issue4-mobile-validation.png) |
| Draft created | [Desktop](issue4-desktop-draft.png) | [Mobile](issue4-mobile-draft.png) |
| Published | [Desktop](issue4-desktop-published.png) | [Mobile](issue4-mobile-published.png) |
| My events | [Desktop](issue4-desktop-mine.png) | [Mobile](issue4-mobile-mine.png) |
| Participant discovery | [Desktop](issue4-desktop-discovery.png) | [Mobile](issue4-mobile-discovery.png) |
| Participant detail | [Desktop](issue4-desktop-detail.png) | [Mobile](issue4-mobile-detail.png) |

## Pending human work and scope

User code review, commit/push, PR into `sprint1`, substantive teammate review and integration remain pending. These automated checks do not mark the issue Done. Full registration/roster journey T-18, manual M-02 and release checks belong to later issues. Existing team review records are not claimed as newly verified.
