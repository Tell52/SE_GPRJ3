# Sprint 2 Tests (Software Test Specification)

Unless specified, O owns published event E on 1 December 2026 from 12:00 to 14:00 UTC, capacity 4. Q is another organizer. P and R are participants. Freeze server time at 09:00. Reset PostgreSQL fixtures for each independent boundary input. Race tests use separate connections and exercise both event-lock acquisition orders. Run the [common access checks](api-spec.md#common-access-checks) for each mutation. F-06 expectations depend on the [BR-08 decision](specification.md#f-06-registration-deadline).


## F-05 Registration cancellation

| Criterion | Test and level | Setup and input | Expected outcome |
|---|---|---|---|
| AC-20 Cancel an owned place once before start | T-20 API + UI | Capacity 1, P active. At 11:59:59.999 cancel, reload receipt and repeat POST. | 200 then 409 INVALID_STATE. ACTIVE counts 1 → 0 → 0. Receipt shows participant cancellation and one place is available. |
| AC-21 Enforce start boundary | T-21 API | Cancel P's active receipt at 12:00 exactly and 12:00:00.001. | Both 409 CANCELLATION_CLOSED. P stays active. |
| AC-22 Rebook and compete for freed place | T-22 PostgreSQL API | At 09:00 cancel P on full capacity-one E. Rebook P, cancel new ID, book R, then try P. | P receives a new ID, both prior receipts retained. R gets 201, P gets 409 EVENT_FULL. Exactly one ACTIVE. |
| AC-23 Restrict cancellation to holder | T-23 API | Run shared access cases. R targets P's ID. | R gets 404, O gets 403. Original row and count unchanged. |


## F-06 Registration deadline

| Criterion | Test and level | Setup and input | Expected outcome |
|---|---|---|---|
| AC-24 Manage stored deadline | T-24 API + UI | Set 10:00, update to 12:00, omit on title edit, clear. Reopen form after each. | 200 each. Saved values 10:00, 12:00, 12:00, null. Effective times 10:00, 11:00, 11:00, 11:00. |
| AC-25 Validate merged schedule and ownership | T-25 API | Set 12:00:00.001 or malformed date. With deadline 10:00 move start to 09:59. Run shared access cases. | Invalid edits get 400 VALIDATION_ERROR. P gets 403, Q gets 404. Deadline and start unchanged. |
| AC-26 Close exactly at effective cutoff | T-26 unit + PostgreSQL API | For null, 10:00 and 12:00 deadlines, use cutoffs 11:00, 10:00 and 11:00 respectively. Submit a fresh booking 1 ms before, exactly at and 1 ms after each cutoff. | First 201 ACTIVE. At/after cutoff 409 REGISTRATION_CLOSED, “Registration for this event is closed.” Zero inserted rows and no consumed place on rejection. |
| AC-27 Communicate closure and preserve receipts | T-27 UI + API | R books before a 10:00 deadline. At 10:00 open discovery/detail as P and POST directly. Reload R's receipt. | E still listed, closed message replaces Register. Direct request gets 409 REGISTRATION_CLOSED. R stays Active. |


## F-07 Event editing and capacity

| Criterion | Test and level | Setup and input | Expected outcome |
|---|---|---|---|
| AC-28 Persist valid edits atomically | T-28 API + UI | On draft and published E save title “Workshop” and a new location, reload. Try title “X” with valid location, blank location, 2001-character description, changed past start or end equal to start. | Valid values survive reload, status unchanged. Each invalid edit gets 400 and saves no field. |
| AC-29 Preserve active seats and capacity limits | T-29 PostgreSQL API | Empty E: submit 1, 1000, 0, 1001, 1.5. With capacity 4 and three ACTIVE, submit 3 then 2. | 1 and 1000 accepted. Out-of-range and fractional inputs get 400. Reduction to 3 succeeds, to 2 gets 409 CAPACITY_BELOW_ACTIVE. All three rows remain. |
| AC-30 Enforce increase window | T-30 API | Increase 4 to 5 at 13:59:59.999, exactly 14:00 and 14:00:00.001. | Before end 200. At/after end 409 INVALID_STATE, capacity stays 4. |
| AC-31 Serialize edit and booking | T-31 PostgreSQL integration | Capacity 2, P active. Race reduction to 1 with R booking. | Edit first: 200 and booking 409 EVENT_FULL, final 1/1 active/capacity. Booking first: 201 and edit 409 CAPACITY_BELOW_ACTIVE, final 2/2. |
| AC-32 Restrict edits by owner and state | T-32 API | Run shared access cases. Owner edits cancelled E after #54 integration. | P gets 403, Q gets 404. Cancelled E gets 409 INVALID_STATE. No stored changes. |


## F-08 Event cancellation

| Criterion | Test and level | Setup and input | Expected outcome |
|---|---|---|---|
| AC-33 Cancel published event and preserve history | T-33 PostgreSQL API | Two ACTIVE and one participant-cancelled row. Cancel E, repeat, and try a draft. | 200 then 409 INVALID_STATE, draft gets 409 INVALID_STATE. Both ACTIVE rows show organizer cancellation, prior reason and timestamp unchanged. |
| AC-34 Show saved cancellation to both roles | T-34 UI + API | Reload owner detail/list, participant receipt/history and discovery. POST a new registration. | Both roles see saved statuses, E absent from discovery. Booking gets 404 NOT_FOUND (non-published event). Zero ACTIVE. |
| AC-35 Serialize cancellation and booking | T-35 PostgreSQL integration | Race O cancelling with P booking an available seat. | Booking first: 201 then its row becomes organizer-cancelled. Cancel first: booking gets 404 and inserts nothing. Cancel succeeds in both, final event CANCELLED with zero ACTIVE. |
| AC-36 Restrict event cancellation to owner | T-36 API | Run shared access cases with ACTIVE rows. P and Q call cancel directly. | 403 and 404 respectively. E remains PUBLISHED and registration rows unchanged. |

## Execution results

### Sprint 2 completion table

The [integrated release table for #55](../../evidence/sprint-2/issue6/release.md) covers AC-20 through AC-36 on one application SHA, including race tests and the F-07 cancelled-event case delivered by F-08. The rows below retain the earlier feature-branch verification.

| Issue / criterion | Executed test | Observed result on 27 November 2026 |
|---|---|---|
| #51 / AC-20 | T-20 [PostgreSQL API](../../../server/tests/api/registrations.test.ts), [receipt UI](../../../client/tests/Registrations.test.tsx), [desktop and mobile journey](../../../e2e/tests/participant-cancellation.spec.ts) | At start −1 ms, two cancellation requests returned 200 and 409 INVALID_STATE. One ACTIVE row became zero. A fresh GET matched the cancelled receipt, including actor and time. Both browser viewports retained the cancellation on reload and showed the freed place on event detail. |
| #51 / AC-21 | T-21 [PostgreSQL API](../../../server/tests/api/registrations.test.ts) | At start and start +1 ms the API returned 409 CANCELLATION_CLOSED. The saved receipt remained ACTIVE. |
| #51 / AC-22 | T-22 [PostgreSQL API](../../../server/tests/api/registrations.test.ts) | On a capacity-one event, P rebooked under a new ID. After cancelling again and retrying cancellation, ACTIVE count was zero. R booked and the count became one. P received 409 EVENT_FULL and retained both cancelled receipts. |
| #51 / AC-23 | T-23 [PostgreSQL API](../../../server/tests/api/registrations.test.ts) | Another participant received 404 NOT_FOUND. Anonymous, missing CSRF and organizer requests received 401, 403 and 403. The owner's receipt and ACTIVE count were unchanged. |
| #53 / AC-24 (stored value) | T-24 [API](../../../server/tests/api/event-editing.test.ts), [form](../../../client/tests/Events.test.tsx), [desktop and mobile reload](../../../e2e/tests/event-deadline.spec.ts) | The owner set an earlier deadline, changed it to event start and cleared it. Each value survived reload. Omitting the field preserved it on a title edit. |
| #53 / AC-25 | T-25 [API](../../../server/tests/api/event-editing.test.ts) | Malformed deadlines, start +1 ms and moving the start before the stored deadline returned 400. A participant received 403 and a different organizer received 404. Stored times were unchanged. |
| #53 / AC-26 | T-26 [unit](../../../server/tests/unit/registration-rules.test.ts), [PostgreSQL API](../../../server/tests/api/event-editing.test.ts) | With null, early and start-equal deadlines, a request 1 ms before the effective cutoff returned 201. At equality and 1 ms after, direct booking returned 409 REGISTRATION_CLOSED. The existing receipt remained ACTIVE, total rows stayed at one and three of four places remained available. |
| #53 / AC-27 | T-27 [API](../../../server/tests/api/event-editing.test.ts), [desktop and mobile](../../../e2e/tests/event-deadline.spec.ts) | An upcoming published event with an expired custom deadline remained in discovery. Its detail showed the closed message and hid Register on both viewports. |

#51 was tested on `sprint2-issue2`, based on `1e75308`. Build, 118 server tests, 51 client tests and both cancellation browser journeys passed.

#53 was tested on the working tree based on `a4bc2be` and integrated at `994f155` via [PR #66](https://github.com/Tell52/SE_GPRJ3/pull/66). Server and client builds, 136 server tests, 55 client tests and four focused browser cases passed.
