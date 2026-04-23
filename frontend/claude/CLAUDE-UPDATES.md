# Frontend Changes Log — Claude Code

> **Purpose:** Every change Claude Code makes to the frontend is documented here with the file changed, what was changed, and why.
>
> **Owner:** Derick G. Mhidze (Backend Engineer) coordinating with Julius P. Ntale (Frontend Engineer)
>
> **Rule:** Julius must review every entry here before merging. If a change breaks his UI flow, he flags it and Derick fixes the backend contract instead.

---

## Change Log

---

### 2026-04-24 — Session 1

---

#### 1. `frontend/.env.local` — **NEW FILE**

**What was added:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Why:**
The frontend had no environment variable pointing to the backend. Without this, `fetch()` calls would have no base URL to connect to. `NEXT_PUBLIC_` prefix is required by Next.js to expose the variable to client-side components. In production this value will change to the deployed backend URL (e.g. `https://api.proctoring.udom.ac.tz`).

**Julius action needed:** When deploying to production, update this value to the live backend URL.

---

#### 2. `frontend/app/page.tsx` — Login Page

**What was changed:**

| Before | After |
|---|---|
| `useState("T22-03-92323")` for regNum | `useState("")` — blank default (no hardcoded test value) |
| `useState("••••••••••")` for password | `useState("")` — blank default |
| `handleLogin` used `setTimeout` to fake login + redirect | `handleLogin` now makes real `POST /api/auth/login` call |
| No error state | Added `error` state + red error banner below the "forgot password" row |
| No token storage | Saves `token` and `user` to `localStorage` on success |

**Exact API call added:**
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ registration_number: regNum, password }),
})
```

**Request body sent:**
```json
{ "registration_number": "T22-03-04321", "password": "Password123!" }
```

**Expected response from backend:**
```json
{
  "token": "<JWT>",
  "user": {
    "user_id": 1,
    "name": "Demo Student",
    "registration_number": "T22-03-04321",
    "regNo": "T22-03-04321",
    "email": "student@test.com",
    "role": "student"
  }
}
```

**On success:** `localStorage.setItem("token", data.token)` + `localStorage.setItem("user", JSON.stringify(data.user))` then `router.push("/dashboard")`

**On failure:** Shows red error banner with the `error.message` from the backend response.

**Why these changes:**
- The login form already used `regNum` state mapped to `registration_number` — this matched the backend contract exactly (backend accepts `registration_number`, not `email`, for student login).
- The `setTimeout` mock was replaced with a real API call so the system actually authenticates against the database.
- Token is stored in `localStorage` so Julius can read it from any page with `localStorage.getItem("token")` and attach it as `Authorization: Bearer <token>` on protected API calls.

**Julius action needed:**
- Read the token from `localStorage` on the dashboard page to show the logged-in student's name/reg number.
- If the token is missing on a protected page, redirect to `/`.

---

#### 3. `frontend/app/register/page.tsx` — Registration Page

**What was changed:**

| Before | After |
|---|---|
| `handleSubmit` used `setTimeout` to fake register + redirect | `handleSubmit` now makes real `POST /api/auth/register` call |
| No error state | Added `error` state + red error banner above the submit button |
| No token storage | Saves `token` and `user` to `localStorage` on success |

**Exact API call added:**
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: form.name,
    registration_number: form.regNum,
    password: form.password,
    face_image: capturedImage,   // base64 JPEG from canvas.toDataURL("image/jpeg", 0.92)
  }),
})
```

**Request body sent:**
```json
{
  "name": "Demo Student",
  "registration_number": "T22-03-04321",
  "password": "Password123!",
  "face_image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Expected response from backend:**
```json
{
  "token": "<JWT>",
  "user": {
    "user_id": 4,
    "name": "Demo Student",
    "registration_number": "T22-03-04321",
    "regNo": "T22-03-04321",
    "email": "t2203xxx@student.udom.ac.tz",
    "role": "student"
  }
}
```

**On success:** Same as login — save token + user to `localStorage`, redirect to `/dashboard`.

**On failure:** Shows red error banner above the "Complete Registration" button.

**Why these changes:**
- Julius's form already had the right state variables (`form.name`, `form.regNum`, `capturedImage`) — only the submit handler needed wiring.
- `face_image` is the field name the backend now accepts (it also accepts `facial_image_base64` as a fallback). The backend decodes the base64, writes it to `/storage/faces/{user_id}.jpg`, and stores the path in the `facial_images` table. The base64 prefix (`data:image/jpeg;base64,`) is stripped automatically before saving.
- Note: The register form has no `email` field. The backend auto-generates a placeholder email (`{regnum}@student.udom.ac.tz`) if none is provided. Julius may want to add an email field later if UDOM requires it.

**Julius action needed:**
- Verify the face capture still works on HTTPS (camera requires a secure context — already handled in the existing `startCamera` function).
- Consider adding an `email` input field if students need to provide their real UDOM email.

---

## What Has NOT Been Changed

The following pages still use mock data / setTimeout and have NOT been touched yet. They will be wired up as the backend builds the corresponding endpoints:

| Page | Still Mock | Backend endpoint needed |
|---|---|---|
| `app/dashboard/page.tsx` | Yes — all tabs use hardcoded data | `GET /api/exams`, `GET /api/results`, `GET /api/notifications` |
| `app/exam/page.tsx` | Yes — 20 hardcoded questions | `GET /api/exams/:id`, `POST /api/sessions/start`, `POST /api/sessions/log`, `POST /api/sessions/:id/submit` |
| `app/verify/page.tsx` | Yes — liveness flow is frontend-only simulation | `POST /api/sessions/verify` (called by AI service, not frontend directly) |
| `app/lecturer/page.tsx` | Yes — exam builder is all local state | `POST /api/exams`, `GET /api/exams`, `PUT /api/exams/:id` |
| `app/admin/page.tsx` | Yes — violation table is hardcoded | `GET /api/reports/:session_id`, `GET /api/reports/export/:exam_id` |
| `app/orient/page.tsx` | N/A — informational only | None needed |

---

## Backend Contract Reference

For every endpoint Julius needs to call, the request/response contract is:

### POST /api/auth/login
```
Body:    { registration_number: string, password: string }
Success: 200 { token, user: { user_id, name, registration_number, regNo, email, role } }
Failure: 401 { error: { code: "INVALID_CREDENTIALS", message: "..." } }
Rate limit: 5 attempts per 15 min per IP
```

### POST /api/auth/register
```
Body:    { name: string, registration_number: string, password: string, face_image?: string (base64) }
Success: 201 { token, user: { user_id, name, registration_number, regNo, email, role } }
Failure: 409 { error: { code: "REG_NUMBER_TAKEN" | "EMAIL_TAKEN", message: "..." } }
         400 { error: { code: "VALIDATION_ERROR", message: "..." } }
```

### All protected endpoints
```
Header:  Authorization: Bearer <token>
No token → 401 { error: { code: "UNAUTHORIZED" } }
Wrong role → 403 { error: { code: "FORBIDDEN" } }
```
