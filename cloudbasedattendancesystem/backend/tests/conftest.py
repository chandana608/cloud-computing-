import pytest
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.common.database import Database
from backend.app.extensions import bcrypt

@pytest.fixture(scope="session")
def app():
    """Create and configure a testing Flask app instance."""
    app = create_app("testing")
    return app

@pytest.fixture
def client(app):
    """Test client for issuing requests."""
    return app.test_client()

@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean all mock database collections before each test."""
    with app.app_context():
        db = Database.get_db()
        for name in [
            "users", "students", "faculty", "classes", "subjects",
            "enrollments", "attendance_sessions", "attendance_records",
            "correction_requests", "audit_logs", "system_settings"
        ]:
            db[name].delete_many({})

@pytest.fixture
def test_users(app):
    """Creates standard test users (admin, faculty, student) with valid hashed passwords."""
    with app.app_context():
        db = Database.get_db()
        pwd_hash = bcrypt.generate_password_hash("Password@123").decode("utf-8")

        admin_res = db.users.insert_one({
            "full_name": "Test Admin",
            "email": "admin@test.com",
            "institution_id": "ADM-001",
            "password_hash": pwd_hash,
            "role": "admin",
            "is_active": True
        })

        fac_user_res = db.users.insert_one({
            "full_name": "Dr. Test Faculty",
            "email": "faculty@test.com",
            "institution_id": "FAC-001",
            "password_hash": pwd_hash,
            "role": "faculty",
            "is_active": True
        })
        fac_doc_res = db.faculty.insert_one({
            "user_id": fac_user_res.inserted_id,
            "employee_id": "FAC-001",
            "department": "Computer Science",
            "assigned_subject_ids": [],
            "assigned_class_ids": []
        })

        stu_user_res = db.users.insert_one({
            "full_name": "Test Student",
            "email": "student@test.com",
            "institution_id": "23CS001",
            "password_hash": pwd_hash,
            "role": "student",
            "is_active": True
        })
        stu_doc_res = db.students.insert_one({
            "user_id": stu_user_res.inserted_id,
            "roll_number": "23CS001",
            "department": "Computer Science",
            "class_id": None,
            "semester": 5
        })

        return {
            "admin": {"id": str(admin_res.inserted_id), "email": "admin@test.com"},
            "faculty": {
                "user_id": str(fac_user_res.inserted_id),
                "faculty_id": str(fac_doc_res.inserted_id),
                "email": "faculty@test.com"
            },
            "student": {
                "user_id": str(stu_user_res.inserted_id),
                "student_id": str(stu_doc_res.inserted_id),
                "email": "student@test.com"
            }
        }
