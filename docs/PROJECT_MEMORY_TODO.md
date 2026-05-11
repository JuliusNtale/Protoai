# Project Memory TODO

Last updated: 2026-05-11
Source: recent implementation + pushes to `main` (`3fa9807` .. `61829fb`)

## Session Checkpoint (2026-05-11)

- [x] RV-25: EAT timezone logging added with safe UTC+3 fallback (`ZoneInfo` fallback).
- [x] RV-26: Lecturer provisioning no longer requires reg number in UI; admin logout added.
- [x] RV-27: Bulk provisioning hidden from admin page; dedicated `admin/system-logs` page added.
- [x] RV-28: Temporary direct-IP frontend runtime env set in compose for server-IP access.
- [x] RV-29: Frontend API URL resolver fallback added for `:3000` direct access (`hostname:5000`).
- [x] RV-30: Student dashboard readability/contrast improvements.
- [x] RDS-01: Shared dashboard shell primitives added (`DashboardShell`, `DashboardPanel`, `MetricCard`).
- [x] RDS-02: Admin dashboard migrated to new shell layout.
- [x] RDS-03: Student dashboard migrated to new shell layout.
- [x] RDS-04: Lecturer dashboard migrated to new shell layout.

## Current Operational Notes (2026-05-11)

- [x] Admin login and dashboard access confirmed working.
- [x] Core session-management APIs are implemented (`start`, `verify`, `log`, `submit`, `answers`, `list`).
- [ ] Public DNS for `proctoai.neuraltale.com` still points to Vercel; Nginx route on VPS is ready but not authoritative until DNS cutover.
- [ ] After DNS cutover, revert temporary direct-IP frontend API strategy to domain/proxy-first routing.

## Session Checkpoint (2026-05-10)

- [x] Backend migrated from Node scaffold to Flask app with SQLAlchemy/Alembic and JWT auth.
- [x] Core auth endpoints live: register/login/reset-password/lookup/change-password/me.
- [x] Core exam/session/report/image endpoints implemented and wired.
- [x] Frontend exam page switched from hardcoded mock questions to live `GET /api/exams/:exam_id`.
- [x] Session answer persistence added (`session_answers`) with migration `0002_add_session_answers`.
- [x] Session resume path added: `GET /api/sessions/:session_id/answers` and frontend restore.
- [x] CI updated to run backend pytest; tests added and passing.
- [x] CD updated to run `alembic upgrade head` before compose startup.

## Completed This Sprint

- [x] Database schema and migration foundation (`0001_initial_schema`) for all 7 original tables.
- [x] New schema extension: `session_answers` table + indexes and uniqueness guard.
- [x] Session flow endpoints:
  - start, verify, log, submit, list, answers retrieval
- [x] Report endpoints:
  - session report aggregation + CSV export
- [x] Admin-only stored face image retrieval endpoint.
- [x] Backend API coverage tests added (`backend/tests/*`) and integrated into CI workflow.

## Immediate Open Items

- [ ] Run full live E2E dry run on VPS with current `main`:
  - admin create student/lecturer -> first-login password change -> session start/verify/log/submit -> report export.
- [ ] Validate `docker compose run --rm backend alembic upgrade head` behavior in production deploy logs.
- [ ] Confirm live socket anomaly path (`anomaly_result`/`session_locked`) with real browser session evidence.
- [ ] Remove/retire obsolete Node backend artifacts (`backend/server.js`, old `package.json` usage) once no longer needed.
- [ ] Secure live log interface (Dozzle): move behind `logs.proctoai.neuraltale.com` with HTTPS, basic auth, and firewall/IP allowlist (avoid exposing `:9999` publicly).

## Pending FR Tasks (Updated)

- [x] FR-01/02 baseline payload and role compatibility for auth endpoints.
- [x] FR-04 baseline RBAC scaffolding and initial role checks in API.
- [x] FR-18 backend report shape + CSV export path.
- [ ] FR-03 finalize password reset delivery flow (currently generic response only).
- [ ] FR-05/06 wire real face verification result persistence and strict backend↔AI contract checks.
- [ ] FR-08 failed-verification logging + lecturer/admin notification pipeline.
- [ ] FR-09 complete lecturer CRUD integration against live backend models/questions.
- [ ] FR-10 admin scheduling + group assignment flow.
- [ ] FR-11/23 full timer-expiry + 3-warning lock operational validation with evidence.
- [ ] FR-19/20 frontend admin report tooling and anomaly flag actions.
- [ ] FR-21/22 live warning UX and warning-count audit evidence capture.

## Pending NFR Tasks

- [ ] Accuracy/FAR/FRR empirical reports with dataset and metrics.
- [ ] Reliability test report (uptime/failure-mode drills).
- [ ] Usability (SUS) study execution and summary.
- [ ] Scalability/load testing (>=100 concurrent sessions) with documented results.

## Next Execution Queue

- [ ] Step 0 (Today): Connect trained face-verification model from `Development/trained_model_exports` into live verification pipeline (proposal-aligned).
  - Wire backend↔AI-service verification contract to load and run exported model artifacts.
  - Implement deterministic thresholding + confidence response format used by session identity checks.
  - Persist verification outcomes and confidence evidence in DB/audit trail for lecturer/admin review.
  - Add integration test coverage for success/failure/low-confidence verification paths.
- [ ] Step 0.1 (Today): Improve UI quality across all pages to production-grade UX standards suitable for real users.
- [ ] Step 0.2 (Today): Standardize typography by using the login page font system across the entire application.
- [ ] Step 0.3 (Today): Simplify login page visual/layout to match `Development/ui-inspo/login UI inspo.png`.
- [ ] Step 0.4 (Today): Resolve real frontend URL routing (current Vercel/DNS issue) and finalize domain-based access flow.
- [ ] Step 0.5 (Today): Apply the new shared dashboard UI system consistently to all remaining pages.
- [ ] Step 0.6 (Today): Improve system-logs action labels to human-readable text and implement professional pagination/default limit behavior:
  - default visible rows: 10
  - user-selectable page size (e.g., 10/25/50)
  - avoid rendering all logs on initial screen
- [ ] Step 0.7 (Today): Update logs date/time rendering to `DD/MM/YYYY | Time`.
- [ ] Step 0.8 (Today): Ensure `Refresh All` in logs page refreshes data smoothly and predictably (no stale/partial UI state).
- [x] Step 1: Complete DNS cutover from Vercel -> VPS and validate HTTPS end-to-end on `proctoai.neuraltale.com`.
- [ ] Step 2: Run full E2E role-based flow and attach screenshots/log evidence.
- [ ] Step 3: Expand backend tests to cover role provisioning edge cases and session state transitions.
- [ ] Step 4: Implement missing production-grade reset-password dispatch (email/SMTP integration).
