# AI-Based Online Examination Proctoring System

> University of Dodoma · FYP 2025/26 · Supervisor: Dr. Mohamed Dewa

An AI-powered exam proctoring platform that verifies student identity via facial recognition, monitors behaviour in real-time (gaze, head pose, tab switches, multiple faces), and issues graduated warnings — auto-submitting the exam and emailing the lecturer on the third offence.

[![CI](https://github.com/victorjudysen/ai-exam-proctoring-system/actions/workflows/ci.yml/badge.svg)](https://github.com/victorjudysen/ai-exam-proctoring-system/actions/workflows/ci.yml)
[![CD](https://github.com/victorjudysen/ai-exam-proctoring-system/actions/workflows/cd.yml/badge.svg)](https://github.com/victorjudysen/ai-exam-proctoring-system/actions/workflows/cd.yml)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend API | Flask, Gunicorn, JWT, SQLAlchemy/Alembic |
| AI Service | Python Flask, ONNX Runtime, MediaPipe, OpenCV |
| Database | PostgreSQL 15 |
| Containerisation | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## Run Locally with Docker

```bash
# 1. Copy and fill in environment variables
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env

# 2. Start all services
docker compose up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| AI Service | http://localhost:8000 |

---

## Run Tests

```bash
# Root-level API integration tests (Jest + Supertest)
npm install
npm test

# Backend unit tests
cd backend && npm ci && npm test

# AI service tests
cd ai-service && pip install -r requirements.txt && python -m pytest tests/ -v
```

---

## CI / CD

**CI** triggers on every push to any branch and on pull requests to `main`. It runs all tests, then builds the Docker images. The build job will not start if any test fails.

**CD** deploys the API stack automatically after CI passes on `main`. It can also be started manually from GitHub Actions with `workflow_dispatch`.

| Step | What happens |
|------|-------------|
| `deploy-production` | SSHs into the VPS, fast-forwards `/opt/proctorai/ai-exam-proctoring-system`, validates required model files, rebuilds backend/AI images, runs Alembic migrations, restarts only ProctorAI services, and checks public health endpoints |

### GitHub Secrets required

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | VPS IP address or hostname |
| `SERVER_USER` | SSH username (e.g. `root`) |
| `SSH_PRIVATE_KEY` | Private SSH key allowed to access the VPS |
| `SERVER_SSH_KEY` | Optional legacy fallback if `SSH_PRIVATE_KEY` is not set |
| `SERVER_PORT` | Optional SSH port; defaults to `22` |

### GitHub Environments required

Create **`production`** in **GitHub → Settings → Environments**. Add required reviewers if deployments should wait for manual approval.

### VPS setup (one-time)

```bash
# 1. Add the deploy public key to authorized_keys on the server
echo "<paste deploy_key.pub content here>" >> ~/.ssh/authorized_keys

# 2. Clone the repository
mkdir -p /opt/proctorai
git clone https://github.com/victorjudysen/ai-exam-proctoring-system.git /opt/proctorai/ai-exam-proctoring-system

# 3. Create and fill production environment values
cd /opt/proctorai/ai-exam-proctoring-system
cp .env.production.example .env.production

# 4. Upload AI model files to ai-service/models/
ls -lh ai-service/models/

# 5. Ensure Docker and Docker Compose are installed
docker --version
docker compose version
```

---

## Repository Structure

```
ai-exam-proctoring-system/
├── frontend/          Next.js app
├── backend/           Express REST API
├── ai-service/        Flask AI endpoints (WebSocket + model inference)
├── tests/             Root-level integration tests (Jest + Supertest)
├── docs/              API spec, test cases, SRS
├── .github/workflows/ CI and CD pipelines
└── docker-compose.yml Starts all services
```

---

## Branching

Work on feature branches (`feat/your-name-*`), never push directly to `main`. Open a PR and assign Kweka as reviewer. Never commit `.env` files, model weights (`.pt`, `.onnx`), or face images.
