# Software Requirements Specification (SRS)

Product: Event Planner (working name, to be confirmed in section 7, DEC-01)
Repository: Tell52/SE_GPRJ3 | Course: CPE 334, Semester 1/2026 | Theme 3: Event Registration and Attendance System

Source column used in this document:
1. **Brief**: stated in the Theme 3 stakeholder brief or Sprint 1 example.
2. **Handout**: required by the Deliverable 1 handout.
3. **Team**: proposed team decision, recorded in section 7. Pending review by both members until marked Accepted there.

## 1. Stakeholder problem and context

Organizers run workshops and seminars with a limited number of places. Sign ups collected by chat and spreadsheets lead to double sign ups, overbooking and no reliable view of who is coming. On the day, attendance is ticked on paper and is hard to summarise.

Participants want one place to discover upcoming events, register, and see their own registrations.

Chosen context: a university faculty where staff and student club leaders (Organizers) publish workshops, and students (Participants) register for them.

## 2. Actors and responsibilities

| Actor | Responsibilities | Source |
|---|---|---|
| Participant | Logs in, discovers published events, registers, views own registrations. Later: cancels own registration. | Brief |
| Organizer | Logs in, creates and publishes own events, views the registration roster of own events. Later: edits events and capacity, sets deadlines, cancels events, checks in attendees, views attendance reports. | Brief |
| System | Enforces capacity, one active registration per participant per event, sessions, role and ownership restrictions. | Brief |

Each account has exactly one role. Accounts are seeded (Handout: self registration not required).

## 3. Product scope

In scope (three sprints): authentication; event creation, publication and discovery; registration with capacity and duplicate control; organizer roster; registration cancellation; registration deadlines; event editing and capacity changes; event cancellation; check in; attendance reporting and summaries.

Explicit exclusions: self registration, password recovery and account administration (Handout); payments and ticketing; email or push notifications; waitlists; recurring or multi session events; co organizers (Team, DEC-09).

## 4. Functional requirements (FR)

| ID | Requirement | Sprint | Source |
|---|---|---|---|
| FR-01 | A user can log in with email and password, retrieve their current identity and role, and log out. | 1 | Handout, Brief |
| FR-02 | An Organizer can create an event as a DRAFT (title, description, location, start, end, capacity), publish their own draft, and list their own events. | 1 | Brief |
| FR-03 | An authenticated user can list published upcoming events with remaining places and view a published event's details. | 1 | Brief |
| FR-04 | A Participant can register for a published upcoming event. | 1 | Brief |
| FR-05 | A Participant can list their own registrations and view the details of one of their own registrations. | 1 | Brief |
| FR-06 | An Organizer can view the registration roster of their own event. | 1 | Brief |
| FR-07 | A Participant can cancel their own active registration. | 2 | Brief |
| FR-08 | An Organizer can set an optional registration deadline for their own event. | 2 | Brief |
| FR-09 | An Organizer can edit their own event's details, including capacity. | 2 | Brief |
| FR-10 | An Organizer can cancel their own published event. | 2 | Brief |
| FR-11 | An Organizer can check in a registered participant at their own event. | 3 | Brief |
| FR-12 | An Organizer can view an attendance report per event (registered, checked in, no show) and a summary across their own events, with CSV export. | 3 | Brief |

## 5. Business rules (BR)

| ID | Rule | Sprint | Source |
|---|---|---|---|
| BR-01 | Event capacity is a whole number from 1 to 1000. Title (3 to 120 characters) and location (1 to 200 characters) are required; description is optional up to 2000 characters; start must be in the future and end after start. | 1 | Brief (positive capacity); Team (limits, DEC-03) |
| BR-02 | Registration is open only for an existing PUBLISHED event whose start time has not passed. | 1 | Brief; Team (closes at start, DEC-05) |
| BR-03 | A participant may hold at most one ACTIVE registration per event, including when the same participant sends concurrent requests. | 1 | Brief |
| BR-04 | ACTIVE registrations for an event never exceed its capacity, including when different participants compete for the last place at the same time. | 1 | Brief |
| BR-05 | Role and ownership: only Participants register; only Organizers create events; only the owning Organizer may publish, manage or view the roster of an event; a registration is visible only to the participant who holds it (and, through the roster, to the event's owner). | 1 | Brief |
| BR-06 | Only a DRAFT event can be published; publication is one way. | 1 | Team (DEC-04) |
| BR-07 | A participant may cancel their own ACTIVE registration until the event starts. Cancelling frees the place, and the participant may register again while places remain. | 2 | Brief; Team (DEC-06) |
| BR-08 | A registration deadline, if set, must not be later than the event start; registration after the deadline is rejected. | 2 | Brief; Team (DEC-05) |
| BR-09 | Capacity may be increased before the event ends and decreased only down to the current number of ACTIVE registrations. | 2 | Brief; Team (DEC-07) |
| BR-10 | A cancelled event accepts no registrations; its active registrations become cancelled by organizer. | 2 | Team |
| BR-11 | Check in is allowed only for ACTIVE registrations, from 1 hour before start until event end, at most once per registration. | 3 | Team |
| BR-12 | After an event ends, an ACTIVE registration without check in is reported as a no show. | 3 | Team |

## 6. Non functional requirements (NFR)

| ID | Requirement and measurable target | Verification | Sprint | Source |
|---|---|---|---|---|
| NFR-01 | Access control: every protected endpoint returns 401 to anonymous requests, 403 to a forbidden role, and 404 for a resource the user may not know about; no private data is returned and nothing changes. | API tests per endpoint (T-03, T-09, T-14, T-15, T-17) | 1 | Handout |
| NFR-02 | Credentials and sessions: passwords stored as bcrypt hashes (cost 12); server side sessions with an HttpOnly cookie, 8 hour absolute expiry, revocation on logout, and CSRF protection on state changing requests. | Unit and API tests (T-02, T-03, T-04) | 1 | Handout; Team (DEC-08) |
| NFR-03 | Durable persistence: committed data is stored in PostgreSQL and is still retrievable after the application restarts; startup never resets data. | API test with a new app instance (T-15); E2E restart step (T-18) | 1 | Handout |
| NFR-04 | Concurrency correctness: with capacity 1 and 10 independent participants registering at once, exactly 1 succeeds and exactly 1 ACTIVE row exists. | PostgreSQL integration test (T-13) | 1 | Brief |
| NFR-05 | Usability: the main journey works at 1440x900 and 390x844 without horizontal overflow, with labelled fields, logical focus order and loading, empty and error states. | E2E at both viewports (T-18); manual review M-02 | 1 | Handout |
| NFR-06 | Reproducibility and configuration: a fresh clone runs migrate, seed, build and tests from README commands; seeding is idempotent; configuration comes from environment variables with safe examples; no secrets in Git or client code; the app is ready for Docker packaging (deployed in Lab 5). | Foundation test (T-19); manual check M-01; PR review | 1 (deploy: Lab 5) | Handout |
| NFR-07 | Performance: event list and registration requests respond within 500 ms at p95 with 1000 events and 20000 registrations seeded locally. | Load script | 3 | Team |

## 7. Assumptions and decisions

Assignment requirements (Brief or Handout) are not decisions; they are marked in the Source column above. This section records the choices the team made where the brief left room, and open questions with their resolution.

Status: **Proposed** (drafted, awaiting review by both members), **Accepted** (both agreed; recorded below), **Rejected** or **Superseded** (keep the row and add the replacement).

| ID | Question | Decision | Rationale | Affects | Status |
|---|---|---|---|---|---|
| DEC-01 | Product name? | "Event Planner". | Short and descriptive. | All docs, UI title | Proposed |
| DEC-02 | What is a duplicate registration? | Same participant, same event, an ACTIVE registration already exists. Enforced by an event row lock in the transaction and a partial unique index on (eventId, participantId) WHERE status = 'ACTIVE'. A cancelled registration (Sprint 2) keeps its row; re registering creates a new row. | Preserves history; the database guard catches anything the service misses. | BR-03, F-03, AC-11 | Proposed |
| DEC-03 | Capacity and field limits? | Capacity integer 1 to 1000; title 3 to 120; location 1 to 200; description up to 2000 characters. | Brief only says positive; 1000 covers faculty events and catches typos. | BR-01, AC-06 | Proposed |
| DEC-04 | Can a published event return to draft? | No. Publication is one way. Corrections go through editing (Sprint 2). | Participants may already have registered. | BR-06, AC-08 | Proposed |
| DEC-05 | When does registration close? | Sprint 1: at event start. Sprint 2: at the optional deadline, which must not be after start. | Brief asks to clarify deadlines; simple rule first. | BR-02, BR-08 | Proposed |
| DEC-06 | Re registration after cancelling? | Allowed while places remain and registration is open. | Matches how sign ups work in practice. | BR-07 | Proposed |
| DEC-07 | Capacity changes? | Increase anytime before the event ends; decrease only down to the ACTIVE count. Never auto remove registrations. | Brief asks to clarify; avoids silently dropping people. | BR-09 | Proposed |
| DEC-08 | Session design? | Server side sessions in a `Session` table: random 32 byte token in an HttpOnly, SameSite=Lax cookie (Secure in production); only its SHA-256 hash stored; 8 hour absolute expiry; logout sets `revokedAt`. CSRF: per session synchronizer token returned by login and `/me`, sent as `X-CSRF-Token` on state changing requests. | Issue #3 requires revocable logout and CSRF protection; a stateless JWT cannot be revoked. | NFR-02, F-01 | Proposed |
| DEC-09 | Co organizers or admin role? | No. One owning Organizer per event; no admin role. | Keeps ownership rules testable. | BR-05 | Proposed |
| DEC-10 | Status code for resources the user may not see? | 404 for another Organizer's event (publish, roster), another Participant's registration, and drafts not owned. 403 when the role itself is not allowed. | Avoids revealing that private records exist. | NFR-01, AC-07, AC-09, AC-15, AC-17 | Proposed |
| DEC-11 | Does browsing require login? | Yes. All endpoints except login require a session. | Simplifies Sprint 1 access control. | FR-03 | Proposed |
| DEC-12 | Time zone? | Stored in UTC; displayed in Asia/Bangkok. | Single campus. | UI | Proposed |
| DEC-13 | May a participant's event detail show their own registration? | Yes: only the caller's own `myRegistration: { id, status }` or null. No roster or other participants' data in any event response. | Lets the event page show "You are registered" (F-03 UI) without exposing others. | AC-07, T-07, F-02, F-03 | Accepted by Tell52 during #4 (2026-11-06); JeenoXD review pending |

### Decision review record

| Date | Reviewer | Decisions reviewed | Outcome / changes |
|---|---|---|---|
| `<date>` | `<name>` | `<DEC IDs>` | `<accepted / changed and why>` |
| `<date>` | `<name>` | `<DEC IDs>` | `<accepted / changed and why>` |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Initial SRS aligned with Issues #1 to #8; assumptions and decisions kept in section 7 |
| 1.1 | 2026-11-06 | #4: added DEC-13 (own registration summary in event detail); confirmed BR-01/DEC-03 limits unchanged. |
