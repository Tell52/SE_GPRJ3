# Lab 5 issue 4 — persistence across revisions

[Issue #30](https://github.com/Tell52/SE_GPRJ3/issues/30) · [Public service](https://s9084416c-4d7hbszvwq-as.a.run.app/)

Release B adds the login-page text **Release B: deployed on Google Cloud Run** in commit `a324db7`. It reached staging in [PR #36](https://github.com/Tell52/SE_GPRJ3/pull/36) and main in [PR #37](https://github.com/Tell52/SE_GPRJ3/pull/37).

| Checkpoint | Deployment and UI evidence | Registration and session evidence |
| --- | --- | --- |
| Release B | [Deployment succeeded](https://github.com/Tell52/SE_GPRJ3/actions/runs/44900752305). Revision `s9084416c-00008-vcl`, main SHA `99981136e9d5ef90d3acaa3d1fbededc84f62b4c`. [Deployment log excerpt](release-b-deployment.txt). Public smoke checks passed for health, database readiness, homepage and anonymous auth. | Participant One opened the [Test 2 receipt](https://s9084416c-4d7hbszvwq-as.a.run.app/registrations/2) for [event 4](https://s9084416c-4d7hbszvwq-as.a.run.app/events/4). Registration 2 was Active, registered 21 Nov 2026 at 18:20 Bangkok, location Temple. [Before restart](release-b-registration.jpg). |
| Restart | [Manual restart run](https://github.com/Tell52/SE_GPRJ3/actions/runs/44902300205) succeeded on the same main SHA and image tag. Revision `s9084416c-00009-57d` received 100% of traffic. [Deployment log excerpt](restart-deployment.txt). All four public smoke checks passed. | Reloaded the original browser tab without logging in again. Participant One still saw registration 2, Active, for Test 2 (event 4), with the same registration time and location. [Restart screenshot (captured during loading)](restart-registration.jpg). |
| Rollback | Code revert `392d66e` reached staging in [PR #38](https://github.com/Tell52/SE_GPRJ3/pull/38) and main in [PR #39](https://github.com/Tell52/SE_GPRJ3/pull/39). [Deploy run](https://github.com/Tell52/SE_GPRJ3/actions/runs/44904066206) deployed revision `s9084416c-00010-vnk` with image tag `d73b3a42ac8d2c7965c9647f17734e286279a590`. The served login bundle omitted the Release B note. All four public smoke checks passed. | Participant One refreshed the original session and saw Test 2, registration 2, Active. [Rollback receipt](rollback-registration.jpg). |
| Roll-forward | Reverted code change `392d66e` locally on `lab5/roll-forward`. All 47 client tests and the production client build passed. Release via staging and main is pending. | Pending deployment. Verify the note on the public login page, refresh receipt 2 in the original session, run the smoke checks and record the serving revision and image tag. |

Keep the participant signed in throughout. At each checkpoint refresh My registrations in that same session, capture the same event and registration, and record the event URL, deployed revision and image tag. With merge commits, this workflow tags the image with the **main release merge SHA**. Record the code revert SHA and the main deployment SHA separately.

Keep the evidence files in a separate commit from the three reverted client files so roll-forward restores only the release change.
