# Sprint 1 Tests (Software Test Specification)

Levels: **Unit** (Vitest, no database), **API** (Vitest + Supertest against an isolated real PostgreSQL test database, reset before each file), **UI** (Vitest + React Testing Library, mocked fetch), **E2E** (Playwright against the running app and real PostgreSQL), **Manual** (supplements, never replaces, automated checks).

Fixtures: `org1`, `org2` (Organizers), `p1` to `p12` (Participants) created per file; `loginAs(user)` returns a Supertest agent holding the `sid` cookie and CSRF token. Concurrent tests use independent agents and `Promise.all`, then assert stored rows with a direct Prisma query.

| Test | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| T-01 | AC-01 | API | Seeded p1 | Login with correct password; wrong password; unknown email; `{}` | 200 with id, name, email, role, csrfToken and `sid` cookie containing `HttpOnly` and `SameSite=Lax`; both failures 401 `INVALID_CREDENTIALS` with identical message and no `Set-Cookie`; `{}` 400 `VALIDATION_ERROR` with field details |
| T-02 | AC-02 | Unit + API | Plain password; p1 session with `expiresAt` set to the past in the database | `hashPassword` / `verifyPassword`; inspect login and me bodies; call me with the expired session | Hash starts with `$2`, differs from plaintext, verifies true and false correctly; no body contains `passwordHash`, token or `tokenHash`; expired session 401 |
| T-03 | AC-03 | API | p1 and org1 sessions | Table driven: every protected route without cookie (list extended by #4 to #6); forged cookie; participant on an Organizer only route (#3: probe route mounting the shared `requireRole`; #4 adds the real POST /api/events and publish cases); logout without, with wrong and with another session's `X-CSRF-Token`; login body with `role: "ORGANIZER"` and `userId` | All anonymous 401 with only `error` in body; forged cookie 401; wrong role 403 `FORBIDDEN`; CSRF 403 `CSRF_INVALID` with no session revoked; spoofed role ignored and session belongs to p1 |
| T-04 | AC-04 | API + UI | p1 agent; saved raw cookie | Logout; then me with the same agent and with the replayed raw cookie. UI: click Logout | Logout 200; session `revokedAt` set; both me calls 401. UI calls the API, shows login page and no previous user data |
| T-05 | AC-05 | API + UI | org1 | Create valid event; GET mine; publish; GET events. UI: fill create form and publish | 201 DRAFT with organizerId = org1 and row stored; listed in mine; publish 200 PUBLISHED, `publishedAt` stored; listed in events. UI badge changes Draft to Published |
| T-06 | AC-06 | Unit + API | Capacities 0, -1, 1.5, 1001, missing, 1, 1000; blank title; 121 character title; blank location | `eventInputSchema.safeParse`; POST each via API | Invalid inputs fail on the named field and API returns 400 with Event count unchanged; 1 and 1000 accepted |
| T-07 | AC-07 | API | Published upcoming E1 (2 registrations), org1 draft D1, published event with past start | p1 GET events; p1 GET D1; org1 GET D1 | Only E1 listed with `remainingPlaces` = capacity minus 2; p1 gets 404 for D1, owner gets 200; no response contains roster or other participants' fields; Participant detail contains only own `myRegistration: { id, status }` or null |
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
| T-18 | AC-18 | E2E | Fresh test database with the normal demo seed (global setup); projects `desktop` 1440x900 and `mobile` 390x844; the test starts the real built API as its own process | organizer1 creates and publishes a capacity 1 event; participant2 opens it (1 place left) and keeps the page open; participant1 opens it in a second tab, registers in the first and opens the receipt and My registrations; participant1 clicks Register in the stale tab; participant2 clicks Register on the stale page; organizer1 opens the roster; the API process is stopped and started again and participant1 logs in | Receipt and My registrations show the registration; stale tab shows "You are already registered for this event." then "You are registered"; participant2 sees "Sorry, this event just filled up.", then Full with no Register button (also after reload) and no registrations of their own; roster shows only Participant One, "1 of 1 places taken"; after restart (new process id) the registration is still there; no horizontal overflow on any page |
| T-19 | AC-19 | Integration | Empty test database | `migrate reset`, seed, change p1 password, seed again; raw SQL insert capacity 0; raw SQL second ACTIVE row for same pair; restart server | Seed twice leaves counts unchanged and changed password still works; both inserts rejected by constraints; rows intact after restart |
| M-01 | AC-19 (NFR-06) | Manual | Tell52's machine, fresh clone of the `sprint1` commit under review | Follow README only: env files, `docker compose --profile test up -d --wait`, `npm ci`, migrate, seed, `npm test`, `npm run test:e2e`; time it | Everything succeeds within 15 minutes; every README gap is written down |
| M-02 | AC-18 (NFR-05) | Manual | `npm run dev:server` and `npm run dev:client` with seed data; browser at desktop width and at 390 px wide (DevTools device mode) | Keyboard only (Tab, Shift+Tab, Enter, Space): log in, create and publish an event, log out, log in as a participant, register, open the receipt, log in as the organizer and open the roster | Every field has a visible label; focus order follows the page; focus outline always visible; busy, empty, error and success messages appear; nothing needs a mouse |

## TDD plan

T-12 (capacity rule) is the planned TDD evidence:
1. Commit T-12 alone (`test: T-12 event full rejection (red)`), run it and record the failing output and commit ID.
2. Implement the rule (`feat: enforce capacity in registration (green)`), run T-12 again unchanged and record the passing output and commit ID.
3. The assertions in T-12 must be identical in both commits (the diff of the test file between the two commits is empty).

T-11 and T-13 should follow the same red then green pattern where practical.

## Test locations

`server/tests/unit/`, `server/tests/api/`, `client/tests/`, `e2e/tests/sprint1-journey.spec.ts` (run with `npm run test:e2e`; it builds the server, starts the client, and starts and restarts the API itself). Actual file and test names are recorded in Execution Results below.

## Execution Results

The table retains historical runs and adds the integrated candidate verification performed on 2026-11-08. The candidate is bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4. M-01/M-02 were executed by Codex at Tell52's request and are identified as assistant-operated checks, not human attestations. Release acceptance and verification of an accepted main commit remain pending.

### Specification and test design history

| Item | Commit | Date | Note |
|---|---|---|---|
| Reviewed contracts v1.0 (spec and test design) | `96d9a67` (merged in PR #10, `28be4c5`) | 2026-11-03 | Before any implementation commit |
| First implementation (#2 foundation) | `d111892` (merged in PR #11, `cf7ef4b`) | 2026-11-05 | Implementation followed the spec |
| T-12 red (#5) | `5e373f0` | 2026-11-06 | Only `server/tests/unit/registration-rules.test.ts` and `server/tests/api/registration-capacity.test.ts` committed; [failing output](../../evidence/sprint-1/issue5-t12-red.txt) |
| T-12 green (#5) | `d3d1c4a` | 2026-11-06 | Implementation added; both T-12 files unchanged; [passing output](../../evidence/sprint-1/issue5-t12-green.txt) |

### Build and test runs

| Run | Command | Commit | Exit | Passed | Failed | Skipped | Output |
|---|---|---|---|---|---|---|---|
| #2 foundation (2026-11-05) | `npm ci`, `npm run build`, `npm run db:migrate`, `npm run db:seed` | Uncommitted tree on base `28be4c5`, same files as `d111892` | 0 | n/a | n/a | n/a | [issue2-verification.txt](../../evidence/sprint-1/issue2-verification.txt) |
| #2 foundation (2026-11-05) | `npm test` (server) | Same as above | 0 | 12 | 0 | 0 | [issue2-verification.txt](../../evidence/sprint-1/issue2-verification.txt) |
| #2 foundation (2026-11-05) | `npm test` (client) | Same as above | 0 | 1 | 0 | 0 | [issue2-verification.txt](../../evidence/sprint-1/issue2-verification.txt) |
| #3 auth (2026-11-05) | `npm test` (server) | `296cc54` | 0 | 31 | 0 | 0 | [issue3-npm-test.txt](../../evidence/sprint-1/issue3-npm-test.txt) |
| #3 auth (2026-11-05) | `npm test` (client) | `296cc54` | 0 | 9 | 0 | 0 | [issue3-npm-test.txt](../../evidence/sprint-1/issue3-npm-test.txt) |
| #4 events (2026-11-06), first run | `npm test` | Uncommitted tree on `3a5f20b`, committed as `8538324` | 1 | server 76, client 21 | 1 | 0 | [issue4-initial-test.txt](../../evidence/sprint-1/issue4-initial-test.txt): field focus attempted while input was disabled; fixed, same assertion then passed |
| #4 events (2026-11-06) | `npm run build` | Uncommitted tree on `3a5f20b`, committed as `8538324` | 0 | n/a | n/a | n/a | [issue4-build.txt](../../evidence/sprint-1/issue4-build.txt) |
| #4 events (2026-11-06) | `npm test` (server) | Uncommitted tree on `3a5f20b`, committed as `8538324` | 0 | 76 | 0 | 0 | [issue4-npm-test.txt](../../evidence/sprint-1/issue4-npm-test.txt) |
| #4 events (2026-11-06) | `npm test` (client) | Uncommitted tree on `3a5f20b`, committed as `8538324` | 0 | 22 | 0 | 0 | [issue4-npm-test.txt](../../evidence/sprint-1/issue4-npm-test.txt) |
| #4 events (2026-11-06) | `node --import tsx e2e/scripts/issue4-smoke.mjs` (desktop and mobile) | Uncommitted tree on `3a5f20b`, committed as `8538324` | 0 | 3 checks | 0 | 0 | [issue4-smoke.txt](../../evidence/sprint-1/issue4-smoke.txt) |
| #5 registration, first full run (2026-11-06) | `npm test` (server) on JeenoXD's machine | `d3d1c4a` before the fix | 1 | 89 | 1 (T-13) | 0 | [issue5-first-run.txt](../../evidence/sprint-1/issue5-first-run.txt): 3 of 10 concurrent requests got 500 (Prisma P2028, 2 s connection wait too short). Nobody overbooked. Fixed with longer transaction limits and a 503 fallback; T-13 unchanged and then passed |
| #5 T-12 red | `npx vitest run tests/unit/registration-rules.test.ts tests/api/registration-capacity.test.ts` (in `server/`) | `5e373f0` | 1 | 0 | 1 test, plus the unit file fails to load (rule not written yet) | 0 | [issue5-t12-red.txt](../../evidence/sprint-1/issue5-t12-red.txt) |
| #5 T-12 green | Same command | `d3d1c4a` | 0 | 7 | 0 | 0 | [issue5-t12-green.txt](../../evidence/sprint-1/issue5-t12-green.txt) |
| #5 registration | `npm test` (server) | `7582113` | 0 | 90 | 0 | 0 | [issue5-npm-test.txt](../../evidence/sprint-1/issue5-npm-test.txt) |
| #5 registration | `npm test` (client) | `7582113` | 0 | 35 | 0 | 0 | [issue5-npm-test.txt](../../evidence/sprint-1/issue5-npm-test.txt) |
| #6 roster (2026-11-06) | `npm run build` | Uncommitted tree on `d1914a2`, committed as `55b4a15` | 0 | n/a | n/a | n/a | [issue6-build.txt](../../evidence/sprint-1/issue6-build.txt) |
| #6 roster (2026-11-06) | `npm test` | Uncommitted tree on `d1914a2`, committed as `55b4a15` | 0 | server 100, client 46 | 0 | 0 | [issue6-npm-test.txt](../../evidence/sprint-1/issue6-npm-test.txt) |
| #6 roster (2026-11-06) | `node --import tsx e2e/scripts/issue6-smoke.mjs` | Uncommitted tree on `d1914a2`, committed as `55b4a15` | 0 | desktop/mobile and API checks | 0 | 0 | [issue6-smoke.txt](../../evidence/sprint-1/issue6-smoke.txt); [details and initial failure](../../evidence/sprint-1/issue6-roster.md) |
| #7 verification (2026-11-07) | `npm run test:e2e` (desktop and mobile) | `8849c36` | Not printed in historical log; passing summary | 2 | 0 | 0 | [issue7-e2e.txt](../../evidence/sprint-1/issue7-e2e.txt); screenshots in [issue7/](../../evidence/sprint-1/issue7/) |
| #7 verification (2026-11-07) | `npm test` (server, client) | `8849c36` | Not printed in historical log; passing summary | server 100, client 46 | 0 | 0 | [issue7-npm-test.txt](../../evidence/sprint-1/issue7-npm-test.txt) |
| #8 M-01 fresh clone (2026-11-08; Codex on Tell52's machine) | README setup, build, npm test and npm run test:e2e; isolated Compose project/ports | `bc8b6ba` | 0 for every command | Setup in 180.779 s; server 100, client 46, E2E 2 | 0 | 0 | [timing and exits](../../evidence/sprint-1/issue8/m01-results.json); [scope and README gaps](../../evidence/sprint-1/issue8/verification.md) |
| #8 M-02 keyboard walkthrough (2026-11-08; Codex) | Assistant-operated Tab/Shift+Tab, Enter/Space, typing and native date-field arrow keys; desktop and 390 px | `bc8b6ba` | 0 | 2 viewport journeys; loading, busy, empty, error/retry and success | 0 application failures; initial harness issue corrected | 0 planned walkthroughs | [keyboard results](../../evidence/sprint-1/issue8/keyboard/keyboard-results.json), [scope/screenshots](../../evidence/sprint-1/issue8/verification.md); human acceptance pending |
| Sprint 1 release candidate | `npm run build` | `bc8b6ba` | 0 | n/a (build) | 0 | n/a | [build output](../../evidence/sprint-1/issue8/m01-npm.cmd-run-build.txt) |
| Sprint 1 release candidate | `npm test` (server) | `bc8b6ba` | 0 | 100 | 0 | 0 | [regression output](../../evidence/sprint-1/issue8/m01-npm.cmd-test.txt) |
| Sprint 1 release candidate | `npm test` (client) | `bc8b6ba` | 0 | 46 | 0 | 0 | [regression output](../../evidence/sprint-1/issue8/m01-npm.cmd-test.txt) |
| Sprint 1 release candidate | `npm run test:e2e` | `bc8b6ba` | 0 | 2 | 0 | 0 | [E2E output](../../evidence/sprint-1/issue8/m01-npm.cmd-run-test-e2e.txt), [candidate screenshots](../../evidence/sprint-1/issue8/journey/) |

The accepted-main build/test run is **not yet available** because the release PR has not been created or merged. The rows above verify the staging candidate only.

### AC results

AC-01–17 rows retain the original feature evidence below; all their automated checks passed again at `bc8b6ba` in the candidate regression log. AC-18/19 include the new explicitly attributed walkthroughs.

| AC | Planned test | Actual file and test name | Automated / manual | Result | Commit |
|---|---|---|---|---|---|
| AC-01 | T-01 | `server/tests/api/auth.test.ts` "T-01 / AC-01: login" (3 tests) | Automated | Pass | `296cc54` |
| AC-02 | T-02 | `server/tests/api/auth.test.ts` "T-02 / AC-02" (3 tests); `server/tests/unit/password.test.ts` (4 tests) | Automated | Pass | `296cc54` |
| AC-03 | T-03 | `server/tests/api/auth.test.ts` "T-03 / AC-03" (7 tests); `client/tests/App.test.tsx` access denied test | Automated | Pass | `296cc54` |
| AC-04 | T-04 | `server/tests/api/auth.test.ts` "T-04 / AC-04" (2 tests); `client/tests/App.test.tsx` login and logout tests (8 tests) | Automated | Pass | `296cc54` |
| AC-05 | T-05 | `server/tests/api/events.test.ts` T-05; `client/tests/Events.test.tsx` create/publish journey | Automated | Pass | `8538324` |
| AC-06 | T-06 | `server/tests/unit/events.test.ts`; `server/tests/api/events.test.ts` T-06; client validation | Automated | Pass | `8538324` |
| AC-07 | T-07 | `server/tests/api/events.test.ts` T-07 filtering, privacy and own registration | Automated | Pass | `8538324` |
| AC-08 | T-08 | `server/tests/api/events.test.ts` T-08 repeated/concurrent publish and past start | Automated | Pass | `8538324` |
| AC-09 | T-09 | `server/tests/api/events.test.ts` T-09 role/ownership rejections | Automated | Pass | `8538324` |
| AC-10 | T-10 | `server/tests/api/registrations.test.ts` "T-10"; `client/tests/Registrations.test.tsx` register and receipt | Automated | Pass | `d3d1c4a` |
| AC-11 | T-11 | `server/tests/api/registrations.test.ts` "T-11" (repeat and 5 concurrent same-participant requests); UI duplicate message | Automated | Pass | `d3d1c4a` |
| AC-12 | T-12 | `server/tests/unit/registration-rules.test.ts` "T-12"; `server/tests/api/registration-capacity.test.ts` (TDD red then green); UI full message | Automated | Pass | `d3d1c4a` |
| AC-13 | T-13 | `server/tests/api/registrations.test.ts` "T-13" (10 concurrent participants, capacity 1) | Automated | Pass | `d3d1c4a` |
| AC-14 | T-14 | `server/tests/api/registrations.test.ts` "T-14" (draft, missing, started, organizer, session and CSRF); UI closed message | Automated | Pass | `d3d1c4a` |
| AC-15 | T-15 | `server/tests/api/registrations.test.ts` "T-15" (privacy, mine, new app instance); `client/tests/Registrations.test.tsx` My registrations and receipt | Automated | Pass | `d3d1c4a` |
| AC-16 | T-16 | `server/tests/api/roster.test.ts` owner/empty; `client/tests/Roster.test.tsx` table/count/empty and states | Automated | Pass | `55b4a15`; [evidence](../../evidence/sprint-1/issue6-roster.md) |
| AC-17 | T-17 | `server/tests/api/roster.test.ts` rejection/no-query; smoke direct API responses | Automated | Pass | `55b4a15`; [API evidence](../../evidence/sprint-1/issue6-api.json) |
| AC-18 | T-18, M-02 | `e2e/tests/sprint1-journey.spec.ts`, desktop/mobile; #8 keyboard walkthrough | Automated + assistant-operated keyboard verification | T-18 Pass; M-02 assistant check Pass; human acceptance pending | `bc8b6ba` |
| AC-19 | T-19, M-01 | `server/tests/api/foundation.test.ts`; `server/tests/unit/test-database.test.ts`; #8 fresh-clone setup | Automated + assistant-operated setup verification | T-19 Pass; M-01 Pass in 180.779 s with prerequisites installed and isolated DB configuration; human acceptance pending | `bc8b6ba` |

## Evidence Index

Actual screenshots and logs are stored under `docs/evidence/sprint-1/` and linked here.

| Evidence | AC / test | Role | Preconditions and steps | Expected | Actual | File | Commit |
|---|---|---|---|---|---|---|---|
| #2 foundation: migrate, seed twice, constraints, restart | AC-19 / T-19 | n/a | Empty test database; see evidence file | Seed idempotent, constraints reject bad rows, rows survive restart | As expected | [issue2-foundation.md](../../evidence/sprint-1/issue2-foundation.md), [file hashes](../../evidence/sprint-1/issue2-file-hashes.txt) | `d111892` |
| #4 create, publish and discover at desktop and mobile | AC-05 to AC-07 | Organizer, Participant | Smoke runner on the test database | Draft, publish, My events, discovery and detail work at both viewports | As expected; no overflow | [issue4-events.md](../../evidence/sprint-1/issue4-events.md) (12 screenshots), [issue4-smoke.txt](../../evidence/sprint-1/issue4-smoke.txt) | `8538324` |
| #6 authorized roster and API rejections | AC-16/17, T-16/17 | Owner, foreign Organizer, Participant, anonymous | Two saved registrations; owner opens My events; direct requests by each role | Owner sees rows/count; denied roles receive 401/403/404 without participant data | Pass; desktop/mobile empty/error/retry also checked | [roster evidence](../../evidence/sprint-1/issue6-roster.md), [API bodies](../../evidence/sprint-1/issue6-api.json) | Uncommitted on `d1914a2` |
| Normal journey: publish, register, retrieve saved registration | AC-05, AC-10, AC-15 / T-18 | Organizer, Participant | T-18 steps 1 and 3 | Event published; receipt and My registrations show the registration | Pass in the historical #7 E2E output; repeated successfully in #8 | [01](../../evidence/sprint-1/issue7/desktop/01-create-form.png), [02](../../evidence/sprint-1/issue7/desktop/02-published.png), [03](../../evidence/sprint-1/issue7/desktop/03-receipt.png), [04](../../evidence/sprint-1/issue7/desktop/04-my-registrations.png) (same names under `mobile/`) | `8849c36`; repeated at `bc8b6ba` |
| Rule rejection: event full or duplicate | AC-11, AC-12 / T-18 | Participant | T-18: duplicate from a stale tab; last place taken while participant2's page was open | Duplicate and full messages; page then shows the registration or Full | Pass in the historical #7 E2E output; repeated successfully in #8 | [05](../../evidence/sprint-1/issue7/desktop/05-duplicate.png), [06](../../evidence/sprint-1/issue7/desktop/06-full-message.png) | `8849c36`; repeated at `bc8b6ba` |
| Login and logout, old session rejected | AC-01, AC-04 / T-01, T-04 | Participant | Seeded API fixtures; login, logout, replay previous session cookie | Login succeeds; logout revokes session; replay returns 401 | Pass as part of all 100 server tests | [candidate regression log](../../evidence/sprint-1/issue8/m01-npm.cmd-test.txt), `server/tests/api/auth.test.ts` | `bc8b6ba` |
| Forbidden role / foreign owner | AC-09, AC-17 / T-09, T-17 | Participant, foreign Organizer, anonymous | API tests attempt event publication and owner roster access with the wrong identity | Role/ownership rejection; roster responses 401/403/404 without participant data | Pass as part of all 100 server tests; historical direct API responses retained | [candidate regression log](../../evidence/sprint-1/issue8/m01-npm.cmd-test.txt), [historical API responses](../../evidence/sprint-1/issue6-api.json) | `bc8b6ba` regression; API response artifact belongs to #6 |
| Concurrency: last place | AC-13 / T-13 | 10 Participants | Capacity 1; 10 registrations at once | One 201, nine 409 `EVENT_FULL`, one ACTIVE row | As expected | [issue5-npm-test.txt](../../evidence/sprint-1/issue5-npm-test.txt) | `7582113` |
| TDD red and green | AC-12 / T-12 | n/a | Commit the two T-12 files alone, run; then add the implementation, run again | Red fails on the capacity rule; green passes with unchanged files | As expected | [issue5-t12-red.txt](../../evidence/sprint-1/issue5-t12-red.txt), [issue5-t12-green.txt](../../evidence/sprint-1/issue5-t12-green.txt) | `5e373f0`, `d3d1c4a` |
| Restart persistence | AC-15, AC-18 / T-15, T-18 | Participant | T-18 final step: API process stopped and started (new process id), then log in | Registration still listed and its receipt opens | As expected | [08](../../evidence/sprint-1/issue7/desktop/08-after-restart.png) | `8849c36` |
| Desktop and mobile viewports | AC-18 / T-18, M-02 | All roles | T-18 at 1440x900 and 390x844; keyboard-only action sequence and focus checks at both widths | No horizontal overflow; labelled fields, reachable controls and visible focus | Pass in #8; assistant-operated verification, human acceptance pending | [journey screenshots](../../evidence/sprint-1/issue8/journey/), [keyboard results](../../evidence/sprint-1/issue8/keyboard/keyboard-results.json) | `bc8b6ba` |
| Fresh clone setup | AC-19 / M-01 | Codex on Tell52's machine | New remote clone of sprint1; new isolated DB volumes; README setup and full checks | Setup and checks within 15 min after prerequisites | Pass in 180.779 s; isolation overrides and README gaps documented | [verification](../../evidence/sprint-1/issue8/verification.md), [timing](../../evidence/sprint-1/issue8/m01-results.json) | `bc8b6ba` |
| Keyboard state and recovery checks | AC-18 / M-02 | Organizer, Participant | Keyboard journey; hold a real save request to expose busy state; delay/abort one roster request, then retry | Visible loading/busy/error, successful retry, keyboard-only normal journey | Pass at desktop and mobile; no application-code edits | [verification](../../evidence/sprint-1/issue8/verification.md), [keyboard results](../../evidence/sprint-1/issue8/keyboard/keyboard-results.json) | `bc8b6ba` |

## Known Limitations

Known limitations and incomplete release gates as of 2026-11-08. These are observations, not a claim of release acceptance.

| Item | Type (failed test / skipped test / incomplete / limitation) | Impact | Plan |
|---|---|---|---|
| T-11 and T-13 were written after the registration code, not red first | Limitation | Only T-12 is TDD evidence. A check that removed the row lock made T-13 fail (7 to 9 of 10 got the last place), so T-13 does detect overbooking. | None; T-12 is the planned TDD test |
| Registration under heavy load waits up to 15 s for a database transaction, then answers 503 `SERVICE_BUSY` | Limitation | Only matters with many simultaneous registrations; nothing is stored on 503 and the user can retry | Revisit with the load target NFR-07 in Sprint 3 |
| M-01/M-02 were executed with AI tooling, not personally by a student | Verification scope | They provide repeatable technical evidence but do not establish a student-run manual test or teammate approval | Tell52/JeenoXD review the results and perform any course-required personal walkthrough |
| Release PR, accepted main commit/tag and final board capture are pending | Incomplete release | Issue #8 cannot be marked Done; candidate checks do not prove an accepted release | Complete substantive review, authorized publication and final evidence capture |
| Native date-field entry in the first #8 keyboard harness attempt was incomplete | Harness issue, corrected | The first run stopped before saving; no application defect established | Arrow-key entry used in successful reruns; initial result retained under issue8/keyboard |

## Version history

| Version | Date | Change | Reviewed by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial test specification | `Tell52` |
| 1.1 | 2026-11-05 | Record actual #2/T-19 automated execution and explicit pending M-01/user/peer review. | `JeenoXD` |
| 1.2 | 2026-11-05 | #3: T-03 role case uses a probe route until #4 adds Organizer routes; AC-01 to AC-04 mapped to actual test files. The #2 client shell smoke test was replaced by the #3 login and routing tests because the placeholder page it checked no longer exists. Client tests and setup live in `client/tests/` (team convention). | `Tell52` |
| 1.3 | 2026-11-05 | Moved #2 run and evidence notes into the table rows; recorded #3 test counts. | `Tell52` |
| 1.4 | 2026-11-06 | Record F-02 tests and initial focus failure/fix; align T-07 with approved myRegistration exception; add separate T-03 event coverage. | `JeenoXD` |
| 1.5 | 2026-11-06 | Moved the #4 execution notes into the tables and linked AC-05 to AC-09 to `8538324`; added #5 results for AC-10 to AC-15, T-12 red/green and evidence rows; recorded the first #5 run failure (T-13, P2028) and its fix. | `Tell52` |
| 1.6 | 2026-11-06 | Record #6 T-16/T-17 and regression results. Existing Events UI fixture supplies an empty roster for the newly mounted section; existing assertions unchanged. | `JeenoXD` |
| 1.7 | 2026-11-07 | #7: T-18 rewritten as implemented (stale page and stale tab give the real full and duplicate attempts; restart uses a new API process); M-01 and M-02 steps made concrete; #6 rows linked to `55b4a15`; #7 run, AC-18 and evidence rows added. | Pending Tell52 review |
| 1.8 | 2026-11-08 | Filled execution/evidence cells; verified integrated candidate in fresh clone; corrected manual-check attribution; recorded remaining release gates. | Pending human review of #8 evidence |
