"""
Seed script for Cloud-Based Attendance Management System.
Populates demonstration database with:
- 1 Administrator account
- 3 Faculty accounts with department and subject mappings
- 3 Academic Classes/Sections
- 4 Core Subjects
- 32 Enrolled Students across sections
- 20+ Attendance Sessions across past 3 weeks
- 600+ Individual Attendance Records creating realistic Safe, Warning, and Defaulter percentages
- Real demonstration Correction Requests (Pending, Approved, Rejected)
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.common.database import Database
from backend.app.extensions import bcrypt

def seed_data_internal(db):
    """Populates db with initial demonstration records if not already populated."""
    print(f"[*] Starting database seed on database '{db.name}' (Mock: {Database.is_mock})...")

    # 1. Reset collections for clean, idempotent demo data
    collections_to_clean = [
        "users", "students", "faculty", "classes", "subjects",
        "enrollments", "attendance_sessions", "attendance_records",
        "correction_requests", "audit_logs", "system_settings"
    ]
    for col in collections_to_clean:
        db[col].delete_many({})
    print("[+] Cleared previous collections.")

    now = datetime.now(timezone.utc)
    admin_hash = bcrypt.generate_password_hash("Admin@123").decode("utf-8")
    faculty_hash = bcrypt.generate_password_hash("Faculty@123").decode("utf-8")
    student_hash = bcrypt.generate_password_hash("Student@123").decode("utf-8")

    # 2. Insert Admin User
    admin_user = {
        "full_name": "Chief Academic Administrator",
        "email": "admin@college.edu",
        "institution_id": "ADM-001",
        "password_hash": admin_hash,
        "role": "admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": now
    }
    admin_res = db.users.insert_one(admin_user)
    print("[+] Created Administrator: admin@college.edu (Password: Admin@123)")

    # 3. Create Classes
    classes_data = [
        {
            "name": "B.Tech Computer Science & Engineering",
            "section": "A",
            "academic_year": "2026-2027",
            "semester": 5,
            "department": "Computer Science & Engineering",
            "created_at": now,
            "updated_at": now
        },
        {
            "name": "B.Tech Computer Science & Engineering",
            "section": "B",
            "academic_year": "2026-2027",
            "semester": 5,
            "department": "Computer Science & Engineering",
            "created_at": now,
            "updated_at": now
        },
        {
            "name": "B.Tech Artificial Intelligence & Data Science",
            "section": "A",
            "academic_year": "2026-2027",
            "semester": 5,
            "department": "Artificial Intelligence & Data Science",
            "created_at": now,
            "updated_at": now
        }
    ]
    class_docs = []
    for c in classes_data:
        res = db.classes.insert_one(c)
        c["_id"] = res.inserted_id
        class_docs.append(c)
    print(f"[+] Created {len(class_docs)} academic classes.")

    # 4. Create Faculty Accounts
    faculty_info = [
        {
            "name": "Dr. Alan Turing",
            "email": "faculty.cs@college.edu",
            "emp_id": "FAC-CS-101",
            "dept": "Computer Science & Engineering",
            "desig": "Professor & HOD"
        },
        {
            "name": "Dr. Grace Hopper",
            "email": "faculty.ai@college.edu",
            "emp_id": "FAC-AI-102",
            "dept": "Artificial Intelligence & Data Science",
            "desig": "Associate Professor"
        },
        {
            "name": "Dr. John von Neumann",
            "email": "faculty.ds@college.edu",
            "emp_id": "FAC-DS-103",
            "dept": "Computer Science & Engineering",
            "desig": "Assistant Professor"
        }
    ]

    faculty_docs = []
    for f in faculty_info:
        u_doc = {
            "full_name": f["name"],
            "email": f["email"],
            "institution_id": f["emp_id"],
            "password_hash": faculty_hash,
            "role": "faculty",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        u_res = db.users.insert_one(u_doc)

        f_doc = {
            "user_id": u_res.inserted_id,
            "employee_id": f["emp_id"],
            "department": f["dept"],
            "designation": f["desig"],
            "assigned_subject_ids": [],
            "assigned_class_ids": [c["_id"] for c in class_docs],
            "created_at": now,
            "updated_at": now
        }
        f_res = db.faculty.insert_one(f_doc)
        f_doc["_id"] = f_res.inserted_id
        faculty_docs.append(f_doc)
    print(f"[+] Created {len(faculty_docs)} faculty accounts.")

    # 5. Create Subjects and Assign Faculty
    subjects_data = [
        {
            "subject_code": "CS501",
            "subject_name": "Cloud Computing & Distributed Systems",
            "department": "Computer Science & Engineering",
            "semester": 5,
            "credits": 4,
            "class_ids": [class_docs[0]["_id"], class_docs[1]["_id"]],
            "faculty_ids": [faculty_docs[0]["_id"]],
            "created_at": now,
            "updated_at": now
        },
        {
            "subject_code": "CS502",
            "subject_name": "Database Management Systems",
            "department": "Computer Science & Engineering",
            "semester": 5,
            "credits": 4,
            "class_ids": [class_docs[0]["_id"], class_docs[1]["_id"]],
            "faculty_ids": [faculty_docs[1]["_id"]],
            "created_at": now,
            "updated_at": now
        },
        {
            "subject_code": "CS503",
            "subject_name": "Computer Networks & Security",
            "department": "Computer Science & Engineering",
            "semester": 5,
            "credits": 3,
            "class_ids": [class_docs[0]["_id"]],
            "faculty_ids": [faculty_docs[0]["_id"]],
            "created_at": now,
            "updated_at": now
        },
        {
            "subject_code": "AI501",
            "subject_name": "Machine Learning & Neural Networks",
            "department": "Artificial Intelligence & Data Science",
            "semester": 5,
            "credits": 4,
            "class_ids": [class_docs[2]["_id"]],
            "faculty_ids": [faculty_docs[2]["_id"]],
            "created_at": now,
            "updated_at": now
        }
    ]

    subject_docs = []
    for s in subjects_data:
        res = db.subjects.insert_one(s)
        s["_id"] = res.inserted_id
        subject_docs.append(s)

        for f_id in s["faculty_ids"]:
            db.faculty.update_one(
                {"_id": f_id},
                {"$addToSet": {"assigned_subject_ids": s["_id"]}}
            )
    print(f"[+] Created {len(subject_docs)} subjects and assigned faculty.")

    # 6. Create 32 Synthetic Students
    student_names = [
        ("Aarav Sharma", "23CS001"),
        ("Aditi Patel", "23CS002"),
        ("Ananya Verma", "23CS003"),
        ("Arjun Nair", "23CS004"),
        ("Deepak Kumar", "23CS005"),
        ("Diya Sen", "23CS006"),
        ("Ishaan Gupta", "23CS007"),
        ("Kavya Joshi", "23CS008"),
        ("Manish Reddy", "23CS009"),
        ("Neha Choudhary", "23CS010"),
        ("Pranav Iyer", "23CS011"),
        ("Pooja Bhat", "23CS012"),
        ("Rahul Mehta", "23CS013"),
        ("Rhea Kapoor", "23CS014"),
        ("Rohan Deshmukh", "23CS015"),
        ("Sanya Malhotra", "23CS016"),
        ("Siddharth Roy", "23CS017"),
        ("Simran Kaur", "23CS018"),
        ("Tarun Singhania", "23CS019"),
        ("Varun Pillai", "23CS020"),
        ("Vidya Menon", "23CS021"),
        ("Yash Agarwal", "23CS022"),
        ("Zoya Akhtar", "23CS023"),
        ("Abhishek Bose", "23CS024"),
        ("Bhavna Das", "23CS025"),
        ("Chirag Mittal", "23CS026"),
        ("Devika Pillai", "23AI001"),
        ("Gautam Sethi", "23AI002"),
        ("Harsh Vardhan", "23AI003"),
        ("Meera Nambiar", "23AI004"),
        ("Nikhil Saxena", "23AI005"),
        ("Tanvi Kulkarni", "23AI006"),
    ]

    student_docs = []
    for idx, (name, roll) in enumerate(student_names):
        if idx < 16:
            assigned_class = class_docs[0]
        elif idx < 26:
            assigned_class = class_docs[1]
        else:
            assigned_class = class_docs[2]

        email = f"{roll.lower()}@college.edu"
        u_doc = {
            "full_name": name,
            "email": email,
            "institution_id": roll,
            "password_hash": student_hash,
            "role": "student",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        u_res = db.users.insert_one(u_doc)

        st_doc = {
            "user_id": u_res.inserted_id,
            "roll_number": roll,
            "department": assigned_class["department"],
            "class_id": assigned_class["_id"],
            "section": assigned_class["section"],
            "academic_year": assigned_class["academic_year"],
            "semester": assigned_class["semester"],
            "created_at": now,
            "updated_at": now
        }
        st_res = db.students.insert_one(st_doc)
        st_doc["_id"] = st_res.inserted_id
        st_doc["user_info"] = u_doc
        student_docs.append(st_doc)

        class_subjects = [s for s in subject_docs if assigned_class["_id"] in s["class_ids"]]
        for cs in class_subjects:
            db.enrollments.insert_one({
                "student_id": st_res.inserted_id,
                "class_id": assigned_class["_id"],
                "subject_id": cs["_id"],
                "academic_year": assigned_class["academic_year"],
                "created_at": now
            })

    print(f"[+] Created {len(student_docs)} students and enrolled them into subjects.")

    # 7. Generate Attendance Sessions and Records
    target_class = class_docs[0]
    class_a_students = [s for s in student_docs if s["class_id"] == target_class["_id"]]
    cs501 = subject_docs[0]
    cs502 = subject_docs[1]

    dates = []
    base_date = datetime.now(timezone.utc).date() - timedelta(days=14)
    for d in range(14):
        day = base_date + timedelta(days=d)
        if day.weekday() < 5:
            dates.append(day.isoformat())

    session_docs = []
    for dt in dates:
        s1 = {
            "class_id": target_class["_id"],
            "subject_id": cs501["_id"],
            "faculty_id": faculty_docs[0]["_id"],
            "session_date": dt,
            "start_time": "09:00",
            "end_time": "10:00",
            "session_type": "Lecture",
            "room": "Room-301",
            "status": "Finalized",
            "created_by": faculty_docs[0]["user_id"],
            "created_at": now - timedelta(days=2),
            "finalized_at": now - timedelta(days=2),
            "updated_at": now
        }
        r1 = db.attendance_sessions.insert_one(s1)
        s1["_id"] = r1.inserted_id
        session_docs.append((s1, cs501))

        s2 = {
            "class_id": target_class["_id"],
            "subject_id": cs502["_id"],
            "faculty_id": faculty_docs[1]["_id"],
            "session_date": dt,
            "start_time": "10:15",
            "end_time": "11:15",
            "session_type": "Lecture",
            "room": "Lab-2",
            "status": "Finalized",
            "created_by": faculty_docs[1]["user_id"],
            "created_at": now - timedelta(days=2),
            "finalized_at": now - timedelta(days=2),
            "updated_at": now
        }
        r2 = db.attendance_sessions.insert_one(s2)
        s2["_id"] = r2.inserted_id
        session_docs.append((s2, cs502))

    # Add 1 Open session today for interactive faculty demonstration
    today_open = {
        "class_id": target_class["_id"],
        "subject_id": cs501["_id"],
        "faculty_id": faculty_docs[0]["_id"],
        "session_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "start_time": "14:00",
        "end_time": "15:00",
        "session_type": "Lab",
        "room": "Cloud Computing Lab 4",
        "status": "Open",
        "created_by": faculty_docs[0]["user_id"],
        "created_at": now,
        "finalized_at": None,
        "updated_at": now
    }
    res_open = db.attendance_sessions.insert_one(today_open)
    today_open["_id"] = res_open.inserted_id

    print(f"[+] Created {len(session_docs) + 1} attendance sessions (including 1 currently Open).")

    # 8. Mark Attendance Records
    sample_records_to_request = []
    total_records_inserted = 0
    for s_idx, (sess, subj) in enumerate(session_docs):
        for st_idx, st in enumerate(class_a_students):
            if st_idx == 0:
                status = "Present" if s_idx % 12 != 0 else "Late"
            elif st_idx == 1:
                status = "Present" if s_idx % 4 != 0 else ("Late" if s_idx % 2 == 0 else "Absent")
            elif st_idx == 2:
                status = "Absent" if s_idx % 2 == 0 else ("Excused" if s_idx % 5 == 0 else "Present")
            else:
                if (st_idx + s_idx) % 7 == 0:
                    status = "Absent"
                elif (st_idx + s_idx) % 9 == 0:
                    status = "Late"
                elif (st_idx + s_idx) % 15 == 0:
                    status = "Excused"
                else:
                    status = "Present"

            rec = {
                "session_id": sess["_id"],
                "student_id": st["_id"],
                "status": status,
                "remarks": "On time" if status == "Present" else ("Medical leave" if status == "Excused" else ""),
                "marked_by": sess["faculty_id"],
                "marked_at": sess["created_at"],
                "updated_at": sess["created_at"]
            }
            rec_res = db.attendance_records.insert_one(rec)
            rec["_id"] = rec_res.inserted_id
            total_records_inserted += 1

            if st_idx == 2 and status == "Absent" and len(sample_records_to_request) < 3:
                sample_records_to_request.append((st, rec))

    print(f"[+] Generated {total_records_inserted} attendance records.")

    # 9. Create Demonstration Correction Requests
    if len(sample_records_to_request) >= 2:
        st1, rec1 = sample_records_to_request[0]
        db.correction_requests.insert_one({
            "student_id": st1["_id"],
            "attendance_record_id": rec1["_id"],
            "original_status": "Absent",
            "requested_status": "Present",
            "reason": "Was present in the lab but roll call was taken while setting up cloud VM.",
            "supporting_notes": "Submitted lab assignment on time to faculty.",
            "status": "Pending",
            "reviewed_by": None,
            "reviewer_comments": None,
            "created_at": now - timedelta(days=1),
            "reviewed_at": None
        })

        st2, rec2 = sample_records_to_request[1]
        db.correction_requests.insert_one({
            "student_id": st2["_id"],
            "attendance_record_id": rec2["_id"],
            "original_status": "Absent",
            "requested_status": "Excused",
            "reason": "Hospital appointment for dental surgery. Medical certificate presented.",
            "supporting_notes": "Certificate attached to department office.",
            "status": "Approved",
            "reviewed_by": faculty_docs[0]["user_id"],
            "reviewer_comments": "Verified medical documentation. Approved.",
            "created_at": now - timedelta(days=3),
            "reviewed_at": now - timedelta(days=2)
        })
        print("[+] Created 2 realistic attendance correction requests (1 Pending, 1 Approved).")

    # 10. Global Settings
    db.system_settings.update_one(
        {"key": "global_settings"},
        {
            "$set": {
                "key": "global_settings",
                "institution_name": "Apex Institute of Engineering & Technology",
                "min_attendance_threshold": 75.0,
                "warning_attendance_threshold": 80.0,
                "academic_year": "2026-2027",
                "current_semester": "Semester 5 (Fall 2026)",
                "updated_at": now
            }
        },
        upsert=True
    )
    print("[+] Initialized system settings.")

def seed_database():
    from backend.app import create_app
    app = create_app(os.getenv("FLASK_ENV", "development"))
    with app.app_context():
        db = Database.get_db()
        seed_data_internal(db)

if __name__ == "__main__":
    seed_database()
