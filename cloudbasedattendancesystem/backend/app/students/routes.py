from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import validate_required_fields, validate_email
from backend.app.common.decorators import roles_required, admin_required, student_required, get_current_user_doc
from backend.app.common.audit import log_audit_event
from backend.app.common.attendance_calculator import compute_attendance_percentage
from backend.app.extensions import bcrypt

students_bp = Blueprint("students", __name__, url_prefix="/api/v1/students")

@students_bp.route("", methods=["GET"])
@roles_required("admin", "faculty")
def get_students():
    """Returns list of students with class details and user accounts."""
    db = Database.get_db()
    query = {}

    class_id = request.args.get("class_id")
    department = request.args.get("department")
    search = request.args.get("search")

    if class_id:
        c_oid = to_object_id(class_id)
        if c_oid:
            query["class_id"] = c_oid
    if department:
        query["department"] = department
    if search:
        query["$or"] = [
            {"roll_number": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    students = list(db.students.find(query).sort("roll_number", 1))

    enriched = []
    for s in students:
        s_ser = serialize_doc(s)
        # Fetch user doc
        user_doc = db.users.find_one({"_id": s["user_id"]})
        if user_doc:
            s_ser["full_name"] = user_doc.get("full_name", "")
            s_ser["email"] = user_doc.get("email", "")
            s_ser["institution_id"] = user_doc.get("institution_id", "")
            s_ser["is_active"] = user_doc.get("is_active", True)

        # Fetch class doc
        if s.get("class_id"):
            cls_doc = db.classes.find_one({"_id": s["class_id"]})
            if cls_doc:
                s_ser["class_name"] = cls_doc.get("name", "")
                s_ser["section"] = cls_doc.get("section", "")
                s_ser["academic_year"] = cls_doc.get("academic_year", "")

        enriched.append(s_ser)

    return success_response(data=enriched)

@students_bp.route("/<id>", methods=["GET"])
@roles_required("admin", "faculty", "student")
def get_student(id):
    """Returns single student profile with enrolled subjects."""
    db = Database.get_db()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid student ID.", status_code=400)

    student = db.students.find_one({"_id": s_oid})
    if not student:
        raise APIError("Student not found.", status_code=404)

    # If student role, ensure they only view their own profile
    current_user = get_current_user_doc()
    if current_user["role"] == "student" and student["user_id"] != current_user["_id"]:
        raise APIError("You are not authorized to view other students' records.", status_code=403)

    res = serialize_doc(student)
    user_doc = db.users.find_one({"_id": student["user_id"]})
    if user_doc:
        res["full_name"] = user_doc.get("full_name")
        res["email"] = user_doc.get("email")
        res["institution_id"] = user_doc.get("institution_id")
        res["is_active"] = user_doc.get("is_active", True)

    if student.get("class_id"):
        cls_doc = db.classes.find_one({"_id": student["class_id"]})
        if cls_doc:
            res["class_details"] = serialize_doc(cls_doc)

    # Fetch enrolled subjects
    enrollments = list(db.enrollments.find({"student_id": s_oid}))
    enrolled_subjects = []
    for enr in enrollments:
        sub_doc = db.subjects.find_one({"_id": enr["subject_id"]})
        if sub_doc:
            enrolled_subjects.append(serialize_doc(sub_doc))
    res["enrolled_subjects"] = enrolled_subjects

    return success_response(data=res)

@students_bp.route("", methods=["POST"])
@admin_required
def create_student():
    """Creates a student user account and associated student record."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(
        data,
        ["full_name", "email", "roll_number", "class_id", "department", "semester"]
    )

    db = Database.get_db()
    email = validate_email(data["email"])
    roll_number = str(data["roll_number"]).strip().upper()
    full_name = str(data["full_name"]).strip()
    institution_id = str(data.get("institution_id", roll_number)).strip().upper()
    password = str(data.get("password", "Student@123"))

    class_oid = to_object_id(data["class_id"])
    if not class_oid:
        raise APIError("Invalid class ID.", status_code=400)

    cls_doc = db.classes.find_one({"_id": class_oid})
    if not cls_doc:
        raise APIError("Specified class does not exist.", status_code=404)

    # Check for existing email or roll number
    if db.users.find_one({"email": email}):
        raise APIError(f"Email '{email}' is already registered.", status_code=400)
    if db.students.find_one({"roll_number": roll_number}):
        raise APIError(f"Roll number '{roll_number}' already exists.", status_code=400)

    now = datetime.now(timezone.utc)
    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    # 1. Insert user
    user_doc = {
        "full_name": full_name,
        "email": email,
        "institution_id": institution_id,
        "password_hash": password_hash,
        "role": "student",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    user_res = db.users.insert_one(user_doc)

    # 2. Insert student
    student_doc = {
        "user_id": user_res.inserted_id,
        "roll_number": roll_number,
        "department": str(data["department"]).strip(),
        "class_id": class_oid,
        "semester": int(data["semester"]),
        "academic_year": cls_doc.get("academic_year", "2026-2027"),
        "created_at": now,
        "updated_at": now
    }
    student_res = db.students.insert_one(student_doc)
    student_doc["_id"] = student_res.inserted_id

    # 3. Automatically enroll student in subjects mapped to this class
    subjects_for_class = list(db.subjects.find({"class_ids": class_oid}))
    for sub in subjects_for_class:
        db.enrollments.update_one(
            {"student_id": student_res.inserted_id, "subject_id": sub["_id"]},
            {
                "$setOnInsert": {
                    "student_id": student_res.inserted_id,
                    "class_id": class_oid,
                    "subject_id": sub["_id"],
                    "created_at": now
                }
            },
            upsert=True
        )

    log_audit_event(
        actor_user_id=None,
        action="CREATE_STUDENT",
        entity_type="student",
        entity_id=student_res.inserted_id,
        new_value=f"{roll_number} - {full_name}"
    )

    result_data = serialize_doc(student_doc)
    result_data["full_name"] = full_name
    result_data["email"] = email
    result_data["class_name"] = cls_doc.get("name")
    return success_response(data=result_data, message="Student created and enrolled successfully.", status_code=201)

@students_bp.route("/<id>", methods=["PUT"])
@admin_required
def update_student(id):
    """Updates student and user account details."""
    data = request.get_json(silent=True) or {}
    db = Database.get_db()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid student ID.", status_code=400)

    student = db.students.find_one({"_id": s_oid})
    if not student:
        raise APIError("Student not found.", status_code=404)

    now = datetime.now(timezone.utc)
    user_updates = {"updated_at": now}
    student_updates = {"updated_at": now}

    if "full_name" in data:
        user_updates["full_name"] = str(data["full_name"]).strip()
    if "email" in data:
        user_updates["email"] = validate_email(data["email"])
    if "is_active" in data:
        user_updates["is_active"] = bool(data["is_active"])

    if "roll_number" in data:
        student_updates["roll_number"] = str(data["roll_number"]).strip().upper()
    if "department" in data:
        student_updates["department"] = str(data["department"]).strip()
    if "semester" in data:
        student_updates["semester"] = int(data["semester"])
    if "class_id" in data:
        new_cid = to_object_id(data["class_id"])
        if new_cid:
            student_updates["class_id"] = new_cid

    db.users.update_one({"_id": student["user_id"]}, {"$set": user_updates})
    db.students.update_one({"_id": s_oid}, {"$set": student_updates})

    log_audit_event(
        actor_user_id=None,
        action="UPDATE_STUDENT",
        entity_type="student",
        entity_id=s_oid,
        new_value=data
    )

    updated_student = db.students.find_one({"_id": s_oid})
    return success_response(data=serialize_doc(updated_student), message="Student updated successfully.")

@students_bp.route("/<id>/status", methods=["PATCH"])
@admin_required
def toggle_student_status(id):
    """Activates or deactivates student account."""
    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    if is_active is None:
        raise APIError("Field 'is_active' (boolean) is required.", status_code=400)

    db = Database.get_db()
    s_oid = to_object_id(id)
    student = db.students.find_one({"_id": s_oid})
    if not student:
        raise APIError("Student not found.", status_code=404)

    db.users.update_one(
        {"_id": student["user_id"]},
        {"$set": {"is_active": bool(is_active), "updated_at": datetime.now(timezone.utc)}}
    )

    log_audit_event(
        actor_user_id=None,
        action="DEACTIVATE_STUDENT" if not is_active else "ACTIVATE_STUDENT",
        entity_type="student",
        entity_id=s_oid,
        new_value={"is_active": is_active}
    )

    return success_response(message=f"Student account {'activated' if is_active else 'deactivated'} successfully.")

@students_bp.route("/<id>/attendance", methods=["GET"])
@roles_required("admin", "faculty", "student")
def get_student_attendance(id):
    """
    Returns complete attendance records, percentages per subject, and overall attendance.
    """
    db = Database.get_db()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid student ID.", status_code=400)

    student = db.students.find_one({"_id": s_oid})
    if not student:
        raise APIError("Student not found.", status_code=404)

    # Permission check for student
    current_user = get_current_user_doc()
    if current_user["role"] == "student" and student["user_id"] != current_user["_id"]:
        raise APIError("Unauthorized access to other student records.", status_code=403)

    # Fetch all attendance records for this student
    records = list(db.attendance_records.find({"student_id": s_oid}))

    # Map records by session
    session_ids = [r["session_id"] for r in records]
    sessions = {s["_id"]: s for s in db.attendance_sessions.find({"_id": {"$in": session_ids}})}
    subject_ids = list({s["subject_id"] for s in sessions.values() if "subject_id" in s})
    subjects = {sub["_id"]: sub for sub in db.subjects.find({"_id": {"$in": subject_ids}})}

    enriched_records = []
    subject_stats = {}

    for r in records:
        session = sessions.get(r["session_id"])
        if not session:
            continue

        sub_id = session.get("subject_id")
        sub_name = subjects.get(sub_id, {}).get("subject_name", "Unknown Subject")
        sub_code = subjects.get(sub_id, {}).get("subject_code", "SUB")

        status = r.get("status", "Absent")

        rec_entry = {
            "record_id": str(r["_id"]),
            "session_id": str(session["_id"]),
            "session_date": session.get("session_date"),
            "session_type": session.get("session_type", "Lecture"),
            "subject_id": str(sub_id),
            "subject_name": sub_name,
            "subject_code": sub_code,
            "status": status,
            "remarks": r.get("remarks", ""),
            "correction_reason": r.get("correction_reason"),
            "marked_at": r.get("marked_at").isoformat() if r.get("marked_at") else None
        }
        enriched_records.append(rec_entry)

        # Accumulate stats per subject
        if sub_id not in subject_stats:
            subject_stats[sub_id] = {
                "subject_id": str(sub_id),
                "subject_code": sub_code,
                "subject_name": sub_name,
                "total": 0,
                "present": 0,
                "absent": 0,
                "late": 0,
                "excused": 0
            }

        subject_stats[sub_id]["total"] += 1
        if status == "Present":
            subject_stats[sub_id]["present"] += 1
        elif status == "Absent":
            subject_stats[sub_id]["absent"] += 1
        elif status == "Late":
            subject_stats[sub_id]["late"] += 1
        elif status == "Excused":
            subject_stats[sub_id]["excused"] += 1

    # Compute percentages per subject
    subject_summary_list = []
    overall_total = 0
    overall_present = 0
    overall_late = 0
    overall_excused = 0
    overall_absent = 0

    for sub_id, stats in subject_stats.items():
        pct, eligible, attended, cat = compute_attendance_percentage(
            stats["present"], stats["late"], stats["excused"], stats["total"]
        )
        stats["percentage"] = pct
        stats["eligible"] = eligible
        stats["attended"] = attended
        stats["category"] = cat
        subject_summary_list.append(stats)

        overall_total += stats["total"]
        overall_present += stats["present"]
        overall_late += stats["late"]
        overall_excused += stats["excused"]
        overall_absent += stats["absent"]

    overall_pct, overall_eligible, overall_attended, overall_cat = compute_attendance_percentage(
        overall_present, overall_late, overall_excused, overall_total
    )

    # Sort records descending by date
    enriched_records.sort(key=lambda x: x["session_date"] or "", reverse=True)

    return success_response(data={
        "overall": {
            "total_sessions": overall_total,
            "eligible_sessions": overall_eligible,
            "attended_sessions": overall_attended,
            "present_count": overall_present,
            "late_count": overall_late,
            "excused_count": overall_excused,
            "absent_count": overall_absent,
            "percentage": overall_pct,
            "category": overall_cat
        },
        "subject_wise": subject_summary_list,
        "history": enriched_records
    })
