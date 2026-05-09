# Project Memory TODO

Last updated: 2026-05-09
Source: `docs/FR_EXECUTION_TRACKER.md`, `docs/TEAM_HANDOFF_BRIEF_2026-05-06.md`

## Immediate Open Items

- [x] Apply backend migration `20260506001-normalize-behavioral-log-event-types.js` in shared/staging DB. (2026-05-09: migrated successfully on server)
- [x] Verify no legacy anomaly values remain in `behavioral_logs.event_type` (`head_movement`, `multiple_persons`). (2026-05-09: `legacy_count = 0`)
- [ ] Complete frontend live socket anomaly handling validation for `anomaly_result` and `session_locked`.
- [ ] Run first full end-to-end dry run and attach evidence links in tracker docs.

## Pending FR Tasks

- [ ] FR-01: Align registration payload fields frontend/backend and verify duplicate handling end-to-end.
- [ ] FR-02: Verify admin/lecturer role-based login UX and mismatch handling.
- [ ] FR-03: Complete password reset end-to-end test script and verification.
- [ ] FR-04: Add role-based access control coverage tests.
- [ ] FR-05: Replace verify page simulation with real live facial capture + identity endpoint wiring.
- [ ] FR-06: Confirm real stored-embedding comparison contract and behavior.
- [ ] FR-07: Enforce single confidence-threshold source across AI/backend/frontend.
- [ ] FR-08: Build failed-verification logging + admin notification pipeline.
- [ ] FR-09: Remove remaining mock data from lecturer exam CRUD and validate ownership checks.
- [ ] FR-10: Implement admin exam scheduling + student group assignment flow (model/rules pending).
- [ ] FR-11: Complete real timer-expiry auto-submit integration with backend.
- [ ] FR-12: Finalize navigation-away prevention and enforcement policy behavior.
- [ ] FR-13: Fully wire continuous frame emitter and confirm `face_absent` logging path.
- [ ] FR-14: Finalize gaze-away detection with production `l2cs` model integration.
- [ ] FR-15: Finalize abnormal head-movement detection persistence with canonical events.
- [ ] FR-16: Ensure tab-switch detection logs canonical anomaly events via `POST /api/sessions/log`.
- [ ] FR-17: Verify behavioral anomaly timestamps/queryability against acceptance criteria.
- [ ] FR-18: Validate report fields and outputs against proposal requirements.
- [ ] FR-19: Complete admin report view/filter/export frontend integration.
- [ ] FR-20: Add UI action + tests for high-anomaly student flagging.
- [ ] FR-21: Verify real-time warning UI (warning 1/2) from live anomaly events.
- [ ] FR-22: Verify cumulative `warning_count` persistence/auditability in live flow.
- [ ] FR-23: Validate full 3-warning lock path: auto-submit, session lock, lecturer/admin alerts.

## Pending NFR Tasks

- [ ] Accuracy (>=90%): produce final facial verification evaluation report.
- [ ] FAR (<5%): produce evidence report.
- [ ] FRR (<10%): produce evidence report.
- [ ] Reliability (>=95% uptime): execute resilience/failure-mode tests and capture results.
- [ ] Usability (SUS >=3.5/5): run participant study and compile report.
- [ ] Scalability (>=100 concurrent sessions): prepare and run load tests (k6/artillery), document results.

## Integration and Coordination Gaps

- [ ] Keep canonical event enum usage consistent across proposal/docs/AI/backend/frontend/reports.
- [ ] Replace any remaining simulated verify/exam flows with live API + socket paths.
- [ ] Complete model handoff/load for `l2cs_net.onnx` and verify runtime loading.
- [ ] Resolve documentation drift by updating `.claude/project-state.md` and `NEXT_STEPS.md`.

## Execution Queue (Next Sequence)

- [x] Step 1: Run staging migration and data validation for canonical event names. (2026-05-09 complete)
- [ ] Step 2: Verify live anomaly -> backend log -> warning_count increment path.
- [ ] Step 3: Run FR-23 end-to-end scenario and capture evidence.
- [ ] Step 4: Remove remaining mock exam/session frontend data paths.
- [ ] Step 5: Add acceptance tests and evidence for FR-21/22/23.
