from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import (
    validate_required_fields,
    validate_date,
    validate_time,
    validate_attendance_status
)
from backend.app.common.decorators import (
    roles_required,
    admin_required,
    faculty_required,
    get_current_user_doc
)
from backend.app.common.audit import log_audit_event
from backend.app.common.attendance_calculator import compute_attendance_percentage

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/v1/attendance")

@attendance_bp.route("/sessions", methods=["POST"])
@roles_required("admin", "faculty")
def create_session():
    """
    Creates an attendance session for a class and subject.
    Validates faculty authorization and prevents duplicate time slots.
    """
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["class_id", "subject_id", "session_date", "start_time", "end_time"])

    db = Database.get_db()
    current_user = get_current_user_doc()

    class_oid = to_object_id(data["class_id"])
    subject_oid = to_object_id(data["subject_id"])
    if not class_oid or not subject_oid:
        raise APIError("Invalid class ID or subject ID.", status_code=400)

    # Validate existence
    cls_doc = db.classes.find_one({"_id": class_oid})
    if not cls_doc:
        raise APIError("Specified class does not exist.", status_code=404)

    sub_doc = db.subjects.find_one({"_id": subject_oid})
    if not sub_doc:
        raise APIError("Specified subject does not exist.", status_code=404)

    # Determine faculty ID
    faculty_oid = None
    if current_user["role"] == "faculty":
        fac_doc = db.faculty.find_one({"user_id": current_user["_id"]})
        if not fac_doc:
            raise APIError("Faculty profile not found.", status_code=404)
        faculty_oid = fac_doc["_id"]

        # Scope validation: faculty must be assigned to this subject or class
        assigned_subs = [str(sid) for sid in fac_doc.get("assigned_subject_ids", [])]
        subject_faculty = [str(fid) for fid in sub_doc.get("faculty_ids", [])]
        if str(subject_oid) not in assigned_subs and str(faculty_oid) not in subject_faculty:
            raise APIError("You are not authorized to conduct sessions for this subject.", status_code=403)
    else:
        # Admin can assign any faculty or default to first faculty
        if "faculty_id" in data and to_object_id(data["faculty_id"]):
            faculty_oid = to_object_id(data["faculty_id"])
        else:
            faculty_oid = sub_doc.get("faculty_ids", [None])[0]

    session_date = validate_date(data["session_date"], "session_date")
    start_time = validate_time(data["start_time"], "start_time")
    end_time = validate_time(data["end_time"], "end_time")
    session_type = data.get("session_type", "Lecture")
    room = data.get("room", "")

    # Duplicate prevention: Check if exact same class, subject, date, and start_time exists
    duplicate = db.attendance_sessions.find_one({
        "class_id": class_oid,
        "subject_id": subject_oid,
        "session_date": session_date,
        "start_time": start_time
    })
    if duplicate:
        raise APIError(
            f"An attendance session already exists for this class, subject, and start time on {session_date}.",
            status_code=409
        )

    now = datetime.now(timezone.utc)
    new_session = {
        "class_id": class_oid,
        "subject_id": subject_oid,
        "faculty_id": faculty_oid,
        "session_date": session_date,
        "start_time": start_time,
        "end_time": end_time,
        "session_type": session_type,
        "room": room,
        "status": "Open",
        "created_by": current_user["_id"],
        "created_at": now,
        "updated_at": now,
        "finalized_at": None
    }

    result = db.attendance_sessions.insert_one(new_session)
    new_session["_id"] = result.inserted_id

    log_audit_event(
        actor_user_id=current_user["_id"],
        action="CREATE_SESSION",
        entity_type="attendance_session",
        entity_id=result.inserted_id,
        new_value=f"{session_date} {start_time}-{end_time} [{sub_doc['subject_code']}]"
    )

    ser = serialize_doc(new_session)
    ser["class_name"] = f"{cls_doc['name']} ({cls_doc['section']})"
    ser["subject_name"] = sub_doc["subject_name"]
    ser["subject_code"] = sub_doc["subject_code"]

    return success_response(data=ser, message="Attendance session created successfully.", status_code=201)

@attendance_bp.route("/sessions", methods=["GET"])
@roles_required("admin", "faculty", "student")
def get_sessions():
    """Lists attendance sessions with extensive filtering."""
    db = Database.get_db()
    current_user = get_current_user_doc()
    query = {}

    class_id = request.args.get("class_id")
    subject_id = request.args.get("subject_id")
    status = request.args.get("status")
    session_date = request.args.get("session_date")

    if class_id:
        c_oid = to_object_id(class_id)
        if c_oid:
            query["class_id"] = c_oid
    if subject_id:
        s_oid = to_object_id(subject_id)
        if s_oid:
            query["subject_id"] = s_oid
    if status:
        query["status"] = status
    if session_date:
        query["session_date"] = session_date

    # If faculty, scope default to their faculty ID unless admin
    if current_user["role"] == "faculty" and not request.args.get("all"):
        fac = db.faculty.find_one({"user_id": current_user["_id"]})
        if fac:
            query["faculty_id"] = fac["_id"]

    sessions = list(db.attendance_sessions.find(query).sort([("session_date", -1), ("start_time", -1)]).limit(100))

    # Enrich sessions with class, subject, faculty name, and attendance record count
    enriched = []
    for sess in sessions:
        s_ser = serialize_doc(sess)
        cls_doc = db.classes.find_one({"_id": sess.get("class_id")})
        if cls_doc:
            s_ser["class_name"] = f"{cls_doc.get('name')} ({cls_doc.get('section')})"

        sub_doc = db.subjects.find_one({"_id": sess.get("subject_id")})
        if sub_doc:
            s_ser["subject_name"] = sub_doc.get("subject_name")
            s_ser["subject_code"] = sub_doc.get("subject_code")

        if sess.get("faculty_id"):
            f_doc = db.faculty.find_one({"_id": sess["faculty_id"]})
            if f_doc:
                u_doc = db.users.find_one({"_id": f_doc["user_id"]})
                if u_doc:
                    s_ser["faculty_name"] = u_doc.get("full_name")

        # Counts
        rec_count = db.attendance_records.count_documents({"session_id": sess["_id"]})
        present_count = db.attendance_records.count_documents({"session_id": sess["_id"], "status": "Present"})
        s_ser["marked_records_count"] = rec_count
        s_ser["present_count"] = present_count

        enriched.append(s_ser)

    return success_response(data=enriched)

@attendance_bp.route("/sessions/<id>", methods=["GET"])
@roles_required("admin", "faculty")
def get_session_details(id):
    """
    Returns single session details with enrolled students list and marked attendance statuses.
    """
    db = Database.get_db()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid session ID.", status_code=400)

    session = db.attendance_sessions.find_one({"_id": s_oid})
    if not session:
        raise APIError("Attendance session not found.", status_code=404)

    s_ser = serialize_doc(session)

    # Class & Subject info
    cls_doc = db.classes.find_one({"_id": session.get("class_id")})
    if cls_doc:
        s_ser["class_name"] = f"{cls_doc.get('name')} ({cls_doc.get('section')})"
        s_ser["department"] = cls_doc.get("department")

    sub_doc = db.subjects.find_one({"_id": session.get("subject_id")})
    if sub_doc:
        s_ser["subject_name"] = sub_doc.get("subject_name")
        s_ser["subject_code"] = sub_doc.get("subject_code")

    # Faculty info
    if session.get("faculty_id"):
        f_doc = db.faculty.find_one({"_id": session["faculty_id"]})
        if f_doc:
            u_doc = db.users.find_one({"_id": f_doc["user_id"]})
            if u_doc:
                s_ser["faculty_name"] = u_doc.get("full_name")

    # Fetch all students belonging to this class
    students_in_class = list(db.students.find({"class_id": session["class_id"]}).sort("roll_number", 1))

    # Fetch any already marked attendance records for this session
    existing_records = {
        r["student_id"]: r
        for r in db.attendance_records.find({"session_id": s_oid})
    }

    student_roster = []
    for st in students_in_class:
        u_doc = db.users.find_one({"_id": st["user_id"]})
        rec = existing_records.get(st["_id"])

        entry = {
            "student_id": str(st["_id"]),
            "roll_number": st.get("roll_number"),
            "full_name": u_doc.get("full_name", "") if u_doc else "Unknown",
            "email": u_doc.get("email", "") if u_doc else "",
            "institution_id": u_doc.get("institution_id", "") if u_doc else "",
            "is_marked": rec is not None,
            "status": rec.get("status", "Present") if rec else "Present", # default for quick marking
            "remarks": rec.get("remarks", "") if rec else "",
            "record_id": str(rec["_id"]) if rec else None
        }
        student_roster.append(entry)

    s_ser["students"] = student_roster
    return success_response(data=s_ser)

@attendance_bp.route("/sessions/<id>/records", methods=["POST"])
@roles_required("admin", "faculty")
def mark_attendance(id):
    """
    Submits or updates attendance records for students in a session (supports bulk marking).
    Enforces one record per student per session and records audit trail.
    """
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["records"])

    records = data["records"]
    if not isinstance(records, list) or len(records) == 0:
        raise APIError("Records must be a non-empty list of student attendance entries.", status_code=400)

    correction_reason = data.get("correction_reason") or data.get("reason")

    db = Database.get_db()
    current_user = get_current_user_doc()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid session ID.", status_code=400)

    session = db.attendance_sessions.find_one({"_id": s_oid})
    if not session:
        raise APIError("Attendance session not found.", status_code=404)

    # If session is finalized, require reason and verify permission
    if session.get("status") == "Finalized":
        if not correction_reason or not str(correction_reason).strip():
            raise APIError("This session has already been finalized. A mandatory correction reason is required to modify attendance.", status_code=400)

    now = datetime.now(timezone.utc)
    saved_count = 0
    updated_count = 0

    for item in records:
        st_id = to_object_id(item.get("student_id"))
        if not st_id:
            continue

        raw_status = item.get("status", "Present")
        status = validate_attendance_status(raw_status)
        remarks = str(item.get("remarks", "")).strip()

        # Idempotent upsert
        filter_query = {"session_id": s_oid, "student_id": st_id}
        existing_rec = db.attendance_records.find_one(filter_query)

        update_doc = {
            "status": status,
            "remarks": remarks,
            "updated_at": now
        }
        if correction_reason:
            update_doc["correction_reason"] = correction_reason

        if existing_rec:
            db.attendance_records.update_one(
                filter_query,
                {
                    "$set": update_doc
                }
            )
            updated_count += 1
        else:
            db.attendance_records.insert_one({
                "session_id": s_oid,
                "student_id": st_id,
                "status": status,
                "remarks": remarks,
                "marked_by": current_user["_id"],
                "marked_at": now,
                "updated_at": now,
                "correction_reason": correction_reason
            })
            saved_count += 1

    # Update session's updated_at
    db.attendance_sessions.update_one({"_id": s_oid}, {"$set": {"updated_at": now}})

    log_audit_event(
        actor_user_id=current_user["_id"],
        action="MARK_ATTENDANCE",
        entity_type="attendance_session",
        entity_id=s_oid,
        new_value=f"Saved: {saved_count}, Updated: {updated_count}",
        reason=correction_reason
    )

    return success_response(
        data={"saved": saved_count, "updated": updated_count},
        message=f"Attendance recorded successfully. ({saved_count} new, {updated_count} updated)"
    )

@attendance_bp.route("/sessions/<id>/finalize", methods=["POST"])
@roles_required("admin", "faculty")
def finalize_session(id):
    """Finalizes and locks an attendance session."""
    db = Database.get_db()
    current_user = get_current_user_doc()
    s_oid = to_object_id(id)
    if not s_oid:
        raise APIError("Invalid session ID.", status_code=400)

    session = db.attendance_sessions.find_one({"_id": s_oid})
    if not session:
        raise APIError("Attendance session not found.", status_code=404)

    # Ensure attendance was actually marked before finalizing
    count = db.attendance_records.count_documents({"session_id": s_oid})
    if count == 0:
        raise APIError("Cannot finalize an attendance session that has no marked records.", status_code=400)

    now = datetime.now(timezone.utc)
    db.attendance_sessions.update_one(
        {"_id": s_oid},
        {"$set": {"status": "Finalized", "finalized_at": now, "updated_at": now}}
    )

    log_audit_event(
        actor_user_id=current_user["_id"],
        action="FINALIZE_SESSION",
        entity_type="attendance_session",
        entity_id=s_oid,
        new_value="Finalized"
    )

    return success_response(message="Session successfully finalized and locked.")

@attendance_bp.route("/sessions/<id>/status", methods=["PATCH"])
@roles_required("admin", "faculty")
def update_session_status(id):
    """Updates session status (e.g. Scheduled, Open, Closed)."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["status"])

    status = str(data["status"]).strip()
    if status not in {"Scheduled", "Open", "Closed", "Finalized"}:
        raise APIError("Invalid status value.", status_code=400)

    db = Database.get_db()
    current_user = get_current_user_doc()
    s_oid = to_object_id(id)

    session = db.attendance_sessions.find_one({"_id": s_oid})
    if not session:
        raise APIError("Attendance session not found.", status_code=404)

    now = datetime.now(timezone.utc)
    update_data = {"status": status, "updated_at": now}
    if status == "Finalized":
        update_data["finalized_at"] = now

    db.attendance_sessions.update_one({"_id": s_oid}, {"$set": update_data})

    log_audit_event(
        actor_user_id=current_user["_id"],
        action="UPDATE_SESSION_STATUS",
        entity_type="attendance_session",
        entity_id=s_oid,
        new_value=status
    )

    return success_response(message=f"Session status changed to {status}.")
