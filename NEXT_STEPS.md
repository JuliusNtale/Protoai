# Development Plan — Next Steps Per Member
## AI-Based Online Examination Proctoring System
## Updated: April 25, 2026 | Based on current codebase analysis

This document describes **what needs to be done next**, calibrated to the current state of the project.
The frontend is ~80% complete. The backend, AI service, ML models, and docs are all in early stages.

---

# VICTOR J. KWEKA — Project Lead & AI Service Engineer

## Your Current Priorities (in order)

### PRIORITY 1: Set Up Infrastructure This Week (Days 1-3)

**Step 1 — Create the ai-service folder and Flask skeleton**

```bash
cd ai-exam-proctoring-system
mkdir ai-service && cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install flask flask-socketio flask-cors opencv-python-headless mediapipe onnxruntime pillow numpy python-dotenv
pip freeze > requirements.txt
```

Then open Claude Code in this folder:
```bash
claude
```

Tell Claude:
> "Create a Python Flask app for an AI service with these files:
> - `app.py`: Flask app on port 8000 with CORS enabled. Register blueprints for /verify-identity and /monitor-frame. Add GET /health that returns {status:'ok', models_loaded: {facenet: false, l2cs: false}}.
> - `config.py`: Load all env vars from .env (MODELS_DIR, FACE_SIMILARITY_THRESHOLD=0.6, GAZE_AWAY_SECONDS=5, HEAD_TURNED_SECONDS=3, HEAD_YAW_THRESHOLD=30, HEAD_PITCH_THRESHOLD=20, BACKEND_URL).
> - `.env.example`: Template with placeholder values.
> - `routes/__init__.py`, `routes/verify.py` (stub POST /verify-identity), `routes/monitor.py` (stub POST /monitor-frame).
> Structure it so model files can be loaded later in a `models/` directory."

**Step 2 — Create Docker Compose at repo root**

Tell Claude:
> "Write a docker-compose.yml at the repo root that starts 4 services:
> 1. `postgres`: image postgres:15, port 5432, env POSTGRES_DB=proctoring_db, POSTGRES_USER=proctor, POSTGRES_PASSWORD=secret, volume for data persistence
> 2. `backend`: build from ./backend, port 5000, env vars from backend/.env, depends_on postgres
> 3. `ai-service`: build from ./ai-service, port 8000, env vars from ai-service/.env
> 4. `frontend`: build from ./frontend, port 3000, env NEXT_PUBLIC_API_URL=http://localhost:5000, NEXT_PUBLIC_WS_URL=http://localhost:8000
> Include volume mounts for hot reload in development: ./backend:/app for backend, etc.
> Also write a Dockerfile for each of the 3 services (frontend uses node:20-alpine, backend uses python:3.11-slim, ai-service uses python:3.11-slim)."

**Step 3 — Create .gitignore at repo root**

Tell Claude:
> "Write a comprehensive .gitignore for a monorepo containing Next.js frontend, Python Flask backend, and Python AI service. Block: .env files, *.pt, *.pth, *.h5, *.onnx, *.pkl model files, storage/faces/ directory, __pycache__, venv/, node_modules/, .next/, .DS_Store, *.pyc. Include a comment explaining WHY model files and face images are blocked (sensitive data + size)."

**Step 4 — Create GitHub Actions CI**

Tell Claude:
> "Write .github/workflows/ci.yml: on push to main and on PR targeting main, run 3 jobs in parallel: (1) frontend-lint: checkout, node 20, npm ci in frontend/, run npm run lint; (2) backend-test: checkout, python 3.11, pip install in backend/, run pytest if tests/ folder exists; (3) ai-service-test: same for ai-service/. Jobs should fail fast."

---

### PRIORITY 2: Build the AI Service Flask Endpoints (Days 4-10)

**Step 5 — Build the /verify-identity stub endpoint**

Open Claude Code in `ai-service/`:
> "Read routes/verify.py. Build POST /verify-identity that:
> 1. Accepts JSON: {user_id: int, image_base64: string}
> 2. Validates both fields present
> 3. Decodes base64 to bytes, opens with PIL
> 4. Runs MTCNN face detection to check a face exists (import facenet_pytorch's MTCNN)
> 5. If face detected: returns {match: True, confidence: 0.92} — this is a stub until real model arrives
> 6. If no face: returns 422 {error: 'No face detected in image'}
> 7. Add try/except around all PIL and MTCNN operations with proper 500 error response
> Note: Structure the face matching as a separate function get_face_match(image, user_id) so I can swap the stub for real ONNX inference in Week 5 without changing the route."

**Step 6 — Build the /monitor-frame endpoint**

Tell Claude:
> "Read .claude/architecture.md for the monitor-frame contract. Build POST /monitor-frame in routes/monitor.py:
> 1. Decode base64 frame to OpenCV BGR image (numpy array)
> 2. Run gaze estimation and head pose estimation CONCURRENTLY using Python threading.Thread
> 3. Gaze stub: return {direction: 'Screen', confidence: 0.95} — real L2CS-Net comes Week 5
> 4. Head pose: use MediaPipe Face Mesh to get facial landmarks, then run OpenCV solvePnP to compute yaw/pitch/roll. Flag alert=True if abs(yaw)>30 OR abs(pitch)>20.
> 5. Build anomalies list: if gaze.direction != 'Screen' → append 'gaze_away'; if head_pose.alert → append 'head_turned'
> 6. Return the response format from .claude/architecture.md exactly.
> Use threading.Thread for true concurrency — pass results through a shared dict."

**Step 7 — Build the WebSocket Server**

Tell Claude:
> "Integrate flask-socketio into app.py. Add a Socket.io event handler:
> 1. On 'webcam_frame' event: receive {session_id, frame_base64, timestamp}
> 2. Authenticate: check session_id is valid (call backend GET /api/sessions/{id}/status)
> 3. Forward frame_base64 to /monitor-frame endpoint (call the function directly, not HTTP)
> 4. Build Warning Controller: maintain a dict `warning_counts = {}` per session_id
> 5. If monitor-frame returns non-empty anomalies: call backend POST /api/sessions/log
> 6. Emit 'anomaly_result' back to the specific client room with full result + warning_count
> 7. If warning_count reaches 3 from backend response: emit 'session_locked' event
> Use flask_socketio.emit() with room=session_id to target specific clients."

---

### PRIORITY 3: Model Integration (Week 5 — after Beckham delivers)

**Step 8 — Load ONNX models and replace stubs**

When Beckham sends the ONNX files via Google Drive:
1. Place them in `ai-service/models/facenet_best.onnx` and `ai-service/models/l2cs_net.onnx`
2. Open Claude Code and say:
> "Read routes/verify.py where I have the stub function get_face_match(). Replace it with real FaceNet ONNX inference:
> 1. Load onnxruntime.InferenceSession from MODELS_DIR/facenet_best.onnx at startup (not per-request)
> 2. Also load MTCNN for face detection and alignment
> 3. In get_face_match(image, user_id): run MTCNN to crop+align face → resize to 160x160 → normalize to [-1,1] → run ONNX session → get 512-D embedding vector
> 4. Load the stored embedding for user_id from the database (call backend GET /api/images/embedding/:user_id)
> 5. Compute cosine similarity between the two vectors
> 6. Return {match: similarity > 0.6, confidence: similarity}
> Keep get_face_match() signature identical — the route doesn't change."

---

### PRIORITY 4: Review All Pull Requests (Ongoing)

Before approving any PR:
- Check for hardcoded secrets: grep for passwords, API keys, tokens in the diff
- Verify error handling exists on every endpoint
- Run the code locally and test the endpoint manually
- Check that `.env` files are NOT included in the commit

---

# JULIUS P. NTALE — Frontend Engineer

## Your Current Priorities (in order)

The UI is nearly complete. Your job now is **wiring it to real data**.

### PRIORITY 1: Create the API Client Layer (Day 1)

**Step 1 — Create the axios API client**

Open Claude Code in `frontend/`:
> "Create frontend/lib/api.ts with an axios instance configured for this project:
> 1. Base URL from process.env.NEXT_PUBLIC_API_URL (default http://localhost:5000)
> 2. Request interceptor: if localStorage has 'token', add Authorization: Bearer {token} header
> 3. Response interceptor: if response is 401, remove 'token' from localStorage and redirect to /
> 4. Export typed helper functions:
>    - authApi.register(data: RegisterPayload): Promise<{user_id, message}>
>    - authApi.login(data: LoginPayload): Promise<{token, user}>
>    - examsApi.list(): Promise<{exams}>
>    - examsApi.getById(id: number): Promise<{exam, questions}>
>    - sessionsApi.start(examId: number): Promise<{session_id, exam}>
>    - sessionsApi.verify(sessionId: number, confidence: number): Promise<{identity_verified}>
>    - sessionsApi.log(sessionId: number, eventType: string, eventData?: object): Promise<{warning_count}>
>    - sessionsApi.submit(sessionId: number, answers: Answer[]): Promise<{score}>
> Use TypeScript interfaces for all payloads and responses."

**Step 2 — Add environment variables**

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:8000
```

---

### PRIORITY 2: Wire Login and Register to Real API (Days 2-3)

**Step 3 — Connect Login page**

Open Claude Code:
> "Read frontend/app/page.tsx (the login page). Find where the form submission currently happens (look for the submit handler or form onSubmit). Replace the mock logic with a real API call using the authApi.login() function from frontend/lib/api.ts.
> - On success: store the returned token in localStorage under key 'token', store user object under key 'user', redirect to /dashboard (or /lecturer or /admin based on role)
> - On error: display the error message from the API response in a visible error state
> - Add a loading state so the button shows a spinner while the request is in progress
> - Keep all existing UI code unchanged — only change the submit handler."

**Step 4 — Connect Register page**

> "Read frontend/app/register/page.tsx. The form captures full_name, reg_number, password, and a face image via camera (already implemented). Find the submit handler. Replace the mock logic with authApi.register() from frontend/lib/api.ts. The face image is already captured as a base64 string in component state — include it as face_image_base64 in the payload. On success, redirect to /verify. On error, show the API error message."

---

### PRIORITY 3: Wire the Identity Verification Flow (Days 3-4)

**Step 5 — Connect Verify page to real AI**

> "Read frontend/app/verify/page.tsx. The page currently has a multi-phase UI (scanning, move_up, etc.) but no real AI call. Replace the verification flow:
> 1. On 'Verify Identity' button click: capture a frame from the camera videoRef using a hidden canvas
> 2. Convert canvas to base64 JPEG: canvas.toDataURL('image/jpeg', 0.8)
> 3. Call POST /api/ai/verify (which Kweka's AI service handles via proxy — use NEXT_PUBLIC_WS_URL) OR call the backend POST /api/sessions/verify directly passing the base64 image
> 4. Actually: the verify flow should be: capture frame → POST to AI service /verify-identity → if match, call sessionsApi.verify(session_id, confidence) → redirect to exam
> 5. If match fails: show retry. After 3 failures: show 'Contact administrator' screen.
> 6. Get session_id from localStorage (it was stored when the student started the exam).
> Keep the phase-based UI — just drive it with the real verification response."

---

### PRIORITY 4: Add Socket.io Frame Loop to Exam Page (Days 5-7)

**Step 6 — Add Socket.io to the Exam page (do this in 3 separate prompts)**

**Prompt A — Socket.io connection:**
> "Read frontend/app/exam/page.tsx. Do NOT change any existing exam logic. ADD a Socket.io client:
> 1. Import { io } from 'socket.io-client' (add socket.io-client to package.json if missing)
> 2. In useEffect on mount: connect to process.env.NEXT_PUBLIC_WS_URL
> 3. On connect: emit 'join_session' with the session_id from localStorage
> 4. Store the socket in a useRef so it persists across renders
> 5. On component unmount: socket.disconnect()
> Do not add the frame capture yet — just the connection."

**Prompt B — Frame capture loop:**
> "Read frontend/app/exam/page.tsx. The video stream is already rendering in a videoRef. ADD frame capture on top of the existing Socket.io connection from Prompt A:
> 1. Create a hidden canvas element in the JSX (width=320, height=240, style display:none)
> 2. In useEffect: set up setInterval every 3000ms
> 3. In the interval: draw videoRef.current to the canvas context at 320x240, then canvas.toDataURL('image/jpeg', 0.6) to get base64
> 4. Emit 'webcam_frame' on the socket: {session_id, frame_base64, timestamp: new Date().toISOString()}
> 5. Clear the interval on unmount.
> Do not add warning handling yet."

**Prompt C — Warning handling:**
> "Read frontend/app/exam/page.tsx. ADD Socket.io event handling for warnings:
> 1. Listen for 'anomaly_result' event: update local state with {warningCount, gazeDirection}
> 2. Listen for 'session_locked' event: immediately call submitExam() then show the lock overlay
> 3. Create a WarningToast component (in this same file or as an import): shows animated red banner 'Warning X of 3: Suspicious behaviour detected.' — positioned fixed at top, auto-dismisses after 5s
> 4. Create a LockOverlay component: full-screen dark overlay with message 'Your exam has been automatically submitted due to repeated violations.' No close button.
> 5. Wire warningCount to show WarningToast when count changes (1 or 2), and LockOverlay when session_locked fires."

---

### PRIORITY 5: Tab Switch Detection (Day 7)

**Step 7**
> "Read frontend/app/exam/page.tsx. ADD document.addEventListener('visibilitychange') in the useEffect that sets up Socket.io. When document.visibilityState === 'hidden': call sessionsApi.log(session_id, 'tab_switch') from frontend/lib/api.ts. Show the WarningToast immediately. Also log when the window loses focus: window.addEventListener('blur', ...). Clean up both listeners on unmount."

---

### PRIORITY 6: Replace All Mock Data (Days 8-12)

Do each page separately. For each one:

**Dashboard (GET exams, GET results, GET warnings):**
> "Read frontend/app/dashboard/page.tsx. The 'My Exams' tab uses a hardcoded exams array. Replace it: on tab select, call examsApi.list() from frontend/lib/api.ts, store result in state, render it. Add loading spinner and error state. The exam cards already exist — just feed them real data."

**Lecturer page (exam CRUD):**
> "Read frontend/app/lecturer/page.tsx. The exam creation form submits but doesn't call an API. Wire the save/publish buttons to examsApi.create() and examsApi.publish() from frontend/lib/api.ts."

**Admin dashboard (session list):**
> "Read frontend/app/admin/page.tsx. Replace the hardcoded student session array with a real call to GET /api/sessions (admin only) from the backend. The table and charts already render correctly — just feed them real data from the API."

---

### PRIORITY 7: Protected Routes (Day 12)

**Step 8**
> "Create frontend/components/protected-route.tsx: a wrapper component that reads 'token' from localStorage, decodes the JWT payload (without verification — just base64 decode the middle part), checks role. If no token → redirect to /. If role doesn't match allowedRoles prop → redirect to /. Wrap the dashboard, exam, lecturer, and admin pages with this component. The token decoded role field is 'student', 'lecturer', or 'admin'."

---

# DERICK G. MHIDZE — Backend Engineer

## Important Note on Tech Stack

The original plan specified Node.js + Express. You started building with Python Flask. **Stick with Flask** — it's the right call given the AI team uses Python too. Do NOT switch to Node.js now. The entire backend is Python Flask + SQLAlchemy + PostgreSQL.

## Your Current Priorities (in order)

### PRIORITY 1: Database Setup (Days 1-2)

**Step 1 — Scaffold the Flask backend properly**

Open Claude Code in `backend/`:
> "Read the current backend folder structure. Reorganize or extend it to have this structure:
> - app.py: Flask app factory pattern, register all blueprints
> - config.py: Config class loading from .env (DATABASE_URL, JWT_SECRET, JWT_EXPIRY_HOURS=8, SMTP_*, ADMIN_EMAIL, AI_SERVICE_URL)
> - extensions.py: SQLAlchemy db = SQLAlchemy(), Migrate = Migrate() instances
> - models/: user.py, facial_image.py, exam.py, question.py, exam_session.py, behavioral_log.py, report.py
> - routes/: auth.py, exams.py, sessions.py, reports.py, images.py
> - middleware/: auth.py (JWT decorator), role.py (role check decorator)
> - .env.example with all required variables
> - requirements.txt: flask, flask-sqlalchemy, flask-migrate, flask-cors, psycopg2-binary, pyjwt, bcrypt, python-dotenv, marshmallow
> Keep any existing working code — just reorganize to this structure."

**Step 2 — Create all 7 SQLAlchemy models**

Tell Claude:
> "Read .claude/database-schema.md for all 7 tables. Create the SQLAlchemy models in backend/models/.
> For each table, create a Python class with:
> - Correct column types (Integer, String, Boolean, DateTime, JSONB for event_data)
> - All constraints: nullable=False where NOT NULL, unique=True, default values
> - Foreign key relationships with backref
> - A __repr__ and a to_dict() method on each model
> Pay special attention to exam_sessions: warning_count must be Integer, nullable=False, default=0"

**Step 3 — Run Alembic migrations**

```bash
cd backend
flask db init           # only needed once — creates migrations/ folder
flask db migrate -m "initial 7 tables"
flask db upgrade        # applies to postgres
```

Verify all 7 tables created: open psql and run `\dt`

---

### PRIORITY 2: Authentication (Days 3-5)

**Step 4 — JWT middleware**

> "Create backend/middleware/auth.py with two decorators:
> 1. @require_auth: extracts 'Authorization: Bearer TOKEN' header, verifies with PyJWT using JWT_SECRET, attaches decoded payload to flask.g.current_user. Returns 401 {error:'Missing or invalid token'} if invalid.
> 2. @require_role(*roles): checks flask.g.current_user['role'] is in the roles tuple. Returns 403 {error:'Insufficient permissions'} if not.
> Apply @require_auth first, then @require_role inside each route as a second decorator."

**Step 5 — Register endpoint**

> "Build POST /api/auth/register in backend/routes/auth.py:
> 1. Validate request JSON with marshmallow schema: full_name (required string), reg_number (required, pattern T##-##-#####), email (required email), department (optional), password (required, min 8 chars), face_image_base64 (required string)
> 2. Check reg_number and email not already in users table. Return 409 if duplicate.
> 3. Hash password: bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
> 4. Save User to db with role='student' (default)
> 5. Decode face_image_base64 → save as JPEG to storage/faces/{user_id}.jpg
> 6. Save FacialImage record: user_id, file_path, embedding=None (filled by AI service later)
> 7. Return 201 {user_id, message:'Registration successful'}
> CRITICAL: never log or return the password hash in any response"

**Step 6 — Login endpoint**

> "Build POST /api/auth/login in backend/routes/auth.py:
> 1. Validate: reg_number, password, role
> 2. Find user by reg_number. If not found: return 401 {error:'Invalid credentials'} — do NOT say reg_number not found
> 3. bcrypt.checkpw(password.encode(), user.password_hash)
> 4. If password wrong: return 401 {error:'Invalid credentials'} — same generic message
> 5. Check user.role matches requested role. If mismatch: 401 same message.
> 6. Generate JWT: payload = {user_id, role, exp: now + 8 hours}, signed with JWT_SECRET, algorithm HS256
> 7. Return 200 {token, user: {user_id, full_name, role, reg_number}}
> CRITICAL: password_hash must NEVER appear in the response"

---

### PRIORITY 3: Exam Endpoints (Days 6-8)

**Step 7**

> "Build the exam CRUD endpoints in backend/routes/exams.py. Decorate all with @require_auth.
> Read .claude/architecture.md for the exact request/response format.
> - POST /api/exams: @require_role('lecturer') — create exam + questions in a transaction
> - GET /api/exams: no role restriction — return all active exams to students, all of their own to lecturers
> - GET /api/exams/:exam_id: return exam details. For students: omit correct_answer from questions.
> - PUT /api/exams/:exam_id: @require_role('lecturer') — check lecturer owns this exam (exam.lecturer_id == g.current_user['user_id'])
> - PATCH /api/exams/:exam_id/publish: @require_role('lecturer') — set status='active'"

---

### PRIORITY 4: Session + Warning Logic (Days 8-12) — MOST CRITICAL

**Step 8 — Session start and verify**

> "Build in backend/routes/sessions.py:
> POST /api/sessions/start: @require_auth, @require_role('student')
> - Check no active session exists for (student_id, exam_id) — return 409 if yes
> - Create ExamSession(student_id=g.current_user.user_id, exam_id, status='pending', warning_count=0, identity_verified=False)
> - Return {session_id, exam: {title, duration_min, questions (without correct_answer)}}

> POST /api/sessions/verify: @require_auth
> - Receive {session_id, confidence_score}
> - If confidence_score > 0.6: set identity_verified=True, status='active', started_at=now()
> - Return {identity_verified: true/false}"

**Step 9 — Warning escalation (most critical endpoint)**

> "Build POST /api/sessions/log in backend/routes/sessions.py. This is the most critical endpoint.
> Read .claude/database-schema.md carefully for behavioral_logs and exam_sessions tables.
>
> Requirements:
> 1. @require_auth — validate session belongs to current user OR is called by AI service
> 2. Validate: session_id (int), event_type (one of: gaze_away, head_turned, face_absent, tab_switch, multiple_faces)
> 3. Use a SQLAlchemy transaction (db.session):
>    a. INSERT behavioral_log: session_id, event_type, event_data, logged_at=now()
>    b. UPDATE exam_sessions SET warning_count = warning_count + 1 WHERE session_id = X
>    c. COMMIT both atomically — if either fails, ROLLBACK and return 500
> 4. Query the updated warning_count from DB (re-fetch after commit)
> 5. If warning_count >= 3:
>    a. Call auto_submit_session(session_id) — this saves all current answers and sets status='locked'
>    b. Call send_lecturer_alert(session_id) — sends email
>    c. Return {warning_count: 3, auto_submitted: True}
> 6. Otherwise: return {warning_count: new_count, auto_submitted: False}
>
> ALSO build auto_submit_session(session_id) as a helper:
> - Set exam_session.status = 'locked', exam_session.submitted_at = now()
> - Call generate_report(session_id)
>
> ALSO build send_lecturer_alert(session_id) using Python smtplib:
> - Query session, student name, exam title, violation sequence with timestamps
> - Send HTML email to lecturer.email AND ADMIN_EMAIL
> - Subject: 'ALERT: Exam auto-submitted — [student_name] — [exam_title]'"

**Step 10 — Submit and Report Generation**

> "Build POST /api/sessions/:session_id/submit and GET /api/reports/:session_id.
> Read .claude/architecture.md for response formats.
> 
> For submit: save each answer to a student_answers table (add this 8th table if needed: question_id, session_id, selected_answer, is_correct). Calculate score = correct_answers / total_questions * 100. Set session.status='completed'. Call generate_report(session_id).
>
> For generate_report(session_id):
> - Count each event_type from behavioral_logs
> - total_anomalies = sum of all counts
> - risk_level: 'high' if total > 10 OR warning_count >= 3, 'medium' if total > 5, 'low' otherwise
> - INSERT into reports table
>
> GET /api/reports/:session_id: @require_role('lecturer','admin') — return full report with logs"

---

# BECKHAM Y. MWAKANJUKI — AI / ML Engineer

## Working Environment: Google Colab (GPU required for training)

All training notebooks live in Google Colab. Scripts committed to the repo in `ml-training/` (no model files — just the .py and .ipynb scripts).

### PRIORITY 1: Set Up Colab Environment (Day 1)

**Step 1 — Create your Colab notebook**

Open Google Colab → New notebook → Rename: `FYP_AI_Training_Notebook.ipynb`

**Step 2 — Enable GPU**
Runtime → Change runtime type → T4 GPU → Save

**Step 3 — Setup cell (run this at start of EVERY session)**

Paste this into Cell 1 and run it:
```python
# Cell 1: Environment Setup
!pip install -q torch torchvision facenet-pytorch opencv-python-headless mediapipe onnx onnxruntime scikit-learn matplotlib pandas tqdm

from google.colab import drive
drive.mount('/content/drive')

import os
BASE_DIR = '/content/drive/MyDrive/fyp-ai'
os.makedirs(f'{BASE_DIR}/datasets/lfw', exist_ok=True)
os.makedirs(f'{BASE_DIR}/datasets/casia', exist_ok=True)
os.makedirs(f'{BASE_DIR}/datasets/mpii_gaze', exist_ok=True)
os.makedirs(f'{BASE_DIR}/datasets/biwi', exist_ok=True)
os.makedirs(f'{BASE_DIR}/checkpoints', exist_ok=True)
os.makedirs(f'{BASE_DIR}/exports', exist_ok=True)
os.makedirs(f'{BASE_DIR}/logs', exist_ok=True)
print("Environment ready. GPU:", torch.cuda.get_device_name(0))
```

---

### PRIORITY 2: Download and Preprocess Datasets (Days 2-5)

**Step 4 — Download LFW (start here — smallest dataset, test your pipeline)**

In Colab:
```python
# Cell 2: Download LFW
!wget -q http://vis-www.cs.umass.edu/lfw/lfw.tgz -O /tmp/lfw.tgz
!tar -xzf /tmp/lfw.tgz -C /content/drive/MyDrive/fyp-ai/datasets/
print("LFW downloaded")
```

**Step 5 — Download MPIIFaceGaze**

Go to: https://www.mpi-inf.mpg.de/departments/computer-vision-and-machine-learning/research/gaze-based-human-computer-interaction/appearance-based-gaze-estimation-in-the-wild/

Fill the data request form → download the dataset → upload to Google Drive manually, then:
```python
# It will be in your Drive. Reference it as:
MPII_DIR = f'{BASE_DIR}/datasets/mpii_gaze'
```

**Step 6 — CASIA-WebFace**

This dataset requires academic access. Options:
- Request from: search "CASIA-WebFace dataset Kaggle" — some mirrors exist
- Alternative: Use MS-Celeb-1M subset on Kaggle (search "face recognition dataset kaggle")
- If access takes time: proceed with LFW first (smaller but sufficient for testing)

**Step 7 — Preprocessing script (use Claude/Gemini to generate)**

Open a new Gemini or Claude session and say:
> "Write a Python preprocessing script for face recognition training that:
> 1. Takes an input directory of images organized as label/image.jpg (LFW format)
> 2. Uses facenet_pytorch MTCNN to detect and align faces
> 3. Resizes all detected faces to 160x160 pixels
> 4. Normalizes pixel values to [0, 1]
> 5. Applies augmentation: random horizontal flip (p=0.5), brightness jitter ±20%, Gaussian blur (p=0.1)
> 6. Splits into 70% train / 15% val / 15% test — stratified by identity
> 7. Saves as PyTorch ImageFolder-compatible structure at output_dir/train/, output_dir/val/, output_dir/test/
> 8. Saves split statistics (num_classes, num_images_per_split) to a JSON file
> 9. Includes a progress bar with tqdm and skips images where MTCNN finds no face
> Test it on 100 images first before running on full dataset."

Run on LFW first. When it works, run on CASIA-WebFace.

---

### PRIORITY 3: Train FaceNet (Days 6-10)

**Step 8 — Generate training script**

Ask Claude/Gemini:
> "Write a PyTorch training script for facial recognition using FaceNet (InceptionResnetV1 from facenet-pytorch, pretrained='vggface2'). Requirements:
> - Loss: Triplet loss with margin=0.2 and semi-hard mining
> - Optimizer: Adam, lr=1e-4, weight_decay=1e-5
> - Scheduler: ReduceLROnPlateau patience=3, factor=0.5
> - Batch size: 32 (triplets)
> - Epochs: 20 with early stopping after 5 patience epochs
> - Every epoch: evaluate on val set — compute: (1) accuracy on verification task (pairs threshold 0.6), (2) FAR (false accept rate), (3) FRR (false reject rate)
> - Save best checkpoint as 'facenet_best.pt' when val accuracy improves
> - Save training log to 'training_log.csv': epoch, train_loss, val_accuracy, FAR, FRR, lr
> - Load from checkpoint if 'facenet_checkpoint.pt' exists (for session resumption)
> Include: from google.colab import files for saving to Drive"

**Step 9 — Run training and monitor**

- Run training
- After every 5 epochs: look at the training_log.csv
- If val_accuracy plateaus below 85% after 10 epochs: paste the CSV into Claude and say:
  > "My FaceNet training has plateaued at [X]% accuracy. Here are epoch 1-10 logs: [paste CSV]. What should I change? Give me 3 specific hyperparameter changes with reasoning."

**Target metrics after training:**
- Accuracy ≥ 90%
- FAR < 5%
- FRR < 10%

**Step 10 — Export FaceNet**

```python
# After training completes
import torch
import onnx
from facenet_pytorch import InceptionResnetV1

model = InceptionResnetV1(pretrained='vggface2')
model.load_state_dict(torch.load(f'{BASE_DIR}/checkpoints/facenet_best.pt'))
model.eval()

dummy_input = torch.randn(1, 3, 160, 160)
torch.onnx.export(
    model, dummy_input,
    f'{BASE_DIR}/exports/facenet_best.onnx',
    input_names=['input'],
    output_names=['embedding'],
    dynamic_axes={'input': {0: 'batch_size'}, 'embedding': {0: 'batch_size'}},
    opset_version=11
)
print("FaceNet exported to ONNX")

# Verify the export
import onnxruntime as ort
sess = ort.InferenceSession(f'{BASE_DIR}/exports/facenet_best.onnx')
output = sess.run(None, {'input': dummy_input.numpy()})
print(f"Output shape: {output[0].shape}")  # should be (1, 512)
```

---

### PRIORITY 4: Train Gaze Model (Days 8-12)

**Step 11 — Generate L2CS-Net fine-tuning script**

Ask Claude/Gemini:
> "Write a PyTorch fine-tuning script for gaze estimation using L2CS-Net. The task is 5-class classification: Screen, Left, Right, Up, Down (not regression).
> - Base model: ResNet-50 pretrained on ImageNet (torchvision.models.resnet50)
> - Replace final FC layer with Linear(2048, 5) for 5 gaze classes
> - Load MPIIFaceGaze dataset: each sample is a 224x224 face crop with a gaze label
> - Loss: CrossEntropyLoss
> - Optimizer: Adam lr=1e-4
> - Scheduler: CosineAnnealingLR
> - Batch size: 64, Epochs: 15
> - Evaluate per-class accuracy and overall MAE (convert class to angle: Screen=0°, Left=-30°, Right=30°, Up=-20°, Down=20°)
> - Save best model as 'l2cs_best.pt'
> - Export to ONNX: input (1, 3, 224, 224), output (1, 5) class logits"

**Target:** MAE < 5 degrees, per-class accuracy > 80%

---

### PRIORITY 5: Head Pose Estimator (Days 10-12)

**Step 12 — No training needed. Just implement and validate.**

Ask Claude/Gemini:
> "Write a Python class HeadPoseEstimator using MediaPipe Face Mesh and OpenCV solvePnP:
> - __init__: initialize MediaPipe FaceMesh with static_image_mode=False, refine_landmarks=True
> - estimate(bgr_frame) → dict: detects 6 key landmarks (indices: 1=nose tip, 152=chin, 263=left eye, 33=right eye, 287=left mouth, 57=right mouth), runs solvePnP with a 3D face model, returns {yaw: float, pitch: float, roll: float, alert: bool}
> - alert = True if abs(yaw) > 30 OR abs(pitch) > 20
> - Include the standard 3D face model reference points (nose, chin, eye corners, mouth corners)
> Also write a validation function that loads BIWI Head Pose dataset annotations, runs estimate() on each image, computes MAE for yaw, pitch, roll separately."

Commit the `HeadPoseEstimator` class to `ml-training/head_pose.py`. Kweka will import it.

---

### WEEK 5 HARD DEADLINE: Model Handoff to Kweka

By end of Week 5 you MUST deliver to Kweka via Google Drive share:
1. `facenet_best.onnx` — input: (1, 3, 160, 160) normalized to [-1,1], output: (1, 512) embedding
2. `l2cs_best.onnx` — input: (1, 3, 224, 224) normalized ImageNet, output: (1, 5) logits
3. `head_pose.py` — the HeadPoseEstimator class
4. A text document: `model_specs.md` — exact preprocessing steps for each model

**If training is not converging by Week 4, tell Kweka immediately.** The fallback plan is to use the pretrained weights without fine-tuning (facenet_pytorch's `pretrained='vggface2'` gives ~85% which is close enough to ship).

---

# ABDUL-SWAMAD J. HASSAN — Documentation Engineer

## Tools: Claude.ai (this Project) + Claude Code for docs in the repo

### PRIORITY 1: API Contract Document (Start Immediately — Unblocks the Team)

**Step 1 — Create docs/api-contract.json**

Open Claude Code in the project root:
> "Read .claude/architecture.md which has all the API endpoint specifications. Generate docs/api-contract.json as an OpenAPI 3.0 YAML file (save as docs/swagger.yaml). Include:
> - Info section: title 'AI Exam Proctoring API', version '1.0.0', description
> - All endpoints from .claude/architecture.md
> - Request body schemas with field types and validation rules
> - Response schemas for 200, 201, 400, 401, 403, 404, 409, 422, 500
> - Security schema: bearerAuth (JWT)
> - Tag groups: Auth, Exams, Sessions, Reports, Images"

Commit `docs/swagger.yaml` to branch `docs/abdul-api-documentation` and push. This is the shared contract everyone works from.

---

### PRIORITY 2: System Requirements Specification (Week 1-2)

**Step 2 — Generate SRS**

In Claude.ai (this Project), say:
> "Using the project proposal (which you have uploaded), generate a System Requirements Specification document. For functional requirements FR-01 to FR-23, create a table with: Req ID, Description, Priority (High/Medium/Low), Acceptance Criteria, Responsible Member, Status (Not Started/In Progress/Complete). For non-functional requirements (performance, security, usability targets), use the quality metrics table from Section 1."

Save the result to `docs/srs.md`. Share with team on Google Docs.

---

### PRIORITY 3: Data Dictionary (Week 2)

**Step 3**

Open Claude Code:
> "Read .claude/database-schema.md. Generate docs/data-dictionary.md as a detailed data dictionary. For each of the 7 tables, create a table with these columns: Column Name | Data Type | Nullable | Default | Constraints | Business Rule | Example Value | Related Columns.
> Pay special attention to:
> - exam_sessions.warning_count: document the 3-strike rule explicitly as a business rule
> - facial_images.file_path: note it must never be exposed to student-role API responses
> - behavioral_logs.event_type: list all valid enum values with their trigger conditions"

---

### PRIORITY 4: Test Cases (Weeks 3-6, ongoing)

As each backend endpoint goes live, write test cases the same week. Do NOT let this fall behind.

**Step 4 — Unit test cases for auth (FR-01 to FR-04)**

> "Write unit test cases in Markdown table format for these functional requirements (paste the FR descriptions from the SRS). For each test case include: TC-ID | Req ID | Description | Preconditions | Test Steps | Test Data | Expected Result | Pass/Fail"

Suggested test case coverage:
- TC-01: Successful student registration with valid data
- TC-02: Registration with duplicate reg_number → 409 error
- TC-03: Login with correct credentials → JWT returned
- TC-04: Login with wrong password → 401, no field hint
- TC-05: Access protected route without JWT → 401
- TC-06: Access lecturer route with student JWT → 403
- TC-07: Face verification with matching face → identity_verified=true
- TC-08: Face verification with non-matching face → identity_verified=false, retry shown

**Step 5 — Execute test cases with the team**

Create a Google Sheet: `AI Proctoring — Test Execution Log`
Columns: TC-ID | Req ID | Tester | Date | Actual Result | Pass/Fail | Defect ID (if fail)

For each FAIL, log a defect:
- Defect ID: D-001, D-002, etc.
- Title, Steps to Reproduce, Expected, Actual, Severity (Critical/High/Medium/Low), Assigned To

---

### PRIORITY 5: SUS Usability Testing (Week 9)

**Step 6 — Prepare test materials**

Ask Claude Code:
> "Write a usability test session script for the AI Exam Proctoring System. Include:
> 1. Facilitator introduction script (2 minutes)
> 2. Five task scenarios: (1) Register with face capture, (2) Log in and verify identity, (3) Take a 5-question practice exam, (4) View a warning notification, (5) Log out
> 3. The standard 10-item SUS questionnaire (numbered 1-10, odd=positive, even=negative)
> 4. Post-session 5-question interview guide
> Save as docs/usability/sus-test-script.md"

Recruit at least 10 student participants who were not involved in building the system.

**Step 7 — Calculate SUS score**

After all sessions, in Claude.ai:
> "Here are SUS responses from [N] participants: [paste data]. Calculate the mean SUS score, standard deviation, and 95% confidence interval. Identify the 3 most common usability issues. Our target is ≥ 70/100 (equivalent to 3.5/5.0). Did we meet the target? Format the results as a section for Chapter 6 of our final report."

---

### PRIORITY 6: Final Report (Weeks 8-11)

Write the report chapter by chapter using Claude.ai. Always paste actual results and screenshots — never fabricate data.

**Structure:**
- Chapter 1: Introduction (background, problem statement, objectives)
- Chapter 2: Literature Review (facial recognition, gaze tracking, exam proctoring systems)
- Chapter 3: Methodology (system design, tech stack, development approach)
- Chapter 4: System Analysis and Design (use cases, DB schema, architecture diagrams)
- Chapter 5: Implementation (code excerpts, screenshots of built system)
- Chapter 6: Testing and Evaluation (test results, SUS scores, AI metrics)
- Chapter 7: Conclusion and Recommendations

For each chapter, say in Claude.ai:
> "Draft Section [X] of our final report. Context: [paste relevant info]. Our actual results are: [paste]. Format to UDOM standards: Times New Roman 12pt, 1.5 line spacing. Do not fabricate results — use only the data I provide."

---

# TEAM COORDINATION RULES

## Git Workflow Summary

```bash
# YOUR daily routine:
git checkout feat/your-branch
git pull origin feat/your-branch
# ...do work...
git status                    # always check before adding
git add specific-files-only   # never git add . blindly
git commit -m "feat: description"
git push origin feat/your-branch
# Open PR on GitHub → assign Kweka → do NOT merge yourself
```

## Communication Protocol

- **Daily**: Update the NEXT_STEPS.md with what you completed (check items off)
- **Blocking issue**: Tell Kweka within the same day, not next week
- **Model training not converging by Week 4**: Beckham tells Kweka immediately — fallback plan exists
- **Kweka**: Review PRs within 24 hours

## Critical Milestones

| Deadline | Milestone | Risk if Missed |
|----------|-----------|----------------|
| +3 days | Docker Compose working, .gitignore complete | Team can't run local stack |
| +5 days | Backend auth endpoints (register/login) working | Julius can't wire frontend |
| +7 days | Database migrations running | All backend work is blocked |
| +14 days | Identity verification end-to-end | Exam flow is broken |
| +21 days | Warning escalation working (all 3 strikes + email) | Core proctoring feature missing |
| +35 days | Beckham model handoff to Kweka | AI service uses stubs, demo looks fake |
| +42 days | Full system end-to-end: register → exam → report | Nothing left to integrate |
| +56 days | All system tests complete | Evaluation phase blocked |
| +63 days | SUS testing done, AI metrics documented | Chapter 6 empty |
| +77 days | Final report draft complete | Nothing to submit |
