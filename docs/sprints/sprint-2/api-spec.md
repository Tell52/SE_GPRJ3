# Sprint 2 API Specification

## Common access checks

Use the [Sprint 1 JSON and error formats](../sprint-1/api-spec.md). For each mutation exercise missing session (401 UNAUTHENTICATED), invalid CSRF token (403 CSRF_INVALID), wrong role (403 FORBIDDEN) and missing or privately owned resource (404 NOT_FOUND). Rejections preserve all stored values.


## F-05 Registration cancellation

FR-07 / BR-07, extending F-03. From My registrations open an Active receipt, confirm Cancel and POST /api/registrations/:id/cancel with no body. Return 200 with the updated receipt. Store status CANCELLED, cancelledBy=PARTICIPANT and server cancelledAt. Keep old receipts when rebooking. Count only ACTIVE rows for remaining places and duplicate checks. The booking cutoff does not shorten the cancellation window.


## F-06 Registration deadline

O sets a local date/time in the edit form. PATCH /api/events/:id accepts registrationDeadline as an ISO instant, null to clear, or omission to preserve. Validate against the resulting startsAt. Persist a nullable timestamp (legacy events read null). Event reads include registrationDeadline, effectiveCutoff and serverTime as UTC instants (registrationDeadline may be null). Show both in the form when different. Participant detail shows the effective cutoff and server-derived closed state. POST /api/events/:id/registrations remains authoritative.


## F-07 Event editing and capacity

FR-09 / BR-09 and BR-01, extending F-02 and F-03. Owner opens the prefilled Edit form from My events for a draft or published event. PATCH /api/events/:id accepts a nonempty subset of title, location, description, startsAt, endsAt and capacity (deadline added by F-06). Return 200 updated event. Reject unknown fields or invalid merged values with 400 VALIDATION_ERROR. Apply BR-01 field limits. A changed start must be future, end must exceed start. An unchanged past start permits capacity edits during the event. Check increases against the stored end under lock. No new storage fields.


## F-08 Event cancellation

FR-10 / BR-10, extending F-02 and F-03. Owner confirms Cancel event on published event detail. POST /api/events/:id/cancel with no body returns 200 updated event. In one transaction set event status CANCELLED and change ACTIVE registrations to CANCELLED with cancelledBy=ORGANIZER and server cancelledAt. Preserve prior cancellations. Owner sees Cancelled in My events and detail. Participants see “Cancelled by organizer” in their receipts and history. Discovery keeps its upcoming PUBLISHED filter.

## Transaction responsibilities

Serialize mutations with bookings on the event row. Re-read state, ownership, server time and ACTIVE count under lock. Apply all changes atomically. Retain the ACTIVE-only uniqueness constraint. See the [system design](../../system-sds.md).
