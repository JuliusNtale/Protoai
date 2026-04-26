# AI-Based Online Examination Proctoring System

> University of Dodoma · College of Informatics and Virtual Education
> Department of Computer Science and Engineering · Final Year Project 2026/26
> Supervisor: Dr. Mohamed Dewa
> Repository: https://github.com/victorjudysen/ai-exam-proctoring-system

## Project Overview

A web-based online examination proctoring system that verifies student identity
using facial recognition and monitors behavior in real time during online exams —
detecting suspicious eye gaze, head movements, and browser tab-switching. A
graduated warning-and-escalation mechanism issues on-screen warnings on
suspicious behavior and auto-submits the exam + alerts the lecturer after 3
cumulative warnings.

Reference documents:
- [`docs/PROPOSAL.pdf`](docs/PROPOSAL.pdf) — full project proposal (architecture, AI design, requirements, ERD)
- [`docs/TEAM_PLAN.pdf`](docs/TEAM_PLAN.pdf) — team roles, 12-week roadmap, Git workflow, branch ownership
- [`docs/api-contract.json`](docs/api-contract.json) — authoritative API contract (owned by Kweka)

## Team

| Member | Reg. Number | Role | Owns |
|---|---|---|---|
| Victor J. Kweka | T22-03-11759 | Project Lead + AI Service Engineer | Repo, Docker, Flask AI service, WebSocket, PR reviews |
| Julius P. Ntale | T22-03-05441 | Frontend Engineer | All React screens + Socket.io client |
| Derick G. Mhidze | T22-03-04321 | Backend Engineer | All Express API endpoints + MySQL database |
| Beckham Y. Mwakanjuki | T22-03-10715 | AI/ML Engineer | Dataset prep + model training (PyTorch/Colab) |
| Abdul-Swamad J. Hassan | T22-03-13834 | Documentation Engineer | SRS, API docs, test cases, final report |

## Tech Stack (locked)

- **Frontend:** React.js 18, Tailwind CSS 3, axios, socket.io-client 4, recharts
- **Backend (main API):** Node.js 20 LTS + Express 4, Sequelize ORM, JWT, bcrypt, Nodemailer, Multer
- **AI Service:** Python 3.10+ + Flask 3, OpenCV, MediaPipe, Socket.io server, ONNX Runtime
- **Database:** MySQL 8.x (primary) — PostgreSQL 15.x acceptable fallback
- **ML Training:** PyTorch 2.x, facenet-pytorch, MTCNN, Google Colab (T4 GPU)
- **DevOps:** Docker + Docker Compose 24, GitHub Actions
- **Ports (dev):** Frontend 3000 · Backend 5000 · AI Service 8000

## Repository Structure

```
ai-exam-proctoring-system/
├── frontend/          # React.js — Julius
├── backend/           # Node.js/Express — Derick
├── ai-service/        # Python/Flask — Kweka + Beckham
├── docs/              # Abdul — API contract, SRS, Swagger, data dictionary
├── docker-compose.yml # Kweka — starts all 3 services + MySQL
├── .github/workflows/ # Kweka — CI/CD
├── .gitignore         # Blocks .env, model weights, datasets, facial images
└── CLAUDE.md
```

## Architecture (3-tier + AI Service Layer)

1. **Presentation Layer** — React portals (student/lecturer/admin) + Browser APIs (Webcam, Visibility)
2. **Application Layer:**
   - Express backend (port 5000) — auth, sessions, business logic, warning escalation
   - Flask AI Service (port 8000) — facial recognition, gaze, head pose, Warning Controller
   - Socket.io server (in AI service) — real-time frame relay
3. **Data Layer** — MySQL + encrypted facial image store + JWT session tokens

**Communication:**
- Frontend ↔ Backend: REST/JSON
- Frontend ↔ AI Service: WebSocket (Socket.io) for webcam frame streaming
- Backend ↔ AI Service: Internal REST
- AI Service → Backend: internal call to trigger auto-submit on warning_count ≥ 3

## Database Schema (7 tables — authoritative)

**Do not rename columns or change types. Reference the proposal Section 4.9.2 and Derick's migrations.**

- `users` — role ENUM('student','lecturer','administrator'), bcrypt password_hash
- `examinations` — FK created_by → users, status ENUM('draft','scheduled','active','completed')
- `exam_sessions` — FK student_id, FK exam_id, **warning_count INT DEFAULT 0 NOT NULL**, session_status ENUM('active','completed','locked')
- `behavioral_logs` — FK session_id, event_type ENUM('gaze_away','head_movement','tab_switch','face_absent'), metadata JSON
- `facial_images` — FK student_id UNIQUE, image_path (encrypted store, admin-only access)
- `questions` — FK exam_id, question_type ENUM('mcq','true_false','short_answer')
- `reports` — FK session_id UNIQUE, risk_level ENUM('low','medium','high'), flagged BOOLEAN

## AI Subsystem

**Thresholds are literature-backed (proposal refs [9]–[15]). Do not change without citing evidence.**

| Module | Model / Tech | Dataset(s) | Threshold | Target Metric |
|---|---|---|---|---|
| Facial Recognition | FaceNet (InceptionResnetV1) + MTCNN | CASIA-WebFace, LFW | Cosine distance < 0.6 | Accuracy ≥ 90%, FAR < 5%, FRR < 10% |
| Eye Gaze | L2CS-Net | GazeCapture, MPIIFaceGaze | Not screen-focused > 5 sec | MAE < 5° |
| Head Pose | MediaPipe Face Mesh + OpenCV solvePnP | BIWI (calibration) | Yaw > 30° OR Pitch > 20° for > 3 sec | MAE < 5° |
| Face Absence | MTCNN | — | No face > 5 sec | — |
| Tab Switch | Browser visibilitychange API | — | Instant | — |

**Image pipeline:** resize 160×160 px → normalize [0,1] → MTCNN align → 128-D/512-D embedding.

## Warning & Escalation Logic (CORE INVARIANT)

This is the differentiating feature of the system. Implement exactly:

1. Any confirmed anomaly → display on-screen warning AND increment `exam_sessions.warning_count`.
2. Each warning logged as a row in `behavioral_logs` with timestamp + metadata.
3. User-facing progression:
   - `warning_count = 1` → banner: "1 of 3 warnings. Suspicious behaviour detected."
   - `warning_count = 2` → banner: "2 of 3 warnings. Next violation submits your exam."
   - `warning_count = 3` → **full-screen lock**, auto-submit, session status='locked', HIGH-PRIORITY email to lecturer + admin.
4. `multiple_persons` anomaly → flag session HIGH priority immediately.
5. **Use a DB transaction** when incrementing warning_count + writing log entry (prevents race conditions on simultaneous anomalies).

The Warning Controller lives in the Flask AI Service; triggers auto-submit via internal call to the Express backend.

## Non-Functional Targets

| Metric | Target | Owner |
|---|---|---|
| Facial recognition accuracy | ≥ 90% | Beckham + Kweka |
| False Acceptance Rate (FAR) | < 5% | Beckham + Kweka |
| False Rejection Rate (FRR) | < 10% | Beckham + Kweka |
| Identity verification latency | < 3 sec | Kweka + Derick |
| Per-frame analysis | < 1 sec | Kweka |
| System uptime | ≥ 95% | Kweka + Derick |
| SUS usability | ≥ 3.5/5.0 | Julius + Abdul |
| Concurrent sessions | ≥ 100 | Kweka + Derick |

Browsers: Chrome, Firefox, Edge. Min resolution: 1280×720.

## Conventions

- **API routes:** `/api/{resource}` (e.g., `/api/auth/login`, `/api/sessions/start`)
- **Auth:** JWT in `Authorization: Bearer <token>` header. Expiry 8 hours. `verifyToken` + `requireRole([...])` middleware on every protected route.
- **Passwords:** bcrypt cost 12. **Never log, never return in any response.**
- **Facial images:** encrypted at rest in `/storage/faces/`, admin-only access via role middleware. Never transmit over unencrypted channels. Student registration images are used ONLY for real-time verification — never for model training.
- **WebSocket frames:** base64 JPEG, 1 frame per 3 seconds. Never persisted raw — only anomaly events logged.
- **Timestamps:** UTC in DB.
- **Error responses:** `{ error: { code, message } }`. Never leak stack traces in production.
- **Migrations:** Sequelize, one per schema change, never edit after running. Fix via new migration.
- **Commit format:** `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`

## Git Workflow (SUMMARY — full rules in TEAM_PLAN Section 8)

- **`main` is protected.** No direct pushes. Branch protection requires PR + 1 approving review.
- **Branch naming:** `feat/<owner>-<feature>` (e.g., `feat/derick-auth-endpoints`) or `docs/abdul-<doc>`.
- **One feature per PR.** Clear description. Kweka reviews within 24h.
- **Before starting work:** `git pull origin feat/<branch>`. Always pull first.
- **After PR merged:** sync next branch with main (`git merge main`).
- **NEVER commit:** `.env` files, model weights (`.pt`/`.pth`/`.h5`/`.onnx`), datasets, facial images, secrets.

## Key Commands (per service)

```bash
# Frontend (Julius)
cd frontend && npm install && npm start          # runs on :3000

# Backend (Derick)
cd backend && npm install && node server.js      # runs on :5000
npx sequelize-cli db:migrate                      # run migrations

# AI Service (Kweka)
cd ai-service && pip install -r requirements.txt && python app.py  # runs on :8000

# All services (Kweka)
docker-compose up                                 # starts everything

# Tests
cd backend && npm test
cd ai-service && pytest
cd frontend && npm run lint
```

## Ethical & Privacy Rules (non-negotiable)

- Facial images: encrypted at rest, admin-only access, never used for model training.
- The system flags *suspicious behavior* — it does NOT determine cheating. Final decisions are made by humans (lecturers/admin).
- Consent captured at registration. Explicit checkbox: *"I consent to facial image capture for identity verification purposes only."*
- All AI thresholds must remain grounded in cited literature.

## Critical Milestones

| Deadline | Milestone | Owner |
|---|---|---|
| End of Week 1 | Monorepo + Docker + API contract | Kweka |
| End of Week 2 | Auth endpoints + Flask skeleton | Derick + Kweka |
| End of Week 3 | Identity verification end-to-end | Kweka + Julius + Derick |
| End of Week 4 | Exam session flow (start, answer, log, auto-submit) | All |
| **End of Week 5** | **All models exported to ONNX — handoff to Kweka** | **Beckham (HARD deadline)** |
| End of Week 6 | Full system integration (register → report) | All |
| End of Week 8 | System tests + defect register | Abdul |
| End of Week 9 | SUS test + AI metrics documented | Abdul + Beckham |
| End of Week 11 | System deployed + final report draft | All |
| End of Week 12 | UDOM submission | All |

## Claude Usage Rules

- **This is a Claude Project.** Full proposal and team plan are already uploaded — reference them by section name ("Table 3 from the proposal", "Section 8.3 from the team plan").
- **Paste context before requesting code.** Never ask for generic builds.
- **Break tasks into small requests.** One endpoint, one component, one function at a time.
- **Paste errors verbatim.** Full stack trace, not a paraphrase.
- **Kweka reviews all PRs before merge.** No exceptions. "Claude wrote it" is not a valid explanation.
- **Understand what you commit.** If Claude produces code you don't fully understand, ask it to explain line by line before committing.

## Current Focus (Week 1)

Phase 1 — Foundation. In progress:
- Kweka: monorepo scaffold, Docker Compose, API contract JSON
- Julius: React scaffold + Login screen (Figure 9)
- Derick: Express scaffold + 7 SQL migrations
- Beckham: Colab setup + LFW/CASIA-WebFace download
- Abdul: SRS template + Postman collection
