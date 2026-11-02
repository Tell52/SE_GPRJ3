# Event Planner

Event Registration and Attendance System for CPE 334 (Theme 3). Organizers publish events with limited places; Participants register; Organizers view the roster.

Status: Sprint 1 in progress. Documentation is in [docs/](docs/). Setup commands below are the planned outline and will be confirmed in Issue #2.

## Stack

React + TypeScript + Vite (`client/`), Node 20 + Express + TypeScript (`server/`), PostgreSQL 16 with Prisma, Vitest, Supertest, React Testing Library, Playwright (`e2e/`).

## Prerequisites

Node.js 20+, npm, Docker (for the local PostgreSQL container).

## Setup

```bash
git clone https://github.com/Tell52/SE_GPRJ3.git
cd SE_GPRJ3
docker compose up -d db

cd server
cp .env.example .env          # set SEED_PASSWORD locally; never commit .env
npm install
npx prisma migrate deploy
npm run seed

cd ../client
npm install
```

## Run

```bash
cd server && npm run dev      # API on http://localhost:3000
cd client && npm run dev      # UI on http://localhost:5173 (proxies /api)
```

## Test

```bash
cd server && npm test         # unit and API tests on the isolated test database (.env.test)
cd client && npm test         # UI component tests
cd e2e && npx playwright test # end to end journeys at desktop and mobile viewports
```

## Build

```bash
cd server && npm run build
cd client && npm run build
```

## Demo accounts

Seeded synthetic accounts (password is the `SEED_PASSWORD` you set locally): `organizer1@example.test`, `organizer2@example.test`, `participant1@example.test`, `participant2@example.test`, `participant3@example.test`.

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