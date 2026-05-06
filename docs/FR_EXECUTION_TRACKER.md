# FR Execution Tracker

Last updated: 2026-05-05  
Scope source: `Proposal/FYP - Project Proposal (v14).docx`  
Codebase source: `Development/ai-exam-proctoring-system`

## 1. Baseline and Rules

1. This file is the daily source of truth for implementation status.
2. Status values:
- `Done`: Implemented and verified against acceptance criteria.
- `In Progress`: Work started but acceptance criteria not fully verified.
- `Blocked`: Cannot proceed due to dependency/risk.
- `Not Started`: No active implementation yet.
3. Every status change must include date and initials in the Notes column.
4. Backend stack is currently Node/Express; AI service stack is Flask. Keep this consistent in all docs.

## 2. Owner Map

1. `Victor`: AI service, architecture, integration, DevOps, review coordination.
2. `Derick`: Backend API, DB, warning escalation, reports.
3. `Julius`: Frontend integration and UX behavior during exam lifecycle.
4. `Beckham`: Model training/export/handoff (`facenet`, `l2cs`, head pose validation).
5. `Abdul`: SRS/API docs/test evidence/final report artifacts.

## 3. FR Matrix (Proposal v14)

| FR | Requirement Summary | Current Status (2026-05-05) | Owner | Primary Files / Endpoints | Acceptance Criteria | Target Date | Notes |
|---|---|---|---|---|---|---|---|
| FR-01 | Student registration with name, reg no, face image | In Progress | Derick + Julius | `backend/routes/auth.js`, `backend/controllers/authController.js`, `frontend/app/register/page.tsx` | Student can register from UI, face image persists, duplicate handling works | 2026-05-10 | Align payload fields frontend/backend |
| FR-02 | Admin/lecturer registration + login | In Progress | Derick + Julius | `backend/routes/auth.js`, `frontend/app/page.tsx` | Role-based login succeeds for each role | 2026-05-10 | Verify role mismatch handling UX |
| FR-03 | Password reset support | In Progress | Derick + Julius | `backend/controllers/authController.js`, `frontend/app/forgot-password/page.tsx` | End-to-end reset flow works with token/temporary credential path | 2026-05-12 | Need full test script |
| FR-04 | Role-based access control | In Progress | Derick | `backend/middleware/auth.js`, `backend/middleware/role.js` | Protected routes reject unauthorized roles with correct status codes | 2026-05-11 | Add coverage tests |
| FR-05 | Capture live facial image at exam login | In Progress | Julius | `frontend/app/verify/page.tsx` | Live webcam frame is captured and sent to identity endpoint | 2026-05-11 | Current page is mostly guided simulation |
| FR-06 | Compare live face to stored registration image | In Progress | Victor + Derick | `ai-service/routes/verify.py`, `ai-service/services/*`, backend verify endpoint | Real match/non-match behavior uses stored embeddings | 2026-05-16 | Confirm storage integration contract |
| FR-07 | Grant exam access only above threshold confidence | In Progress | Victor + Derick + Julius | `ai-service/routes/verify.py`, `backend/controllers/sessionController.js`, `frontend/app/verify/page.tsx` | Access denied below threshold, granted above threshold | 2026-05-16 | Ensure single threshold source |
| FR-08 | Log failed verification attempts + notify admin | Not Started | Derick + Victor | backend verify/log services, alert path | Failed attempts are persisted and visible to admin/reporting | 2026-05-18 | Missing explicit failed-attempt pipeline |
| FR-09 | Lecturer can create/edit/publish exam questions | In Progress | Derick + Julius | `backend/routes/exams.js`, `backend/controllers/examController.js`, `frontend/app/lecturer/page.tsx` | Lecturer CRUD works from UI with ownership checks | 2026-05-15 | Remove any remaining mock data |
| FR-10 | Admin schedules exams and assigns student groups | Not Started | Derick + Julius | backend exams/admin routes, admin UI | Admin can schedule and target groups | 2026-05-20 | Group model/rules not finalized |
| FR-11 | Enforce timer + auto-submit on timeout | In Progress | Julius + Derick | `frontend/app/exam/page.tsx`, session submit endpoint | Timer expiry triggers server-accepted submission | 2026-05-14 | Frontend timer exists; real submit integration pending |
| FR-12 | Prevent navigation away from exam page | In Progress | Julius | `frontend/hooks/use-browser-lockdown.ts`, exam page | Tab/window deviation captured and enforced per policy | 2026-05-13 | Tie to FR-16 logging path |
| FR-13 | Continuous facial presence monitoring | In Progress | Victor + Julius | `ai-service/routes/monitor.py`, `ai-service/sockets/frame_handler.py`, exam socket client | Continuous frame stream + `face_absent` anomalies recorded | 2026-05-16 | Frontend frame emitter not fully wired |
| FR-14 | Detect and record gaze-away events | In Progress | Victor + Derick | `ai-service/services/gaze_estimator.py`, log endpoint | Gaze anomalies persist in behavioral logs | 2026-05-17 | Needs l2cs model finalization |
| FR-15 | Detect and record abnormal head movement | In Progress | Victor + Derick | `ai-service/services/head_pose.py`, log endpoint | Head pose anomalies persist with timestamps | 2026-05-17 | Event naming consistency needed |
| FR-16 | Detect/flag browser tab switching | In Progress | Julius + Derick | exam page visibility handlers, `POST /api/sessions/log` | Tab switch events logged as anomalies | 2026-05-14 | Ensure event enum alignment |
| FR-17 | Record all behavioral anomalies with timestamps | In Progress | Derick | `backend/controllers/logController.js`, `BehavioralLog` model | Every anomaly type is timestamped and queryable | 2026-05-15 | 2026-05-06: canonical normalization logic added; DB migration added |
| FR-18 | Generate post-exam behavioral report per session | In Progress | Derick | `backend/services/reportService.js`, `backend/controllers/reportController.js` | Report generated with totals/risk/warnings per session | 2026-05-18 | Validate against proposal report fields |
| FR-19 | Admin view/filter/export reports | In Progress | Derick + Julius | `backend/routes/reports.js`, admin UI page | Admin can view list, filter, export CSV | 2026-05-20 | Frontend admin integration incomplete |
| FR-20 | Flag high-anomaly students for review | In Progress | Derick + Julius | `PATCH /api/reports/:session_id/flag`, admin UI | Flag action persists and is visible in dashboard | 2026-05-20 | Add UI action + tests |
| FR-21 | Real-time on-screen warning on confirmed suspicious event | In Progress | Julius + Victor | socket event handling in exam page + AI emit | Warning 1/2 appears instantly on anomaly events | 2026-05-14 | Backend/API canonical event contracts finalized 2026-05-06; frontend still to fully consume |
| FR-22 | Cumulative `warning_count` per session in DB with timestamps | In Progress | Derick | `logController`, `ExamSession`, `BehavioralLog` | Count increments atomically and is auditable | 2026-05-15 | 2026-05-06: canonical event migration + unit coverage added |
| FR-23 | On 3+ warnings: auto-submit, lock session, notify lecturer/admin | In Progress | Derick + Victor + Julius | `backend/controllers/logController.js`, `backend/services/emailService.js`, AI socket handler, exam UI | Third warning deterministically locks session, submits answers, emits lock event, sends alerts | 2026-05-18 | 2026-05-06: backend canonicalization done; end-to-end UI lock validation pending |

## 4. NFR Tracker

| NFR | Target | Current Status | Owner | Verification Method | Target Date | Notes |
|---|---|---|---|---|---|---|
| Accuracy | >=90% facial verification | Blocked | Beckham + Victor | Offline evaluation report | 2026-05-29 | Needs final trained model + metrics |
| FAR | <5% | Blocked | Beckham | Evaluation notebook/report | 2026-05-29 | Not yet evidenced |
| FRR | <10% | Blocked | Beckham | Evaluation notebook/report | 2026-05-29 | Not yet evidenced |
| Reliability | >=95% exam uptime | In Progress | Victor + Derick | uptime + resilience test run | 2026-06-05 | Need failure-mode tests |
| Usability | SUS >=3.5/5 (>=70/100) | Not Started | Abdul | SUS study report | 2026-06-20 | Plan participants now |
| Scalability | >=100 concurrent sessions | Not Started | Victor + Derick | load test report | 2026-06-05 | Prepare k6/artillery scenario |

## 5. Integration Gaps (Must close first)

1. Event name consistency:
- Proposal wording, AI anomalies, backend validators, and reports must use one canonical enum set.
2. Frontend exam and verify real wiring:
- Replace simulated warning and verification flows with live API + socket flows.
3. Model completeness:
- `facenet_best.onnx` exists; `l2cs_net.onnx` handoff/load pending.
4. Documentation drift:
- Update `.claude/project-state.md` and `NEXT_STEPS.md` to avoid miscoordination.

## 6. 7-Day Sprint Board (Execution Order)

| Day | Date | Priority Deliverable | Owner(s) | Exit Check |
|---|---|---|---|---|
| D1 | 2026-05-06 | Freeze event enums + payload schemas | Victor, Derick, Julius, Abdul | Shared API/event contract committed |
| D2 | 2026-05-07 | Wire verify page to live identity path | Julius, Victor, Derick | Verify page makes real identity decision |
| D3 | 2026-05-08 | Wire exam socket frame loop to AI service | Julius, Victor | Frames emitted every interval, anomalies returned |
| D4 | 2026-05-09 | Connect anomalies -> backend log -> warning count | Victor, Derick | DB warning count increments on live anomalies |
| D5 | 2026-05-10 | Complete FR-23 scenario end-to-end | Julius, Victor, Derick | 3rd warning causes lock + auto-submit + alert |
| D6 | 2026-05-11 | Remove remaining mock exam/session data | Julius, Derick | UI uses backend data only |
| D7 | 2026-05-12 | Add acceptance tests for FR-21/22/23 | Derick, Victor, Abdul | Test cases executed and recorded |

## 7. Daily Update Template

Use this format to update each day:

```text
Date:
Owner:
FRs touched:
Changes made:
Evidence (PR/commit/test):
New blockers:
Next action:
```

## 8. Immediate Action Items (Open)

1. Apply backend migration `20260506001-normalize-behavioral-log-event-types.js` in shared/staging DB.
2. Wire frontend exam page to real socket anomaly events (`anomaly_result`, `session_locked`).
3. Run first end-to-end dry run and attach evidence links in this tracker.
