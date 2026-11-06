# Sprint 1 API Specification

Conventions are in [system-sds.md](../../system-sds.md) section 4. All bodies are JSON. Identity comes from the `sid` cookie. State changing requests (except login) must send `X-CSRF-Token`. Error body: `{ "error": { "code", "message", "details"? } }`.

Common errors on protected routes: 401 `UNAUTHENTICATED` (no or invalid session), 403 `FORBIDDEN` (role), 403 `CSRF_INVALID`.

## F-01 Authentication

### POST /api/auth/login (public)

Request: `{ "email": "participant1@example.test", "password": "<password>" }`

| Status | Body |
|---|---|
| 200 | `{ "user": { "id": 3, "name": "Participant One", "email": "participant1@example.test", "role": "PARTICIPANT" }, "csrfToken": "..." }` plus `Set-Cookie: sid=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` |
| 400 | `VALIDATION_ERROR` with `details` for `email` / `password` |
| 401 | `INVALID_CREDENTIALS` "Email or password is incorrect." |

### GET /api/auth/me (any session)

200 `{ "user": {...}, "csrfToken": "..." }`; 401 `UNAUTHENTICATED` (missing, revoked or expired session).

### POST /api/auth/logout (any session, CSRF)

200 `{ "ok": true }` plus `Set-Cookie: sid=; Max-Age=0`. Session row gets `revokedAt`.

## F-02 Events

Event object:

```json
{ "id": 7, "title": "Intro to Git", "description": "...", "location": "CB2301",
  "startsAt": "2026-11-20T07:00:00.000Z", "endsAt": "2026-11-20T09:00:00.000Z",
  "capacity": 30, "status": "PUBLISHED", "publishedAt": "...",
  "organizer": { "id": 1, "name": "Organizer One" },
  "activeCount": 12, "remainingPlaces": 18 }
```

### POST /api/events (Organizer, CSRF)

Request: `{ "title", "description"?, "location", "startsAt", "endsAt", "capacity" }` (ISO 8601 times).

| Status | Body |
|---|---|
| 201 | Event object, `status: "DRAFT"`, `publishedAt: null` |
| 400 | `VALIDATION_ERROR` (BR-01 fields) |
| 403 | `FORBIDDEN` for Participants |

### POST /api/events/:id/publish (owning Organizer, CSRF)

| Status | Body |
|---|---|
| 200 | Event object, `status: "PUBLISHED"` |
| 403 | `FORBIDDEN` for Participants |
| 404 | `NOT_FOUND` missing or not owned |
| 409 | `INVALID_STATE` already published or start passed |

### GET /api/events (any session)

200 `{ "items": [event] }`: PUBLISHED, `startsAt > now`, ordered by `startsAt`.

### GET /api/events/mine (Organizer)

200 `{ "items": [event] }`: all of the session Organizer's events, drafts included. 403 for Participants.

### GET /api/events/:id (any session)

200 event object, plus `"myRegistration": { "id", "status" } | null` for Participants, scoped to the caller's ACTIVE registration. This is the only registration-data exception to AC-07; no roster or other participants' data is returned (DEC-13). 404 for missing, or a draft not owned by the caller.

## F-03 Registrations

Registration object:

```json
{ "id": 15, "status": "ACTIVE", "registeredAt": "...",
  "event": { "id": 7, "title": "Intro to Git", "startsAt": "...", "endsAt": "...", "location": "CB2301" } }
```

### POST /api/events/:id/registrations (Participant, CSRF)

No body.

| Status | Body |
|---|---|
| 201 | Registration object (returned after commit) |
| 403 | `FORBIDDEN` for Organizers |
| 404 | `NOT_FOUND` missing or draft event |
| 409 | `REGISTRATION_CLOSED`, `ALREADY_REGISTERED` or `EVENT_FULL` |

Checks run in this order inside the locked transaction: missing or draft (404), started (`REGISTRATION_CLOSED`), duplicate (`ALREADY_REGISTERED`), capacity (`EVENT_FULL`). So a participant who is already registered for a full event gets `ALREADY_REGISTERED`, not `EVENT_FULL`.

### GET /api/registrations/mine (Participant)

200 `{ "items": [registration] }` ordered by event start. 403 for Organizers.

### GET /api/registrations/:id (holding Participant)

200 registration object; 404 when missing or held by someone else; 403 for Organizers.

## F-04 Roster

### GET /api/events/:id/registrations (owning Organizer)

```json
{ "event": { "id": 7, "title": "Intro to Git", "capacity": 30 }, "count": 2,
  "items": [ { "id": 15, "status": "ACTIVE", "registeredAt": "...",
               "participant": { "id": 3, "name": "Participant One", "email": "participant1@example.test" } } ] }
```

403 for Participants; 404 for missing or not owned.

## Permissions summary

| Endpoint | Anonymous | Participant | Organizer owner | Organizer not owner |
|---|---|---|---|---|
| `POST /api/auth/login` | allowed | allowed | allowed | allowed |
| `GET /api/auth/me`, `POST /api/auth/logout` | 401 | allowed | allowed | allowed |
| `POST /api/events` | 401 | 403 | allowed | allowed |
| `POST /api/events/:id/publish` | 401 | 403 | allowed | 404 |
| `GET /api/events` | 401 | allowed | allowed | allowed |
| `GET /api/events/mine` | 401 | 403 | own only | own only |
| `GET /api/events/:id` | 401 | published only | allowed | published only |
| `POST /api/events/:id/registrations` | 401 | allowed | 403 | 403 |
| `GET /api/registrations/mine` | 401 | own only | 403 | 403 |
| `GET /api/registrations/:id` | 401 | own only, else 404 | 403 | 403 |
| `GET /api/events/:id/registrations` | 401 | 403 | allowed | 404 |

## Validation

| Input | Rule | Error |
|---|---|---|
| `email` | Required, valid email, trimmed and lower cased | 400 `VALIDATION_ERROR` |
| `password` | Required, non empty | 400 `VALIDATION_ERROR` |
| `title` | Required, 3 to 120 characters after trim | 400 `VALIDATION_ERROR` |
| `location` | Required, 1 to 200 characters after trim | 400 `VALIDATION_ERROR` |
| `description` | Optional, up to 2000 characters | 400 `VALIDATION_ERROR` |
| `startsAt`, `endsAt` | ISO 8601; start later than now; end later than start | 400 `VALIDATION_ERROR` |
| `capacity` | Integer 1 to 1000 | 400 `VALIDATION_ERROR` |
| `:id` path parameters | Positive integer | 404 `NOT_FOUND` |
| `X-CSRF-Token` header | Required on POST except login; must equal the session's token | 403 `CSRF_INVALID` |

Unknown body fields (including `role`, `userId`, `organizerId`, `participantId`) are ignored.

## Data and transaction responsibilities

| Endpoint | Tables read | Tables written | Transaction and integrity |
|---|---|---|---|
| `POST /api/auth/login` | User | Session (insert) | Single insert after password check |
| `POST /api/auth/logout` | Session | Session (`revokedAt`) | Single update |
| `POST /api/events` | none | Event (insert) | Single insert; capacity and time CHECK constraints as backstop |
| `POST /api/events/:id/publish` | Event | Event (status, publishedAt) | Conditional update `WHERE id = ? AND organizerId = ? AND status = 'DRAFT'`; zero rows then decide 404 or 409 |
| `GET /api/events`, `/mine`, `/:id` | Event, Registration (ACTIVE count) | none | Read only |
| `POST /api/events/:id/registrations` | Event (locked), Registration | Registration (insert) | One transaction: `SELECT ... FOR UPDATE` on the event row, rule checks, insert, commit before 201; partial unique index maps to 409 `ALREADY_REGISTERED` |
| `GET /api/registrations/mine`, `/:id` | Registration, Event | none | Read only, filtered by `participantId` = session user |
| `GET /api/events/:id/registrations` | Event, Registration, User (id, name, email only) | none | Ownership checked before the roster query |

## Version history

| Version | Date | Change | Reviewed by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial API specification | `<pending>` |
| 1.1 | 2026-11-06 | #4: own-registration exception in event detail (DEC-13); validation limits unchanged. | Tell52 decision; Chutipon review pending |
| 1.2 | 2026-11-06 | #5: registration object includes event `endsAt`; documented the 409 check order. | Pending Tell52 review |
