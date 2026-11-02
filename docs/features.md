# Feature Inventory

| ID | Feature | Description | Requirements | Depends on | Sprint | Issue |
|---|---|---|---|---|---|---|
| F-01 | Authentication and access control | Login, current identity, logout with server side sessions and CSRF; backend role enforcement. | FR-01, NFR-01, NFR-02 | SYS-FOUND | 1 | #3 |
| F-02 | Event creation, publication and discovery | Organizer creates a draft, publishes it and lists own events; authenticated users discover published events. | FR-02, FR-03, BR-01, BR-05, BR-06, NFR-01 | F-01 | 1 | #4 |
| F-03 | Atomic registration and personal registrations | Participant registers under capacity and duplicate rules; lists and views own persisted registrations. | FR-04, FR-05, BR-02, BR-03, BR-04, BR-05, NFR-01, NFR-03, NFR-04 | F-01, F-02 | 1 | #5 |
| F-04 | Organizer roster | Owning Organizer views the registrations of their event. | FR-06, BR-05, NFR-01 | F-02, F-03 | 1 | #6 |
| F-05 | Registration cancellation | Participant cancels own registration; place is freed; re registration allowed. | FR-07, BR-07 | F-03 | 2 | |
| F-06 | Registration deadline | Optional deadline set by the Organizer and enforced on registration. | FR-08, BR-08 | F-03, F-07 | 2 | |
| F-07 | Event editing and capacity change | Organizer edits own event and changes capacity within limits. | FR-09, BR-09 | F-02, F-03 | 2 | |
| F-08 | Event cancellation | Organizer cancels own published event. | FR-10, BR-10 | F-02, F-03 | 2 | |
| F-09 | Check in | Organizer checks in active registrations during the check in window. | FR-11, BR-11 | F-04 | 3 | |
| F-10 | Attendance reporting and summaries | Attendance report, cross event summary, CSV export. | FR-12, BR-12 | F-09 | 3 | |

## System responsibilities

| ID | Responsibility | Requirements | Established | Verified | Issue |
|---|---|---|---|---|---|
| SYS-FOUND | Application foundation: client/server structure, versioned migrations, constraints, idempotent seed, environment configuration, README | NFR-03, NFR-06 | Sprint 1 | Sprint 1 (T-19, M-01); Docker and GCP in Lab 5 | #2 |
| SYS-UI | Shared UI shell and end to end journeys at desktop and mobile viewports, regression and persistence checks | NFR-01, NFR-03, NFR-04, NFR-05, NFR-06 | Sprint 1 | Sprint 1 (T-18, M-02); extended each sprint | #7 |
| SYS-PERF | Performance hardening | NFR-07 | Sprint 3 | Sprint 3 load script | |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Initial inventory aligned with Issues #1 to #8 |
