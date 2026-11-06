# Event Planner

Event Registration and Attendance System for CPE 334 (Theme 3). Organizers publish events with limited places; Participants register; Organizers view the roster.

Status: Foundation (#2) and authentication (#3) are integrated in `sprint1`. Issue #4 event creation, publication and discovery is implemented locally on `feature/issue4-events`, awaiting user review/commit/push and teammate PR review. Registration, roster and the complete Sprint 1 journey remain in #5–7. See [event implementation evidence](docs/evidence/sprint-1/issue4-events.md).

## Stack

React 18 + TypeScript + Vite (`client/`), Node + Express + TypeScript (`server/`), PostgreSQL 16 with Prisma 6, Vitest, Supertest, React Testing Library. Playwright configuration is prepared in `e2e/`; journey tests belong to #7.

This is an npm workspaces monorepo with one root `package-lock.json`. Run `npm ci` at the repository root. Dependency versions are pinned. Prisma 6 is retained for the documented schema/migration workflow; the root override pins its `deepmerge-ts` dependency to 8.0.2 to address GHSA-ggr8-5vv4-36mx.

## Prerequisites

Node.js 20.19+ (20.x), 22.12+ (22.x), or 24+; npm; Docker Desktop with Linux containers and Compose v2. Tested versions and actual results are in [foundation evidence](docs/evidence/sprint-1/issue2-foundation.md).

Docker is used only for local PostgreSQL development/test databases, as approved on 2026-11-05. App containerization, CI/CD and deployment remain outside #2. Default ports: dev database 5433, test database 5434, API 3000, client 5173. Database ports bind to loopback only.

## Setup

```bash
git clone https://github.com/Tell52/SE_GPRJ3.git
cd SE_GPRJ3
cp .env.example .env
cp server/.env.example server/.env
cp server/.env.test.example server/.env.test
```

`cp` also works in PowerShell; alternatively use `Copy-Item`. Before continuing, edit these local files:

- Root `.env`: set a non-placeholder `POSTGRES_PASSWORD`.
- `server/.env`: use that database password in `DATABASE_URL` and set your local `SEED_PASSWORD` (nonempty, not the placeholder, at most 72 UTF-8 bytes because bcrypt truncates longer input).
- `server/.env.test`: use the same database password but keep port **5434** and database **event_planner_test**; set a separate test `SEED_PASSWORD`.

For database passwords containing URL special characters, percent-encode the password in `DATABASE_URL`. If changing database ports, change both the root port setting and corresponding URL. Root `.env` configures Compose; server files configure the application/tests. All real `.env` files are ignored. Never put a database password in a client `VITE_*` variable.

From the repository root:

```bash
docker compose --profile test up -d --wait
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm test
```

The Compose project `se-gprj3` creates separate `event_planner` and `event_planner_test` databases in separate containers/volumes; it does not use another project's database. `db:migrate` runs the committed Prisma migrations, including SQL CHECK constraints and the partial ACTIVE-registration unique index. Do not substitute `prisma db push`, which does not reproduce those custom constraints.

If PostgreSQL is already installed locally, create these dedicated databases and set the URLs accordingly. The tests only permit a loopback `event_planner_test` database with the `public` schema and reject a target matching development.

## Run

```bash
npm run dev:server            # terminal 1: API on http://127.0.0.1:3000
npm run dev:client            # terminal 2: UI on http://127.0.0.1:5173 (proxies /api)
```

For the compiled API: `npm run build` then `npm start`. To inspect the client production build: `npm run preview --workspace client`. These are separate processes; serving the client from the API is part of later delivery work. Stop a foreground process with Ctrl+C. API startup only connects and listens: it never migrates, seeds or resets data.

## Test

```bash
npm test                         # server foundation/auth/events, then client tests
npm test --workspace server       # builds API; guarded real PostgreSQL tests
npm test --workspace client       # auth and event UI tests
```

Server tests explicitly read `server/.env.test`; they reset **only the dedicated test database** before the integration suite. T-19 runs migrations and seed through the CLI, changes a password and an event, repeats seed, checks raw-SQL constraint failures, and starts/stops the compiled API twice while comparing all four tables. No disabled tests are used. Run test suites serially against a given test database.

`npm test` covers the implemented foundation, authentication and event acceptance criteria (AC-01–09 and automated AC-19), not AC-10–18. The full Playwright journey in `e2e/tests/` remains #7 work; `npm test --workspace e2e` will report no tests until then. A separate F-02 smoke runner is available after `npm run build` and `npm test`: `node --import tsx e2e/scripts/issue4-smoke.mjs`. It requires Chrome installed and free ports 3000/5173, starts/stops its own API/Vite servers, and resets only the guarded dedicated test database. Run it serially with other database tests. It saves desktop/mobile screenshots under `docs/evidence/sprint-1/` and does not claim full T-18 or human M-02 coverage.

## Build

```bash
npm run build
```

## Demo accounts

Seeded synthetic accounts (password is the `SEED_PASSWORD` you set locally): `organizer1@example.test`, `organizer2@example.test`, `participant1@example.test`, `participant2@example.test`, `participant3@example.test`.

The seed also creates one draft and one published event owned by organizer1, initially starting 30 days after the first seed. User upserts have empty updates; changing `SEED_PASSWORD` and reseeding does **not** change an existing account's password. Events have internal stable `seedKey` values so editing a title or date does not create duplicates on reseed. Existing event dates are not refreshed automatically. The seed stores no sessions or registrations.

## Persistence and stopping

`docker compose --profile test stop` stops both databases; `docker compose --profile test up -d --wait` starts them again with the same named volumes. `docker compose --profile test down` removes the containers but keeps volumes. Do not add `--volumes`/`-v` unless you intend to erase data. Changing `POSTGRES_PASSWORD` after initial creation does not change the existing PostgreSQL role password; update that role explicitly or use the existing local password.

## Review status

Work was developed from `sprint1` commit `28be4c5e6d105d9a24f7851d4ac9e2338b62fdef` on `feature/issue2-foundation`. The feature is submitted for a PR into `sprint1`; teammate review, M-01 and merge remain pending. An earlier direct push was reverted without rewriting history after the user clarified the intended PR workflow. This does not establish the issue's Definition of Done. See [execution evidence](docs/evidence/sprint-1/issue2-foundation.md).

## Documentation

| Part | File |
|---|---|
| A | [docs/srs.md](docs/srs.md) (includes assumptions and decisions) |
| B | [docs/features.md](docs/features.md), [docs/traceability.md](docs/traceability.md) |
| C | [docs/system-sds.md](docs/system-sds.md) |
| D | [docs/sprints/plan.md](docs/sprints/plan.md) |
| E | [specification.md](docs/sprints/sprint-1/specification.md), [api-spec.md](docs/sprints/sprint-1/api-spec.md), [ui-spec.md](docs/sprints/sprint-1/ui-spec.md), [tests.md](docs/sprints/sprint-1/tests.md) (includes Execution Results, Evidence Index, Known Limitations) |
| Sprint records | [reviewer.md](docs/sprints/sprint-1/reviewer.md) (includes Team Contributions, Process Evidence Index), [ai-use.md](docs/sprints/sprint-1/ai-use.md) |
| Index | [contracts.md](docs/sprints/sprint-1/contracts.md) (compatibility index only) |
| Evidence files | `docs/evidence/sprint-1/` (screenshots and logs) |
