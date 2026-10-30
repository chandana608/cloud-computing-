# Testing & Verification Guide: Cloud-Based Attendance Management System

## 1. Automated Test Suite Execution

The backend contains a full suite of automated unit and integration tests powered by **pytest**, testing:
- **Authentication**: Valid login, invalid credentials, institution ID login, password change.
- **Role-Based Access Control (RBAC)**: Verification that students/faculty cannot create classes, unauthorized record access rejection.
- **Academic Hierarchy**: Class and Subject creation, duplicate code rejection.
- **Attendance Session Engine**: Session creation, duplicate time slot conflict rejection, bulk marking, finalization locking, post-finalization lock enforcement.
- **Calculation Rules**: Accurate percentage computation, Excused exclusion rule, Safe/Warning/Defaulter categorization.
- **Grievance Workflow**: Student correction submission, faculty review and approval, automatic record update and audit event logging.

### Running Backend Tests

Activate the Python virtual environment and run pytest:

```powershell
# Windows
.\backend\venv\Scripts\pytest.exe backend\tests -v

# Linux / macOS
source backend/venv/bin/activate
pytest backend/tests -v
```

All 9 test suites execute against an isolated in-memory MongoMock database instance, running deterministically without external network dependency.

---

## 2. Frontend Build Verification

The React frontend utilizes **Vite** with strict ES module bundling and JSX syntax checking.

```bash
cd frontend
npm run build
```

This compiles all React components, Tailwind styles, and icons into static distribution assets under `frontend/dist/`.
