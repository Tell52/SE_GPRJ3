# Lab 5 Deployment: Event Planner on Google Cloud Run

Team: Chutipon Homsuwan (JeenoXD) and Napat Tantipibulsap (Tell52)
Repository: https://github.com/Tell52/SE_GPRJ3 (public)
Public URL: https://s9084416c-4d7hbszvwq-as.a.run.app
Lab 5 Issues: #27 to #31 (label `lab5`)

## 1. Stack

| Part | Technology |
|---|---|
| Client | React 18, TypeScript, Vite (built into `client/dist`) |
| Server | Node 24, Express 5, TypeScript, Prisma 6.19.3 |
| Database | PostgreSQL 16 (Cloud SQL in production) |
| Tests | Vitest, Supertest, React Testing Library, Playwright E2E |
| Container | One image from the root `Dockerfile`: the server serves the API and the built client |
| CI | `.github/workflows/ci-docker.yml`, job `test-and-docker` |
| Deploy | `.github/workflows/deploy.yml` ("Deploy to Google Cloud", provided by the course portal) |

In production the server listens on `0.0.0.0`, serves `client/dist` with an SPA fallback, trusts the Cloud Run proxy, and exposes `GET /api/health` (process up) and `GET /api/ready` (database reachable, 503 if not).

## 2. Shared cloud setup

Our own GCP account was not available, so we used the course's shared project. The course portal created every resource below; we created no GCP resources, secrets or IAM roles ourselves.

| Item | Value |
|---|---|
| Project / region | `cpe-se-course-2026` / `asia-southeast1` |
| Team prefix | `s9084416c` |
| Cloud Run service | `s9084416c` |
| Migration job | `s9084416c-migrate` |
| Cloud SQL instance | `s9084416c-pg` (db-f1-micro), database and user `s9084416c` |
| Artifact Registry | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9084416c/s9084416c` |
| Runtime service account | `s9084416c-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| Deployer service account | `s9084416c-deployer@cpe-se-course-2026.iam.gserviceaccount.com` |
| Keyless login | Workload Identity pool `s9084416c-pool`, provider `s9084416c-provider` |

GitHub environment `demo` holds the variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` and `MIGRATE_COMMAND`. None of them is a secret, and the workflow uses short-lived credentials rather than a stored service-account key.

## 3. Environment variables and secrets (names only)

No secret value is committed. Real `.env` files are ignored by Git and excluded by `.dockerignore`; only `*.env.example` placeholders are committed.

| Name | Where it is set | Used by | Secret? |
|---|---|---|---|
| `DATABASE_URL` | Local: `server/.env`. Cloud: Secret Manager `s9084416c-database-url` (service and job) | Server, Prisma | Yes |
| `ADMIN_PASSWORD` | Cloud: Secret Manager `s9084416c-admin-password` (migration job) | Fallback for creating synthetic demo accounts | Yes |
| `DEMO_USER_PASSWORD` | Cloud: Secret Manager `s9084416c-demo-password` (mapped by the starter script when demo seeding is enabled) | Seed source before ADMIN_PASSWORD | Yes |
| `SEED_PASSWORD` | Local: `server/.env`, `server/.env.test`, root `.env` for Compose. CI: written to `server/.env.test` with a CI-only value | Seed (checked first) | Yes (local or test scope) |
| `POSTGRES_PASSWORD` | Local: root `.env` | Local Compose database | Yes (local or test scope) |
| `NODE_ENV` | Dockerfile `production`; local `development` | Server | No |
| `PORT` | Dockerfile `3000`; Cloud Run sets its own `PORT` (use the port supplied by the platform) and the server uses it | Server | No |
| `HOST` | Optional; defaults to `0.0.0.0` in production | Server | No |
| `CLIENT_DIST` | Dockerfile `/app/client/dist` | Server | No |
| `SESSION_TTL_HOURS` | Optional; default 8 | Server | No |
| `TZ` | Dockerfile `Asia/Bangkok` | Server | No |
| `MIGRATE_COMMAND` | GitHub `demo` variable: `npx prisma migrate deploy && npm run prisma:seed` | Deploy workflow, migration job | No |

Additional controls: `POSTGRES_PORT` and `POSTGRES_TEST_PORT` select local database ports; `APP_PORT` selects the Compose app port or optionally overrides the Cloud Run container port in the workflow. `POSTGRES_USER` and `POSTGRES_DB` identify the local DB user and database. These are non-secret. For authenticated smoke checks, supply the synthetic account through `SMOKE_EMAIL` and `SMOKE_PASSWORD` privately; the password is a secret. Without them the script reports the login check as skipped.

The seed reads `SEED_PASSWORD`, then `DEMO_USER_PASSWORD`, then `ADMIN_PASSWORD`, so the same code works locally, in CI and on the portal's job. It never overwrites existing users or passwords.

## 4. Commands

Local (repository root):

```bash
cp .env.example .env
cp server/.env.example server/.env
cp server/.env.test.example server/.env.test
# Set local passwords in these files; set SEED_PASSWORD in root .env for Compose.
# Match DATABASE_URL to the local DB password and keep the test DB separate.
npm ci
docker compose up -d --wait db
npm run db:migrate
npm run db:seed
npm run build
docker compose --profile test up -d --wait     # test database
npm test                                       # server + client tests
npm run test:e2e                               # Playwright journey
docker compose --profile app up --build        # whole app at http://localhost:3000
DRY_RUN=1 bash deploy/deploy.sh                # prints the deploy plan, no GCP calls
bash deploy/tests/test_deploy_stub.sh          # offline check of deploy.sh
```

Smoke test against any URL (Python 3, standard library only):

```bash
python3 deploy/smoke_test.py https://s9084416c-4d7hbszvwq-as.a.run.app
# no local Python: docker run --rm -v "${PWD}:/w" -w /w python:3.14-alpine python deploy/smoke_test.py <URL>
```

`deploy/deploy.sh` is based on the TA starter kit configured for this team. We keep it for the dry run and offline test; real deployments go through GitHub Actions only.

## 5. Release procedure

1. Open an Issue with the `lab5` label.
2. Branch from `staging` (`lab5/<topic>`), commit, push, open a PR into `staging` that references the Issue.
3. CI `test-and-docker` runs. The teammate reviews with a specific check, then merges.
4. Open a release PR from `staging` into `main`. Ruleset `protect-main` requires 1 approval and a passing `test-and-docker`, with the branch up to date.
5. Merging pushes to `main`, which starts "Deploy to Google Cloud" automatically:
   build the image tagged with the commit SHA, push it, run `MIGRATE_COMMAND` on `s9084416c-migrate`, then deploy the service. The service is only deployed if the migration succeeds.
6. Check the run is green, run the smoke test, and record the commit, image, digest and revision in the Issue.

A manual run (Actions → Deploy to Google Cloud → Run workflow on `main`) redeploys the current `main` and creates a new revision.

## 6. Restart and rollback

Restart: run "Deploy to Google Cloud" by hand on `main`. This creates a new revision of the same code.

Rollback: the portal workflow has no image tag input, so we roll back through Git:

1. `git switch staging && git pull`, then `git switch -c lab5/rollback`.
2. `git revert <commit of the change to undo>`, push, PR into `staging`, review, release PR into `main`.
3. The merge deploys the older code. Run the smoke test and check the change is gone.

Roll forward the same way by reverting the revert commit on `lab5/roll-forward`.

Data lives in Cloud SQL, not in the container, so records and sessions survive restarts, redeploys and rollbacks. Migrations are only applied forward; a rollback of application code does not undo a migration.

## 7. Finding the running commit

1. Open Cloud Run → service `s9084416c` → Revisions. Identify the revision actually receiving traffic. If traffic is split, inspect each receiving revision.
2. In Cloud Shell, select the project explicitly and list the traffic allocation:

```bash
gcloud run services describe s9084416c --project cpe-se-course-2026 --region asia-southeast1 --format="yaml(status.traffic)"
gcloud run revisions describe "$REVISION" --project cpe-se-course-2026 --region asia-southeast1 --format="yaml(spec.containers[0].image,status.imageDigest)"
```

Set `REVISION` to the serving revision name from the first command. Match its image digest to the build/push log and its SHA tag to the triggering main commit. A manual rebuild can produce a new digest for the same tag.

## 8. Release log

| Release | Trigger | Commit (image tag) | Image digest | Revision | Result |
|---|---|---|---|---|---|
| A | [Push](https://github.com/Tell52/SE_GPRJ3/actions/runs/44894356526) | `9b4efa98219f809622139cadb9fb9481b6960dff` | `sha256:25c34b1dd8ea56ac99da69dd17b29585b8b610eaabb6f092a51d8d1f2c9f8887` | `s9084416c-00007-286` | Public journey and smoke evidence in #29. |
| B | [Merge #37](https://github.com/Tell52/SE_GPRJ3/actions/runs/44900752305) | `99981136e9d5ef90d3acaa3d1fbededc84f62b4c` | `sha256:955990423caaea4de68e00e114d0a911d2736e2ae9d9b1e1d5ebaf1fdbfb70dd` | `s9084416c-00008-vcl` | Release note visible; see #29. |
| Restart | [Manual on main](https://github.com/Tell52/SE_GPRJ3/actions/runs/44902300205) | `99981136e9d5ef90d3acaa3d1fbededc84f62b4c` | `sha256:0a686c5c896f7649e2e7f4b0e7d2ac4f618975ba79c1075b7367ff670d3e081b` | `s9084416c-00009-57d` | Registration 2 and participant session survived. |
| Rollback | [Merge #39](https://github.com/Tell52/SE_GPRJ3/actions/runs/44904066206) | `d73b3a42ac8d2c7965c9647f17734e286279a590` | `sha256:79a8173f13fbe5321c6d1f6b597af7a0263f016fcd15847c8dab7a078df73ec1` | `s9084416c-00010-vnk` | Deployment succeeded. Public smoke checks passed; [registration 2 remained Active in the original participant session](../../evidence/lab5/issue4/rollback-registration.jpg). |
| Roll-forward | [Merge #41](https://github.com/Tell52/SE_GPRJ3/pull/41) · [Deploy](https://github.com/Tell52/SE_GPRJ3/actions/runs/44907046636) | `747cb0dcced8b477a007dc05e1e5466acf6ad23f` | `sha256:318cfcb7a2b7c3c921367d657aaad92d246624937ff27a8f8f316fd16682e702` | `s9084416c-00011-ws8` | 100% traffic. The [login note returned](../../evidence/lab5/issue4/roll-forward-login.jpg) and the [same receipt stayed Active](../../evidence/lab5/issue4/roll-forward-registration.jpg). |

## 9. Notes and deviations

1. Our own GCP account was unavailable. The team used the TA portal's shared project and keyless identity setup.
2. The team expected the first Deploy demo run to stop at settings validation before repository connection. In the [recorded run](https://github.com/Tell52/SE_GPRJ3/actions/runs/44887258836), settings validation passed and keyless authentication failed before image publication or deployment.
3. The portal workflow was added directly to main in `f5fbb45`. It has no automatic smoke step or image-tag rollback input. Run smoke checks after deployment and use the reviewed revert flow above.
4. Early migration attempts failed. Commit `9b4efa9` restored the starter-kit deployment layout and extended seed password lookup. The historical direct updates precede the protected release flow demonstrated by PRs #36–39.
5. The portal previously reported a starter-kit layout mismatch. Successful subsequent deployments establish that the app ran; the latest repository-review screen is separate evidence.
6. Demo passwords belong in Secret Manager. Existing sessions are stored in PostgreSQL and remain subject to their normal expiry.

## 10. Evidence and verification

- [CI and Docker build](https://github.com/Tell52/SE_GPRJ3/actions/runs/44903710012), [blocked main PR](https://github.com/Tell52/SE_GPRJ3/pull/35), and [main gate screenshot](../../evidence/lab5/issue2/pr-35-main-merge-blocked.png).
- [Public journey and release screenshots](https://github.com/Tell52/SE_GPRJ3/issues/29), [restart receipts](../../evidence/lab5/issue4/persistence.md), and [rollback release](https://github.com/Tell52/SE_GPRJ3/pull/39).
- The restart uses Event 4 (Test 2), registration 2, in the same participant session. After PR #41 deployed, Participant One refreshed the original session and saw the same Active receipt. All four public smoke checks passed. Optional scripted login was skipped. [PR #42](https://github.com/Tell52/SE_GPRJ3/pull/42) added the verification record to staging.

The historical restart screenshot shows the page loading. The contemporaneous check recorded the loaded receipt; the saved rollback screenshot shows its fields.
