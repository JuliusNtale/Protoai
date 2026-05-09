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
| Backend API | Node.js, Express 4, JWT, bcrypt, Sequelize |
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

**CD** triggers automatically after CI passes on `main`. It follows four sequential steps:

| Step | What happens |
|------|-------------|
| `deploy-staging` | Builds and pushes `:staging` + `:<sha>` to Docker Hub; runs a container health check |
| `approve-production` | Manual approval gate (requires a reviewer in the `production` environment) |
| `deploy-production` | Retags the staging image as `:latest`, `:v1`, and `:<sha>` on Docker Hub |
| `deploy-server` | SSHs into the VPS and runs `docker compose pull && docker compose up -d` |

### GitHub Secrets required

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (read/write) |
| `SERVER_HOST` | VPS IP address |
| `SERVER_USER` | SSH username (e.g. `root`) |
| `SSH_PRIVATE_KEY` | The ed25519 private key printed during setup |

### GitHub Environments required

Create these in **GitHub → Settings → Environments**:

- **`staging`** — no restrictions
- **`production`** — enable **Required reviewers**, add your own username  
  *(repository must be public for required reviewers on free accounts)*

### VPS setup (one-time)

```bash
# 1. Add the public key to authorized_keys on the server
echo "<paste deploy_key.pub content here>" >> ~/.ssh/authorized_keys

# 2. Set DOCKERHUB_USERNAME so docker compose pull can resolve image names
echo "DOCKERHUB_USERNAME=your-username" >> /var/www/ai-exam-proctoring/.env

# 3. Ensure Docker and Docker Compose are installed
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
