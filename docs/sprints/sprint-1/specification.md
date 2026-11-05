# Sprint 1 Specification

Requirements are defined in [srs.md](../../srs.md), decisions in [srs.md](../../srs.md) section 7, system conventions in [system-sds.md](../../system-sds.md). Endpoint details are in [api-spec.md](api-spec.md), screens in [ui-spec.md](ui-spec.md), tests in [tests.md](tests.md), PR reviews in [reviewer.md](reviewer.md).

Sprint 1 scope: SYS-FOUND (#2), F-01 (#3), F-02 (#4), F-03 (#5), F-04 (#6), SYS-UI (#7). Out of scope: cancellation, deadlines, editing, event cancellation, check in, reports, Docker, CI and GCP deployment.

## SYS-FOUND Application foundation (Issue #2)

Linked: NFR-03, NFR-06 | Depends on: #1

Behaviour:
1. Monorepo with `client/`, `server/`, `e2e/`, `docs/`; build, test and start commands documented in the README.
2. Versioned Prisma migrations create User, Session, Event and Registration with foreign keys, unique email, capacity and time CHECK constraints, and the partial unique index for one ACTIVE registration per participant per event.
3. Idempotent seed with at least two users per role in a dedicated database separate from TokTickIT. Re running it never duplicates rows or overwrites a changed password.
4. Startup never migrates, truncates or seeds, so data survives restarts.
5. Safe `.env.example` files; real secrets never committed.

Data: migration `init` creates all four tables (see system-sds section 2).

| ID | Acceptance criterion |
|---|---|
| AC-19 | On an empty database, migrate and seed succeed; running the seed a second time leaves row counts unchanged and keeps a password that was changed after the first seed; inserting capacity 0 or a second ACTIVE registration for the same participant and event directly in SQL is rejected by the database; restarting the server leaves existing rows intact. |

## F-01 Authentication and access control (Issue #3)

Linked: FR-01, NFR-01, NFR-02 | Depends on: SYS-FOUND

Behaviour and workflow:
1. On load the client calls `GET /api/auth/me`; 401 shows the login page.
2. Login with valid credentials creates a server side session, sets the `sid` cookie and returns the user and a CSRF token. The client keeps both in memory and opens the role home.
3. Every protected route runs `requireSession` (401), `requireRole` (403) and, for state changing methods, `requireCsrf` (403). Identity and role come only from the session.
4. Logout revokes the session row, clears the cookie, and the client clears cached state.

Rules and boundaries: email trimmed and lower cased; unknown email and wrong password give the same 401 message; empty or malformed fields give 400; sessions expire 8 hours after creation regardless of activity; password and session fields are never returned.

Data: User, Session (from SYS-FOUND). No new migration.

| ID | Acceptance criterion |
|---|---|
| AC-01 | Valid credentials return 200 with the stored id, name, email, role and a CSRF token, and set an HttpOnly, SameSite=Lax `sid` cookie. A wrong password and an unknown email both return 401 `INVALID_CREDENTIALS` with the identical message and no cookie. Missing or malformed fields return 400 `VALIDATION_ERROR`. |
| AC-02 | Stored passwords are bcrypt hashes that differ from the plaintext and verify correctly. No response contains `passwordHash`, the session token or its hash. A session past its `expiresAt` returns 401 on `GET /api/auth/me`. |
| AC-03 | Anonymous requests to every protected route return 401. A Participant calling an Organizer only route returns 403. A state changing request with a missing or wrong `X-CSRF-Token` returns 403 `CSRF_INVALID`. A `role` or `userId` field in a request body is ignored. In all these cases no data changes. |
| AC-04 | Logout returns 200, sets `revokedAt` on the session and clears the cookie; replaying the old cookie returns 401. In the UI, Logout returns to the login page and protected pages no longer show the previous user's data. |

## F-02 Event creation, publication and discovery (Issue #4)

Linked: FR-02, FR-03, BR-01, BR-05, BR-06, NFR-01 | Depends on: F-01

Behaviour and workflow:
1. An Organizer creates an event; it is stored as DRAFT with `organizerId` from the session and appears in My events.
2. The owner publishes the draft; it becomes PUBLISHED with `publishedAt` set and appears in discovery.
3. Any logged in user lists published upcoming events (ordered by start, with `remainingPlaces`) and views a published event's detail. Detail never includes the roster.

Rules and boundaries: BR-01 field limits (capacity 1 to 1000; 1 and 1000 accepted; 0, -1, 1.5, 1001 and missing rejected); BR-06 only DRAFT can be published (409 otherwise, also 409 if start already passed); BR-05 Participants cannot create or publish (403); another Organizer publishing gets 404 (DEC-10); drafts are visible only to their owner (404 for others).

Data: Event (from SYS-FOUND). No new migration.

| ID | Acceptance criterion |
|---|---|
| AC-05 | An Organizer's valid create returns 201 with status DRAFT owned by the session user and the event appears in `GET /api/events/mine`. Publishing it returns 200 with status PUBLISHED and `publishedAt` stored, and it then appears in `GET /api/events`. |
| AC-06 | Capacity 0, -1, 1.5, 1001 or missing, or a blank or oversized title or location, returns 400 `VALIDATION_ERROR` naming the field and inserts nothing; capacity 1 and 1000 are accepted. |
| AC-07 | `GET /api/events` returns only PUBLISHED events that have not started, with correct `remainingPlaces`. `GET /api/events/:id` for a draft returns 404 to anyone but its owner. No event response includes registrations or participant data. |
| AC-08 | Publishing an already PUBLISHED event returns 409 `INVALID_STATE`; `publishedAt` and all other fields are unchanged. |
| AC-09 | A Participant's create or publish returns 403 and creates or changes nothing. Another Organizer publishing the owner's draft returns 404 and the event stays DRAFT. |

## F-03 Atomic registration and personal registrations (Issue #5)

Linked: FR-04, FR-05, BR-02, BR-03, BR-04, BR-05, NFR-01, NFR-03, NFR-04 | Depends on: F-01, F-02

Behaviour and workflow:
1. A Participant presses Register; `POST /api/events/:id/registrations` (no body; identity from the session).
2. The service runs one transaction:
   1. `SELECT ... FROM "Event" WHERE id = $1 FOR UPDATE` locks the event row, serialising concurrent requests for that event.
   2. Missing or DRAFT gives 404; start passed gives 409 `REGISTRATION_CLOSED` (BR-02).
   3. Existing ACTIVE registration for this participant gives 409 `ALREADY_REGISTERED` (BR-03).
   4. ACTIVE count >= capacity gives 409 `EVENT_FULL` (BR-04).
   5. Insert ACTIVE registration; 201 is returned only after commit.
3. Backstop: a violation of the partial unique index is mapped to 409 `ALREADY_REGISTERED`.
4. The pure rule `decideRegistration(event, existingActive, activeCount, now)` returns OK or the error code, so it can be unit tested.
5. The Participant sees a saved receipt and the registration in My registrations; it is retrievable after logging in again or after a server restart.

Permissions: only Participants register (Organizer 403). A registration is visible only to its holder; another Participant gets 404 and never sees it in their list.

Data: Registration (from SYS-FOUND). No new migration.

| ID | Acceptance criterion |
|---|---|
| AC-10 | A Participant registering for a published upcoming event with places gets 201 with an ACTIVE registration whose `participantId` is the session user; the row exists in the database, the event's `remainingPlaces` drops by 1, and `GET /api/registrations/:id` in a new login session returns the same id. |
| AC-11 | A Participant with an ACTIVE registration who registers again gets 409 `ALREADY_REGISTERED` and the ACTIVE count is unchanged. Five concurrent requests from the same Participant store exactly one ACTIVE registration. |
| AC-12 | For an event whose ACTIVE registrations equal its capacity, a new Participant gets 409 `EVENT_FULL` and the ACTIVE count is unchanged. |
| AC-13 | For an event with capacity 1 and ten independent Participants registering concurrently, exactly one gets 201, nine get 409 `EVENT_FULL`, and exactly one ACTIVE row is stored. |
| AC-14 | Registering for a draft or a missing event returns 404; for an event whose start has passed returns 409 `REGISTRATION_CLOSED`; an Organizer registering returns 403; none of these insert a row. |
| AC-15 | `GET /api/registrations/mine` returns only the session Participant's registrations with event title, start and location. Another Participant requesting that registration by id gets 404 and does not see it in their own list. After the server restarts against the same database, the holder still retrieves it. |

## F-04 Organizer roster (Issue #6)

Linked: FR-06, BR-05, NFR-01 | Depends on: F-02, F-03

Behaviour and workflow: the owning Organizer opens their event and sees each registration's id, status and registered time with the participant's id, name and email, ordered by registration time, plus a count. Read only; no new table.

Permissions: anonymous 401; Participant 403; non owning Organizer 404 (DEC-10). Ownership is checked before any roster query.

| ID | Acceptance criterion |
|---|---|
| AC-16 | For the owner's event with two registrations, `GET /api/events/:id/registrations` returns 200 with both entries (registration id, status, registeredAt, participant id, name, email) in registration order and `count` 2; for an event with none it returns an empty `items` list and the UI shows "No registrations yet". No entry contains password or session fields. |
| AC-17 | The roster request returns 401 when anonymous, 403 for a Participant and 404 for a non owning Organizer, each with no participant data in the body. |

## SYS-UI End to end journeys and UI quality (Issue #7)

Linked: NFR-01, NFR-03, NFR-04, NFR-05, NFR-06 | Depends on: #2 to #6

Behaviour: the complete Sprint 1 journey runs through the real UI against real PostgreSQL at desktop 1440x900 and mobile 390x844, followed by a restart persistence check. Direct backend rejections are tested at the API level (T-03, T-09, T-17).

| ID | Acceptance criterion |
|---|---|
| AC-18 | Through the UI: organizer1 logs in, creates and publishes an event with capacity 1 and logs out; participant1 logs in, registers, opens the saved registration and logs out; participant2 sees the event as Full and a forced register attempt shows the full message; participant1 registering again shows the duplicate message; organizer1 sees participant1 in the roster and logs out. After the server restarts, participant1 still sees the registration. Both viewports pass with no horizontal overflow. |

## Product Definition of Done

A feature, issue or release is Done only when every item is true and backed by evidence (test output, PR links, commit IDs). An AI tool's claim is not evidence.

1. The behaviour in this specification is implemented through every affected layer (UI, API, database).
2. Every linked AC has its planned test in [tests.md](tests.md) executed on the tested commit, and results are recorded in [reviewer.md](reviewer.md).
3. Tests assert the rule and stored rows, not only status codes; none are disabled, skipped or weakened to pass.
4. For T-12, the red run before implementation and the green run afterwards are recorded with the assertions unchanged.
5. The work has a GitHub Issue linked to its feature and AC IDs, a branch from the latest `sprint1`, and a PR into `sprint1` with a substantive teammate review recorded in [reviewer.md](reviewer.md); authors never approve their own PRs.
6. README, `.env.example`, migrations and seed work on a fresh clone (M-01).
7. No secrets in Git or client code; authorization is enforced in the backend.
8. Changed specifications or tests get a version history entry with a reason.
9. Incomplete work, failed or skipped tests and limitations are disclosed.

## Version history

| Version | Date | Change | Reviewed by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial Sprint 1 specification | `<pending>` |
