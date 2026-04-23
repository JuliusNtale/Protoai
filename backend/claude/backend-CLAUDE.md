# Backend Service — Derick's Scope

> This file scopes Claude Code to the backend work. The root `../CLAUDE.md`
> has the full system context. Read both.
>
> **Owner:** Derick G. Mhidze (T22-03-04321) — Backend Engineer
> **Reviewer:** Victor J. Kweka (Project Lead) — all PRs reviewed by him

## What I'm Building

The **main REST API** for the AI Proctoring System. Everything business-logic
and database-related lives here. AI inference does NOT live here — that's
Kweka's Flask service at `../ai-service/`.

**This service is responsible for:**
- User registration, login, password reset (students, lecturers, admins)
- JWT issuance + verification + role-based access control
- Exam CRUD (lecturers create; admins schedule; students attempt)
- Exam session lifecycle (start → verify identity → answer → submit → lock)
- Behavioral log ingestion from the AI Service
- **Warning escalation logic** (increment warning_count, auto-submit at 3, email lecturer)
- Report generation + CSV export
- Encrypted facial image storage (admin-only access)
- Email alerts via Nodemailer

**This service is NOT responsible for:**
- Running AI models (Kweka's Flask service)
- WebSocket frame streaming (Kweka's Socket.io server)
- Anomaly threshold evaluation (Kweka's Warning Controller in Flask)
- Any UI (Julius's React frontend)
- Model training (Beckham's Colab work)

## Tech Stack (locked)

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4.x
- **Database:** MySQL 8.x (PostgreSQL 15.x fallback if Kweka switches in Docker)
- **ORM:** Sequelize 6.x (migrations + models)
- **Auth:** jsonwebtoken 9.x (JWT), bcrypt 5.x (cost factor 12)
- **Email:** Nodemailer 6.x
- **File uploads:** Multer 1.x (for facial image base64 decode)
- **Validation:** express-validator
- **Security:** helmet, cors
- **Config:** dotenv
- **Port (dev):** 5000

## Folder Structure

```
backend/
├── routes/           # One file per resource
│   ├── auth.js       # /api/auth/*
│   ├── exams.js      # /api/exams/*
│   ├── sessions.js   # /api/sessions/*
│   ├── logs.js       # /api/sessions/log
│   ├── reports.js    # /api/reports/*
│   └── images.js     # /api/images/* (admin only)
├── controllers/      # Business logic — one file per resource
├── middleware/
│   ├── auth.js       # verifyToken (JWT check)
│   └── role.js       # requireRole(['admin', ...])
├── models/           # Sequelize models — one per table (7 total)
├── migrations/       # Sequelize migration files (never edit after running)
├── config/
│   ├── database.js   # Sequelize connection
│   └── mailer.js     # Nodemailer transport
├── storage/
│   └── faces/        # Encrypted facial images (gitignored)
├── tests/            # Jest unit + integration tests
├── .env              # Secrets (gitignored)
├── .env.example      # Shared template with placeholder values
├── server.js         # Express app entry point
└── package.json
```

## My Branches (from TEAM_PLAN Section 8.3)

Work on these in roughly this order. One branch per PR.

| # | Branch | Week | What it builds |
|---|---|---|---|
| 1 | `feat/derick-scaffold` | 1 | Express app skeleton with full folder structure |
| 2 | `feat/derick-db-migrations` | 1 | All 7 Sequelize migration files |
| 3 | `feat/derick-auth-endpoints` | 2 | POST /register, /login, /reset-password |
| 4 | `feat/derick-jwt-middleware` | 2 | verifyToken + requireRole middleware |
| 5 | `feat/derick-exam-endpoints` | 3 | CRUD /api/exams and /api/questions |
| 6 | `feat/derick-session-endpoints` | 3 | POST /sessions/start and /sessions/verify |
| 7 | `feat/derick-behavioral-log-endpoint` | 4 | POST /sessions/log (anomaly ingestion) |
| 8 | `feat/derick-warning-escalation-logic` | 4 | warning_count increment + auto-submit trigger |
| 9 | `feat/derick-report-generation` | 5 | Report aggregation + risk_level calculation |
| 10 | `feat/derick-image-storage` | 5 | Encrypted image storage + admin-only access |
| 11 | `feat/derick-email-alerts` | 5/6 | Nodemailer alerts on session lock |
| 12 | `feat/derick-report-export` | 6 | CSV export endpoint for reports |

## Database Tables I Own

All 7 tables. Full schema in proposal Section 4.9.2. Key things to remember:

- `users`: role ENUM('student','lecturer','administrator'), bcrypt password_hash
- `exam_sessions`: **warning_count INT DEFAULT 0 NOT NULL** (critical — this drives escalation)
- `behavioral_logs`: event_type ENUM('gaze_away','head_movement','tab_switch','face_absent'), metadata JSON
- `facial_images`: student_id UNIQUE (one image per student), image_path in encrypted store
- `reports`: session_id UNIQUE (one report per session), risk_level ENUM('low','medium','high')

**Migration rules (non-negotiable):**
- Never edit a migration after it has been run. Create a new one to fix errors.
- All migrations must be reversible (implement `down()` for every `up()`).
- Run in timestamped order.
- Verify with `npx sequelize-cli db:migrate:status` before starting work.

## API Endpoints I'm Responsible For

**Auth module:**
- `POST /api/auth/register` — creates user + saves facial image path
- `POST /api/auth/login` — returns JWT (8h expiry)
- `POST /api/auth/reset-password` — email token flow

**Exam module:**
- `POST /api/exams` (lecturer only) — create exam
- `GET /api/exams` — list (role-filtered)
- `GET /api/exams/:id` — get with questions
- `PUT /api/exams/:id` — update (lecturer only, own exams only)
- `PATCH /api/exams/:id/publish` — set status = 'active'

**Session module:**
- `POST /api/sessions/start` — create Exam_Session, identity_verified=false, warning_count=0
- `POST /api/sessions/verify` — called by AI Service after facial match; updates identity_verified + verification_score
- `POST /api/sessions/:id/submit` — save answers, set status='completed', trigger report generation
- `POST /api/sessions/log` — **receives anomaly events from AI Service; increments warning_count; triggers auto-submit at 3**

**Report module:**
- `GET /api/reports/:session_id` — full report (lecturer/admin only)
- `GET /api/reports/export/:exam_id` — CSV download (admin only)
- `PATCH /api/reports/:session_id/flag` — admin flags session for review

**Image module:**
- `GET /api/images/:user_id` — serve facial image (admin role only, enforced by middleware)

## CORE INVARIANT — Warning Escalation Logic

This is my most critical task. Implement it exactly:

```javascript
// POST /api/sessions/log pseudocode
async function logAnomaly(session_id, event_type, metadata) {
  return sequelize.transaction(async (t) => {
    // 1. Insert log entry
    await BehavioralLog.create({
      session_id, event_type, metadata,
      event_timestamp: new Date()
    }, { transaction: t });

    // 2. Atomically increment warning_count
    const session = await ExamSession.findByPk(session_id, { transaction: t });
    session.warning_count += 1;
    await session.save({ transaction: t });

    // 3. If threshold reached, escalate
    if (session.warning_count >= 3) {
      await autoSubmit(session_id, t);           // save answers
      session.session_status = 'locked';
      await session.save({ transaction: t });
      await sendLecturerAlert(session_id);        // Nodemailer
    }

    return { warning_count: session.warning_count };
  });
}
```

**Non-negotiable rules:**
- Always use a DB transaction for the log-insert + counter-increment. Two anomalies arriving simultaneously must NOT both see `warning_count = 2` and both increment to 3.
- Auto-submit must save whatever answers the student has entered so far — do not discard them.
- `session_status = 'locked'` is a terminal state. A locked session cannot be re-opened or modified.
- Email alert is HIGH-PRIORITY. Include: student name, exam title, violation sequence with timestamps, link to the report.

## Conventions I Follow

- **Route naming:** `/api/{resource}` (plural, kebab-case for multi-word)
- **HTTP status codes:** 200 success, 201 created, 400 validation error, 401 unauthorized (no/bad token), 403 forbidden (wrong role), 404 not found, 500 server error
- **Error response shape:** `{ error: { code: "INVALID_CREDENTIALS", message: "Email or password incorrect" } }` — never leak stack traces, never reveal which field was wrong on login
- **Validation:** every request body goes through express-validator before hitting the controller
- **Passwords:** NEVER logged, NEVER returned in any response (use Sequelize `defaultScope` to exclude `password_hash` on all queries)
- **Timestamps:** UTC in DB, ISO 8601 strings in API responses
- **Env vars:** all secrets in `.env`, shared template in `.env.example` with placeholder values
- **Logging:** use `winston` or similar — log requests + errors, NEVER log passwords or JWT tokens
- **CORS:** allow only `http://localhost:3000` (frontend) and `http://localhost:8000` (AI service) in dev

## Testing Requirements

- **Unit tests (Jest):** every controller function — mock the database
- **Integration tests (supertest):** every endpoint — hit a test database
- **Coverage target:** ≥ 70% for controllers and middleware
- **Abdul writes the test cases** (SRS-aligned, FR-01 through FR-23); I implement them
- Before opening a PR, run: `npm test` — all tests must pass

## Security Non-Negotiables

1. **Passwords:** bcrypt cost 12. Never in logs. Never in responses.
2. **JWT:** 8h expiry. Signed with strong secret in `.env`. Invalidation via token blacklist on logout (optional but preferred).
3. **Facial images:** stored in `/storage/faces/` (outside git). Served ONLY via `GET /api/images/:user_id` with `requireRole(['administrator'])` middleware. A student JWT hitting that endpoint must get 403.
4. **SQL injection:** always use Sequelize parameterized queries. Never string-concatenate SQL.
5. **Rate limiting:** add `express-rate-limit` on `/api/auth/login` (5 attempts per 15 min per IP) to prevent brute force.
6. **Helmet:** enable default security headers.
7. **No hardcoded secrets in git.** Ever. Check `git status` before every commit.

## Commands I Use Daily

```bash
# Start dev server (auto-reload)
npm run dev

# Run migrations
npx sequelize-cli db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Create a new migration
npx sequelize-cli migration:generate --name add-something-to-table

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## How I Work With Claude Code

When Claude Code starts in this folder, it should assume:

1. **I am Derick.** Assignments go to me unless the task crosses services (then ping Kweka).
2. **I'm writing Express, not Flask.** If a task requires Python, it belongs to Kweka's `../ai-service/` folder.
3. **I follow the API contract.** If Julius needs a new endpoint, I check the API contract first (`../docs/api-contract.json`) — if it's not there, Kweka must approve the addition.
4. **I don't invent schema changes.** The 7 tables are fixed by the proposal. Any change requires a new migration and team-wide notification.
5. **Kweka reviews every PR.** Claude should flag to me when generated code has security implications that need his sign-off (auth flow changes, image access changes, warning escalation changes).

## Interfaces With Other Services

**From Julius's frontend (React):**
- Standard REST calls with JWT in Authorization header
- Base64-encoded facial images in registration POST body

**From Kweka's AI Service (Flask):**
- `POST /api/sessions/verify` — after face match; body: `{ session_id, match: bool, confidence_score: float }`
- `POST /api/sessions/log` — per anomaly; body: `{ session_id, event_type, metadata }`
- These are internal calls — use a shared secret in `.env` (`AI_SERVICE_TOKEN`) for authentication between services

**To Kweka's AI Service:**
- I don't push to Kweka's service directly. The frontend streams frames to it via WebSocket. My only outbound call is triggering auto-submit confirmation back to the frontend.

## Current Week Focus

<!-- Update this as I move through branches -->

**Week 1:** Scaffold the Express app + all 7 Sequelize migrations.
- Branch: `feat/derick-scaffold` (then `feat/derick-db-migrations`)
- Deliverable: `node server.js` starts without error. `npx sequelize-cli db:migrate` creates all 7 tables.

## Quick Reference — My Dependencies on Others

- **Kweka's API contract (`../docs/api-contract.json`)** — must exist before I build endpoints. If missing, ping him.
- **Julius's frontend calls** — he follows my endpoint shapes. If he asks for a change, confirm with Kweka first.
- **Beckham's models** — no direct dependency. Kweka integrates them in Flask; I just receive verification results from Flask.
- **Abdul's test cases** — I implement the tests he writes. He documents every endpoint I build in Swagger.
