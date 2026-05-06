# FR Acceptance Tests

Last updated: 2026-05-06  
References:
1. `docs/FR_EXECUTION_TRACKER.md`
2. `docs/API_EVENT_DICTIONARY.md`
3. Proposal v14 functional requirements (FR-01 to FR-23)

## 1. Execution Rules

1. Record execution per test using the template in Section 4.
2. Do not mark an FR as `Done` unless all its listed tests pass.
3. Capture evidence for each run:
- API response screenshot/export
- DB record proof where applicable
- UI screenshot/video for frontend cases

## 2. High-Priority Acceptance Suite (Core Demo Path)

### AT-01 (FR-01): Student Registration with Face Image

Preconditions:
1. Backend and frontend running.
2. Database reachable.

Steps:
1. Open register page.
2. Enter valid student data and capture face image.
3. Submit form.

Expected:
1. 201 success response.
2. User record created.
3. Face image path/storage record created.

### AT-02 (FR-02, FR-04): Role-based Login Access

Preconditions:
1. Student, lecturer, admin accounts exist.

Steps:
1. Login as student and access student routes.
2. Attempt lecturer/admin route with student token.
3. Repeat for lecturer and admin.

Expected:
1. Correct role can access authorized routes.
2. Unauthorized role gets 403.

### AT-03 (FR-05, FR-06, FR-07): Identity Verification Gate

Steps:
1. Start exam session.
2. Capture live frame on verify page.
3. Submit to identity pipeline.

Expected:
1. Match with score above threshold grants access.
2. Non-match or low score blocks exam access.

### AT-04 (FR-13, FR-14, FR-15, FR-17): Continuous AI Monitoring Logging

Steps:
1. Enter exam.
2. Emit webcam frames over socket.
3. Trigger gaze/head anomalies intentionally.

Expected:
1. AI returns anomaly list.
2. Backend persists canonical `event_type` with timestamp.

### AT-05 (FR-16): Tab Switch Detection

Steps:
1. During exam, switch tab/window.
2. Return to exam.

Expected:
1. `tab_switch` event logged in backend.
2. Warning count increments.

### AT-06 (FR-21, FR-22, FR-23): 3-Strike Escalation

Steps:
1. Trigger first anomaly.
2. Trigger second anomaly.
3. Trigger third anomaly.

Expected:
1. Warning 1 and 2 displayed in UI.
2. At warning 3: session locked, answers auto-submitted, alert triggered.

### AT-07 (FR-18): Report Generation Per Session

Steps:
1. Complete or lock a session with known anomaly counts.
2. Request report endpoint.

Expected:
1. Report exists for session.
2. Counts, warning_count, and risk level are correct.

### AT-08 (FR-19, FR-20): Admin Report Management

Steps:
1. Open admin reports page.
2. Filter reports and export CSV.
3. Flag a high-risk student session.

Expected:
1. Filter/export works.
2. Flag state persists and re-renders correctly.

## 3. Full FR-by-FR Acceptance Checklist

| FR | Test IDs | Pass Criteria Summary | Status |
|---|---|---|---|
| FR-01 | AT-01 | Student registration persists user + facial record | Pending |
| FR-02 | AT-02 | Role login works for lecturer/admin/student | Pending |
| FR-03 | AT-09 | Password reset works end-to-end | Pending |
| FR-04 | AT-02 | Unauthorized roles blocked | Pending |
| FR-05 | AT-03 | Live facial capture at verification | Pending |
| FR-06 | AT-03 | Face comparison with stored baseline | Pending |
| FR-07 | AT-03 | Threshold gate enforced | Pending |
| FR-08 | AT-10 | Failed verifies logged + admin visibility | Pending |
| FR-09 | AT-11 | Lecturer exam/question CRUD + publish | Pending |
| FR-10 | AT-12 | Admin schedule/assign exams to groups | Pending |
| FR-11 | AT-13 | Timeout auto-submit enforced | Pending |
| FR-12 | AT-14 | Exam navigation protections enforced | Pending |
| FR-13 | AT-04 | Continuous facial presence monitoring | Pending |
| FR-14 | AT-04 | Gaze-away detection + logging | Pending |
| FR-15 | AT-04 | Head-turn detection + logging | Pending |
| FR-16 | AT-05 | Tab-switch logging integrated | Pending |
| FR-17 | AT-04 | All anomalies timestamped in DB | Pending |
| FR-18 | AT-07 | Session-level behavioral report generated | Pending |
| FR-19 | AT-08 | Admin view/filter/export reports | Pending |
| FR-20 | AT-08 | High-risk sessions can be flagged | Pending |
| FR-21 | AT-06 | Real-time warning shown per confirmed event | Pending |
| FR-22 | AT-06 | warning_count persists and increments correctly | Pending |
| FR-23 | AT-06 | 3-strike lock + auto-submit + alert | Pending |

## 4. Test Execution Log Template

Use one block per test run:

```text
Test ID:
FR:
Date:
Tester:
Environment:
Preconditions met: Yes/No
Steps executed:
Expected result:
Actual result:
Pass/Fail:
Evidence link/path:
Defect ID (if fail):
Notes:
```

## 5. Additional Required Tests

### AT-09 (FR-03): Password Reset
Expected:
1. Valid user can initiate reset.
2. Reset credential/token can be used once.
3. Old password no longer works after reset.

### AT-10 (FR-08): Failed Verification Logging
Expected:
1. Failed attempt increments failed verify record.
2. Admin can inspect failed attempts for a session/student.

### AT-11 (FR-09): Lecturer Exam CRUD
Expected:
1. Lecturer can create, update, publish exams.
2. Non-owner lecturer cannot edit another lecturer's exam.

### AT-12 (FR-10): Admin Scheduling and Group Assignment
Expected:
1. Admin can schedule exam timing and assign target group.
2. Student outside group cannot start scheduled exam.

### AT-13 (FR-11): Timer Expiry Auto-submit
Expected:
1. When timer reaches zero, submission is triggered automatically.
2. Session state updates to completed/locked per rule.

### AT-14 (FR-12): Navigation Guard
Expected:
1. Browser-level navigation deviations are blocked or penalized per policy.
2. No silent bypass during active exam.

## 6. Exit Criteria for Milestone "Core System Ready"

1. AT-01 through AT-08 all pass.
2. AT-06 passes in three consecutive runs.
3. No `Blocked` item remains for FR-21/22/23.
4. Evidence artifacts are attached for each passed test.
