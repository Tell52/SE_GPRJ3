# Issue #6: Organizer private roster evidence

Date: 2026-11-06 (Asia/Bangkok). Base: `d1914a2` (PR #14 merged into `sprint1`), branch `feature/issue6-roster`. Tested as an uncommitted working tree; no implementation commit, push, PR, teammate approval or integration is claimed. Tell52 confirmed PR #14 merged and authorized the changes to shared route/UI files before implementation.

## Implementation

- F-04 / FR-06 / BR-05 / AC-16–17: `GET /api/events/:id/registrations` requires a session and Organizer role, checks event ownership before querying registrations, and selects only the contract fields. It returns stored registration id/status/date, participant id/name/email, event summary and an exact count. Order is registered time ascending, then id for ties. No migration or registration write is needed.
- My events opens the organizer event detail with a roster table; below 640px it becomes labelled cards. Includes loading, empty, API/network error and retry states; dates use Asia/Bangkok. Public event detail does not mount or request a roster.
- Shared edits: registration router GET handler and EventDetailPage roster mount. The existing Tell52 Events UI test fixture adds an empty roster response; existing assertions are unchanged. Existing registration POST/service behavior is unchanged.

## Executed checks

Environment: Windows PowerShell, Node v22.17.1, npm 10.9.2, PostgreSQL 16.15, Prisma 6.19.3, Vitest 4.1.12. Chrome headless via the repository Playwright dependency. Database: guarded local `event_planner_test`, separate from development; reset by existing test helpers. Docker Desktop was started and existing Compose development/test database containers brought up.

| Command | Result | Evidence |
|---|---|---|
| `npm run build` | Exit 0; server TypeScript/Prisma and client TypeScript/Vite pass; rerun after caption CSS fix | [build](issue6-build.txt) |
| `npm test` | Exit 0; server 100, client 46 passed; 0 failed/skipped | [tests](issue6-npm-test.txt) |
| `node --import tsx e2e/scripts/issue6-smoke.mjs` | Exit 0; desktop 1440x900 and mobile 390x844; My events → roster, empty, simulated 500/retry, logout, no overflow/page errors; caption height checked | [smoke](issue6-smoke.txt) |
| Direct API requests in smoke runner | Owner 200/count 2, anonymous 401, Participant 403, foreign Organizer 404 | [response bodies](issue6-api.json) |

`server/tests/api/roster.test.ts` has 10 cases: exact field whitelist and persisted values, reverse-insertion/time ordering, read-only registrations, empty owned draft, denied roles with no roster query, and invalid/missing event IDs. `client/tests/Roster.test.tsx` has 11 cases covering navigation, ordered rows/count, empty/loading, network retry, 401/403/404/500, public/Participant/foreign routes, and late response isolation. The full suite includes existing #2–5 regression tests.

The first smoke run passed desktop but failed its exact mobile cell-name locator because mobile CSS adds the Email label to the accessible name ([initial output](issue6-smoke-initial.txt)). The locator now matches the intended email with its optional label. Visual inspection of the next run found a vertically wrapped table caption on mobile; `caption { display: block; width: 100%; }` fixed it, and a height assertion now detects that regression. Build and both viewport checks were rerun successfully. These were smoke/layout issues; the API/UI unit suite passed on its first run.

## Screenshots

All users and emails in these files are synthetic test fixtures. The smoke runner creates registrations through the real API, then reads them through the owner UI. The error screenshots deliberately simulate a 500 response; populated and empty screens use the real backend.

| State | Desktop | Mobile |
|---|---|---|
| Authorized roster, two registrations | [desktop](issue6-desktop-roster.png) | [mobile](issue6-mobile-roster.png) |
| Empty owned draft | [desktop](issue6-desktop-empty.png) | [mobile](issue6-mobile-empty.png) |
| API error with retry | [desktop](issue6-desktop-error.png) | [mobile](issue6-mobile-error.png) |

## Review remaining

Tell52's local code review and substantive teammate review are pending; no human review is invented. T-18/full journey, M-01/fresh-clone setup and M-02/manual accessibility remain separate work. This evidence verifies #6 locally and does not mark the issue Done. Commit and push remain with Tell52. API/Vite/Chrome smoke processes were closed; database containers remain available.
