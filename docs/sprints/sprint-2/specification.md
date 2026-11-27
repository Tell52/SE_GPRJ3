# Sprint 2 Specification

Revision 0.3 includes the F-06 decision for #53. Session handling, roles, deployment and seed identities carry forward from Sprint 1. Each feature below links to its verification cases.


## F-05 Registration cancellation

A participant can cancel an owned ACTIVE registration strictly before the event starts. Each cancellation releases one place and preserves history. Rebooking requires an open event with a place available.

Requirements: FR-07 / BR-07.

- **AC-20** Cancel an owned place once before start. [T-20](tests.md#f-05-registration-cancellation)
- **AC-21** Enforce start boundary. [T-21](tests.md#f-05-registration-cancellation)
- **AC-22** Rebook and compete for freed place. [T-22](tests.md#f-05-registration-cancellation)
- **AC-23** Restrict cancellation to holder. [T-23](tests.md#f-05-registration-cancellation)

**Done for #51** when T-20 through T-23 pass with saved receipt reload, counts and direct ownership rejection. Link results, test files, reviewed commit and integrated PR in the sprint completion record.


## F-06 Registration deadline

FR-08 / BR-08 and BR-02, extending F-03 and the #52 edit form. Sprint 1 at 489e5bf closed at start. The [TA-approved #49 decision](https://github.com/Tell52/SE_GPRJ3/issues/49#issuecomment-7128346309) closes registration at start minus 60 minutes, by server time inside the locked transaction. Existing receipts stay Active. This decision reached main at 4fb8732.

**BR-08 decision for #53, 27 November 2026.** The owner may store a deadline up to and including start. Registration closes at the earlier of that value and start minus 60 minutes. Clearing the deadline restores the fixed #49 cutoff. For a 12:00 event, a stored deadline of 10:00 closes at 10:00, while 12:00 or null closes at 11:00. Equality closes registration, preserving the roster preparation window.

- **AC-24** Manage stored deadline. [T-24](tests.md#f-06-registration-deadline)
- **AC-25** Validate merged schedule and ownership. [T-25](tests.md#f-06-registration-deadline)
- **AC-26** Close exactly at effective cutoff. [T-26](tests.md#f-06-registration-deadline)
- **AC-27** Communicate closure and preserve receipts. [T-27](tests.md#f-06-registration-deadline)

**Done for #53** when the deadline decision is recorded, #52 is integrated, T-24 through T-27 pass, and saved form, boundary responses, row counts, test files, reviewed commit and integrated PR are linked.


## F-07 Event editing and capacity

An organizer can edit an owned draft or published event. Capacity must remain an integer from 1 to 1000 and accommodate every ACTIVE registration, including when a booking races with an edit.

Requirements: FR-09 / BR-09 and BR-01.

- **AC-28** Persist valid edits atomically. [T-28](tests.md#f-07-event-editing-and-capacity)
- **AC-29** Preserve active seats and capacity limits. [T-29](tests.md#f-07-event-editing-and-capacity)
- **AC-30** Enforce increase window. [T-30](tests.md#f-07-event-editing-and-capacity)
- **AC-31** Serialize edit and booking. [T-31](tests.md#f-07-event-editing-and-capacity)
- **AC-32** Restrict edits by owner and state. [T-32](tests.md#f-07-event-editing-and-capacity)

**Done for #52** when applicable T-28 through T-32 cases pass, and reload, both race outcomes with counts, test files, reviewed commit and integrated PR are linked. Run cancelled-state case on #54 integration.


## F-08 Event cancellation

An organizer can cancel an owned published event. The event and its ACTIVE registrations change status together. Earlier participant cancellations retain their reason and time.

Requirements: FR-10 / BR-10.

- **AC-33** Cancel published event and preserve history. [T-33](tests.md#f-08-event-cancellation)
- **AC-34** Show saved cancellation to both roles. [T-34](tests.md#f-08-event-cancellation)
- **AC-35** Serialize cancellation and booking. [T-35](tests.md#f-08-event-cancellation)
- **AC-36** Restrict event cancellation to owner. [T-36](tests.md#f-08-event-cancellation)

**Done for #54** when T-33 through T-36 pass and both role views, mixed-row snapshots, race outcomes, test files, reviewed commit and integrated PR are linked.

## Product Definition of Done

Review the versioned contracts before implementation. For each feature, link the executed tests and evidence to its criteria, resolve review findings and record the approved PR and integrated commit in the [review record](reviewer.md).
