# Exam Lab — Local Exam Module Testing Guide

Exam Lab is a **local-only** development shortcut for iterating on the exam module
(`/exam`, session lifecycle, autosave, monitoring, lecturer intervention) without
repeating login, exam creation, and facial identity verification on every run.

It does **not** weaken production auth, session, or identity checks. It works by
seeding real rows through the same tables the normal flow uses — including a
genuinely `identity_verified=True` `ExamSession` — so the exam page's real,
unmodified server-side checks (`GET /sessions/:id/status`, JWT auth, etc.) pass
honestly instead of being bypassed. See `backend/app/devtools/routes.py` for
the implementation and gating.

**Gating:** the bootstrap endpoints only exist when the backend has both
`ENABLE_DEV_TOOLS=true` **and** `FLASK_ENV=development` (`backend/app/config.py`).
`docker-compose.yml` sets both by default for local dev. `docker-compose.api-prod.yml`
sets neither — Exam Lab cannot be enabled in production through that compose file.

---

## 1. Docker startup

```bash
docker-compose up --build
```

Services: `postgres` (15432), `backend` (5000), `ai-service` (8000), `frontend` (3000).

## 2. Health checks

```bash
curl http://localhost:5000/health
curl http://localhost:8000/health
curl http://localhost:5000/api/devtools/exam-lab/status
```

The last call should return `{"enabled": true}` when running via `docker-compose up`.
If it 404s, `ENABLE_DEV_TOOLS`/`FLASK_ENV` aren't both set to enable it — check the
`backend` service environment.

## 3. Normal (production-shaped) flow — sanity check, not Exam Lab

1. Open `http://localhost:3000`, log in as a real/admin-provisioned student.
2. Dashboard → start an assigned exam → redirected to `/verify`.
3. Complete facial verification (needs a webcam and the AI service's face models).
4. Redirected to `/exam`; answer questions, submit.

Use this path to confirm the real flow still works end-to-end after any exam-module change.

## 4. Exam Lab flow (fast iteration)

1. Open `http://localhost:3000/exam-lab`.
2. It calls `GET /api/devtools/exam-lab/status`; if disabled you'll see a message
   telling you which env vars to set — it does not silently no-op.
3. Click **Launch with Real Monitoring** or **Launch with Mock Monitoring**.
   - This calls `POST /api/devtools/exam-lab/bootstrap`, which upserts a
     deterministic dev lecturer (`DEV-LEC-0001`), dev student (`DEV-STU-0001`),
     a "Exam Lab Sandbox Program" degree program, a "Exam Lab Sandbox Exam"
     (5 MCQ questions), an assignment, and an `ExamSession` that's already
     `active` + `identity_verified=True`.
   - The response's real JWT + `session_id`/`exam_id` are stored in
     `localStorage`/cookies exactly like the normal login/dashboard flow, then
     the browser is routed straight to the real `/exam` page.
4. Re-launching at any point **resets** the dev session: clears answers,
   warnings, and any terminated/completed state back to a clean `active`
   session — this is your reset/cleanup path, see §11.

**Real Monitoring** behaves exactly like the normal flow's camera/AI-socket
pipeline (needs a webcam and the `ai-service` container with `.onnx` models
present). **Mock Monitoring** sets a `exam_lab_mock_monitoring` localStorage
flag that the exam page checks (only ever honored when the frontend was built
with `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true`, which the Vercel production build
never sets) — it skips requesting the camera and connecting to the AI socket
entirely and marks monitoring "calibrated" immediately so the exam timer isn't
stuck waiting on a camera. It does not touch auth/session/identity checks.

## 5. Manual submission

From `/exam`, answer a few questions, click **Submit** → confirm. Verify:
- `POST /sessions/:id/submit` returns a score.
- The "Congratulations" modal shows the score.
- `GET /api/sessions` (as the dev lecturer or an admin) shows the session as `completed`.

## 6. Timeout (auto-submit at 0)

The dev exam's duration is 30 minutes. To test the timeout path quickly, either:
- Temporarily lower `duration_min` for the "Exam Lab Sandbox Exam" via the
  lecturer UI (log in as `DEV-LEC-0001` / the password Exam Lab prints), or
- Patch `timeLeft` briefly in devtools for a manual check (not a substitute
  for a real timed run before release).

Confirm the "Time's Up" modal appears and `submit` fires automatically exactly once.

## 7. Autosave

Answer a question, then hit `GET /api/sessions/:id/answers` (with the dev
student's token) directly — the answer should already be persisted via
`POST /sessions/:id/answer`, before you ever click Submit. Refresh `/exam` and
confirm previously-selected answers are restored.

## 8. Tab switch detection

While in `/exam` (fullscreen), switch tabs or minimize the window. A
`tab_switch` `BehavioralLog` row should be created (`POST /sessions/log`) and
`warning_count` incremented — check via `GET /api/sessions`. This never
interrupts the exam; it's logged for lecturer/admin review only.

## 9. Camera permission failure

Launch with **Real Monitoring**, then deny the camera permission prompt.
The "Camera permission denied" message shows in the monitor panel; the exam
itself remains fully usable — answering, autosave, and manual submit never
depended on camera state. The exam clock now starts within a bounded ~20s
wait regardless of camera outcome (a calibration failsafe that used to
incorrectly require `examCameraReady`, leaving the timer frozen forever for
a denied/missing camera — fixed 2026-08-03). No AI proctoring analysis runs
for that session, since the AI socket never connects without a camera.

## 10. AI events (real monitoring only)

With the `ai-service` container running and `.onnx` models present under
`ai-service/models/`, confirm in the browser devtools Network/WS tab that
`webcam_frame` events are sent every ~2s and `anomaly_result` events come
back. Trigger an anomaly (look away, cover the camera, hold up a second face)
and confirm a `BehavioralLog` row appears and `warning_count` increments.

## 11. Lecturer warn / terminate

1. Log in as the dev lecturer (`DEV-LEC-0001`, password from the Exam Lab
   launch response) in a second browser/incognito window, or as any admin.
2. Go to Lecturer → Sessions & Reports, find the dev student's session.
3. **Warn**: sends a real-time `manual_warning` socket event — the student's
   `/exam` tab should show the "Message from Invigilator" modal without
   interrupting the exam.
4. **Terminate**: sends `session_terminated` — the student's tab should show
   the "Session Terminated" modal with the score computed from whatever was
   autosaved so far, and further `/submit` calls should be rejected (409).

## 12. Cleanup / reset

Re-visit `/exam-lab` and launch again — this resets the dev session back to a
clean `active`, verified state (see §4). To remove the dev fixtures entirely,
delete the `DEV-LEC-0001` / `DEV-STU-0001` users and the "Exam Lab Sandbox
Exam" via the admin UI, or drop and re-`flask db upgrade` your local database.
