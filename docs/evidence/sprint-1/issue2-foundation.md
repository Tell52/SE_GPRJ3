# Issue #2 foundation execution evidence

Date: 2026-11-05 (Asia/Bangkok). Branch: `feature/issue2-foundation`.
Base: `28be4c5e6d105d9a24f7851d4ac9e2338b62fdef` from the latest `sprint1` at checkout.
Tested revision: **uncommitted working tree**, not a new commit or release. [File hashes](issue2-file-hashes.txt) identify the reviewed files; [command output](issue2-verification.txt) records the final run.

## Scope and decisions

- User authorized implementation from the GitHub `sprint1` baseline, discarding unrelated local experiments, and reserved commit/push for themselves.
- User approved Docker Compose solely for local PostgreSQL after the README/SDS versus specification/issue conflict was raised. No app Dockerfile, CI, cloud deployment, authentication or event/registration API behavior was added.
- Schema includes User, Session, Event and Registration; the initial migration contains FKs, unique email/token hash, capacity/time CHECK constraints and the partial `registration_one_active` unique index. Date columns use `TIMESTAMPTZ(3)`.
- A nullable unique internal Event `seedKey` supports idempotent event seeding even after a title/date edit. User upserts and event upserts use empty updates. Seed is transactional and serialized by a PostgreSQL advisory lock.
- Local settings were generated into ignored `.env` files; no real passwords are included in this evidence. There are 2 organizer and 3 participant demo accounts, 1 draft and 1 published event.

## Environment tested

| Component | Actual version |
|---|---|
| OS | Windows, PowerShell, Docker Desktop Linux engine |
| Node.js / npm | 22.17.1 / 10.9.2 |
| PostgreSQL | 16.15 (Debian, Compose `postgres:16`) |
| Docker engine | 29.2.1 |
| Prisma client / CLI | 6.19.3 |
| React / Express | 18.3.1 / 5.3.0 |
| TypeScript / Vite / Vitest | 5.9.3 / 7.3.7 / 4.1.12 |

Dependencies and integrity hashes are locked in the root `package-lock.json`. Vite's Node minimum is documented in its [official guide](https://vite.dev/guide/); Prisma 6 compatibility is documented in the [Prisma upgrade guide](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v6). Node 20 itself was not executed on this machine.

## Commands and actual results

Commands below run from the repository root unless noted.

| Command | Exit | Actual result |
|---|---|---|
| `docker compose --profile test up -d --wait` | 0 | Created separate dev/test containers and named volumes; both healthy. |
| `npm run db:migrate` (initial run, empty dev database) | 0 | Applied `20261105000100_init`. |
| `npm run db:seed` (initial run) | 0 | Seed completed successfully. |
| `npm ci` (final clean dependency installation) | 0 | Installed from lockfile, 306 packages; npm reports 0 vulnerabilities. |
| `npm run build` | 0 | Prisma generation, server TypeScript compilation, client typecheck and Vite production build passed. |
| `npm run db:migrate` (repeat) | 0 | No pending migrations; no reset. |
| `npm run db:seed` (repeat) | 0 | Existing development records preserved. |
| `npm test` | 0 | Server: 2 files / 12 tests passed. Client: 1 file / 1 test passed. No failures or skipped tests. |
| `npm audit` | 0 | 0 reported vulnerabilities at execution time. |

The initial migration/seed results were observed during execution. The final clean-install/build/repeat-migration/seed/test/audit output is retained in `issue2-verification.txt`. Initial tests on Vitest 3.2.7 also passed; audit then identified vulnerable transitive tooling. Vitest was updated to 4.1.12 and Prisma's `deepmerge-ts` was overridden to 8.0.2. npm 10 initially failed dependency resolution (`edgesOut`); npm 11 was used once to update the dependency tree, followed by `npm update deepmerge-ts` and a successful reproducible `npm ci` with npm 10.9.2. The final test run used the final lockfile and passed.

## Assertions actually executed

`server/tests/api/foundation.test.ts`:

1. **T-19 fresh migration / seed repeat:** reset only the dedicated test DB with `prisma migrate reset --force --skip-seed --skip-generate`, assert zero users/events, run `migrate deploy`, run the real seed CLI; assert 2 organizers, 3 participants, 1 draft, 1 published event. All hashes verify and have bcrypt cost 12. Change participant1's password and a draft event's title/capacity, rerun the CLI, and compare every row of all four tables. New password still verifies; original password no longer does.
2. **T-19 CHECK constraints:** direct SQL inserts with capacity 0, -1 and 1001 fail with PostgreSQL `23514`; equal or reversed event times also fail. Stored event count remains 2. Capacities 1 and 1000 are accepted.
3. **T-19 uniqueness and relations:** duplicate email and token hash fail with Prisma `P2002`; each of the four foreign-key relationships rejects missing parents with `P2003`. A raw SQL second ACTIVE registration fails with PostgreSQL `23505`, leaving exactly one registration. PostgreSQL's index definition is checked for UNIQUE, WHERE and ACTIVE.
4. **T-19 process restart:** create a stored registration and session, launch the compiled API process, issue an HTTP request, compare all rows, stop the process, then repeat. Full row snapshots remain identical throughout both starts/stops, including password hashes, dates and registrations.
5. **Foundation API:** unknown route returns the exact safe JSON 404; malformed JSON returns 400 `VALIDATION_ERROR` without a stack in the body.

`server/tests/unit/test-database.test.ts`: 7 guard cases, including rejection of development/other DB names, remote hosts, other schemas, non-PostgreSQL URLs and a dev/test collision despite different credentials/loopback aliases; allows the dedicated test target.

`client/src/App.test.tsx`: accessible main and heading, visible coming-soon message, no unavailable action button in the foundation shell. This is not a full Sprint 1 journey test.

## Remaining verification and handoff

- T-19 automated assertions passed. M-01 on a teammate's fresh clone is **not run**; AC-19 is not claimed fully Done until that check and review/integration are complete.
- AC-01–18, T-12 TDD, login, business workflows and E2E tests belong to later issues and were not run/implemented here.
- At test execution, commit/push and teammate review were pending. After receiving the change summary, the user explicitly instructed Codex to commit and push directly to `sprint1`, overriding the earlier instruction to leave commit/push to the user and making an exception to the planned PR workflow. This authorization is not a teammate review or M-01 result. No PR, issue comment or board transition is part of this handoff.
- Development and test PostgreSQL containers remain available locally. The API processes launched by tests were stopped. No real external data was used.
