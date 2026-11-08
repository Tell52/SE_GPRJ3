# Three Sprint Plan

| Sprint | Goal | Features | Dependencies | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| 1 | Small working domain slice: an Organizer publishes an event, Participants register under capacity and duplicate rules, and the owner sees the roster, with real sessions, permissions and persistence. | F-01, F-02, F-03, F-04; SYS-FOUND, SYS-UI | SYS-FOUND first; F-01; then F-02; F-03 needs F-02; F-04 needs F-03 | Reviewed release on `main` with recorded tag/commit; AC-01 to AC-19 verified; local setup reproducible. | Deliverable 1, 8 Nov 2026 |
| 2 | Complete the registration lifecycle under engineering contracts. | F-05, F-06, F-07, F-08 | All build on F-02 and F-03; F-06 uses the edit form from F-07 | Cancellation and re registration, deadlines, safe capacity changes, event cancellation; application Docker packaging, CI/CD and GCP from Lab 5 (local database Compose is in Sprint 1). | Deliverable 2, 29 Nov 2026 |
| 3 | Attendance, reporting and hardening. | F-09, F-10; SYS-PERF | F-09 needs F-04; F-10 needs F-09 | Check in, attendance report, summary and CSV export; NFR-07 met. | Progress 29 Nov; complete 13 Dec 2026 |

## Sprint 1 scope

Sprint 1 follows the theme's Sprint 1 example: an Organizer logs in and publishes an event with positive capacity; a Participant logs in, registers and views the registration; the Organizer views the event's registrations. It includes the two hardest rules (capacity under concurrency and one active registration) because cancellation, capacity change and check in all build on them. Cancellation, deadlines, editing and event cancellation are left to Sprint 2.

## Sprint 1 Issues

| Issue | Title | Covers | Branch |
|---|---|---|---|
| #1 | Create project documentation and the Sprint 1 engineering baseline | Parts A to E | `feature/issue1-docs` |
| #2 | Set up the application foundation, PostgreSQL schema and reproducible seed | SYS-FOUND; AC-19 | `feature/issue2-foundation` |
| #3 | Implement authentication, sessions and server side access control | F-01; AC-01 to AC-04 | `feature/issue3-auth` |
| #4 | Implement event creation, publication and discovery | F-02; AC-05 to AC-09 | `feature/issue4-events` |
| #5 | Implement atomic registration and persisted personal registrations | F-03; AC-10 to AC-15 | `feature/issue5-registration` |
| #6 | Implement the Organizer private event registration roster | F-04; AC-16, AC-17 | `feature/issue6-roster` |
| #7 | Verify end to end journeys, persistence and regression coverage | SYS-UI; AC-18 | `feature/issue7-verification` |
| #8 | Complete peer reviewed integration and record the accepted release | release | `sprint1` into `main` |

Workflow: integration branch `sprint1` is created from `main`. Each issue branch is created from the latest `sprint1` (never from another feature branch), and its PR into `sprint1` is reviewed by the teammate. Board columns: Backlog, Specified, Started, PR Review, Fixing, Done. Defect fixes use `fix/...` branches from `sprint1`. The reviewed `sprint1` into `main` release PR is Issue #8.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Initial plan aligned with Issues #1 to #8 |
| 1.1 | 2026-11-05 | Distinguish approved Sprint 1 local database Compose from later application packaging/deployment. |
