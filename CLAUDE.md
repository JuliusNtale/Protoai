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

---

## Repository Structure

```
ai-exam-proctoring-system/
├── CLAUDE.md               ← YOU ARE HERE — read before every session
├── .claude/                ← Detailed context for Claude Code sessions
│   ├── project-state.md    ← Current build status per feature
│   ├── architecture.md     ← API contracts and data flow
│   ├── database-schema.md  ← All 7 tables with columns
│   └── prompting-guide.md  ← How to write good Claude prompts
├── frontend/               ← Next.js app (Julius) — ~80% complete
├── backend/                ← Python Flask REST API (Derick) — ~15% complete
├── ai-service/             ← Python Flask AI endpoints (Kweka) — 0% started
├── ml-training/            ← Colab notebooks + scripts (Beckham) — 0% started
├── docs/                   ← SRS, API spec, test cases (Abdul)
├── docker-compose.yml      ← Starts all services (Kweka)
└── .gitignore              ← Blocks .env, *.pt, *.onnx, storage/faces/
```

---

## Current Build Status (April 2026)

| Layer | Status | What's Done | What's Missing |
|-------|--------|-------------|----------------|
| Frontend | 80% | All 8 pages built with UI and mock data | Real API calls, Socket.io frame loop, warning overlay wired to real events |
| Backend API | 15% | Flask scaffold, auth stub, exam stub | JWT auth, DB migrations, all endpoints, email alerts, report gen |
| AI Service | 0% | Nothing | Full Flask service, model integration, WebSocket server |
| ML Models | 0% | Nothing | Dataset download, training scripts, ONNX exports |
| Database | 0% | Nothing | PostgreSQL schema, migrations |
| DevOps | 0% | Nothing | Docker Compose, GitHub Actions CI |
| Documentation | 0% | Original plan PDF | SRS, API docs, test cases, final report |

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
npm install        # or: pnpm install
npm run dev        # runs on http://localhost:3000
```

### Backend (Derick)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
python app.py              # runs on http://localhost:5000
```

### AI Service (Kweka)
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py              # runs on http://localhost:8000
```

### All at once (Docker — Kweka sets this up)
```bash
docker-compose up          # starts frontend, backend, ai-service, postgres
```

---

## Key Design Decisions

- **Warning threshold = 3**: sustained anomaly >5s (gaze), >3s (head/multi-face), face absent — each confirmed anomaly fires a warning after a persistence + cooldown check (see below). At 3, auto-submit + email.
- **Facial recognition pipeline**: MTCNN detect → FaceNet embed → cosine similarity → threshold 0.6
- **Gaze model**: `gaze_model.onnx` — custom lightweight CNN (~101K params) trained on MPIIGaze normalized eye crops (Kaggle `4quant/eye-gaze`), 5-class output: Center (reported as "Screen"), Down, Left, Right, Up. Test accuracy 78.54% (macro F1 0.781); full details in `trained_model_exports/checkpoints/README_HANDOFF.md`. Replaces the earlier `l2cs_net.onnx` placeholder, which was never functional in production (its actual output tensor name didn't match what the code requested).
- **Gaze normalization** (`ai-service/services/gaze_normalization.py`): implements the actual Zhang et al. (2018) MPIIGaze data-normalization method — 3D head pose via `solvePnP`, a virtual camera aimed directly at the observed eye pixel with head roll cancelled, then a perspective warp into the model's 36x60 input. Zoom is self-calibrating per frame (measures the eye's actual warped size and corrects to a target width) rather than depending on absolute distance in the 3D face model's non-metric units, which proved unstable to hand-tune. An earlier roll-only-correction version (`detect_and_crop_eye`, since deleted) left the eye off-center in the crop — this was a real, confirmed bug, not just an approximation gap.
- **"Center" is a narrow cone, not "anywhere on screen"**: per `trained_model_exports/checkpoints/label_config.json` (pitch_center=-8.93°, yaw_scale=7.21°, center_thresh=0.85), the model's Center class only covers roughly ±6° yaw / ±4° pitch around a point ~9° below the camera axis — confirmed empirically too, Center is the smallest class in the training data (17.7% vs ~20-22% for each other class). That's much narrower than the angle spanned by reading across a normal monitor. **Policy decision (2026-07-02): only `Down`/`Up` count as "gaze away"; `Left`/`Right` are treated as normal screen-reading and never escalate** (`_AWAY_DIRECTIONS` in `frame_handler.py`). A `gaze_away` reading also requires confidence ≥ `GAZE_CONFIDENCE_THRESHOLD` (default 0.4) and the SAME specific direction sustained for the full debounce window — flip-flopping between directions (a model-noise signature) resets the persistence timer instead of accumulating.
- **Head pose**: MediaPipe Face Mesh + OpenCV solvePnP (no training needed, just calibration)
- **Frontend stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend stack**: Python Flask, PostgreSQL, SQLAlchemy, JWT, bcrypt, Nodemailer equiv (smtplib)
- **AI service**: Python Flask + ONNX Runtime + MediaPipe + OpenCV + Socket.io
- **Deployment split**: the frontend (`frontend/`) is hosted on **Vercel**, which auto-deploys on every push to `main` via its own GitHub integration — this is completely separate from `.github/workflows/cd.yml`, which only deploys `backend` + `ai-service` to the VPS. There is no frontend container on the VPS. Don't assume merging a frontend-only PR needs a manual VPS deploy step — it doesn't.
- **Password policy**: there is no forced password-change-on-first-login anymore (removed 2026-07-02) — provisioned/reset accounts are immediately usable with their temporary password. `must_change_password` still exists as a DB column but nothing sets it `True` or enforces it.

---

## Where to Find More Context

- `.claude/project-state.md` — detailed feature-by-feature status
- `.claude/architecture.md` — complete API endpoint contracts
- `.claude/database-schema.md` — all 7 database tables with columns
- `.claude/prompting-guide.md` — how to write effective prompts for this project
- `docs/Original-Development-Plan-&-Roles.pdf` — full original spec
- `NEXT_STEPS.md` — per-member development plan with step-by-step instructions
