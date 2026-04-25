# Project State — AI Exam Proctoring System
## Last Updated: April 25, 2026

This file is the source of truth for current build progress. Update it when you complete a feature.

---

## Frontend — Julius P. Ntale (Next.js 15 + React 19 + TypeScript)

### Pages Built (in `frontend/app/`)

| Page | File | Status | Notes |
|------|------|--------|-------|
| Login | `page.tsx` | UI complete, no real auth | Needs POST /api/auth/login |
| Register | `register/page.tsx` | UI + camera capture complete | Needs POST /api/auth/register |
| Face Verify | `verify/page.tsx` | UI flow complete | Needs POST /api/sessions/verify (real AI) |
| Student Dashboard | `dashboard/page.tsx` | UI complete with mock data | Needs all GET endpoints wired |
| Exam | `exam/page.tsx` | UI complete with mock questions | Needs real questions, Socket.io frame loop |
| Orientation | `orient/page.tsx` | UI complete | Minor — connect to exam start flow |
| Lecturer | `lecturer/page.tsx` | UI complete with mock data | Needs exam CRUD API |
| Admin | `admin/page.tsx` | UI complete with mock data | Needs real session data, WebSocket events |

### What Julius Still Needs to Build

- [ ] API client setup (`frontend/lib/api.ts`) — axios instance with JWT interceptor
- [ ] Replace all mock data with real API calls (every page)
- [ ] Socket.io client integration in Exam page — send frame every 3s
- [ ] Warning overlay component — animated toast (1/3, 2/3) + full-screen lock (3/3)
- [ ] Tab-switch detection — `visibilitychange` event → POST to `/api/sessions/log`
- [ ] Auto-submit on timer reaching zero
- [ ] Protected route wrapper — check JWT in localStorage before rendering
- [ ] Environment variable — `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`

---

## Backend API — Derick G. Mhidze (Python Flask + PostgreSQL)

### Location: `backend/`

**Note:** Derick built Flask (Python) instead of Node.js/Express. This is the accepted approach. The backend IS Flask.

### What Exists (from git history)
- Flask app scaffold with some routes
- Auth stub (register/login outlines)
- Exam endpoint stubs
- Session logging stub
- Email alert scaffold

### What Derick Needs to Complete

**Database (Week 1 priority):**
- [ ] PostgreSQL connection via SQLAlchemy (`backend/config/database.py`)
- [ ] Alembic migrations for all 7 tables (see `.claude/database-schema.md`)
- [ ] Run migrations: `flask db upgrade`

**Authentication (Week 1-2 priority):**
- [ ] `POST /api/auth/register` — validate, bcrypt hash, save user + face image path
- [ ] `POST /api/auth/login` — validate, bcrypt compare, return JWT (8h expiry)
- [ ] `POST /api/auth/reset-password` — token + email
- [ ] JWT middleware decorator (`@require_auth`, `@require_role`)

**Exam Management (Week 2-3):**
- [ ] `POST /api/exams` — create (lecturer only)
- [ ] `GET /api/exams` — list (role-filtered)
- [ ] `GET /api/exams/:id` — with questions
- [ ] `PUT /api/exams/:id` — update
- [ ] `PATCH /api/exams/:id/publish`
- [ ] Question CRUD endpoints

**Sessions (Week 3):**
- [ ] `POST /api/sessions/start` — create session, identity_verified=false
- [ ] `POST /api/sessions/verify` — receive confidence_score, update identity_verified
- [ ] `POST /api/sessions/:id/submit` — save answers, trigger report

**Warning Logic (Week 3-4 — CRITICAL):**
- [ ] `POST /api/sessions/log` — ingest behavioral event, increment warning_count atomically
- [ ] Auto-submit trigger at warning_count = 3
- [ ] Session lock at warning_count = 3
- [ ] `sendLecturerAlert()` — smtplib email to lecturer + admin

**Reports (Week 4-5):**
- [ ] `generateReport(session_id)` — aggregate logs, calculate risk_level
- [ ] `GET /api/reports/:session_id`
- [ ] `GET /api/reports/export/:exam_id` — CSV download

**Image Storage (Week 4):**
- [ ] Multer-equivalent in Flask (Werkzeug) for face image upload
- [ ] Serve images with admin-only role check

---

## AI Service — Victor J. Kweka (Python Flask + ONNX + MediaPipe)

### Location: `ai-service/` (DOES NOT EXIST YET — needs to be created)

### What Kweka Needs to Build

**Flask App Skeleton (Week 1):**
- [ ] `ai-service/app.py` — Flask app with CORS
- [ ] `GET /health` — returns service status
- [ ] `requirements.txt` — flask, opencv-python, mediapipe, onnxruntime, pillow, numpy

**Identity Verification (Week 2-3):**
- [ ] `POST /verify-identity` — accept base64 image, run MTCNN + FaceNet, return {match: bool, confidence: float}
- [ ] Face embedding storage per user (in DB or file)
- [ ] Cosine similarity computation, threshold = 0.6

**Real-time Monitoring (Week 3-4):**
- [ ] `POST /monitor-frame` — accept frame, run gaze + head pose concurrently, return anomaly flags JSON
- [ ] Gaze classifier using L2CS-Net ONNX model
- [ ] Head pose using MediaPipe Face Mesh + OpenCV solvePnP

**WebSocket Server (Week 4):**
- [ ] Socket.io server integration in Flask (flask-socketio)
- [ ] Accept `webcam_frame` events from exam sessions
- [ ] Forward to `/monitor-frame`, emit `anomaly_result` back
- [ ] Warning Controller: per-session `warning_count` dict, call backend at count=3

**Model Integration (Week 5 — after Beckham delivers):**
- [ ] Load `facenet_best.onnx` from `ai-service/models/`
- [ ] Load `l2cs_net.onnx` from `ai-service/models/`
- [ ] ONNX Runtime inference sessions

---

## ML Training — Beckham Y. Mwakanjuki (Google Colab + PyTorch)

### Location: `ml-training/` (DOES NOT EXIST YET — needs to be created)

### All training runs on Google Colab. Outputs go to Google Drive at `/MyDrive/fyp-ai/`

### What Beckham Needs to Build

**Environment (Week 1):**
- [ ] Colab notebook with GPU setup cell
- [ ] Google Drive mount + folder structure: `datasets/`, `checkpoints/`, `exports/`, `logs/`

**Datasets (Week 1-2):**
- [ ] Download LFW: http://vis-www.cs.umass.edu/lfw/
- [ ] Download CASIA-WebFace (via Kaggle or academic request)
- [ ] Download MPIIFaceGaze: https://www.mpi-inf.mpg.de/departments/computer-vision-and-machine-learning/research/gaze-based-human-computer-interaction/appearance-based-gaze-estimation-in-the-wild/
- [ ] Download BIWI Head Pose (ETH Zurich request)
- [ ] MTCNN preprocessing script: align, 160x160, normalize, augment, 70/15/15 split

**FaceNet Training (Week 2-3):**
- [ ] Fine-tuning script: InceptionResnetV1 (pretrained=vggface2), Triplet loss, Adam lr=1e-4, batch=32, 20 epochs
- [ ] Evaluation: accuracy, FAR, FRR on test set
- [ ] Target: accuracy ≥ 90%, FAR < 5%, FRR < 10%
- [ ] Export: `facenet_best.onnx`

**Gaze Model (Week 3-4):**
- [ ] L2CS-Net fine-tuning on GazeCapture + MPIIFaceGaze
- [ ] 5-class output head: Screen, Left, Right, Up, Down
- [ ] Target: MAE < 5 degrees
- [ ] Export: `l2cs_net.onnx`

**Head Pose (Week 4):**
- [ ] HeadPoseEstimator class (no training needed — MediaPipe + solvePnP)
- [ ] Validate on BIWI dataset: yaw/pitch/roll MAE < 5 degrees

**Model Handoff (End of Week 5 — HARD DEADLINE):**
- [ ] Share `facenet_best.onnx` and `l2cs_net.onnx` via Google Drive to Kweka
- [ ] Document input format: image size, normalization, output format

---

## Documentation — Abdul-Swamad J. Hassan

### Location: `docs/`

### What Abdul Needs to Produce

- [ ] `docs/srs.md` — System Requirements Specification (FR-01 to FR-23)
- [ ] `docs/api-contract.json` — All endpoints with request/response schemas
- [ ] `docs/swagger.yaml` — OpenAPI 3.0 spec (updated as Derick builds)
- [ ] `docs/data-dictionary.md` — Every column in every table with business rules
- [ ] `docs/test-cases-unit.md` — FR-01 to FR-08
- [ ] `docs/test-cases-integration.md` — FR-09 to FR-23
- [ ] `docs/test-results.xlsx` (Google Sheet) — execution results + defect register
- [ ] `docs/usability/sus-questionnaire.md` — SUS test script + 10 standard items
- [ ] `docs/final-report/` — Chapter drafts (4, 5, 6)
- [ ] `docs/user-manuals/student-manual.md`
- [ ] `docs/user-manuals/lecturer-manual.md`
- [ ] `docs/user-manuals/admin-manual.md`

---

## DevOps — Victor J. Kweka

### What Kweka Needs to Build

- [ ] `docker-compose.yml` at repo root — starts frontend(3000), backend(5000), ai-service(8000), postgres(5432)
- [ ] `frontend/Dockerfile`
- [ ] `backend/Dockerfile`
- [ ] `ai-service/Dockerfile`
- [ ] `.github/workflows/ci.yml` — runs lint + tests on push to main
- [ ] `.env.example` files for backend and ai-service
- [ ] `.gitignore` updates: block `*.pt`, `*.onnx`, `*.pkl`, `storage/faces/`, `venv/`, `.env`
