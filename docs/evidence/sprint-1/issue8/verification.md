# Issue #8 candidate verification

Executed on 8 November 2026 (Asia/Bangkok) by Codex at Tell52's request. Application candidate: `bc8b6ba8457dd51211ea93e68ef6d6c2ab803dd4`, fetched from `origin/sprint1` after PR #16. These are technical verification results, not an attestation that either student personally ran the checks or that the release has been accepted.

## M-01: fresh-clone setup

**Pass with the documented isolation configuration: 180.779 seconds (3 min 0.779 s), below 15 minutes.** Timing began at 02:53:55.094 and ended at 02:56:55.870 +07:00, including clone, environment-file preparation and every command below. Node v22.17.1, npm 10.9.2, Docker Engine 29.2.1 and Google Chrome were already installed. Docker Desktop was started before the timed run; prerequisite installation and a cold package/image download are not measured.

A new remote clone was created under the operating-system temporary directory. No node_modules or environment files were copied from the working checkout. Environment examples were copied and configured with newly generated local credentials. A separate Compose project, `se-gprj3-issue8`, used fresh database volumes and loopback ports 5543/5544, leaving the existing development/test databases untouched. Test database name remained `event_planner_test`, with the existing safety guard active. API/UI ports were 3000/5173.

| Command | Exit | Result / evidence |
|---|---|---|
| `git clone --branch sprint1 --single-branch https://github.com/Tell52/SE_GPRJ3.git` | 0 | [clone log](m01-clone.txt); exact candidate in [timing record](m01-results.json) |
| `docker compose -p se-gprj3-issue8 --profile test up -d --wait` | 0 | [new volumes and healthy databases](m01-docker-compose--p-se-gprj3-issue8---profile-test-up--d---wait.txt) |
| `npm ci` | 0 | [306 packages installed; audit found zero vulnerabilities](m01-npm.cmd-ci.txt) |
| `npm run db:generate` | 0 | [Prisma generation](m01-npm.cmd-run-db-generate.txt) |
| `npm run db:migrate` | 0 | [committed SQL migration applied](m01-npm.cmd-run-db-migrate.txt) |
| `npm run db:seed` | 0 | [seed execution](m01-npm.cmd-run-db-seed.txt) |
| `npm run build` | 0 | [server and client production build](m01-npm.cmd-run-build.txt) |
| `npm test` | 0 | [100 server and 46 client tests passed; no failures or skips](m01-npm.cmd-test.txt) |
| `npm run test:e2e` | 0 | [2 journeys passed; no failures or skips](m01-npm.cmd-run-test-e2e.txt); [screenshots](journey/) |

### README observations

1. The M-01 contract selects the sprint candidate, but the README clone command defaults to `main`. The audit explicitly selected `sprint1`; `main` was still the initial commit. The README's #7 and #2 review-status paragraphs are also stale. README was not changed in this task's approved three-document edit scope.
2. README permits changing database ports and corresponding URLs. This run additionally used `-p se-gprj3-issue8` to isolate new containers and volumes from the existing Compose project. This is an explicit test-environment deviation, not a claim of an unchanged command-for-command run.
3. The documented installed-Chrome route worked. No additional browser installation or application-code change was required.
4. The 15-minute result applies to this prepared machine, with existing package/image caches. It is not a guarantee for a machine without the prerequisites or for a slow network.

The original #7 screenshots remain unchanged in the working repository. Newly generated screenshots were copied from the clone into `issue8/journey/`. Only generated evidence and the standalone verification harness were added in the clone; the tested application source was the committed candidate.

## M-02: keyboard-driven browser walkthrough

**Pass at 1440×900 and 390×844.** Operator: Codex, using Playwright keyboard input in installed Chrome with `en-US` locale and `Asia/Bangkok` timezone. The application used the isolated real PostgreSQL test database and compiled API from the candidate. The browser was automated headlessly; this is not a student-run manual session or a screen-reader audit. Human acceptance remains pending.

Application actions used Tab, Shift+Tab, Enter, Space, text typing, Control+A and arrow keys for the native segmented date/time fields. No mouse clicks, locator `fill()`/`focus()`, DOM value assignment or accessibility-tree activation was used. Locators and read-only DOM checks identified the currently focused element and verified visible states. Browser navigation to the initial login URL, viewport setup, screenshots and network fault injection are harness operations.

| Check | Result | Evidence (desktop/mobile have matching names) |
|---|---|---|
| Login fields and reverse tab order | Visible labels; Email → Password and Shift+Tab back to Email; focused controls have the 3px outline | [desktop login](keyboard/desktop-01-login-focus.png), [mobile login](keyboard/mobile-01-login-focus.png) |
| Required-field error | Empty submission displays an error and focuses Email | [mobile error](keyboard/mobile-02-required-error.png) |
| Create form and native date fields | All six fields entered with keyboard; visible labels and focus ring; valid future start/end | [desktop form](keyboard/desktop-03-form.png), [mobile form](keyboard/mobile-03-form.png) |
| Busy state | Held the real save request, observed disabled `Saving...`, then released it | [desktop busy](keyboard/desktop-03b-busy.png), [mobile busy](keyboard/mobile-03b-busy.png) |
| Draft/empty/success | Draft saved, empty roster shown; publication cancellation and confirmation work with keys | [mobile draft](keyboard/mobile-04-draft-empty.png), [mobile published](keyboard/mobile-05-published.png) |
| Registration and receipt | Participant registers using Space, sees success/registration number, opens My registrations and returns to receipt | [desktop receipt](keyboard/desktop-06-receipt.png), [mobile receipt](keyboard/mobile-06-receipt.png) |
| Loading and recoverable error | Delayed then aborted one roster request; loading and network error displayed | [mobile loading](keyboard/mobile-07a-roster-loading.png), [mobile error](keyboard/mobile-07b-roster-error.png) |
| Keyboard retry and roster | Retry using Space retrieves the real stored participant; owner sees 1 of 2 places taken | [desktop roster](keyboard/desktop-07-roster.png), [mobile roster](keyboard/mobile-07-roster.png) |
| Reachability and layout | Targets reached through keyboard navigation, focus-visible/outline checked; no horizontal overflow at each captured state | [focus and step record](keyboard/keyboard-results.json) |

The delayed/aborted requests expose transient UI states deterministically; they do not mock successful server responses. Normal saves, publication, registration and roster reads use the real API/database. Codex visually inspected representative desktop/mobile form, busy, error and roster captures in addition to the recorded checks.

The first harness attempt stopped because numeric typing plus ArrowRight skipped native date segments, leaving an incomplete date. The [initial result](keyboard/initial-harness-results.json) is retained. The harness was corrected to use arrow-key segment entry and then passed; no application code was changed. A further successful run added deterministic busy/loading/error/retry checks. [Final run output](keyboard-run.txt).

To reproduce, copy [issue8-keyboard.mjs](issue8-keyboard.mjs) into `e2e/scripts/` in a prepared clone of the candidate, run the normal E2E suite first to reset/seed its guarded test database, then from the clone root run `node --import tsx e2e/scripts/issue8-keyboard.mjs ABSOLUTE_OUTPUT_DIRECTORY`. Ports 3000/5173 must be free. The script starts/stops its own API and Vite process, creates synthetic verification events and registrations, and never resets a development database. Its relative imports intentionally match the `e2e/scripts/` execution location.

## Evidence boundaries and release gates

- The baseline design commit `96d9a67` predates the first implementation `d111892`. Later documentation refinements are not represented as the original design.
- Comparing both T-12 test files between red `5e373f0` and green `d3d1c4a` yields an empty diff. Historical execution logs remain linked in tests.md. They were not regenerated or backdated in #8.
- All feature PRs #10–16 have teammate approvals and are merged. Their comments contain no specific technical findings; substantive review details remain outstanding.
- Candidate tests passed, but no release PR, accepted-main commit/tag or final board capture exists. Do not mark #8 Done based on this report.
