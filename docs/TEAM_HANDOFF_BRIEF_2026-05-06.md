# Team Handoff Brief (Derick + Julius)

Date: 2026-05-06  
Audience: Derick (Backend), Julius (Frontend)  
Purpose: Quick alignment on what changed and what to do next.

## What Victor + I already completed

1. Added a single execution tracker:
- `docs/FR_EXECUTION_TRACKER.md`

2. Added canonical API/event contracts:
- `docs/API_EVENT_DICTIONARY.md`

3. Added FR acceptance test checklist:
- `docs/FR_ACCEPTANCE_TESTS.md`

4. Standardized anomaly event vocabulary (canonical):
- `gaze_away`
- `head_turned`
- `tab_switch`
- `face_absent`
- `multiple_faces`

5. Backend now accepts both canonical and legacy aliases at API entry:
- Legacy accepted temporarily: `head_movement`, `multiple_persons`
- Internally normalized to canonical values.

6. Added DB migration to move stored legacy event names to canonical:
- `backend/migrations/20260506001-normalize-behavioral-log-event-types.js`

7. Added backend unit coverage for normalization:
- `backend/tests/eventNormalization.test.js`
- `backend/tests/reportEventCanonicalization.test.js`

## What Derick should do next (Backend)

1. Run migration in shared/staging DB:
- `npx sequelize-cli db:migrate`

2. Confirm no legacy values remain in `behavioral_logs.event_type`:
- Expected only canonical 5 values.

3. Keep `/api/sessions/log` contract aligned with:
- `event_type` (canonical)
- `event_data` (JSON payload)

4. Keep report output canonical in all responses/exports.

5. Add/extend integration tests for:
- warning 1 -> warning 2 -> warning 3 lock path
- session lock + auto-submit + alert behavior

## What Julius should do next (Frontend)

1. Replace local/simulated warning flow in exam page with live socket flow.

2. Emit real `webcam_frame` payload to AI service:
- `{ session_id, frame_base64, timestamp }`

3. Consume and render these events from AI service:
- `anomaly_result` -> show warning UI with returned `warning_count`
- `session_locked` -> trigger submit + lock overlay flow

4. Ensure tab switch posts anomaly path matching canonical contract.

5. Validate end-to-end with Derick:
- warning count in UI must equal backend DB warning_count.

## Joint check (Derick + Julius)

Run one full scenario and capture evidence:
1. Start exam session
2. Trigger 3 anomalies
3. Confirm:
- warning counts 1,2,3
- session becomes `locked`
- submit path triggered
- report/logs show canonical event names only

## Quick reference files

1. `docs/API_EVENT_DICTIONARY.md`
2. `docs/FR_EXECUTION_TRACKER.md`
3. `docs/FR_ACCEPTANCE_TESTS.md`
