# Event Planner

Event Registration and Attendance System for CPE 334 (Theme 3). Organizers publish events with limited places; Participants register; Organizers view the roster.

Status: Issue #2 foundation is ready for local review. Login, event management, registration and roster are separate issues (#3–7) and are not implemented yet. The client currently shows a placeholder page; API feature routes return JSON 404.

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
npm test                         # foundation server tests, then client shell test
npm test --workspace server       # builds API, checks guard, runs T-19
npm test --workspace client       # client shell smoke test
```

Server tests explicitly read `server/.env.test`; they reset **only the dedicated test database** before the integration suite. T-19 runs migrations and seed through the CLI, changes a password and an event, repeats seed, checks raw-SQL constraint failures, and starts/stops the compiled API twice while comparing all four tables. No disabled tests are used. Run test suites serially against a given test database.

`npm test` does not claim AC-01–18 or E2E coverage. The `e2e/` workspace currently has configuration only; `npm test --workspace e2e` will report no tests until #7. A teammate's fresh-clone manual check M-01 is still pending.

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

Work is based on `sprint1` commit `28be4c5e6d105d9a24f7851d4ac9e2338b62fdef`, developed on `feature/issue2-foundation`. After receiving the change summary, the user explicitly requested Codex to commit and push this work directly to `sprint1`. This is an exception to the planned feature-PR workflow; teammate review and M-01 remain pending, so this does not establish the issue's Definition of Done. See [execution evidence](docs/evidence/sprint-1/issue2-foundation.md).

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
