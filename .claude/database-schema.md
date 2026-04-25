# Database Schema — All 7 Tables
## PostgreSQL | Managed by Derick via SQLAlchemy + Alembic

---

## Table 1: users

```sql
CREATE TABLE users (
    user_id      SERIAL PRIMARY KEY,
    full_name    VARCHAR(100) NOT NULL,
    reg_number   VARCHAR(20) UNIQUE NOT NULL,  -- e.g. T22-03-11759
    email        VARCHAR(150) UNIQUE NOT NULL,
    department   VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,        -- bcrypt, never store plaintext
    role         VARCHAR(20) NOT NULL DEFAULT 'student', -- 'student','lecturer','admin'
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
```

---

## Table 2: facial_images

```sql
CREATE TABLE facial_images (
    image_id     SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_path    VARCHAR(300) NOT NULL,          -- server path only, never expose to students
    embedding    BYTEA,                          -- serialized FaceNet 512-D vector (numpy bytes)
    captured_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Table 3: exams

```sql
CREATE TABLE exams (
    exam_id      SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    course_code  VARCHAR(30) NOT NULL,
    lecturer_id  INTEGER NOT NULL REFERENCES users(user_id),
    duration_min INTEGER NOT NULL,               -- exam duration in minutes
    scheduled_at TIMESTAMP,
    status       VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft','active','completed'
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Table 4: questions

```sql
CREATE TABLE questions (
    question_id  SERIAL PRIMARY KEY,
    exam_id      INTEGER NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,          -- 'mcq','true_false','short_answer'
    option_a     TEXT,
    option_b     TEXT,
    option_c     TEXT,
    option_d     TEXT,
    correct_answer VARCHAR(5) NOT NULL,          -- 'A','B','C','D','True','False'
    marks        INTEGER NOT NULL DEFAULT 1,
    order_num    INTEGER NOT NULL DEFAULT 0
);
```

---

## Table 5: exam_sessions

```sql
CREATE TABLE exam_sessions (
    session_id       SERIAL PRIMARY KEY,
    student_id       INTEGER NOT NULL REFERENCES users(user_id),
    exam_id          INTEGER NOT NULL REFERENCES exams(exam_id),
    started_at       TIMESTAMP,
    submitted_at     TIMESTAMP,
    session_status   VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending','active','completed','locked'
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    warning_count    INTEGER NOT NULL DEFAULT 0,  -- CRITICAL: must be NOT NULL DEFAULT 0
    -- Business Rule: when warning_count reaches 3 →
    --   auto-submit all answers, set status='locked', send email to lecturer+admin
    score            DECIMAL(5,2),
    UNIQUE(student_id, exam_id)
);
```

---

## Table 6: behavioral_logs

```sql
CREATE TABLE behavioral_logs (
    log_id       SERIAL PRIMARY KEY,
    session_id   INTEGER NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    event_type   VARCHAR(50) NOT NULL,  -- 'gaze_away','head_turned','face_absent','tab_switch','multiple_faces'
    event_data   JSONB,                 -- extra metadata: {gaze_direction, yaw, pitch, roll}
    logged_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast querying per session
CREATE INDEX idx_behavioral_logs_session ON behavioral_logs(session_id);
CREATE INDEX idx_behavioral_logs_type ON behavioral_logs(event_type);
```

---

## Table 7: reports

```sql
CREATE TABLE reports (
    report_id        SERIAL PRIMARY KEY,
    session_id       INTEGER NOT NULL UNIQUE REFERENCES exam_sessions(session_id),
    gaze_away_count  INTEGER NOT NULL DEFAULT 0,
    head_turned_count INTEGER NOT NULL DEFAULT 0,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    face_absent_count INTEGER NOT NULL DEFAULT 0,
    multiple_faces_count INTEGER NOT NULL DEFAULT 0,
    total_anomalies  INTEGER NOT NULL DEFAULT 0,
    risk_level       VARCHAR(10) NOT NULL,  -- 'low','medium','high'
    -- Risk rule: high if total_anomalies > 10 OR warning_count >= 3
    --            medium if total_anomalies > 5
    --            low otherwise
    generated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Entity Relationships

```
users ──< facial_images  (1 user → 1 face image)
users ──< exams          (1 lecturer → many exams)
exams ──< questions      (1 exam → many questions)
users ──< exam_sessions  (1 student → many sessions)
exams ──< exam_sessions  (1 exam → many sessions)
exam_sessions ──< behavioral_logs  (1 session → many logs)
exam_sessions ──1 reports          (1 session → 1 report)
```

---

## Alembic Migration Commands (Derick)

```bash
cd backend
flask db init        # only once — creates migrations/ folder
flask db migrate -m "initial schema"   # generates migration file
flask db upgrade     # applies to database
flask db downgrade   # rolls back one version
```

---

## Key Business Rules

| Rule | Location | Enforcement |
|------|----------|-------------|
| warning_count NOT NULL DEFAULT 0 | exam_sessions | DB constraint |
| warning_count increment MUST be atomic | POST /sessions/log | DB transaction |
| At warning_count = 3: auto-submit + lock | POST /sessions/log | Backend logic |
| facial images admin-only | GET /api/images/:user_id | Role middleware |
| Passwords never in API response | POST /auth/login | Code review |
| students cannot see other students' data | All GET endpoints | role check + WHERE student_id = req.user.id |
