# Sprint 2 Tests (Software Test Specification)

Unless specified, O owns published event E on 1 December 2026 from 12:00 to 14:00 UTC, capacity 4. Q is another organizer. P and R are participants. Freeze server time at 09:00. Reset PostgreSQL fixtures for each independent boundary input. Race tests use separate connections and exercise both event-lock acquisition orders. Run the [common access checks](api-spec.md#common-access-checks) for each mutation. F-06 expectations depend on the [pending BR-08 decision](specification.md#f-06-registration-deadline).


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

All cases are planned. Record each test ID, implementation file, tested commit, observed outcome and evidence link during #51–#54.
