# Sprint 1 Tests (Software Test Specification)

Levels: **Unit** (Vitest, no database), **API** (Vitest + Supertest against an isolated real PostgreSQL test database, reset before each file), **UI** (Vitest + React Testing Library, mocked fetch), **E2E** (Playwright against the running app and real PostgreSQL), **Manual** (supplements, never replaces, automated checks).

Fixtures: `org1`, `org2` (Organizers), `p1` to `p12` (Participants) created per file; `loginAs(user)` returns a Supertest agent holding the `sid` cookie and CSRF token. Concurrent tests use independent agents and `Promise.all`, then assert stored rows with a direct Prisma query.

| Test | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| T-01 | AC-01 | API | Seeded p1 | Login with correct password; wrong password; unknown email; `{}` | 200 with id, name, email, role, csrfToken and `sid` cookie containing `HttpOnly` and `SameSite=Lax`; both failures 401 `INVALID_CREDENTIALS` with identical message and no `Set-Cookie`; `{}` 400 `VALIDATION_ERROR` with field details |
| T-02 | AC-02 | Unit + API | Plain password; p1 session with `expiresAt` set to the past in the database | `hashPassword` / `verifyPassword`; inspect login and me bodies; call me with the expired session | Hash starts with `$2`, differs from plaintext, verifies true and false correctly; no body contains `passwordHash`, token or `tokenHash`; expired session 401 |
| T-03 | AC-03 | API | org1 draft event; p1 session | Table driven: every protected route without cookie; p1 POST /api/events; org1 publish without and with wrong `X-CSRF-Token`; p1 login body with `role: "ORGANIZER"` then POST /api/events | All anonymous 401 with only `error` in body; role 403; CSRF 403 `CSRF_INVALID`; spoofed role still 403; event and row counts unchanged |
| T-04 | AC-04 | API + UI | p1 agent; saved raw cookie | Logout; then me with the same agent and with the replayed raw cookie. UI: click Logout | Logout 200; session `revokedAt` set; both me calls 401. UI calls the API, shows login page and no previous user data |
| T-05 | AC-05 | API + UI | org1 | Create valid event; GET mine; publish; GET events. UI: fill create form and publish | 201 DRAFT with organizerId = org1 and row stored; listed in mine; publish 200 PUBLISHED, `publishedAt` stored; listed in events. UI badge changes Draft to Published |
| T-06 | AC-06 | Unit + API | Capacities 0, -1, 1.5, 1001, missing, 1, 1000; blank title; 121 character title; blank location | `eventInputSchema.safeParse`; POST each via API | Invalid inputs fail on the named field and API returns 400 with Event count unchanged; 1 and 1000 accepted |
| T-07 | AC-07 | API | Published upcoming E1 (2 registrations), org1 draft D1, published event with past start | p1 GET events; p1 GET D1; org1 GET D1 | Only E1 listed with `remainingPlaces` = capacity minus 2; p1 gets 404 for D1, owner gets 200; no response contains registration or participant fields |
| T-08 | AC-08 | API | org1 published event | Publish again | 409 `INVALID_STATE`; row (including `publishedAt`) identical to before |
| T-09 | AC-09 | API | org1 draft D1 | p1 POST /api/events; p1 publish D1; org2 publish D1 | 403, 403, 404; Event count unchanged; D1 still DRAFT with `publishedAt` null |
| T-10 | AC-10 | API | Published E1 capacity 3 | p1 registers; query DB; GET event; log in again as p1 and GET registration by id | 201 ACTIVE, participantId = p1; one ACTIVE row; `remainingPlaces` 2; new session returns the same id |
| T-11 | AC-11 | API | p1 ACTIVE in E1; separate event E2 | p1 registers in E1 again; p1 sends 5 concurrent registrations to E2 | 409 `ALREADY_REGISTERED` and E1 ACTIVE count unchanged; E2 has exactly one ACTIVE row for p1, other responses 409 |
| T-12 | AC-12 | Unit + API (TDD) | E1 capacity 2 with p1, p2 ACTIVE | `decideRegistration` with activeCount = capacity; p3 registers via API | Unit returns `EVENT_FULL`; API 409 `EVENT_FULL`; ACTIVE count stays 2. Red run recorded before implementation, green after, assertions unchanged |
| T-13 | AC-13 | API (concurrent) | E1 capacity 1; p1 to p10 logged in | 10 registrations with `Promise.all` | Exactly one 201, nine 409 `EVENT_FULL`; exactly one ACTIVE row |
| T-14 | AC-14 | API | org1 draft D1; id 999999; published event with past start; published E1 | p1 registers to D1, 999999, past event; org2 registers to E1 | 404, 404, 409 `REGISTRATION_CLOSED`, 403; Registration count unchanged |
| T-15 | AC-15 | API | p1 in E1, p2 in E2 | p1 GET mine; p2 GET p1's registration; p2 GET mine; close the app, build a new app instance on the same database, log in as p1, GET by id | p1 sees only own with event title, start, location; p2 gets 404 and p1's registration absent from p2's list; after restart p1 gets the same registration |
| T-16 | AC-16 | API + UI | org1 E1 with p1 then p2; org1 E2 with none | org1 GET E1 roster; org1 GET E2 roster. UI: render roster with 2 rows and with none | E1: 200, count 2, p1 then p2 with id, status, registeredAt, name, email, no password or session fields; E2: empty items. UI shows table and "No registrations yet" |
| T-17 | AC-17 | API | org1 E1 with p1 registered | GET roster anonymous; as p1; as org2 | 401, 403, 404; none of the bodies contain participant data |
| T-18 | AC-18 | E2E | Fresh seed; projects `desktop` 1440x900 and `mobile` 390x844 | Full AC-18 journey through the UI, then restart the server and log in as participant1 | Each step visible; duplicate and full messages shown; roster shows participant1; registration present after restart; `document.documentElement.scrollWidth <= window.innerWidth` on every page |
| T-19 | AC-19 | Integration | Empty test database | `migrate reset`, seed, change p1 password, seed again; raw SQL insert capacity 0; raw SQL second ACTIVE row for same pair; restart server | Seed twice leaves counts unchanged and changed password still works; both inserts rejected by constraints; rows intact after restart |
| M-01 | AC-19 (NFR-06) | Manual | Teammate's machine, fresh clone of the release commit | Follow README only | Install, migrate, seed, build and all tests succeed within 15 minutes; any README gap recorded |
| M-02 | AC-18 (NFR-05) | Manual | Running app at both viewports | Keyboard only walk through login, create, publish, register, roster | Every field labelled, logical focus order, visible focus, pending, empty and error states correct; findings recorded |

## TDD plan

T-12 (capacity rule) is the planned TDD evidence:
1. Commit T-12 alone (`test: T-12 event full rejection (red)`), run it and record the failing output and commit ID.
2. Implement the rule (`feat: enforce capacity in registration (green)`), run T-12 again unchanged and record the passing output and commit ID.
3. The assertions in T-12 must be identical in both commits (the diff of the test file between the two commits is empty).

T-11 and T-13 should follow the same red then green pattern where practical.

## Test locations (planned)

`server/tests/unit/`, `server/tests/api/` (one file per feature, for example `registration.api.test.ts`), `client/src/**/*.test.tsx`, `e2e/tests/sprint1-journey.spec.ts`. Actual file and test names are recorded in Execution Results below.

## Execution Results

Template prepared in Issue #1. Fill in real commands, outputs and commit IDs as work happens; an empty or "Not run" row is not evidence. Do not mark a row Pass without execution output. Automated and manual checks are listed separately.

### Specification and test design history

| Item | Commit | Date | Note |
|---|---|---|---|
| Reviewed contracts v1.0 (spec and test design) | `<SHA>` | `<date>` | Before any implementation commit |
| T-12 red | `<SHA>` | `<date>` | Failing output below |
| T-12 green | `<SHA>` | `<date>` | Same assertions, passing |

### Build and test runs

| Command | Commit | Exit | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| `npm run build` | `<SHA>` | `<>` | | | |
| `cd server && npm test` | `<SHA>` | `<>` | `<>` | `<>` | `<>` |
| `cd client && npm test` | `<SHA>` | `<>` | `<>` | `<>` | `<>` |
| `cd e2e && npx playwright test` | `<SHA>` | `<>` | `<>` | `<>` | `<>` |

### AC results

| AC | Planned test | Actual file and test name | Automated / manual | Result | Commit |
|---|---|---|---|---|---|
| AC-01 | T-01 | `<>` | Automated | Not run | |
| AC-02 | T-02 | `<>` | Automated | Not run | |
| AC-03 | T-03 | `<>` | Automated | Not run | |
| AC-04 | T-04 | `<>` | Automated | Not run | |
| AC-05 | T-05 | `<>` | Automated | Not run | |
| AC-06 | T-06 | `<>` | Automated | Not run | |
| AC-07 | T-07 | `<>` | Automated | Not run | |
| AC-08 | T-08 | `<>` | Automated | Not run | |
| AC-09 | T-09 | `<>` | Automated | Not run | |
| AC-10 | T-10 | `<>` | Automated | Not run | |
| AC-11 | T-11 | `<>` | Automated | Not run | |
| AC-12 | T-12 | `<>` | Automated | Not run | |
| AC-13 | T-13 | `<>` | Automated | Not run | |
| AC-14 | T-14 | `<>` | Automated | Not run | |
| AC-15 | T-15 | `<>` | Automated | Not run | |
| AC-16 | T-16 | `<>` | Automated | Not run | |
| AC-17 | T-17 | `<>` | Automated | Not run | |
| AC-18 | T-18, M-02 | `<>` | Automated + manual | Not run | |
| AC-19 | T-19, M-01 | `<>` | Automated + manual | Not run | |

## Evidence Index

Actual screenshots and logs are stored under `docs/evidence/sprint-1/` and linked here.

| Evidence | AC / test | Role | Preconditions and steps | Expected | Actual | File | Commit |
|---|---|---|---|---|---|---|---|
| Normal journey: publish, register, retrieve saved registration | AC-05, AC-10, AC-15 / T-18 | Organizer, Participant | `<>` | `<>` | `<>` | `docs/evidence/sprint-1/<file>.png` | `<SHA>` |
| Rule rejection: event full or duplicate | AC-11, AC-12 / T-18 | Participant | `<>` | `<>` | `<>` | `<file>` | `<SHA>` |
| Login and logout, old session rejected | AC-01, AC-04 / T-04 | Participant | `<>` | `<>` | `<>` | `<file>` | `<SHA>` |
| Forbidden role / foreign owner (API output) | AC-09, AC-17 / T-09, T-17 | Participant, Organizer | `<>` | `<>` | `<>` | `<file>.log` | `<SHA>` |
| Concurrency: last place | AC-13 / T-13 | 10 Participants | `<>` | `<>` | `<>` | `<file>.log` | `<SHA>` |
| TDD red and green | AC-12 / T-12 | n/a | `<>` | `<>` | `<>` | `<file>.log` | `<SHA red>`, `<SHA green>` |
| Restart persistence | AC-15, AC-18 / T-15, T-18 | Participant | `<>` | `<>` | `<>` | `<file>` | `<SHA>` |
| Desktop and mobile viewports | AC-18 / T-18, M-02 | all | `<>` | `<>` | `<>` | `<file>` | `<SHA>` |
| Fresh clone setup | AC-19 / M-01 | n/a | `<>` | `<>` | `<>` | `<file>.log` | `<SHA>` |

## Known Limitations

Failed or skipped tests, incomplete work and accepted limitations. Fill in at release.

| Item | Type (failed test / skipped test / incomplete / limitation) | Impact | Plan |
|---|---|---|---|
| `<item or "none">` | `<>` | `<>` | `<>` |

## Version history

| Version | Date | Change | Reviewed by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial test specification | `<pending>` |
