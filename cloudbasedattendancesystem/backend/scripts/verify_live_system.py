"""
Comprehensive live end-to-end verification script for Cloud-Based Attendance Management System.
Tests live HTTP endpoints on http://127.0.0.1:5000 and verifies frontend response on http://localhost:5173/.
"""
import sys
import json
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:5000/api/v1"
FRONTEND_BASE = "http://localhost:5173/"

class TestRunner:
    def __init__(self):
        self.passes = 0
        self.failures = 0
        self.tokens = {}

    def log(self, tag, message, success=True):
        status = "[PASS]" if success else "[FAIL]"
        if success:
            self.passes += 1
        else:
            self.failures += 1
        print(f"{status} {tag}: {message}")

    def request(self, method, endpoint, data=None, token=None, headers_override=None):
        url = f"{API_BASE}{endpoint}" if endpoint.startswith("/") else endpoint
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if headers_override:
            headers = headers_override

        if token:
            headers["Authorization"] = f"Bearer {token}"

        req_body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=req_body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as response:
                status_code = response.getcode()
                raw = response.read().decode("utf-8")
                try:
                    body = json.loads(raw)
                except Exception:
                    body = raw
                return status_code, body
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                body = json.loads(raw)
            except Exception:
                body = raw
            return e.code, body
        except Exception as e:
            return 0, str(e)

    def run_all(self):
        print("=" * 70)
        print("  LIVE SYSTEM END-TO-END VALIDATION TEST")
        print("=" * 70)

        # 1. System Health & Readiness
        print("\n--- 1. System Health & Readiness ---")
        code, body = self.request("GET", "/health")
        is_healthy = isinstance(body, dict) and body.get("status") == "UP"
        self.log("Health Check", f"Status: {code}, Status Text: {body.get('status') if isinstance(body, dict) else body}", is_healthy)

        code, body = self.request("GET", "/ready")
        is_ready = isinstance(body, dict) and body.get("ready") is True
        self.log("Ready Check", f"Status: {code}, Mode: {body.get('database_mode') if isinstance(body, dict) else ''}", is_ready)

        # 2. Frontend Server Response
        print("\n--- 2. Frontend Server Check ---")
        code, body = self.request("GET", FRONTEND_BASE, headers_override={"Accept": "text/html"})
        is_vite = isinstance(body, str) and ("vite" in body.lower() or "attendance" in body.lower() or "root" in body.lower())
        self.log("Frontend Serves HTML Bundle", f"Status: {code}, Vite/React HTML served cleanly ({len(body)} bytes)", code == 200 and is_vite)

        # 3. Authentication: Admin Login
        print("\n--- 3. Role Authentication ---")
        code, body = self.request("POST", "/auth/login", {
            "identifier": "admin@college.edu",
            "password": "Admin@123"
        })
        admin_token = body.get("data", {}).get("token") if isinstance(body, dict) else None
        role = body.get("data", {}).get("user", {}).get("role") if isinstance(body, dict) else None
        self.log("Admin Login", f"Status: {code}, Role: {role}", code == 200 and admin_token is not None and role == "admin")
        self.tokens["admin"] = admin_token

        # 4. Authentication: Faculty Login
        code, body = self.request("POST", "/auth/login", {
            "identifier": "faculty.cs@college.edu",
            "password": "Faculty@123"
        })
        faculty_token = body.get("data", {}).get("token") if isinstance(body, dict) else None
        role = body.get("data", {}).get("user", {}).get("role") if isinstance(body, dict) else None
        self.log("Faculty Login", f"Status: {code}, Role: {role}", code == 200 and faculty_token is not None and role == "faculty")
        self.tokens["faculty"] = faculty_token

        # 5. Authentication: Student Login
        code, body = self.request("POST", "/auth/login", {
            "identifier": "23cs001@college.edu",
            "password": "Student@123"
        })
        student_token = body.get("data", {}).get("token") if isinstance(body, dict) else None
        role = body.get("data", {}).get("user", {}).get("role") if isinstance(body, dict) else None
        self.log("Student Login", f"Status: {code}, Role: {role}", code == 200 and student_token is not None and role == "student")
        self.tokens["student"] = student_token

        # 6. Admin API Operations
        print("\n--- 4. Administrator Operations ---")
        code, body = self.request("GET", "/reports/dashboard-stats", token=self.tokens["admin"])
        data = body.get("data", {}) if isinstance(body, dict) else {}
        self.log("Admin Dashboard Stats", f"Students: {data.get('total_students')}, Faculty: {data.get('total_faculty')}, Classes: {data.get('total_classes')}", code == 200 and data.get("total_students", 0) > 0)

        code, body = self.request("GET", "/classes", token=self.tokens["admin"])
        classes_data = body.get("data", []) if isinstance(body, dict) else []
        self.log("Fetch Classes", f"Retrieved {len(classes_data)} classes", code == 200 and len(classes_data) > 0)

        code, body = self.request("GET", "/subjects", token=self.tokens["admin"])
        subjects_data = body.get("data", []) if isinstance(body, dict) else []
        self.log("Fetch Subjects", f"Retrieved {len(subjects_data)} subjects", code == 200 and len(subjects_data) > 0)

        code, body = self.request("GET", "/admin/audit-logs", token=self.tokens["admin"])
        audit_data = body.get("data", []) if isinstance(body, dict) else []
        self.log("Fetch Audit Logs", f"Retrieved {len(audit_data)} audit log entries", code == 200 and isinstance(audit_data, list))

        # 7. Faculty Operations
        print("\n--- 5. Faculty Operations ---")
        code, body = self.request("GET", "/faculty/me/classes", token=self.tokens["faculty"])
        faculty_classes = body.get("data", {}).get("classes", []) if isinstance(body, dict) else []
        faculty_subjects = body.get("data", {}).get("subjects", []) if isinstance(body, dict) else []
        self.log("Faculty Assigned Scope", f"Assigned classes: {len(faculty_classes)}, Assigned subjects: {len(faculty_subjects)}", code == 200 and len(faculty_subjects) > 0)

        assigned_class_id = faculty_classes[0]["id"] if faculty_classes else None
        assigned_sub_id = faculty_subjects[0]["id"] if faculty_subjects else None

        # Faculty: Create attendance session for authorized subject/class
        import time
        s_min = int(time.time()) % 50
        code, body = self.request("POST", "/attendance/sessions", {
            "class_id": assigned_class_id,
            "subject_id": assigned_sub_id,
            "session_date": "2026-10-30",
            "start_time": f"14:{s_min:02d}",
            "end_time": f"15:{s_min:02d}",
            "session_type": "Lecture",
            "classroom": "Hall-101",
            "topic": "Live Integration Verification Test"
        }, token=self.tokens["faculty"])
        session_id = body.get("data", {}).get("id") if isinstance(body, dict) else None
        self.log("Create Attendance Session", f"Status: {code}, Session ID: {session_id}", code in (200, 201) and session_id is not None)

        if session_id:
            # Fetch enrolled students for session
            code, body = self.request("GET", f"/attendance/sessions/{session_id}", token=self.tokens["faculty"])
            students_in_session = body.get("data", {}).get("students", []) if isinstance(body, dict) else []
            self.log("Fetch Session Students", f"Found {len(students_in_session)} enrolled students", code == 200 and len(students_in_session) > 0)

            # Mark Attendance (Bulk)
            records = []
            for idx, stu in enumerate(students_in_session):
                status = "Present" if idx % 4 != 0 else ("Absent" if idx % 4 == 1 else "Late")
                stu_id = stu.get("student_id") or stu.get("id")
                records.append({
                    "student_id": stu_id,
                    "status": status,
                    "remarks": "Verified via live automated runner"
                })

            code, body = self.request("POST", f"/attendance/sessions/{session_id}/records", {
                "records": records
            }, token=self.tokens["faculty"])
            self.log("Mark Bulk Attendance", f"Status: {code}, Marked count: {body.get('data', {}).get('count')}", code in (200, 201))

            # Finalize Session
            code, body = self.request("POST", f"/attendance/sessions/{session_id}/finalize", token=self.tokens["faculty"])
            self.log("Finalize Session", f"Status: {code}, Finalized successfully", code == 200)

            # Attempt update after finalize without mandatory reason (Expect 400 Bad Request)
            code, body = self.request("POST", f"/attendance/sessions/{session_id}/records", {
                "records": [records[0]]  # missing reason
            }, token=self.tokens["faculty"])
            self.log("Enforce Mandatory Reason on Finalized Edit", f"Status: {code} (Correctly rejected missing reason)", code == 400)

            # Update after finalize WITH mandatory reason (Expect 200 Success)
            code, body = self.request("POST", f"/attendance/sessions/{session_id}/records", {
                "records": [records[0]],
                "correction_reason": "Administrative correction after official verification"
            }, token=self.tokens["faculty"])
            self.log("Allow Finalized Edit With Valid Reason", f"Status: {code} (Allowed with reason)", code in (200, 201))

        # 8. Student Operations
        print("\n--- 6. Student Operations ---")
        code, body = self.request("GET", "/auth/me", token=self.tokens["student"])
        student_profile = body.get("data", {}).get("profile", {}) if isinstance(body, dict) else {}
        student_id = student_profile.get("id")
        self.log("Student Profile Retrieval", f"Status: {code}, Student ID: {student_id}, Roll: {student_profile.get('roll_number')}", code == 200 and student_id is not None)

        code, body = self.request("GET", f"/students/{student_id}/attendance", token=self.tokens["student"])
        overall = body.get("data", {}).get("overall", {}) if isinstance(body, dict) else {}
        history = body.get("data", {}).get("history", []) if isinstance(body, dict) else []
        overall_pct = overall.get("percentage", 0)
        self.log("Student Attendance Calculation", f"Overall: {overall_pct}% (Category: {overall.get('category')}, History count: {len(history)})", code == 200 and overall_pct > 0)

        # 9. Attendance Correction Workflow
        print("\n--- 7. Attendance Correction Workflow ---")
        # Find a non-excused record to request correction
        sample_record = None
        for r in history:
            if r.get("status") in ["Absent", "Late"]:
                sample_record = r
                break
        if not sample_record and history:
            sample_record = history[0]

        if sample_record:
            rec_id = sample_record.get("record_id")
            code, body = self.request("POST", "/correction-requests", {
                "attendance_record_id": rec_id,
                "requested_status": "Excused",
                "reason": "Medical certificate submitted for official leave"
            }, token=self.tokens["student"])
            correction_id = body.get("data", {}).get("id") if isinstance(body, dict) else None
            is_ok = code in (200, 201) or (code == 400 and "already exists" in str(body))
            self.log("Student Submit Correction Request", f"Status: {code}, Req ID: {correction_id}", is_ok)

            if correction_id:
                # Admin reviews and approves correction
                code, body = self.request("PATCH", f"/correction-requests/{correction_id}", {
                    "action": "Approved",
                    "reviewer_comments": "Approved after reviewing submitted medical certificate"
                }, token=self.tokens["admin"])
                self.log("Admin Review & Approve Correction", f"Status: {code}, Approved: {body.get('data', {}).get('status') == 'Approved' if isinstance(body, dict) else False}", code == 200)

        # 10. Reports & Exports
        print("\n--- 8. Reports & Analytics Export ---")
        code, body = self.request("GET", "/reports/defaulters?threshold=75", token=self.tokens["admin"])
        defaulters = body.get("data", {}).get("defaulters", []) if isinstance(body, dict) else []
        self.log("Defaulter Detection (<75%)", f"Identified {len(defaulters)} defaulter students", code == 200 and isinstance(defaulters, list))

        code, body = self.request("GET", "/reports/export/csv?type=attendance", token=self.tokens["admin"])
        is_csv = isinstance(body, str) and ("Date" in body or "Roll Number" in body or "Student" in body)
        self.log("Attendance CSV Export", f"Status: {code}, Content length: {len(body) if isinstance(body, str) else 0} bytes", code == 200 and is_csv)

        # Summary
        print("\n" + "=" * 70)
        print(f"  TOTAL TESTS RUN: {self.passes + self.failures}")
        print(f"  PASSED: {self.passes}")
        print(f"  FAILED: {self.failures}")
        print("=" * 70)

        return 0 if self.failures == 0 else 1

if __name__ == "__main__":
    runner = TestRunner()
    sys.exit(runner.run_all())
