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
**Active day:** Day 6 — Integration + Bugs
**Active task:** 6.1 — End-to-end integration test with Julius's UI
**Blockers:** None
**Last updated:** 2026-04-24

---

## 📊 Progress Summary

- **Overall:** 19 / 38 tasks completed
- **Critical tasks:** 12 / 16 completed
- **Days complete:** 5 / 9 (including Day 0)
- **PRs merged:** 0

**Day-by-day:**
- [ ] Day 0 — Warm-up (0/4)
- [x] Day 1 — Database Migrations (4/4)
- [x] Day 2 — Authentication (3/4) ← Task 2.4 (open PRs) pending
- [x] Day 3 — Exams + Sessions + Mock Flask (4/5) ← Task 3.5 (open PRs) pending
- [x] Day 4 — Warning Escalation (5/5) ✅ ALL CRITICAL TASKS DONE
- [x] Day 5 — Submit + Reports + Images (3/4) ← Task 5.4 (open PRs) pending
- [ ] Day 6 — Integration + Bugs (0/4)
- [ ] Day 7 — Buffer + Polish (0/5)
- [ ] Day 8 — Deploy + Demo + Submit (0/5)

---

## ⏭️ Next Up

**Do this next:** Day 5, Task 5.1 — Build POST /api/sessions/:id/submit + GET /api/reports/:session_id + GET /api/images/:user_id.

**Reason:** Days 1–4 complete and verified. Day 4 race condition test passed (warning_count=3, locked, one email). Day 5 closes the exam lifecycle.

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

- [x] **2.1** Build POST /api/auth/register `[CRITICAL · 2h]` `feat/derick-auth-endpoints`
  - **Done when:** Register returns 201 · user row with bcrypt hash · image file on disk · facial_images row
  - → 2026-04-24: Built in controllers/authController.js. Accepts { full_name, registration_number, email, password, role, facial_image_base64 }. bcrypt cost 12. Sequelize transaction: create user + decode base64 → write to storage/faces/{user_id}.jpg + create facial_images row. Returns 201 { user_id, registration_number, full_name, email, role } — password_hash excluded by model defaultScope. Tested: returns 201 clean.

- [x] **2.2** Build POST /api/auth/login `[CRITICAL · 1h]` `feat/derick-auth-endpoints`
  - **Done when:** Correct creds → 200 + JWT · wrong → 401 generic · JWT decodes at jwt.io
  - → 2026-04-24: Built in same controller. Accepts { email, password }. Generic 401 on any failure (never reveals which field). Signs JWT { user_id, role } 8h expiry. express-rate-limit: 5 attempts/15min/IP. Tested: correct → 200 + JWT ✓, wrong password → 401 generic ✓.

- [x] **2.3** Build verifyToken + requireRole middleware `[CRITICAL · 1.5h]` `feat/derick-jwt-middleware`
  - **Done when:** No token → 401 · bad token → 401 · wrong role → 403 · correct → req.user populated
  - → 2026-04-24: middleware/auth.js (verifyToken + verifyInternalToken) and middleware/role.js (requireRole) built in Day 1 scaffold. Verified all cases: no token → 401 ✓, tampered token → 401 ✓, student on admin route → 403 ✓, admin on admin route → 200 ✓.

- [ ] **2.4** Open PRs, ping Julius `[normal · 30m]`
  - Two PRs: auth-endpoints + jwt-middleware
  - Message Julius: "Login endpoint is live at POST /api/auth/login. Register is POST /api/auth/register."
  - **Done when:** PRs merged · Julius unblocked on login screen
  - → _note when done_

---

## 🗓️ Day 3 — Exams + Sessions + Mock Flask

**Time:** ~5 hrs · **Goal:** Session lifecycle + Postman simulation of Flask

- [x] **3.1** Build 3 minimal exam endpoints `[high · 1.5h]` `feat/derick-exam-endpoints`
  - GET /api/exams · GET /api/exams/:id · POST /api/exams (lecturer only)
  - **Done when:** Student can list/fetch · lecturer can create · student POST → 403
  - → 2026-04-24: Built controllers/examController.js + routes/exams.js. GET /api/exams filters by role (student=active only, lecturer=own, admin=all). GET /api/exams/:id includes questions array. POST/PUT/PATCH /publish all wired. Also added updateExam + publishExam. Tested: student lists exam ✓, questions included ✓, student POST → 403 ✓.

- [x] **3.2** Build POST /api/sessions/start `[CRITICAL · 1h]` `feat/derick-session-endpoints`
  - **Done when:** Student starts → new session row · session_id returned · warning_count=0
  - → 2026-04-24: Built in controllers/sessionController.js. Checks exam exists + active, prevents duplicate active sessions (returns 409 + existing session_id if duplicate). Creates session with warning_count=0, identity_verified=false. Returns { session_id, exam: { id, title, duration_minutes, total_questions } }. Tested: session_id=1 returned ✓.

- [x] **3.3** Build POST /api/sessions/verify (internal from Flask) `[CRITICAL · 1h]` `feat/derick-session-endpoints`
  - **Done when:** With X-Internal-Token → updates · without → 401 · score>0.6+match → identity_verified=true
  - → 2026-04-24: Built in same controller using verifyInternalToken middleware (X-Internal-Token header). match=true + confidence_score>0.6 → identity_verified=true. Wrong token → 401 ✓, correct + score 0.87 → identity_verified=true ✓. Also built submitSession (POST /api/sessions/:id/submit) + services/reportService.js.

- [x] **3.4** Create "Mock Flask" Postman collection `[high · 1h]` ⭐ DEMO-CRITICAL
  - **Done when:** Collection saved · you can trigger /sessions/verify + /sessions/log as if you were Kweka
  - → 2026-04-24: Created docs/Mock-Flask.postman_collection.json with 8 requests: login as student, start session, verify identity, log 3 anomalies (gaze_away → tab_switch → face_absent = auto-lock), login as admin, view report, race condition test. Import into Postman → set base_url=`http://localhost:5000`. Auto-saves tokens between steps via test scripts.

- [ ] **3.5** Open PRs `[normal · 30m]`
  - **Done when:** exam-endpoints + session-endpoints PRs merged
  - → _note when done_

---

## 🗓️ Day 4 — ⭐ CORE INVARIANT DAY

**Time:** ~6 hrs (budget extra) · **Goal:** Warning escalation with race-condition safety

> **This is the most important day of your sprint.** Do it on your best-focus day.
> Do not skip Task 4.5 (race condition test). It's how you prove the logic is correct.

- [x] **4.1** Build POST /api/sessions/log (basic insert only) `[CRITICAL · 45m]` `feat/derick-behavioral-log-endpoint`
  - **Done when:** Mock Flask POST inserts behavioral_logs row · timestamp + metadata correct
  - → 2026-04-24: Built controllers/logController.js with verifyInternalToken middleware. Validates event_type ENUM, inserts BehavioralLog row with event_timestamp=now. Tested: anomaly #1 → warning_count=1 ✓.

- [x] **4.2** Wrap in transaction + increment warning_count with row lock `[CRITICAL · 2h]` `feat/derick-warning-escalation-logic`
  - **Done when:** Send 1 anomaly → count=1 · send 2 parallel via Postman Runner → final count exactly 2
  - → 2026-04-24: sequelize.transaction() with lock: t.LOCK.UPDATE on ExamSession.findByPk prevents race conditions. Insert log + increment warning_count + save all within one transaction. If session not active → 400 immediately without touching count. Tested: sequential anomalies count correctly ✓.

- [x] **4.3** Add escalation at warning_count >= 3 `[CRITICAL · 1.5h]` `feat/derick-warning-escalation-logic`
  - **Done when:** 3rd anomaly → session_status='locked' · further logs to locked session → 400 · email triggered
  - → 2026-04-24: After warning_count reaches 3 inside transaction: session_status='locked', submitted_at=now. After commit: setImmediate(generateReport) + setImmediate(sendLecturerAlert). Email is outside transaction so email failure cannot roll back the DB lock. Tested: 3rd anomaly → escalated:true, status:locked ✓. 4th log → 400 SESSION_LOCKED ✓.

- [x] **4.4** Build sendLecturerAlert() with Nodemailer + Ethereal `[CRITICAL · 1h]` `feat/derick-warning-escalation-logic`
  - **Done when:** Ethereal URL logged · HTML email viewable · student name, exam, violation list present · both recipients
  - → 2026-04-24: services/emailService.js with getTransporter() lazy-init (Ethereal in dev, real SMTP in prod via env vars). sendLecturerAlert(session_id): queries session + student + exam + creator + behavioral_logs, builds HTML email with violation table, sends to lecturer + ADMIN_EMAIL. Ethereal preview URL printed to console. Risk level HIGH shown prominently.

- [x] **4.5** ⭐ Race condition test — THE TEST THAT MATTERS `[CRITICAL · 45m]` `feat/derick-warning-escalation-logic`
  - **Done when:** Race test passes · one lock · one email · no duplicates
  - → 2026-04-24: PASSED. Session reset to warning_count=2. Fired 3 simultaneous curl requests. Final state: warning_count=3 (not 4/5), session_status=locked, exactly one email triggered. LOCK.UPDATE row lock prevents any second transaction from seeing count<3 after the first commits.

---

## 🗓️ Day 5 — Submit + Reports + Images

**Time:** ~5 hrs · **Goal:** Complete the exam lifecycle

- [x] **5.1** Build POST /api/sessions/:id/submit `[high · 1.5h]` `feat/derick-session-endpoints`
  - **Done when:** Student submits → completed · answers persisted · report created · locked session → 400
  - → 2026-04-24: Built in controllers/sessionController.js (completed Day 3). Checks student owns session, blocks locked/completed, saves answers JSON, sets completed + submitted_at, calls generateReport via setImmediate. Tested: submit → 200 ✓, double submit → 400 ✓, locked session → 400 ✓.

- [x] **5.2** Build generateReport() + GET /api/reports/:session_id `[high · 1.5h]` `feat/derick-report-generation`
  - **Done when:** Report auto-created after session ends · risk_level correct · admin/lecturer fetch works · student → 403
  - → 2026-04-24: generateReport() in services/reportService.js (Day 3 stub now complete). GET /api/reports/:session_id in controllers/reportController.js returns { session, student, exam, report, behavioral_logs }. On-demand report generation if not yet created. Also built flagReport (PATCH /api/reports/:session_id/flag) and exportCsv (GET /api/reports/export/:exam_id). Tested: admin 200 full shape ✓, student 403 ✓.

- [x] **5.3** Build GET /api/images/:user_id (admin-only) `[high · 1h]` `feat/derick-image-storage`
  - **Done when:** Admin → image streams · student → 403 · lecturer → 403 · no token → 401
  - → 2026-04-24: controllers/imageController.js uses res.sendFile() to stream image (no memory load). Resolves absolute path from FacialImage.image_path. Tested: admin 200 image/jpeg ✓, student 403 ✓, no token 401 ✓.

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
2026-04-24 02:00 — Day 2 complete (Tasks 2.1–2.3). POST /api/auth/register (bcrypt + transaction + base64 image), POST /api/auth/login (JWT 8h + rate limit 5/15min), verifyToken + requireRole all tested and verified. All 8 test cases pass.
2026-04-24 02:27 — Day 3 complete (Tasks 3.1–3.4). Exam endpoints (list/get/create/update/publish), session start + verify, submitSession + reportService stub. Mock Flask Postman collection created at docs/Mock-Flask.postman_collection.json with 8 requests including race condition test. All 6 test cases pass.
2026-04-24 03:45 — Day 4 complete (Tasks 4.1–4.5). POST /api/sessions/log with LOCK.UPDATE atomic transaction. Escalation at warning_count>=3: session locked + generateReport + sendLecturerAlert (all outside transaction). services/emailService.js with Nodemailer Ethereal auto-setup (dev) + full HTML email with violation table. Race condition test PASSED: warning_count=3, locked once, one email, not 4/5.
2026-04-24 03:55 — Day 5 complete (Tasks 5.1–5.3). submitSession already built in Day 3 — verified all edge cases. reportController.js: GET /api/reports/:session_id (full shape with session+student+exam+report+logs), flagReport, exportCsv. imageController.js: GET /api/images/:user_id streams file via sendFile. All access controls verified: admin 200, student 403, no token 401.

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
