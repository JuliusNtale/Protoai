# API and Event Dictionary

Last updated: 2026-05-06  
Linked tracker: `docs/FR_EXECUTION_TRACKER.md`

## 1. Purpose

This file defines the canonical payload contracts and anomaly event enums used across:
1. Frontend (Next.js client)
2. AI Service (Flask + Socket.IO)
3. Backend API (Node/Express)
4. Database reporting logic

If any service uses a different event name, it is considered a defect.

## 2. Canonical Anomaly Event Enum

Use only these `event_type` values:
1. `gaze_away`
2. `head_turned`
3. `tab_switch`
4. `face_absent`
5. `multiple_faces`

## 3. Existing Mismatch Map (Fix Required)

Current non-canonical names observed in codebase:
1. `head_movement` -> must be `head_turned`
2. `multiple_persons` -> must be `multiple_faces`

Required action:
1. Update backend validators and any AI emit paths to canonical values.
2. Update report aggregation logic to use canonical values only.

## 4. Core REST Contracts

### 4.1 Start Exam Session

Endpoint:
`POST /api/sessions/start`

Request:
```json
{
  "exam_id": 12
}
```

Response:
```json
{
  "session_id": 301,
  "exam": {
    "id": 12,
    "title": "Advanced Algorithms",
    "duration_minutes": 120,
    "total_questions": 20
  }
}
```

### 4.2 Verify Identity (AI -> Backend Internal)

Endpoint:
`POST /api/sessions/verify`

Auth:
`X-Internal-Token`

Request:
```json
{
  "session_id": 301,
  "match": true,
  "confidence_score": 0.87
}
```

Response:
```json
{
  "ok": true,
  "identity_verified": true,
  "verification_score": 0.87
}
```

### 4.3 Log Anomaly

Endpoint:
`POST /api/sessions/log`

Auth:
`X-Internal-Token` (AI service) or approved authenticated flow

Request:
```json
{
  "session_id": 301,
  "event_type": "gaze_away",
  "event_data": {
    "gaze_direction": "Left",
    "yaw": 8.4,
    "pitch": -3.1,
    "frame_time": "2026-05-06T10:45:31.202Z"
  }
}
```

Response:
```json
{
  "ok": true,
  "warning_count": 2,
  "escalated": false,
  "session_status": "active"
}
```

Escalation response example:
```json
{
  "ok": true,
  "warning_count": 3,
  "escalated": true,
  "session_status": "locked"
}
```

### 4.4 Submit Session

Endpoint:
`POST /api/sessions/:id/submit`

Request:
```json
{
  "answers": {
    "1": "B",
    "2": "D"
  }
}
```

Response:
```json
{
  "status": "completed",
  "submitted_at": "2026-05-06T11:02:10.201Z"
}
```

## 5. AI Service REST Contracts

### 5.1 Verify Identity

Endpoint:
`POST /verify-identity`

Request:
```json
{
  "user_id": 44,
  "image_base64": "data:image/jpeg;base64,..."
}
```

Response:
```json
{
  "match": true,
  "confidence": 0.91
}
```

### 5.2 Monitor Frame

Endpoint:
`POST /monitor-frame`

Request:
```json
{
  "session_id": 301,
  "frame_base64": "data:image/jpeg;base64,..."
}
```

Response:
```json
{
  "gaze": {
    "direction": "Screen",
    "confidence": 0.94
  },
  "head_pose": {
    "yaw": 2.1,
    "pitch": -1.0,
    "roll": 0.4,
    "alert": false
  },
  "anomalies": []
}
```

## 6. Socket.IO Event Contracts

### 6.1 Client -> AI Service

Event:
`webcam_frame`

Payload:
```json
{
  "session_id": 301,
  "frame_base64": "data:image/jpeg;base64,...",
  "timestamp": "2026-05-06T10:45:31.202Z"
}
```

### 6.2 AI Service -> Client (Monitoring Result)

Event:
`anomaly_result`

Payload:
```json
{
  "session_id": 301,
  "anomalies": ["gaze_away"],
  "warning_count": 1,
  "gaze_direction": "Left"
}
```

### 6.3 AI Service -> Client (Session Lock)

Event:
`session_locked`

Payload:
```json
{
  "session_id": 301,
  "reason": "warning_count_exceeded"
}
```

## 7. Warning and Escalation Rule

1. Each confirmed anomaly event increments `warning_count` by exactly 1.
2. At `warning_count` 1 or 2:
- Emit `anomaly_result`.
- Show warning UI on client.
3. At `warning_count` 3:
- Persist anomaly and lock state in DB.
- Auto-submit session answers.
- Emit `session_locked` to client.
- Send lecturer/admin alert.

## 8. Database Field Naming Policy

1. Use `event_type` for anomaly category.
2. Use `event_data` for JSON payload metadata.
3. Use `warning_count` in `exam_sessions` as authoritative cumulative warning counter.
4. Reports must aggregate using canonical enum names only.

## 9. Change Control

Before changing any event/API name:
1. Update this file.
2. Update `docs/FR_EXECUTION_TRACKER.md`.
3. Update backend validator, AI service emission, frontend consumers, and report logic in one coordinated PR.
