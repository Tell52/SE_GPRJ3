# Sprint 2 UI Specification

## Navigation and state behaviour

Keep existing role-specific navigation. Submit mutations with the session CSRF token. Disable the pending action, preserve form input on validation errors and display field messages alongside the relevant controls. After a conflict refresh the server state and explain the outcome beside the action.

## F-05 Registration cancellation

Open an Active receipt from My registrations. Before start, show Cancel registration with confirmation, including when booking has already closed. On success show “Cancelled by participant”, refresh remaining places and remove the cancellation action. Rebooking yields a separate receipt. At or after start, keep the receipt readable.

## F-06 Registration deadline

In the owner edit form, show an optional local date/time and a way to clear it. Reopen the form with the stored value. Under the [deadline rule](specification.md#f-06-registration-deadline), display the effective cutoff when it differs from the stored deadline. For an upcoming published event, retain the discovery entry after closing. Participant detail replaces Register with “Registration for this event is closed.” A previously booked participant can still open their Active receipt.

## F-07 Event editing and capacity

From My events, open an owned draft or published event and choose Edit. Prefill its details, schedule and capacity. Save valid changes and show them on reload. For a capacity conflict, display the rejection beside capacity and allow correction. Keep edit controls scoped to the owner.

## F-08 Event cancellation

On an owned published event, confirm Cancel event after explaining that all active registrations will be cancelled. After success, show Cancelled in the organizer list and detail. Remove the event from discovery. In participant history and receipts distinguish “Cancelled by organizer” from earlier participant cancellations.
