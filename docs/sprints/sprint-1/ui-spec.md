# Sprint 1 UI Specification

Shared conventions (AppShell, labels, pending, empty and error states, viewports, time format) are in [system-sds.md](../../system-sds.md) section 3. Target viewports: desktop 1440x900 and mobile 390x844, no horizontal overflow.

## Navigation and role based controls

| Role | Header links | Home after login | Controls shown only to this role |
|---|---|---|---|
| Participant | Events, My registrations, Logout | `/events` | Register button, View registration link |
| Organizer | My events, Events, Logout | `/organizer/events` | Create event, Publish, Roster section |

Hiding a control is convenience only; the API enforces every permission. Opening the other role's route shows "You do not have access to this page".

## State behaviour

| State | Behaviour |
|---|---|
| Loading | Lists show "Loading..."; submit buttons show a busy label and are disabled |
| Empty | Per screen messages listed below |
| Error | API message in an alert at the top; field errors under each field; network failure "Could not reach the server. Try again." |
| Success | Create event: opens the event detail with "Event saved as draft". Publish: badge changes to Published with "Event published". Register: opens the receipt with "You are registered". Logout: login page |
| Responsive | Desktop 1440x900 and mobile 390x844 with no horizontal overflow; tables become stacked cards below 640 px; touch targets at least 44 px |

## F-01 Authentication

| Screen | Content and behaviour |
|---|---|
| Login `/login` | Email and Password fields with labels; Log in button ("Logging in..." and disabled while pending). Empty fields show messages under the field. 401 shows "Email or password is incorrect." in an alert. Success goes to the role home. |
| AppShell | Header with app name, user name and role badge; links: Participant (Events, My registrations), Organizer (My events, Events); Logout button. Logout returns to `/login` and clears cached user data. |
| Access denied | Shown when a role opens the other role's route: "You do not have access to this page" with a link home. |

## F-02 Events

| Screen | Content and behaviour |
|---|---|
| Events `/events` | Cards: title, date and time, location, "N places left" or "Full". Empty: "No upcoming events". |
| Event detail `/events/:id` | Title, description, location, start and end, remaining places. Register area belongs to F-03. No roster shown. 404 shows "Event not found". |
| My events `/organizer/events` | Table (cards on mobile): title, start, status badge (Draft or Published), registered / capacity. Create event button. Empty: "You have not created any events yet". |
| Create event `/organizer/events/new` | Fields: Title, Description, Location, Start, End, Capacity. Client validation mirrors BR-01. Save ("Saving..."). Success opens the organizer event detail. |
| Organizer event detail `/organizer/events/:id` | Details, status badge, Publish button only for drafts with confirm "Publish this event? Participants will be able to register." Roster section belongs to F-04. |

## F-03 Registration

| Screen | Content and behaviour |
|---|---|
| Register area on `/events/:id` (Participant) | Register button ("Registering...", disabled while pending). Already registered: "You are registered" with a View registration link. No places: Full badge, button hidden. Messages: `EVENT_FULL` "Sorry, this event just filled up."; `ALREADY_REGISTERED` "You are already registered for this event."; `REGISTRATION_CLOSED` "Registration for this event is closed." Success opens the receipt. |
| Registration receipt `/registrations/:id` | Registration number, status, registered time, event title, start, location. 404 shows "Registration not found". |
| My registrations `/registrations` | List of own registrations with event title, start, status. Empty: "You have not registered for any events". |

## F-04 Roster

| Screen | Content and behaviour |
|---|---|
| Roster section on `/organizer/events/:id` | "N of capacity places taken"; table (cards on mobile): participant name, email, status, registered time, in registration order. Empty: "No registrations yet". Loading and error states as shared. |

## Version history

| Version | Date | Change | Reviewed by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial UI specification | `<pending>` |
