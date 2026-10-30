from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import validate_required_fields, validate_attendance_status
from backend.app.common.decorators import roles_required, student_required, get_current_user_doc
from backend.app.common.audit import log_audit_event

corrections_bp = Blueprint("corrections", __name__, url_prefix="/api/v1/correction-requests")

@corrections_bp.route("", methods=["POST"])
@student_required
def create_correction_request():
    """Student submits an attendance correction request."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["attendance_record_id", "requested_status", "reason"])

    db = Database.get_db()
    current_user = get_current_user_doc()

    student_doc = db.students.find_one({"user_id": current_user["_id"]})
    if not student_doc:
        raise APIError("Student profile not found.", status_code=404)

    record_oid = to_object_id(data["attendance_record_id"])
    if not record_oid:
        raise APIError("Invalid attendance record ID.", status_code=400)

    # Verify that record belongs to this student
    record = db.attendance_records.find_one({"_id": record_oid, "student_id": student_doc["_id"]})
    if not record:
        raise APIError("Attendance record not found or does not belong to you.", status_code=404)

    # Check for existing pending request
    existing_pending = db.correction_requests.find_one({
        "attendance_record_id": record_oid,
        "status": "Pending"
    })
    if existing_pending:
        raise APIError("A pending correction request already exists for this attendance record.", status_code=400)

    requested_status = validate_attendance_status(data["requested_status"])
    reason = str(data["reason"]).strip()
    if len(reason) < 5:
        raise APIError("Please provide a descriptive reason (at least 5 characters).", status_code=400)

    now = datetime.now(timezone.utc)
    new_request = {
        "student_id": student_doc["_id"],
        "attendance_record_id": record_oid,
        "original_status": record.get("status", "Absent"),
        "requested_status": requested_status,
        "reason": reason,
        "supporting_notes": str(data.get("supporting_notes", "")).strip(),
        "status": "Pending",
        "reviewed_by": None,
        "reviewer_comments": None,
        "created_at": now,
        "reviewed_at": None
    }

    result = db.correction_requests.insert_one(new_request)
    new_request["_id"] = result.inserted_id

    log_audit_event(
        actor_user_id=current_user["_id"],
        action="SUBMIT_CORRECTION_REQUEST",
        entity_type="correction_request",
        entity_id=result.inserted_id,
        reason=reason
    )

    return success_response(
        data=serialize_doc(new_request),
        message="Correction request submitted successfully.",
        status_code=201
    )

@corrections_bp.route("", methods=["GET"])
@roles_required("admin", "faculty", "student")
def list_correction_requests():
    """Lists correction requests with role-based filtering and status filters."""
    db = Database.get_db()
    current_user = get_current_user_doc()
    query = {}

    status_filter = request.args.get("status")
    if status_filter:
        query["status"] = status_filter

    if current_user["role"] == "student":
        student_doc = db.students.find_one({"user_id": current_user["_id"]})
        if not student_doc:
            return success_response(data=[])
        query["student_id"] = student_doc["_id"]

    requests_list = list(db.correction_requests.find(query).sort("created_at", -1))

    # Enrich each request with student name, roll number, session date, subject
    enriched = []
    for r in requests_list:
        r_ser = serialize_doc(r)

        # Student info
        st_doc = db.students.find_one({"_id": r["student_id"]})
        if st_doc:
            r_ser["roll_number"] = st_doc.get("roll_number")
            u_doc = db.users.find_one({"_id": st_doc["user_id"]})
            if u_doc:
                r_ser["student_name"] = u_doc.get("full_name")
                r_ser["student_email"] = u_doc.get("email")

        # Record & session info
        rec_doc = db.attendance_records.find_one({"_id": r["attendance_record_id"]})
        if rec_doc:
            sess_doc = db.attendance_sessions.find_one({"_id": rec_doc["session_id"]})
            if sess_doc:
                r_ser["session_date"] = sess_doc.get("session_date")
                r_ser["start_time"] = sess_doc.get("start_time")
                sub_doc = db.subjects.find_one({"_id": sess_doc.get("subject_id")})
                if sub_doc:
                    r_ser["subject_name"] = sub_doc.get("subject_name")
                    r_ser["subject_code"] = sub_doc.get("subject_code")

        # Reviewer info
        if r.get("reviewed_by"):
            rev_doc = db.users.find_one({"_id": r["reviewed_by"]})
            if rev_doc:
                r_ser["reviewer_name"] = rev_doc.get("full_name")

        enriched.append(r_ser)

    return success_response(data=enriched)

@corrections_bp.route("/<id>", methods=["PATCH"])
@roles_required("admin", "faculty")
def review_correction_request(id):
    """
    Approves or rejects a correction request.
    If approved, automatically updates the underlying attendance record and logs audit.
    """
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["action"])

    action = str(data["action"]).capitalize()
    if action not in {"Approved", "Rejected"}:
        raise APIError("Action must be either 'Approved' or 'Rejected'.", status_code=400)

    comments = str(data.get("reviewer_comments", "")).strip()

    db = Database.get_db()
    current_user = get_current_user_doc()
    req_oid = to_object_id(id)
    if not req_oid:
        raise APIError("Invalid correction request ID.", status_code=400)

    req_doc = db.correction_requests.find_one({"_id": req_oid})
    if not req_doc:
        raise APIError("Correction request not found.", status_code=404)

    if req_doc.get("status") != "Pending":
        raise APIError(f"Request has already been reviewed ({req_doc.get('status')}).", status_code=400)

    now = datetime.now(timezone.utc)

    # If approved, update attendance record
    if action == "Approved":
        target_status = req_doc["requested_status"]
        db.attendance_records.update_one(
            {"_id": req_doc["attendance_record_id"]},
            {
                "$set": {
                    "status": target_status,
                    "updated_at": now,
                    "correction_reason": f"Approved Request: {req_doc['reason']} (Notes: {comments})"
                }
            }
        )

    # Update request document
    db.correction_requests.update_one(
        {"_id": req_oid},
        {
            "$set": {
                "status": action,
                "reviewed_by": current_user["_id"],
                "reviewer_comments": comments,
                "reviewed_at": now
            }
        }
    )

    log_audit_event(
        actor_user_id=current_user["_id"],
        action=f"CORRECTION_REQUEST_{action.upper()}",
        entity_type="correction_request",
        entity_id=req_oid,
        new_value=action,
        reason=comments
    )

    updated_req = db.correction_requests.find_one({"_id": req_oid})
    return success_response(data=serialize_doc(updated_req), message=f"Correction request {action.lower()} successfully.")
