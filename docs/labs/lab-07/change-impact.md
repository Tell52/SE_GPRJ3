# Lab 7 change request #49: registration closes 60 minutes before start

Contract version **v1.1** (v1.0 = accepted Sprint 1 release, main `489e5bf`, Cloud Run revision `s9084416c-00014-9lz`).
Approved by Prapatsorn Sangrod (TA, CPE 334) on 24 November 2026; approval and clarifications recorded on Issue #49.
Accepted Sprint 1 baseline and actual pre-change implementation are the same commit: `489e5bf` (no Sprint 2 work merged to main yet).

## Old and new behaviour

| Item | Old (Sprint 1, v1.0) | New (v1.1, #49) |
|---|---|---|
| Rule BR-02 / DEC-05 | Registration open for a PUBLISHED event until its start; rejected when server time ≥ start. | Rejected when **server time ≥ start − 60 minutes**. |
| Clock | Server clock (`new Date()` inside the locked transaction) | Unchanged: server clock only; the browser clock never decides |
| Boundaries | start − 1 ms: accepted; start: rejected | start − 60 min − 1 s: accepted; start − 60 min exactly: rejected; start − 30 min: rejected; start: rejected |
| Rejected request | HTTP 409, `REGISTRATION_CLOSED`, "Registration for this event is closed."; no row written | Unchanged status, code and message |
| Enforcement | Backend `decideRegistration` | Unchanged: backend; the UI only reflects it |
| Participant event page | Register button until start | From start − 60 min: "Registration for this event is closed." shown instead of Register (convenience only) |
| Events list | Published events listed until start | Unchanged: listed until start |
| Roles | Only Participants register; Organizer 403; anonymous 401 | Unchanged |
| Cancelling a registration | Not in Sprint 1 (BR-07 is Sprint 2) | Not applicable; unchanged |
| Organizer/Admin adding participants | Not in Sprint 1 (no such endpoint) | Not applicable; unchanged |
| Existing registrations | | Registrations made before the cutoff stay ACTIVE |

Reason: organizers need a final roster before the event to prepare seats and materials.

## Impact

| Requirement | Feature | SRS / SDS sections | AC | STS tests | Code modules | Impact |
|---|---|---|---|---|---|---|
| BR-02, DEC-05 | F-03 Registration | SRS §BR-02, §DEC-05; Sprint 1 spec F-03 step 2.2, AC-14; API spec POST /api/events/:id/registrations | AC-14 | T-14 (unchanged), T-14b (new) | `server/src/services/registration-rules.ts` `decideRegistration` | **Changed:** cutoff moves to start − 60 min |
| BR-02 (UI) | F-03 | UI spec, Register area | AC-14 | T-14b (client) | `client/src/registrations/RegisterPanel.tsx` | **Changed:** closed message instead of Register from the cutoff |
| BR-08 (Sprint 2, not built) | Deadline | SRS §BR-08, §DEC-05 | none yet | none yet | none | Text aligned: a deadline must not be later than the cutoff |
| BR-03, BR-04 | F-03 | unchanged | AC-11, AC-12, AC-13 | T-11, T-12, T-13 | same function, later checks | Must stay unchanged; check order kept |
| BR-05, NFR-01 | Roles and access | unchanged | AC-14 (404/403 parts), AC-15, AC-17 | T-14, T-15, T-17 | `requireRole`, `requireCsrf` | Must stay unchanged |
| FR-03 list | F-02 | Sprint 1 spec F-02 | AC-07 | T-07 | `server/src/services/events.ts` list query | Not changed: event listed until start |
| BR-06 publish | F-02 | unchanged | AC-08 | T-08 | `events.ts` publish | Not changed: publishing still allowed until start |
| BR-07 cancel (Sprint 2) | | | | | | Not applicable: not built in Sprint 1 |
| BR-11 check in (Sprint 3) | | | | | | Not applicable: not built; its own window is unaffected |

Not applicable: persistence and migrations (no schema change; the rule is computed from the stored `startsAt`); historical data (existing ACTIVE registrations stay ACTIVE; the rule applies only to new requests); API shape (no new fields).

Existing tests: all current fixtures start at least one day ahead or in the past, so no existing expected result changes.

## Preserved behaviour and regression protection

Draft and missing events 404; Organizer 403; anonymous 401; missing CSRF 403; duplicate 409 `ALREADY_REGISTERED`; full 409 `EVENT_FULL`; concurrency (T-11, T-13); roster ownership (T-16, T-17); event listing (T-07). Protected by the full server suite (unit and API), the client suite and the e2e Sprint 1 journey, run on the pre-change commit and after the change.

## Review

Tell52 reviews this file and the contract diff in the docs PR before any test or implementation commit.
