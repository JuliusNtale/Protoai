# How to Use Claude Code Effectively — Team Guide

## Rule 1: Always start your session by reading project context

When you open Claude Code in your terminal, say:
```
Read CLAUDE.md and .claude/project-state.md, then tell me the current state of [your area].
```
This loads context so Claude understands your exact system — not a generic one.

---

## Rule 2: One task at a time — never ask Claude for "the whole thing"

BAD prompt:
> "Build the entire backend authentication system"

GOOD prompt sequence:
1. "Read backend/app.py. Add a POST /api/auth/register endpoint that validates the request body using marshmallow, hashes the password with bcrypt (12 rounds), saves the user to the users table using SQLAlchemy, and returns {user_id, message}. Follow the existing Flask app pattern in app.py."
2. "Now add POST /api/auth/login: validate reg_number and password, compare password with bcrypt, return a JWT signed with HS256 containing {user_id, role} with 8h expiry. Return HTTP 401 with generic message if credentials are wrong."
3. "Now write a `require_auth` decorator that extracts the Bearer token from Authorization header, verifies it with PyJWT, attaches the payload to flask.g.user, and returns 401 if missing or invalid."

---

## Rule 3: Always paste the relevant schema / contract before asking Claude to build

Reference the files in `.claude/`:
```
Read .claude/database-schema.md for the exam_sessions table, then build 
POST /api/sessions/log that inserts a BEHAVIORAL_LOG row and atomically 
increments warning_count in exam_sessions using a SQLAlchemy transaction.
Return the updated warning_count. If it reaches 3, trigger auto-submit logic.
```

---

## Role-Specific Prompt Templates

### Julius (Frontend — Next.js)
```
I am building the frontend for an AI exam proctoring system. 
Read .claude/architecture.md for the API contract.
The frontend is Next.js 15 with React 19, TypeScript, Tailwind CSS, shadcn/ui.
Currently in frontend/app/[page]/page.tsx.

Task: [specific task]
Constraint: [any specific requirement]
```

**Connecting mock data to real API:**
```
Read frontend/app/dashboard/page.tsx. The current exam list uses hardcoded mock data 
starting at line [X]. Replace it with a real API call: GET /api/exams using axios 
to http://localhost:5000. Use a useEffect with loading/error state. The JWT token 
is stored in localStorage under key "token" — add it as Authorization: Bearer header.
```

**Socket.io frame loop:**
```
Read frontend/app/exam/page.tsx. Add a Socket.io client that:
1. Connects to ws://localhost:8000 on component mount
2. Every 3 seconds, captures a frame from the existing videoRef using a hidden canvas
3. Converts the canvas to base64 JPEG
4. Emits "webcam_frame" with { session_id, frame_base64, timestamp: new Date().toISOString() }
5. Listens for "anomaly_result" and updates a local warningCount state
6. When warningCount reaches 3, show the full-screen lock overlay and call submitExam()
Do not remove any existing exam logic — only add the Socket.io layer.
```

---

### Derick (Backend — Python Flask)
```
I am building the backend REST API for an AI exam proctoring system using Python Flask 
and PostgreSQL with SQLAlchemy ORM.
Read .claude/database-schema.md for the table structures.
Read .claude/architecture.md for the exact API contract I must implement.
Currently in backend/[file].

Task: [specific endpoint]
```

**Warning escalation (most critical):**
```
Read .claude/database-schema.md for exam_sessions and behavioral_logs tables.
Read .claude/architecture.md for POST /api/sessions/log.

Build this endpoint with these EXACT requirements:
1. Validate request: session_id (int), event_type (string), event_data (optional JSON)
2. Use a SQLAlchemy database transaction (db.session) to:
   a. Insert a new behavioral_logs row with event_type, event_data, logged_at=now()
   b. Atomically increment warning_count in exam_sessions WHERE session_id = X
   c. Commit both operations together — if either fails, rollback
3. After commit, check if warning_count >= 3
4. If yes: call auto_submit_session(session_id) and send_lecturer_alert(session_id)
5. Return { warning_count: new_count, auto_submitted: bool }
Include error handling for session not found (404) and database errors (500).
```

---

### Kweka (AI Service — Python Flask)
```
I am building the AI service for an exam proctoring system.
It's a Python Flask app on port 8000.
Read .claude/architecture.md for the exact API contract.

I need: [specific endpoint or feature]
Models available: [list what Beckham has exported so far, or "using stubs until Week 5"]
```

**Building with model stubs (before Beckham delivers):**
```
Build POST /verify-identity in Flask. For now, use a STUB implementation that:
- Accepts { user_id, image_base64 }
- Decodes the base64 image with PIL
- Uses MTCNN to detect if a face exists
- Returns { match: True, confidence: 0.95 } if face detected (stub — real model comes Week 5)
- Returns { error: "No face detected" } if MTCNN finds nothing
Structure the code so I can replace the stub with real FaceNet ONNX inference by changing 
only the compute_similarity() function. Include proper error handling.
```

---

### Beckham (ML Training — Google Colab)
```
I am training ML models for a facial recognition and gaze estimation system.
Training runs on Google Colab with T4 GPU.
Models: FaceNet (InceptionResnetV1), L2CS-Net for gaze.
Dataset paths are mounted at /content/drive/MyDrive/fyp-ai/datasets/

Task: [specific training script or evaluation]
```

**If training plateaus:**
```
My FaceNet training has plateaued. Here is my training log after 12 epochs:
[paste the CSV log or loss numbers]

Current config: Triplet loss, Adam lr=1e-4, batch=32, pretrained=vggface2
Validation accuracy: 78% (target 90%)

What should I change? Give me specific hyperparameter changes to try and explain why 
each change should help. Then update my training script to apply your recommendation.
```

---

### Abdul (Documentation — Claude.ai + Claude Code)
```
I am writing documentation for an AI exam proctoring system for my final year project 
at the University of Dodoma.

Context: [paste the relevant spec section or describe what was actually built]
Task: [specific document section]
Format: [UDOM report format / Swagger YAML / Markdown test cases]
```

---

## Debugging with Claude

**GOOD (paste the exact error):**
```
I got this error running my Flask app:
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection refused
    at backend/config/database.py line 12

Here is my database.py: [paste full file]
My .env has DATABASE_URL=postgresql://user:pass@localhost:5432/proctoring_db
Fix the error and explain what caused it.
```

**BAD:**
> "My database isn't connecting. How do I fix it?"

---

## What Claude Will NOT Do Well Without Context

- Build an endpoint matching your exact table schema — always paste the schema
- Connect the frontend to your specific API — always paste the contract
- Fix training that doesn't converge — always paste the loss logs
- Write test cases for your specific requirements — always paste the FR being tested

**The quality of Claude's output = the quality of context you provide.**
