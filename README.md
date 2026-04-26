# AI-Based Online Examination Proctoring System

**University of Dodoma | FYP 2025/26**  
Supervisor: Dr. Mohamed Dewa  
Repository: https://github.com/victorjudysen/ai-exam-proctoring-system

---

## Overview

This project is an AI-powered online exam proctoring platform designed to ensure academic integrity during remote assessments. It leverages facial recognition, gaze and head pose estimation, and real-time monitoring to detect suspicious behavior and automate exam supervision.

---

## Features

- **Student Identity Verification:** Facial recognition before each exam using FaceNet (ONNX)
- **Real-Time Monitoring:**
  - Gaze tracking (L2CS-Net ONNX)
  - Head pose estimation (MediaPipe)
  - Tab switching and multiple face detection
- **Warning System:** Graduated warnings (1→2→3). At 3, the exam is auto-submitted and the lecturer is notified.
- **Dashboards & Reports:** Live dashboards for lecturers/admins and post-exam behavioral reports

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

---

## Repository Structure

```
ai-exam-proctoring-system/
├── CLAUDE.md               ← Claude context & rules
├── .claude/                ← Detailed context, API, DB, prompts
├── frontend/               ← Next.js app (UI)
├── backend/                ← Python Flask REST API
├── ai-service/             ← Python Flask AI endpoints
├── ml-training/            ← Colab notebooks + scripts
├── docs/                   ← SRS, API spec, test cases
├── docker-compose.yml      ← Starts all services
└── .gitignore              ← Blocks .env, *.pt, *.onnx, storage/faces/
```

---

## Team

| Name | Reg. No | Role | AI Tool | Branch Prefix |
|------|---------|------|---------|---------------|
| Victor J. Kweka | T22-03-11759 | Project Lead + AI Service | Claude Code | feat/kweka-* |
| Julius P. Ntale | T22-03-05441 | Frontend Engineer | Claude Code | feat/julius-* |
| Derick G. Mhidze | T22-03-04321 | Backend Engineer | Claude Code | feat/derick-* |
| Beckham Y. Mwakanjuki | T22-03-10715 | AI/ML Engineer | Gemini/Colab | feat/beckham-* |
| Abdul-Swamad J. Hassan | T22-03-13834 | Documentation Engineer | Claude Code | docs/abdul-* |

---

## Setup & Usage

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.10+
- PostgreSQL
- (Optional) Docker & Docker Compose

### Frontend (Next.js)
```bash
cd frontend
npm install        # or: pnpm install
npm run dev        # http://localhost:3000
```

### Backend API (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
python app.py              # http://localhost:5000
```

### AI Service (Flask)
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py              # http://localhost:8000
```

### All at once (Docker)
```bash
docker-compose up
```

---

## Development Workflow

- **Branching:** Work on feature branches (`feat/your-name-*`), never push to `main` directly
- **Commits:** Add only specific files, not `git add .`
- **Pull Requests:** Open PRs for review, assign Kweka as reviewer
- **Sensitive Data:** Never commit `.env`, model weights, or face images

---

## Key Design Decisions

- **Warning threshold = 3**: Gaze away >5s, head turned >3s, tab switch, face absent — each fires a warning. At 3, auto-submit + email.
- **Facial recognition pipeline:** MTCNN detect → FaceNet embed → cosine similarity → threshold 0.6
- **Gaze model:** L2CS-Net fine-tuned to 5 classes: Screen, Left, Right, Up, Down
- **Head pose:** MediaPipe Face Mesh + OpenCV solvePnP

---

## Quality Targets

| Metric | Target |
|--------|--------|
| Facial recognition accuracy | ≥ 90% |
| False Acceptance Rate (FAR) | < 5% |
| False Rejection Rate (FRR) | < 10% |
| Identity verification latency | < 3 seconds |
| Frame processing time | < 1 sec/frame |
| System uptime during exams | ≥ 95% |
| Concurrent exam sessions | ≥ 100 |
| Gaze estimation MAE | < 5 degrees |
| Head pose estimation MAE | < 5 degrees |
| SUS usability score | ≥ 3.5 / 5.0 (70/100) |

---

## Status (April 2026)

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

## References & Further Context

- `.claude/` — Project state, API, DB schema, prompt guide
- `docs/Original-Development-Plan-&-Roles.pdf` — Full original spec
- `NEXT_STEPS.md` — Per-member development plan

---

## License

This project is for academic use at the University of Dodoma. For other uses, contact the project supervisor.

---

*This README is a living document and will be updated as the project progresses.*
