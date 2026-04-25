# AI-Based Online Examination Proctoring System
## Claude Code Context — Read This First

**University of Dodoma | FYP 2025/26 | Supervisor: Dr. Mohamed Dewa**
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
                                         ├── L2CS-Net (ONNX) ─ gaze estimation
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

- **Warning threshold = 3**: Gaze away >5s, head turned >3s, tab switch, face absent — each fires a warning. At 3, auto-submit + email.
- **Facial recognition pipeline**: MTCNN detect → FaceNet embed → cosine similarity → threshold 0.6
- **Gaze model**: L2CS-Net fine-tuned to 5 classes: Screen, Left, Right, Up, Down
- **Head pose**: MediaPipe Face Mesh + OpenCV solvePnP (no training needed, just calibration)
- **Frontend stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend stack**: Python Flask, PostgreSQL, SQLAlchemy, JWT, bcrypt, Nodemailer equiv (smtplib)
- **AI service**: Python Flask + ONNX Runtime + MediaPipe + OpenCV + Socket.io

---

## Where to Find More Context

- `.claude/project-state.md` — detailed feature-by-feature status
- `.claude/architecture.md` — complete API endpoint contracts
- `.claude/database-schema.md` — all 7 database tables with columns
- `.claude/prompting-guide.md` — how to write effective prompts for this project
- `docs/Original-Development-Plan-&-Roles.pdf` — full original spec
- `NEXT_STEPS.md` — per-member development plan with step-by-step instructions
