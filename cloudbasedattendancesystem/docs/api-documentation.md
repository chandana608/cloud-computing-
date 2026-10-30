# REST API Documentation: Cloud-Based Attendance Management System

Base URI: `/api/v1`

All protected endpoints require an HTTP `Authorization` header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 1. Authentication (`/api/v1/auth`)

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/auth/login` | `POST` | Public | Authenticate via email or institution ID + password |
| `/auth/me` | `GET` | Authenticated | Retrieve authenticated user profile |
| `/auth/change-password` | `POST` | Authenticated | Change account password |
| `/auth/forgot-password` | `POST` | Public | Generate expiring password reset token |
| `/auth/reset-password` | `POST` | Public | Reset password using valid token |

---

## 2. Academic Management

### Classes (`/api/v1/classes`)
- `GET /classes`: List all classes with student count.
- `GET /classes/<id>`: Class details.
- `POST /classes`: Create class (Admin only).
- `PUT /classes/<id>`: Update class (Admin only).

### Subjects (`/api/v1/subjects`)
- `GET /subjects`: List all subjects enriched with faculty and class mappings.
- `GET /subjects/<id>`: Subject details.
- `POST /subjects`: Create subject (Admin only).
- `PUT /subjects/<id>`: Update subject (Admin only).

### Students (`/api/v1/students`)
- `GET /students`: List students (filterable by `class_id`, `department`, `search`).
- `GET /students/<id>`: Student profile and enrolled subjects.
- `POST /students`: Create student account and auto-enroll (Admin only).
- `PUT /students/<id>`: Update student details (Admin only).
- `PATCH /students/<id>/status`: Toggle activation status (Admin only).
- `GET /students/<id>/attendance`: Comprehensive attendance records and percentages.

### Faculty (`/api/v1/faculty`)
- `GET /faculty`: List all faculty with assigned courses and classes.
- `GET /faculty/<id>`: Faculty profile.
- `GET /faculty/me/classes`: Classes and subjects assigned to current faculty.
- `POST /faculty`: Create faculty user and record (Admin only).
- `PUT /faculty/<id>`: Update faculty details and assignments (Admin only).

---

## 3. Attendance Engine (`/api/v1/attendance`)

- `POST /attendance/sessions`: Create new session (Admin / Faculty).
- `GET /attendance/sessions`: List sessions with filters (`class_id`, `subject_id`, `status`, `date`).
- `GET /attendance/sessions/<id>`: Session details + student roster with marked records.
- `POST /attendance/sessions/<id>/records`: Bulk/individual marking with duplicate prevention.
- `POST /attendance/sessions/<id>/finalize`: Locks session against further edits without reason.
- `PATCH /attendance/sessions/<id>/status`: Update session status (`Scheduled`, `Open`, `Closed`, `Finalized`).

---

## 4. Reports & Exports (`/api/v1/reports`)

- `GET /reports/dashboard-stats`: High-level KPI aggregates.
- `GET /reports/daily`: Grouped session summaries by date.
- `GET /reports/subject-wise`: Class student attendance in a subject.
- `GET /reports/defaulters`: Students falling below attendance threshold (e.g. 75%).
- `GET /reports/export/csv`: Export attendance or defaulter list to downloadable CSV.
- `GET /reports/export/pdf`: Export professional PDF report.

---

## 5. Correction Requests (`/api/v1/correction-requests`)

- `POST /correction-requests`: Student submits correction request for an attendance entry.
- `GET /correction-requests`: List correction requests (scoped by role and status).
- `PATCH /correction-requests/<id>`: Faculty/Admin approves or rejects request with feedback.

---

## 6. System Health & Audits

- `GET /health`: Liveness probe (`200 OK`).
- `GET /ready`: Readiness probe verifying MongoDB Atlas connectivity.
- `GET /admin/audit-logs`: Immutable system audit trail.
- `GET /admin/settings` & `POST /admin/settings`: Read and update threshold settings.
