# System Architecture & API Contract
## Source of truth for all inter-service communication

---

## Service Ports

| Service | Port | Language | Owner |
|---------|------|----------|-------|
| Frontend (Next.js) | 3000 | TypeScript | Julius |
| Backend API (Flask) | 5000 | Python | Derick |
| AI Service (Flask) | 8000 | Python | Kweka |
| PostgreSQL | 5432 | — | Kweka (Docker) |
| WebSocket (Socket.io) | 8000 | Python | Kweka |

---

## Backend API Contract — All Endpoints

Base URL: `http://localhost:5000`

### Auth Endpoints

```
POST /api/auth/register
Body:  { full_name, reg_number, email, department, password, face_image_base64 }
Resp:  201 { user_id, message: "Registration successful" }
Err:   400 { error: "Validation error", fields: [...] }
       409 { error: "Registration number already exists" }

POST /api/auth/login
Body:  { reg_number, password, role }
Resp:  200 { token: "JWT...", user: { user_id, full_name, role } }
Err:   401 { error: "Invalid credentials" }    ← NEVER say which field is wrong

POST /api/auth/reset-password
Body:  { email }
Resp:  200 { message: "Reset link sent if email exists" }  ← same msg always (security)
```

### Exam Endpoints

```
GET  /api/exams
Headers: Authorization: Bearer <token>
Query:   ?status=active  (optional filter)
Resp:  200 { exams: [{ exam_id, title, course_code, duration_min, scheduled_at, status }] }

GET  /api/exams/:exam_id
Resp:  200 { exam: {...}, questions: [{ question_id, question_text, option_a/b/c/d, question_type }] }
       Note: correct_answer NOT included in student response (only for lecturer/admin)

POST /api/exams
Role: lecturer only
Body:  { title, course_code, duration_min, scheduled_at, questions: [...] }
Resp:  201 { exam_id }

PUT  /api/exams/:exam_id
Role: lecturer (own exams only)
Body:  any exam fields to update
Resp:  200 { message: "Updated" }

PATCH /api/exams/:exam_id/publish
Role: lecturer only
Resp:  200 { status: "active" }
```

### Session Endpoints

```
POST /api/sessions/start
Headers: Authorization: Bearer <token>
Body:  { exam_id }
Resp:  201 { session_id, exam: { title, duration_min, questions: [...] } }
Err:   409 { error: "Session already exists for this exam" }

POST /api/sessions/verify
Body:  { session_id, confidence_score }   ← called by AI Service after face match
Resp:  200 { identity_verified: true }
Err:   422 { identity_verified: false, message: "Score below threshold" }

POST /api/sessions/log
Headers: Authorization: Bearer <token>
Body:  { session_id, event_type, event_data: {} }
       event_type: "gaze_away" | "head_turned" | "face_absent" | "tab_switch" | "multiple_faces"
Resp:  200 { warning_count: 2 }    ← returns current warning_count after increment
       200 { warning_count: 3, auto_submitted: true }  ← triggers auto-submit

POST /api/sessions/:session_id/submit
Headers: Authorization: Bearer <token>
Body:  { answers: [{ question_id, selected_answer }] }
Resp:  200 { score, session_id }

GET  /api/sessions (admin/lecturer only)
Resp:  200 { sessions: [{ session_id, student_name, exam_title, warning_count, risk_level }] }
```

### Report Endpoints

```
GET  /api/reports/:session_id
Role: admin or lecturer (own exams only)
Resp:  200 { report: { session_id, student: {...}, exam: {...}, gaze_away_count,
             head_turned_count, tab_switch_count, face_absent_count,
             total_anomalies, risk_level, logs: [...] } }

GET  /api/reports/export/:exam_id
Role: admin or lecturer
Resp:  CSV file download (Content-Disposition: attachment; filename="exam_report.csv")

GET  /api/images/:user_id
Role: admin only
Resp:  Image file (Content-Type: image/jpeg)
Err:   403 { error: "Forbidden" }  for non-admin
```

---

## AI Service API Contract

Base URL: `http://localhost:8000`

```
GET  /health
Resp: 200 { status: "ok", models_loaded: { facenet: true, l2cs: true } }

POST /verify-identity
Body:  { user_id: int, image_base64: string }  ← image is 640x480 JPEG base64
Process: MTCNN align → resize 160x160 → FaceNet embed → cosine similarity vs stored embed
Resp:  200 { match: true, confidence: 0.87 }
       200 { match: false, confidence: 0.31 }
Err:   422 { error: "No face detected in image" }

POST /monitor-frame
Body:  { session_id: int, frame_base64: string }
Process: Run gaze + head pose CONCURRENTLY (threading), return combined result
Resp:  200 {
    gaze: { direction: "Screen"|"Left"|"Right"|"Up"|"Down", confidence: 0.91 },
    head_pose: { yaw: 15.2, pitch: -8.1, roll: 2.3, alert: false },
    anomalies: ["gaze_away"] | []    ← non-empty = warning should be logged
}
```

### WebSocket Events (Socket.io on port 8000)

```
Client → Server:
  Event: "webcam_frame"
  Data:  { session_id: int, frame_base64: string, timestamp: ISO string }

Server → Client:
  Event: "anomaly_result"
  Data:  { session_id: int, anomalies: [...], warning_count: int, gaze_direction: string }

  Event: "session_locked"
  Data:  { session_id: int, reason: "warning_count_exceeded" }
```

---

## Data Flow — Complete Exam Session

```
1. Student opens browser → GET /api/exams (see available exams)
2. Student clicks "Start Exam"
   → POST /api/sessions/start  → returns session_id
3. Frontend loads Identity Verification page
   → Camera captures frame → POST /verify-identity (AI Service)
   → AI returns {match, confidence}
   → If match: POST /api/sessions/verify {session_id, confidence_score}
   → Backend sets identity_verified=true
4. Exam begins — frontend connects WebSocket (socket.io to port 8000)
5. Every 3 seconds:
   → Canvas captures webcam frame → emit "webcam_frame" on WebSocket
   → AI Service receives frame → runs /monitor-frame
   → Returns anomaly_result to client
   → If anomaly: client POSTs /api/sessions/log {event_type}
   → Backend increments warning_count, returns new count
   → If warning_count = 1 or 2: frontend shows warning toast
   → If warning_count = 3: backend auto-submits, sets status=locked, sends email
                            client receives session_locked event → shows lock screen
6. Tab switch detected:
   → document.visibilitychange fires → client POSTs /api/sessions/log {event_type: "tab_switch"}
7. Timer reaches zero OR student submits:
   → POST /api/sessions/:id/submit {answers: [...]}
   → Backend saves answers, calculates score, triggers generateReport()
8. Report generated:
   → Aggregates all behavioral_logs for session
   → Calculates risk_level
   → Inserts into reports table
```

---

## Frontend Environment Variables

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:8000
```

## Backend Environment Variables

Create `backend/.env` (copy from `backend/.env.example`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/proctoring_db
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRY_HOURS=8
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ADMIN_EMAIL=admin@udom.ac.tz
AI_SERVICE_URL=http://localhost:8000
FLASK_ENV=development
```

## AI Service Environment Variables

Create `ai-service/.env`:
```
BACKEND_URL=http://localhost:5000
MODELS_DIR=./models
FACE_SIMILARITY_THRESHOLD=0.6
GAZE_AWAY_SECONDS=5
HEAD_TURNED_SECONDS=3
HEAD_YAW_THRESHOLD=30
HEAD_PITCH_THRESHOLD=20
FLASK_ENV=development
```
