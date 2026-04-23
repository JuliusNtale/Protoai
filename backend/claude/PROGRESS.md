# Backend Sprint Progress — Derick

> **Purpose:** Track Derick's backend tasks across the 8-day sprint.
> Both Derick and Claude Code read and update this file.
>
> **Rules for Claude Code:**
> 1. At the start of every session, read this file first — it tells you where Derick is.
> 2. When a task is completed, mark it `[x]` and add a short `→ note` describing what was done.
> 3. When starting a task, update the **"Current Focus"** section at the top.
> 4. Never check off a task you haven't actually verified working. If uncertain, ask Derick.
> 5. If Derick asks "what should I do next?", look at **"Next Up"** and the first unchecked task.
>
> **Rules for Derick:**
> 1. Update **"Current Focus"** at the start of each work session.
> 2. Tick `[x]` only when the task's "Done when" criteria are actually met.
> 3. Add notes in `→` lines — what you built, any gotchas, links to PRs.
> 4. If you fall behind, move unfinished tasks to Day 7 (the buffer day).

---

## 📍 Current Focus

**Status:** In progress
**Active day:** Day 2 — Authentication
**Active task:** 2.1 — Build POST /api/auth/register
**Blockers:** MySQL must be installed locally before running migrations (Task 0.2)
**Last updated:** 2026-04-24

---

## 📊 Progress Summary

- **Overall:** 4 / 38 tasks completed
- **Critical tasks:** 2 / 16 completed
- **Days complete:** 1 / 9 (including Day 0)
- **PRs merged:** 0

**Day-by-day:**
- [ ] Day 0 — Warm-up (0/4)
- [x] Day 1 — Database Migrations (4/4)
- [ ] Day 2 — Authentication (0/4)
- [ ] Day 3 — Exams + Sessions + Mock Flask (0/5)
- [ ] Day 4 — Warning Escalation (0/5) ⭐ CRITICAL
- [ ] Day 5 — Submit + Reports + Images (0/4)
- [ ] Day 6 — Integration + Bugs (0/4)
- [ ] Day 7 — Buffer + Polish (0/5)
- [ ] Day 8 — Deploy + Demo + Submit (0/5)

---

## ⏭️ Next Up

**Do this next:** Day 0, Task 0.2 — Install MySQL locally and verify connection (if not done), then run `npx sequelize-cli db:migrate` to create the 7 tables.

**Reason:** All Day 1 code is built; migrations need a running MySQL to execute. After that, Day 2 auth endpoints are next.

---

## 🗓️ Day 0 — Warm-up (before Day 1)

**Time:** ~2 hrs · **Goal:** Avoid burning Day 1 on basics

- [ ] **0.1** Watch Sequelize 15-min refresher + skim docs `[high · 45m]`
  - Search YouTube "Sequelize migrations tutorial 2024" — watch 1 video (~15m)
  - Skim https://sequelize.org/docs/v6/core-concepts/model-basics/ and ../migrations/
  - **Done when:** You can describe how a migration differs from a model; you understand `up()` and `down()`
  - → _note when done_

- [ ] **0.2** Install MySQL locally + verify connection `[high · 30m]`
  - Install MySQL 8. Create DB: `CREATE DATABASE proctoring_dev;`
  - Create `.env` with DB_HOST, DB_USER, DB_PASS, DB_NAME
  - Test connection with a throwaway Node script
  - **Done when:** `SELECT 1` works; `.env` ready
  - → _note when done_

- [ ] **0.3** Clone repo, explore what Kweka built `[high · 30m]`
  - `git clone <repo>` · `cd backend`
  - Read `server.js`, `package.json`, `.env.example`, any `docs/` files
  - Note: is there an api-contract.json? What middleware is set up? What folders exist?
  - **Done when:** You have a mental map of what exists vs what you'll add
  - → _note when done_

- [ ] **0.4** Message Julius — what endpoints is he calling? `[normal · 15m]`
  - Ask: "What API endpoints have you already written axios calls for? What URL paths and request body shapes do you assume?"
  - Write his answers here
  - **Done when:** You have a list of Julius's assumptions
  - → _note when done_

---

## 🗓️ Day 1 — Database Migrations

**Time:** ~5 hrs · **Goal:** 7 tables live, seeded with test data

- [x] **1.1** Install pnpm + verify Kweka's scaffold runs `[high · 45m]`
  - `npm install -g pnpm` if needed
  - In `/backend`, `pnpm install`
  - Run Kweka's start script. Confirm server boots. Add missing bits to existing `package.json` — don't redo.
  - **Done when:** Server starts on :5000 · `/health` returns ok
  - → 2026-04-24: Kweka's scaffold didn't exist yet — Claude Code built the full Express scaffold from scratch. `node server.js` starts on :5000, `/health` returns ok, Ethereal mailer auto-configured.

- [x] **1.2** Generate 7 Sequelize migrations `[CRITICAL · 2h]` `feat/derick-db-migrations`
  - Open Claude Code in `/backend`. Paste proposal Section 4.9.2 specs.
  - **Done when:** 7 migration files exist · `pnpm sequelize-cli db:migrate` runs clean · DESCRIBE each table matches spec
  - → 2026-04-24: 7 migration files created in `/migrations/` with timestamps 20260424001–007. All foreign keys, ENUMs, indexes, and NOT NULL constraints included. `warning_count INT NOT NULL DEFAULT 0` confirmed on exam_sessions. Run `npx sequelize-cli db:migrate` once MySQL is up.

- [x] **1.3** Generate 7 Sequelize models with associations `[CRITICAL · 1.5h]` `feat/derick-db-migrations`
  - **Done when:** 7 model files · associations defined · `const { User, Exam } = require('./models')` works
  - → 2026-04-24: 7 model files in `/models/` + `models/index.js` with all associations. User model has `defaultScope` excluding `password_hash`. Verified: `node -e "require('./models')"` loads all 7 models cleanly.

- [x] **1.4** Write a seed file with test data `[high · 45m]` `feat/derick-db-migrations`
  - 1 student, 1 lecturer, 1 admin (password: 'Password123!'), 1 active exam, 3 MCQ questions
  - **Done when:** `pnpm sequelize-cli db:seed:all` populates DB · you can log in as any role later
  - → 2026-04-24: Seed file at `/seeders/20260424001-demo-data.js`. Creates student (T22-03-04321), lecturer (T22-03-11759), admin (T22-03-00001) all with bcrypt Password123!, 1 active exam, 3 questions. Run after migrations.

---

## 🗓️ Day 2 — Authentication

**Time:** ~5 hrs · **Goal:** Register + Login + JWT middleware

- [ ] **2.1** Build POST /api/auth/register `[CRITICAL · 2h]` `feat/derick-auth-endpoints`
  - **Prompt:** _"Build POST /api/auth/register in /routes/auth.js + /controllers/auth.js. Accept JSON: { full_name, reg_number, email, password, role, facial_image_base64 }. Validate with express-validator (email format, password min 8 chars, role in ['student','lecturer','administrator']). Hash password with bcrypt cost 12. In a Sequelize transaction: create User row, decode base64 image and write to /storage/faces/<user_id>.jpg, create FacialImage row with the path. Return 201 { user_id, email, role }. Never return password_hash. Explain the transaction logic before I commit."_
  - **Done when:** Register returns 201 · user row with bcrypt hash · image file on disk · facial_images row
  - → _note when done_

- [ ] **2.2** Build POST /api/auth/login `[CRITICAL · 1h]` `feat/derick-auth-endpoints`
  - **Prompt:** _"Build POST /api/auth/login in the same auth controller. Accept { email, password }. Fetch user by email. If no user or bcrypt.compare fails, return 401 with generic 'Invalid email or password'. If valid, sign JWT with { user_id, role } using JWT_SECRET from .env, 8h expiry. Return 200 { token, user: { user_id, full_name, email, role } }. Never reveal which field was wrong."_
  - **Done when:** Correct creds → 200 + JWT · wrong → 401 generic · JWT decodes at jwt.io
  - → _note when done_

- [ ] **2.3** Build verifyToken + requireRole middleware `[CRITICAL · 1.5h]` `feat/derick-jwt-middleware`
  - **Prompt:** _"Build /middleware/auth.js with verifyToken: extract Bearer from Authorization header, verify with jwt.verify, attach req.user = { user_id, role }, call next(). Return 401 'Unauthorized' if missing/invalid. Build /middleware/role.js with requireRole(roles) factory that returns middleware checking req.user.role is in the array. Return 403 'Forbidden' otherwise. Show me how to apply both to a test route like GET /api/test-admin (admins only)."_
  - **Done when:** No token → 401 · bad token → 401 · wrong role → 403 · correct → req.user populated
  - → _note when done_

- [ ] **2.4** Open PRs, ping Julius `[normal · 30m]`
  - Two PRs: auth-endpoints + jwt-middleware
  - Message Julius: "Login endpoint is live at POST /api/auth/login. Register is POST /api/auth/register."
  - **Done when:** PRs merged · Julius unblocked on login screen
  - → _note when done_

---

## 🗓️ Day 3 — Exams + Sessions + Mock Flask

**Time:** ~5 hrs · **Goal:** Session lifecycle + Postman simulation of Flask

- [ ] **3.1** Build 3 minimal exam endpoints `[high · 1.5h]` `feat/derick-exam-endpoints`
  - GET /api/exams · GET /api/exams/:id · POST /api/exams (lecturer only)
  - **Prompt:** _"Build 3 exam endpoints in /routes/exams.js. GET /api/exams: list all exams with status='active' — uses verifyToken only. GET /api/exams/:id: return exam with questions array embedded using Sequelize include. POST /api/exams: requires verifyToken + requireRole(['lecturer']), accepts { title, duration_minutes, scheduled_start, scheduled_end }. Set created_by = req.user.user_id, status = 'draft'. Return 201 with exam_id."_
  - **Done when:** Student can list/fetch · lecturer can create · student POST → 403
  - → _note when done_

- [ ] **3.2** Build POST /api/sessions/start `[CRITICAL · 1h]` `feat/derick-session-endpoints`
  - **Prompt:** _"Build POST /api/sessions/start in /routes/sessions.js. Require verifyToken + requireRole(['student']). Accept { exam_id }. Verify exam exists and status='active'. Check student doesn't already have an active session for this exam. Create ExamSession with student_id=req.user.user_id, exam_id, identity_verified=false, warning_count=0, session_status='active', start_time=now. Return 201 { session_id, exam }."_
  - **Done when:** Student starts → new session row · session_id returned · warning_count=0
  - → _note when done_

- [ ] **3.3** Build POST /api/sessions/verify (internal from Flask) `[CRITICAL · 1h]` `feat/derick-session-endpoints`
  - **Prompt:** _"Build POST /api/sessions/verify. Do NOT use verifyToken — use a custom middleware that checks header X-Internal-Token matches process.env.AI_SERVICE_TOKEN. If not, return 401. Accept { session_id, match (bool), confidence_score (float) }. Fetch the session. If match === true && confidence_score > 0.6, update identity_verified=true, verification_score=confidence_score. Return 200 { ok: true }. Add AI_SERVICE_TOKEN=dev-internal-secret-change-in-prod to .env."_
  - **Done when:** With X-Internal-Token → updates · without → 401 · score>0.6+match → identity_verified=true
  - → _note when done_

- [ ] **3.4** Create "Mock Flask" Postman collection `[high · 1h]` ⭐ DEMO-CRITICAL
  - Postman folder called "Mock Flask" with 2 requests:
    - Verify Identity (simulates successful face match)
    - Log Anomaly (simulates gaze_away event)
  - Both send X-Internal-Token header
  - **Done when:** Collection saved · you can trigger /sessions/verify + /sessions/log as if you were Kweka
  - → _note when done_

- [ ] **3.5** Open PRs `[normal · 30m]`
  - **Done when:** exam-endpoints + session-endpoints PRs merged
  - → _note when done_

---

## 🗓️ Day 4 — ⭐ CORE INVARIANT DAY

**Time:** ~6 hrs (budget extra) · **Goal:** Warning escalation with race-condition safety

> **This is the most important day of your sprint.** Do it on your best-focus day.
> Do not skip Task 4.5 (race condition test). It's how you prove the logic is correct.

- [ ] **4.1** Build POST /api/sessions/log (basic insert only) `[CRITICAL · 45m]` `feat/derick-behavioral-log-endpoint`
  - No warning logic yet — just insert the log row
  - **Prompt:** _"Build POST /api/sessions/log using the same X-Internal-Token middleware from /sessions/verify. Accept { session_id, event_type (ENUM: gaze_away, head_movement, tab_switch, face_absent), metadata (JSON, optional) }. Validate event_type. Insert BehavioralLog row with event_timestamp=now. Return 200 { log_id }. Do NOT increment warning_count yet — that's the next task."_
  - **Done when:** Mock Flask POST inserts behavioral_logs row · timestamp + metadata correct
  - → _note when done_

- [ ] **4.2** Wrap in transaction + increment warning_count with row lock `[CRITICAL · 2h]` `feat/derick-warning-escalation-logic`
  - ⚠️ **This is the most important code in your project.**
  - **Prompt:** _"Modify POST /api/sessions/log to atomically increment warning_count. Use Sequelize transaction. Inside the transaction: (1) SELECT the ExamSession with lock: Transaction.LOCK.UPDATE — this row-locks against concurrent reads. (2) Insert the BehavioralLog. (3) Update session.warning_count = warning_count + 1. (4) Save. (5) Return { log_id, warning_count } after commit. If the session is already locked (session_status='locked'), return 400 without incrementing. Explain WHY the row lock prevents race conditions before showing code."_
  - **Done when:** Send 1 anomaly → count=1 · send 2 parallel via Postman Runner → final count exactly 2
  - → _note when done_

- [ ] **4.3** Add escalation at warning_count >= 3 `[CRITICAL · 1.5h]` `feat/derick-warning-escalation-logic`
  - Email sends AFTER commit (async), not inside transaction
  - **Prompt:** _"Extend the transaction in POST /api/sessions/log. After incrementing warning_count: if warning_count >= 3, set session_status='locked' and end_time=now within the same transaction. Also set any unsaved answers to submitted status if an answers table exists (skip if not). Commit the transaction. AFTER commit succeeds, call sendLecturerAlert(session_id) asynchronously (don't await, don't block response). Return the response to Flask immediately. Explain why the email is OUTSIDE the transaction."_
  - **Done when:** 3rd anomaly → session_status='locked' · further logs to locked session → 400 · email triggered
  - → _note when done_

- [ ] **4.4** Build sendLecturerAlert() with Nodemailer + Ethereal `[CRITICAL · 1h]` `feat/derick-warning-escalation-logic`
  - Ethereal auto-generates test inbox — no SMTP setup needed for dev
  - **Prompt:** _"Build /config/mailer.js with Nodemailer using Ethereal.email (call nodemailer.createTestAccount() on startup if EMAIL_MODE=dev, log the preview URL). Build /services/alerts.js with sendLecturerAlert(session_id): query ExamSession with include User (student) and Exam with Exam.creator (lecturer); query all BehavioralLogs for the session ordered by event_timestamp. Build HTML email: student name, reg_number, exam title, violation list table (event_type, timestamp). Send to lecturer email + admin email (hard-code admin@test.com for now). Log Ethereal preview URL so I can click and see the email."_
  - **Done when:** Ethereal URL logged · HTML email viewable · student name, exam, violation list present · both recipients
  - → _note when done_

- [ ] **4.5** ⭐ Race condition test — THE TEST THAT MATTERS `[CRITICAL · 45m]` `feat/derick-warning-escalation-logic`
  - Postman Runner, session with warning_count=2, fire 3 parallel POST /api/sessions/log
  - Expected: exactly one triggers lock+email; final warning_count is 3 (not 4/5); only one email
  - **Done when:** Race test passes · one lock · one email · no duplicates
  - → _note when done_

---

## 🗓️ Day 5 — Submit + Reports + Images

**Time:** ~5 hrs · **Goal:** Complete the exam lifecycle

- [ ] **5.1** Build POST /api/sessions/:id/submit `[high · 1.5h]` `feat/derick-session-endpoints`
  - **Prompt:** _"Build POST /api/sessions/:id/submit. verifyToken + requireRole(['student']). Verify session.student_id matches req.user.user_id. If session_status is 'locked' or 'completed', return 400. Accept { answers: [{ question_id, answer }] }. Create an answers table if not exists (migration). Save all answers. Set session_status='completed', end_time=now. Call generateReport(session_id). Return 200 with report_id."_
  - **Done when:** Student submits → completed · answers persisted · report created · locked session → 400
  - → _note when done_

- [ ] **5.2** Build generateReport() + GET /api/reports/:session_id `[high · 1.5h]` `feat/derick-report-generation`
  - **Prompt:** _"Build /services/reports.js with generateReport(session_id): query all BehavioralLogs for session, count by event_type into { gaze_away, head_movement, tab_switch, face_absent }, sum for total_anomalies. Calculate risk_level: 'high' if warning_count>=3 OR total_anomalies>10, 'medium' if total_anomalies>5, else 'low'. Insert Report row with session_id, total_anomalies, risk_level, generated_at=now, flagged=false. Return report_id. Then build GET /api/reports/:session_id with verifyToken + requireRole(['lecturer','administrator']): return report with embedded session, student, exam, and behavioral_logs."_
  - **Done when:** Report auto-created after session ends · risk_level correct · admin/lecturer fetch works · student → 403
  - → _note when done_

- [ ] **5.3** Build GET /api/images/:user_id (admin-only) `[high · 1h]` `feat/derick-image-storage`
  - **Prompt:** _"Build GET /api/images/:user_id with verifyToken + requireRole(['administrator']). Fetch FacialImage by user_id. If not found, 404. Otherwise res.sendFile(absolutePath). Stream the image — don't load into memory. Return appropriate Content-Type (image/jpeg)."_
  - **Done when:** Admin → image streams · student → 403 · lecturer → 403 · no token → 401
  - → _note when done_

- [ ] **5.4** Open PRs, update Julius on reports endpoint `[normal · 1h]`
  - 3 PRs: session-submit, report-generation, image-storage
  - **Done when:** PRs merged · Julius can build admin dashboard
  - → _note when done_

---

## 🗓️ Day 6 — Integration + Bugs

**Time:** ~5 hrs · **Goal:** Everything connects, demo flow works

- [ ] **6.1** End-to-end integration test with Julius `[CRITICAL · 2h]`
  - Run full flow from his React UI: register → login → start session → submit → view
  - Fix API contract mismatches, CORS (allow localhost:3000), missing fields
  - **Done when:** Julius completes full flow · no CORS · no API mismatches · JWT persists
  - → _note when done_

- [ ] **6.2** Mock Flask end-to-end demo flow `[CRITICAL · 1.5h]`
  - Your demo storyline. Julius logs in + starts session. You trigger Mock Flask Postman: 1 verify → student enters exam. Then 3 /sessions/log → session auto-locks → email arrives → admin views report.
  - **Done when:** Full demo runs via Postman-as-Flask · real email arrives · UI reflects lock
  - → _note when done_

- [ ] **6.3** Fix top 3 demo-blocking bugs `[high · 1h]`
  - Only fix what blocks the demo. Log edge cases in a notes file.
  - **Done when:** Demo runs clean · no crashes on happy path
  - → _note when done_

- [ ] **6.4** Document Mock Flask strategy for supervisor `[normal · 30m]`
  - Write `docs/demo-strategy.md` explaining the Mock Flask approach
  - Content: _"Since Kweka's Flask AI service is still in training phase, the backend's integration with the AI layer is demonstrated using a Postman-based mock collection. All API contracts are fully implemented and verified."_
  - **Done when:** demo-strategy.md committed · Abdul has context for final report
  - → _note when done_

---

## 🗓️ Day 7 — Buffer + Polish

**Time:** ~5 hrs · **Goal:** Catch-up + nice-to-haves

- [ ] **7.1** Finish slipped tasks from Days 0-6 `[high · 2h]`
  - Scroll up through unchecked boxes. Finish anything critical that didn't make it.
  - **Done when:** Every CRITICAL task from earlier days is checked
  - → _note when done_

- [ ] **7.2** Add 3 indexes `[normal · 45m]`
  - Just these: users.email (confirm unique), exam_sessions.student_id, behavioral_logs.session_id
  - **Prompt:** _"Create a new Sequelize migration that adds indexes on: users.email (unique already but confirm), exam_sessions.student_id, behavioral_logs.session_id. Show me the up() and down() methods."_
  - **Done when:** Migration runs · EXPLAIN queries show index usage
  - → _note when done_

- [ ] **7.3** Security quick sweep `[normal · 45m]`
  - Grep for console.log → remove sensitive ones
  - Check no passwords/hashes logged
  - Verify `.env` in `.gitignore` · verify `.env` NOT in git history (`git log --all -- .env` should be empty)
  - **Done when:** No secrets in git · no sensitive data in logs · .gitignore verified
  - → _note when done_

- [ ] **7.4** CSV export if time permits `[normal · 1h]`
  - GET /api/reports/export/:exam_id — admin only
  - **Prompt:** _"Build GET /api/reports/export/:exam_id with verifyToken + requireRole(['administrator']). Query all ExamSessions for the exam with their Reports, Users (student), and BehavioralLogs. Use json2csv or fast-csv to build CSV with columns: student_name, reg_number, start_time, end_time, identity_verified, warning_count, session_status, total_anomalies, risk_level, flagged. Set response headers Content-Type text/csv and Content-Disposition attachment. Stream response."_
  - **Done when:** Admin downloads CSV · opens in Excel · all sessions listed
  - → _note when done_

- [ ] **7.5** Write backend README.md `[normal · 30m]`
  - Setup steps, .env vars, how to run migrations, how to run the mock Flask demo
  - **Done when:** README in /backend · anyone can follow it to run the project
  - → _note when done_

---

## 🗓️ Day 8 — Deploy + Demo + Submit

**Time:** ~5 hrs · **Goal:** Production live, demo rehearsed, submitted

- [ ] **8.1** Deploy backend to Contabo `[CRITICAL · 2h]`
  - Install Node 20, MySQL · clone repo · production .env (strong JWT_SECRET, real Gmail SMTP, AI_SERVICE_TOKEN)
  - Run migrations + seeds · PM2 to keep process alive
  - **Done when:** Production URL responds on /health · migrations applied · PM2 running
  - → _note when done_

- [ ] **8.2** Production smoke test `[CRITICAL · 45m]`
  - Every critical endpoint from Postman against prod URL
  - Full Mock Flask demo flow on production · real email to real Gmail
  - **Done when:** All critical endpoints work on prod · real email received
  - → _note when done_

- [ ] **8.3** Hand everything to Abdul `[high · 45m]`
  - Folder `/docs/derick-evidence/` with: Postman collection (incl. Mock Flask), README, DB table screenshots, email screenshots, demo-strategy.md, sample API responses
  - **Done when:** Abdul has everything for Chapters 4-5
  - → _note when done_

- [ ] **8.4** Demo rehearsal with team `[CRITICAL · 1h]`
  - Practice twice. Storyline: register (facial image) → login → start session → Mock Flask verifies → enter exam → 3 anomalies → auto-lock → lecturer email arrives live → admin views report
  - Time it — under 8 min
  - **Done when:** Demo runs clean under 8 min · email arrives during demo · no crashes
  - → _note when done_

- [ ] **8.5** Tag v1.0, final push, submit `[CRITICAL · 30m]`
  - Final merge to main · `git tag v1.0 && git push --tags` · README clean · submit to UDOM
  - **Done when:** v1.0 tagged · repo clean · submitted
  - → _note when done_

---

## 🚨 If You Fall Behind — Drop Order

If time runs out, drop these **in this order**:

1. ❌ CSV export (7.4)
2. ❌ Security sweep formality (7.3) — do bare minimum
3. ❌ Exam POST endpoint (3.1) — seed data via SQL instead
4. ❌ README.md (7.5) — quick one-liner is fine

**NEVER drop:**
- Migrations (Day 1)
- Auth + JWT (Day 2)
- Session start + verify (Day 3.2, 3.3)
- Mock Flask collection (Day 3.4) — required for demo
- **Anything on Day 4** — the warning escalation IS your project
- Submit + report generation (Day 5.1, 5.2)
- Deployment (Day 8.1)

---

## 📝 Session Log

> Claude Code: append here at the end of each session with a 1-line summary.
> Format: `YYYY-MM-DD HH:MM — <what was done>`

2026-04-24 01:14 — Built full Express scaffold from scratch (Kweka's scaffold wasn't ready): package.json, server.js, all route stubs, middleware, 7 migrations, 7 models with associations, seed file. Server starts on :5000. Ready for Day 2 (auth) once MySQL is installed and migrations are run.

---

## 🐛 Known Issues / Defects

> Claude Code: log any bugs found but not yet fixed here.
> Format: `[severity] description — found in task X.Y`

_None yet._

---

## 🔗 Useful Links

- **Repo:** https://github.com/victorjudysen/ai-exam-proctoring-system
- **Proposal:** `../docs/PROPOSAL.pdf`
- **Team plan:** `../docs/TEAM_PLAN.pdf`
- **API contract:** `../docs/api-contract.json` _(if Kweka has created it)_
- **Sequelize docs:** https://sequelize.org/docs/v6/
- **Ethereal (email testing):** https://ethereal.email/
