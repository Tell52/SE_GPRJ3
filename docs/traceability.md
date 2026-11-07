# Requirements Traceability

Sprint 2 and 3 requirements are allocated to a feature and sprint now; their AC and tests are written in that sprint's contract ("S2 contract", "S3 contract").

## Requirements to features, sprints and verification

| Requirement | Feature / responsibility | Sprint | AC | Tests |
|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-04, AC-18 | T-01, T-04, T-18 |
| FR-02 | F-02 | 1 | AC-05, AC-08, AC-18 | T-05, T-08, T-18 |
| FR-03 | F-02 | 1 | AC-07 | T-07 |
| FR-04 | F-03 | 1 | AC-10, AC-18 | T-10, T-18 |
| FR-05 | F-03 | 1 | AC-15, AC-18 | T-15, T-18 |
| FR-06 | F-04 | 1 | AC-16, AC-18 | T-16, T-18 |
| FR-07 | F-05 | 2 | S2 contract | S2 contract |
| FR-08 | F-06 | 2 | S2 contract | S2 contract |
| FR-09 | F-07 | 2 | S2 contract | S2 contract |
| FR-10 | F-08 | 2 | S2 contract | S2 contract |
| FR-11 | F-09 | 3 | S3 contract | S3 contract |
| FR-12 | F-10 | 3 | S3 contract | S3 contract |
| BR-01 | F-02 | 1 | AC-06 | T-06 |
| BR-02 | F-03 | 1 | AC-14 | T-14 |
| BR-03 | F-03 | 1 | AC-11 | T-11 |
| BR-04 | F-03 | 1 | AC-12, AC-13 | T-12, T-13 |
| BR-05 | F-02, F-03, F-04 | 1 | AC-09, AC-14, AC-15, AC-17 | T-09, T-14, T-15, T-17 |
| BR-06 | F-02 | 1 | AC-08 | T-08 |
| BR-07 | F-05 | 2 | S2 contract | S2 contract |
| BR-08 | F-06 | 2 | S2 contract | S2 contract |
| BR-09 | F-07 | 2 | S2 contract | S2 contract |
| BR-10 | F-08 | 2 | S2 contract | S2 contract |
| BR-11 | F-09 | 3 | S3 contract | S3 contract |
| BR-12 | F-10 | 3 | S3 contract | S3 contract |
| NFR-01 | F-01 to F-04, SYS-UI | 1 | AC-03, AC-07, AC-09, AC-14, AC-15, AC-17 | T-03, T-07, T-09, T-14, T-15, T-17 |
| NFR-02 | F-01 | 1 | AC-02, AC-03, AC-04 | T-02, T-03, T-04 |
| NFR-03 | F-03, SYS-FOUND, SYS-UI | 1 | AC-10, AC-15, AC-18, AC-19 | T-10, T-15, T-18, T-19 |
| NFR-04 | F-03, SYS-UI | 1 | AC-11, AC-13 | T-11, T-13 |
| NFR-05 | SYS-UI | 1 | AC-18 | T-18, M-02 |
| NFR-06 | SYS-FOUND, SYS-UI | 1 (deploy: Lab 5) | AC-19 | T-19, M-01 |
| NFR-07 | SYS-PERF | 3 | S3 contract | S3 contract |

## Sprint 1 AC to tests

| AC | Feature | Test | Level |
|---|---|---|---|
| AC-01 | F-01 | T-01 | API |
| AC-02 | F-01 | T-02 | Unit + API |
| AC-03 | F-01 | T-03 | API |
| AC-04 | F-01 | T-04 | API + UI |
| AC-05 | F-02 | T-05 | API + UI |
| AC-06 | F-02 | T-06 | Unit + API |
| AC-07 | F-02 | T-07 | API |
| AC-08 | F-02 | T-08 | API |
| AC-09 | F-02 | T-09 | API |
| AC-10 | F-03 | T-10 | API |
| AC-11 | F-03 | T-11 | API (concurrent) |
| AC-12 | F-03 | T-12 | Unit + API (TDD) |
| AC-13 | F-03 | T-13 | API (concurrent) |
| AC-14 | F-03 | T-14 | API |
| AC-15 | F-03 | T-15 | API |
| AC-16 | F-04 | T-16 | API + UI |
| AC-17 | F-04 | T-17 | API |
| AC-18 | SYS-UI | T-18, M-02 | E2E + manual |
| AC-19 | SYS-FOUND | T-19, M-01 | Integration + manual |

Execution results (test file and name, result, tested commit) are recorded in the Execution Results section of [tests.md](sprints/sprint-1/tests.md).

## Coverage gaps

None for the baseline. Every FR, BR and NFR is allocated to a feature or responsibility and a sprint. Sprint 2 and 3 items are allocated but not yet elaborated.

## Approved changes

| Date | Change | Reason | Approved by |
|---|---|---|---|
| 2026-11-06 | AC-07/T-07 permit only caller-owned myRegistration summary in participant detail; field limits remain as documented. | Resolve wording conflict with API contract for F-02. | Tell52 during #4 (DEC-13); JeenoXD review pending |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-03 | Initial traceability aligned with Issues #1 to #8 |
| 1.1 | 2026-11-06 | Record approved F-02 clarification; AC-05 to AC-09 execution links are in tests.md and issue4-events.md. |
