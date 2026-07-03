# AI-Based Online Examination Proctoring System
## Claude Code Context — Read This First

**University of Dodoma | FYP 2026/26 | Supervisor: Dr. Mohamed Dewa**
**Repository:** https://github.com/victorjudysen/ai-exam-proctoring-system

---

## What This System Does

An AI-powered online exam proctoring platform that:
1. Verifies student identity via facial recognition before each exam
2. Monitors behaviour in real-time during exams (gaze, head pose, tab switching, multiple faces)
3. Issues graduated warnings (1→2→3) — at warning 3, auto-submits the exam and emails the lecturer
4. Provides lecturers and admins with live dashboards and post-exam behavioural reports

---

## Team

| Name | Reg. No | Role | AI Tool | Branch Prefix |
|------|---------|------|---------|---------------|
| Victor J. Kweka | T22-03-11759 | Project Lead + AI Service | Claude Code | `feat/kweka-*` |
| Julius P. Ntale | T22-03-05441 | Frontend Engineer | Claude Code | `feat/julius-*` |
| Derick G. Mhidze | T22-03-04321 | Backend Engineer | Claude Code | `feat/derick-*` |
| Beckham Y. Mwakanjuki | T22-03-10715 | AI/ML Engineer | Gemini/Colab | `feat/beckham-*` |
| Abdul-Swamad J. Hassan | T22-03-13834 | Documentation Engineer | Claude Code | `docs/abdul-*` |

---

## Architecture

```
Browser (Next.js 15 / React 19)
    │
    ├─── HTTP (axios) ──────────────► Flask Backend API  (port 5000)
    │                                    │
    └─── WebSocket (socket.io) ────────► Flask AI Service (port 8000)
                                         │
                                         ├── FaceNet (ONNX) ── identity verify
                                         ├── Gaze CNN (ONNX) ── gaze estimation
                                         └── MediaPipe ──────── head pose
                                         
Database: PostgreSQL (7 tables)
Storage:  /storage/faces/ (server-only, never in git)
```

**Important architecture note:** The backend was built in Python Flask (not Node.js as originally planned). This is the accepted approach. Derick owns the backend Flask app (port 5000). Kweka owns the AI service Flask app (port 8000). They are two separate Python services.

**Dead code warning — legacy Node/Express backend:** `backend/` still contains a full, earlier Node/Express implementation (`server.js`, `routes/*.js`, `models/` Sequelize models, `middleware/`, `.sequelizerc` + `.js` migrations under `migrations/`). **None of it runs anywhere** — `backend/Dockerfile` builds a Python image and its `CMD` is `gunicorn ... run:app`, and `docker-compose.yml`'s `backend` service runs `python run.py`. The live backend is entirely under `backend/app/` (Flask blueprints) plus Alembic (`backend/migrations/env.py` + `migrations/versions/`). Do not add features to `server.js`/`routes/*.js`/Sequelize `models/` — they are unused leftovers. The **root-level Jest suite** (`tests/api.test.js`, run via `npm test` at repo root) also only exercises this legacy Express app (it mocks `backend/models`, `backend/config/mailer`, `backend/utils/logger` — all Node paths) — it does **not** test the real Flask backend and passing it proves nothing about production behavior. Real backend tests are `backend/tests/*.py` (pytest).

---

## Repository Structure

```
ai-exam-proctoring-system/
├── CLAUDE.md               ← YOU ARE HERE — read before every session
├── .claude/                ← Detailed context for Claude Code sessions
│   ├── project-state.md    ← Feature-by-feature status (dated April 2026 — often stale, cross-check against code/git log)
│   ├── architecture.md     ← API contracts and data flow
│   ├── database-schema.md  ← All 7 tables with columns
│   └── prompting-guide.md  ← How to write good Claude prompts
├── frontend/               ← Next.js app (Julius) — deployed to Vercel
├── backend/                ← Live Flask REST API in app/ (Derick); server.js/routes/*.js/models/ are unused legacy Node code — see warning above
├── ai-service/             ← Flask + Socket.io AI endpoints (Kweka) — models, gaze/head-pose/identity logic
├── tests/                  ← Root-level Jest suite — tests the legacy Node backend only, not app/
├── docs/                   ← SRS, API spec, test cases (Abdul)
├── docker-compose.yml      ← Local dev stack: postgres, backend, ai-service, frontend
├── docker-compose.api-prod.yml ← Production compose used by CD on the VPS (backend + ai-service only)
└── .gitignore              ← Blocks .env, *.pt, *.onnx, storage/faces/
```

Note: `ml-training/` and `NEXT_STEPS.md` are referenced in older docs but do not currently exist in the repo.

---

## Current Status

The system is built out end-to-end and running in production (see `README.md` for live URLs): frontend on Vercel, backend + AI service on a VPS via `docker-compose.api-prod.yml`, deployed through `.github/workflows/cd.yml`. `.claude/project-state.md`'s per-feature checklist is dated April 2026 and describes an early scaffold stage that no longer matches reality — treat it as historical, not current, and prefer reading the actual code or `git log` for up-to-date status.

---

## Critical Quality Targets (from Proposal)

| Metric | Target | Owner |
|--------|--------|-------|
| Facial recognition accuracy | ≥ 90% | Beckham + Kweka |
| False Acceptance Rate (FAR) | < 5% | Beckham + Kweka |
| False Rejection Rate (FRR) | < 10% | Beckham + Kweka |
| Identity verification latency | < 3 seconds | Kweka + Derick |
| Frame processing time | < 1 sec/frame | Kweka |
| System uptime during exams | ≥ 95% | Kweka + Derick |
| Concurrent exam sessions | ≥ 100 | Kweka + Derick |
| Gaze estimation MAE | < 5 degrees | Beckham |
| Head pose estimation MAE | < 5 degrees | Beckham |
| SUS usability score | ≥ 3.5 / 5.0 (70/100) | Julius + Abdul |

---

## Golden Rules (Non-Negotiable)

1. **Never commit `.env` files, model weights (`.pt`, `.onnx`), or facial images** — `.gitignore` blocks these but always run `git status` before `git add .`
2. **Never push directly to `main`** — all work goes to feature branches, PR to main, Kweka reviews
3. **Never merge Claude-generated code you don't understand** — ask Claude to explain it line by line first
4. **Always pull before starting work:** `git pull origin your-branch-name`
5. **Break Claude prompts into one endpoint / one component at a time** — never ask Claude to build the whole feature at once

---

## Day-to-Day Git Workflow

```bash
# Start of every work session:
git checkout feat/your-branch-name
git pull origin feat/your-branch-name

# After finishing a task:
git status                          # check what changed
git add specific-file.py            # add specific files (not git add .)
git commit -m "feat: description"   # commit with clear message
git push origin feat/your-branch-name

# Open PR on GitHub → assign Kweka as reviewer → do NOT merge yourself
```

---

## Environment Setup

### Frontend (Julius)
```bash
cd frontend
pnpm install        # pnpm-lock.yaml is the checked-in lockfile
npm run dev          # runs on http://localhost:3000
```

### Backend (Derick)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
python run.py               # runs on http://localhost:5000 (legacy Node entry point is server.js — not used)
```

### AI Service (Kweka)
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py              # runs on http://localhost:8000
```

### All at once (Docker)
```bash
docker-compose up          # starts frontend, backend, ai-service, postgres
```

---

## Development Commands

### Frontend (`frontend/`)
```bash
npm run build     # production build (next build)
npm run lint       # eslint . --ext .js,.jsx,.ts,.tsx
```
No frontend test suite is configured — verify UI changes by running `npm run dev` and exercising the feature in a browser.

### Backend (`backend/`) — pytest against the real Flask app
```bash
cd backend
python -m pytest tests/ -v
python -m pytest tests/test_auth.py -v                              # one file
python -m pytest tests/test_sessions_and_reports.py::test_name -v   # one test
```
`tests/conftest.py` points `DATABASE_URL` at an in-memory SQLite DB and sets `AI_SERVICE_TOKEN=test-internal-token`, so tests run with no Postgres/env setup required.

Alembic migrations:
```bash
cd backend
flask db upgrade                                   # apply
flask db migrate -m "description"                  # generate new revision (after editing app/models/)
```

### AI service (`ai-service/`)
```bash
cd ai-service
python -m pytest tests/ -v
```
Model-loading tests skip automatically when `*.onnx` files aren't present locally (they're gitignored — only present on a dev machine that manually placed them, or the VPS).

### Root-level Jest (`tests/`)
```bash
npm install
npm test          # jest --forceExit --runInBand
```
Exercises the legacy Node/Express backend only (see the dead-code warning above) — do not treat this as a signal about `backend/app/` behavior.

---

## Key Design Decisions

- **Warning threshold = 3**: sustained anomaly ≥2s across all anomaly types (gaze away, head turned, face absent, multiple faces — `GAZE_AWAY_SECONDS`/`HEAD_TURNED_SECONDS`/`FACE_ABSENT_SECONDS`/`MULTIPLE_FACES_SECONDS`, all default 2 as of 2026-07-03), gated by confidence + persistence debouncing so the faster window doesn't produce false positives — each confirmed anomaly fires a warning after a persistence + cooldown check (see below). At 3, auto-submit + email.
- **Nothing counts as a violation during calibration (fixed 2026-07-03)**: `handle_frame()` in `frame_handler.py` used to only gate `head_turned` on the session's own `calibrating` flag — gaze/face/multiple-faces/identity-mismatch checks all ran (and could accumulate persistence toward a warning) from the very first frame, before the frontend's "Setting Up Monitoring" overlay had even finished. A student adjusting their seat during setup could get flagged the moment the overlay disappeared. All anomaly building AND the periodic identity re-check are now gated on `not calibrating`, so nothing is tracked until calibration is actually done.
- **Facial recognition pipeline**: MTCNN detect → FaceNet embed → cosine similarity → threshold 0.6
- **Gaze model**: `gaze_model.onnx` — custom lightweight CNN (~101K params) trained on MPIIGaze normalized eye crops (Kaggle `4quant/eye-gaze`), 5-class output: Center (reported as "Screen"), Down, Left, Right, Up. Test accuracy 78.54% (macro F1 0.781); full details in `trained_model_exports/checkpoints/README_HANDOFF.md`. Replaces the earlier `l2cs_net.onnx` placeholder, which was never functional in production (its actual output tensor name didn't match what the code requested).
- **Gaze normalization** (`ai-service/services/gaze_normalization.py`): implements the actual Zhang et al. (2018) MPIIGaze data-normalization method — 3D head pose via `solvePnP`, a virtual camera aimed directly at the observed eye pixel with head roll cancelled, then a perspective warp into the model's 36x60 input. Zoom is self-calibrating per frame (measures the eye's actual warped size and corrects to a target width) rather than depending on absolute distance in the 3D face model's non-metric units, which proved unstable to hand-tune. An earlier roll-only-correction version (`detect_and_crop_eye`, since deleted) left the eye off-center in the crop — this was a real, confirmed bug, not just an approximation gap.
- **"Center" is a narrow cone, not "anywhere on screen"**: per `trained_model_exports/checkpoints/label_config.json` (pitch_center=-8.93°, yaw_scale=7.21°, center_thresh=0.85), the model's Center class only covers roughly ±6° yaw / ±4° pitch around a point ~9° below the camera axis — confirmed empirically too, Center is the smallest class in the training data (17.7% vs ~20-22% for each other class). That's much narrower than the angle spanned by reading across a normal monitor. **Policy decision (2026-07-02, reversed 2026-07-03): all four non-Screen directions (`Down`/`Up`/`Left`/`Right`) now count as "gaze away"** (`_AWAY_DIRECTIONS` in `frame_handler.py`) at the same ~2s window as `multiple_faces`/`face_absent`. Originally `Left`/`Right` were excluded as a false-positive risk against normal screen-reading eye movement, given how narrow the Center cone is — that risk is still real and was knowingly accepted per an explicit request to cover all look-away directions; if Left/Right prove too noisy in live testing, re-tighten `_AWAY_DIRECTIONS` back to `{'Down', 'Up'}`. A `gaze_away` reading also requires confidence ≥ `GAZE_CONFIDENCE_THRESHOLD` (default 0.4) and the SAME specific direction sustained for the full debounce window — flip-flopping between directions (a model-noise signature) resets the persistence timer instead of accumulating.
- **Head pose**: MediaPipe Face Mesh + OpenCV solvePnP (no training needed, just calibration). **Bug fixed 2026-07-03**: `cv2.RQDecomp3x3`'s Euler decomposition is ambiguous (any rotation has two valid decompositions related by a ~180° flip on two axes); for this face model it consistently landed pitch/roll on the flipped branch, producing values like pitch=139° or -156° for an ordinary frontal face — meaning `alert` (and thus `head_turned`) was true on essentially every frame regardless of real head position, confirmed via live production logs. `head_pose.py::_normalize_angle()` folds any angle with magnitude > 90° back to the sensible branch (`angle ∓ 180`). Yaw was unaffected by this bug. Whether `HEAD_PITCH_THRESHOLD`/`HEAD_YAW_THRESHOLD` also need recalibrating now that pitch is measured correctly is an open follow-up — check live `pose_debug` logs. **Downstream consequence**: this flipped the sign relationship between pitch and real head movement (confirmed: a real downward tilt now reports *positive* pitch, not negative). `frontend/app/verify/page.tsx::isPhaseConditionSatisfied()`'s `move_up`/`move_down` checks were tuned against the old buggy sign and had to be swapped — same pattern already present there for yaw (see its own comment). If head_pose.py's angle convention changes again, check that function.
- **Frontend stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend stack**: Python Flask, PostgreSQL, SQLAlchemy, JWT, bcrypt, Nodemailer equiv (smtplib)
- **AI service**: Python Flask + ONNX Runtime + MediaPipe + OpenCV + Socket.io
- **Deployment split**: the frontend (`frontend/`) is hosted on **Vercel**, which auto-deploys on every push to `main` via its own GitHub integration — this is completely separate from `.github/workflows/cd.yml`, which only deploys `backend` + `ai-service` to the VPS. There is no frontend container on the VPS. Don't assume merging a frontend-only PR needs a manual VPS deploy step — it doesn't.
- **Password policy**: there is no forced password-change-on-first-login anymore (removed 2026-07-02) — provisioned/reset accounts are immediately usable with their temporary password. `must_change_password` still exists as a DB column but nothing sets it `True` or enforces it.
- **Mid-exam identity re-verification (added 2026-07-03)**: the one-time `/verify-identity` check at `/verify` and the `/status`-based entry guard on `/exam` only cover the moment of entry — neither catches someone swapping in for the original student mid-exam without ever leaving/reloading the page. `frame_handler.py::_check_identity_mismatch()` periodically (`IDENTITY_RECHECK_SECONDS`, default 8s) re-runs the FaceNet comparison against the session's registered baseline, throttled since it's heavier than gaze/pose/count. It requires `IDENTITY_MISMATCH_CONFIRM_COUNT` (default 2) CONSECUTIVE mismatched checks before confirming — a lone bad-angle/lighting frame must not lock a legitimate student, since the consequence (immediate session lock + auto-submit, bypassing the normal 1-2-3 graduated warnings entirely) is severe. The student_id used for comparison is always resolved server-side via a new trusted internal endpoint (`GET /api/sessions/internal/<id>`), never taken from the client — a client-supplied user_id would let an impostor simply claim their own account and match their own face, defeating the check entirely. Shared FaceNet/baseline logic between the one-time and periodic checks lives in `ai-service/services/identity_verifier.py`.

---

## Code Layout Within Each Service

**Backend (`backend/app/`)** — `create_app()` in `app/__init__.py` wires everything: registers one blueprint per domain (`auth`, `users`, `exams`, `sessions`, `reports`, `images`, `search`), each under `/api/<domain>` and living in its own package (`app/<domain>/routes.py`); `app/models/` holds the SQLAlchemy models (one file per table); `app/extensions.py` holds the shared `db`/`jwt`/`migrate` instances used across blueprints; `app/config.py` reads all env vars. `app/__init__.py` also auto-provisions a bootstrap admin user on first request if none exists (`BOOTSTRAP_ADMIN_*` env vars) and logs every request as structured JSON. Server-to-server calls from the AI service authenticate via an `X-Internal-Token` header checked against `AI_SERVICE_TOKEN` (see `app/sessions/routes.py`) — follow that pattern for any new internal-only endpoint rather than trusting client-supplied IDs.

**AI service (`ai-service/`)** — `routes/` holds thin synchronous HTTP endpoints (`health.py`, `verify.py` for one-time identity checks, `monitor.py`); the real-time per-frame pipeline lives in `sockets/frame_handler.py` (Socket.io handlers — anomaly persistence/debounce state, calibration gating, warning counting, identity re-check scheduling all happen here); `services/` holds the model/CV logic consumed by both routes and sockets (`model_loader.py` loads ONNX models once at startup, `face_detector.py`, `gaze_estimator.py` + `gaze_normalization.py`, `head_pose.py`, `identity_verifier.py`, `embedding_store.py`, `preprocessing.py`).

**Frontend (`frontend/`)** — `lib/api-url.ts::getApiPath()` resolves the backend base URL (env var `NEXT_PUBLIC_API_URL`, falling back to `<host>:5000` in local dev); `middleware.ts` gates `/dashboard`, `/lecturer`, `/admin`, `/exam`, `/verify` by decoding the `auth_token` cookie's JWT payload client-side (no signature check — the backend still enforces auth on every API call) and redirecting to `/unauthorized` on role mismatch.

---

## Where to Find More Context

- `.claude/project-state.md` — feature-by-feature status (dated April 2026, stale — see "Current Status" above)
- `.claude/architecture.md` — complete API endpoint contracts
- `.claude/database-schema.md` — all 7 database tables with columns
- `.claude/prompting-guide.md` — how to write effective prompts for this project
- `docs/Original-Development-Plan-&-Roles.pdf` — full original spec
