# Sprint 3 contracts (v0.1)

Baseline: Sprint 2 release on main `fabd9e9` (PR #69, revision `s9084416c-00016-xh6`). IDs continue AC-01 to AC-36 and T-01 to T-36.
Status: F-09 is implemented first as the Deliverable 2 Sprint 3 increment; F-10 is specified and planned.

## F-09 On-site check-in

FR-11, BR-11, BR-05, NFR-01, NFR-03; extends F-04 roster. From the roster of an owned event the organizer checks in an ACTIVE registration.

**API.** `POST /api/registrations/:id/check-in`, no body, Organizer role, CSRF. Returns 200 with the roster item `{ id, status, registeredAt, checkedInAt, participant }`. Lock the event row FOR UPDATE (the same lock as bookings, edits and event cancellation), then re-read and decide in this order:

| Check | Response |
|---|---|
| Registration missing, or its event not owned by the caller | 404 `NOT_FOUND` |
| Event not PUBLISHED, or registration not ACTIVE | 409 `INVALID_STATE` |
| Already checked in | 409 `ALREADY_CHECKED_IN` |
| Server time before start − 1 h, or at or after end (half-open window) | 409 `CHECK_IN_CLOSED` |
| Otherwise | 200, `checkedInAt` = server time |

Participant 403 `FORBIDDEN`, no session 401, missing CSRF 403 `CSRF_INVALID`. A rejection writes nothing.

**Data.** Nullable `Registration.checkedInAt` (timestamptz). Existing rows read null. The roster returns `checkedInAt` for every row.

**UI.** Roster gains a Checked in column. An ACTIVE row without a check-in shows "Check in"; after success it shows the saved Bangkok time, and a reload shows the same. A rejection is shown above the table and the roster reloads.

| AC | Test and level | Setup and input | Expected |
|---|---|---|---|
| AC-37 Check in within the window | T-37 unit + PostgreSQL API | ACTIVE row on a published event. Server time at start − 1 h − 1 ms, start − 1 h, end − 1 ms, end (fresh fixture each). | 409 CHECK_IN_CLOSED, 200, 200, 409 CHECK_IN_CLOSED. Saved `checkedInAt` equals server time and survives a roster reload. |
| AC-38 Once, ACTIVE only | T-38 PostgreSQL API | Two concurrent check-ins of one receipt; a participant-cancelled receipt; a receipt on an organizer-cancelled event. | Exactly one 200 and one 409 ALREADY_CHECKED_IN, one timestamp. Both cancelled cases 409 INVALID_STATE, no timestamp. |
| AC-39 Owner only | T-39 API | Other organizer, participant, anonymous, owner without CSRF. | 404, 403, 401, 403. No timestamp written. |

Done when T-37 to T-39 pass, the roster shows the saved time after reload, the PR is reviewed and the change is on main and deployed.

## F-10 Attendance reporting and CSV (planned)

FR-12, BR-12, BR-05, NFR-01. Read-only `GET /api/events/:id/attendance` and `GET /api/attendance/summary` share one aggregation with CSV export, derived from registration status and `checkedInAt`. No summary table.

| AC | Test and level | Setup and input | Expected |
|---|---|---|---|
| AC-40 Event report | T-40 API + UI | Ended event: one checked in, two ACTIVE without check-in, one cancelled. Separate fixture before end. | Registered 3, checked in 1, no-shows 2 after end; before end the two are pending. |
| AC-41 Summary and CSV | T-41 API + export | Two events owned by O, one by Q; text with commas and quotes. | Summary covers O's events only; CSV parses to the same totals and keeps quoted text. |
| AC-42 Owner only | T-42 API | Participant, Q on O's event, anonymous. | 403, 404, 401; no attendance data returned. |

## Revision history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-28 | F-09 and F-10 contracts from the Deliverable 2 draft; F-09 error codes and check order fixed before implementation. For teammate review before the F-09 tests and code. |
