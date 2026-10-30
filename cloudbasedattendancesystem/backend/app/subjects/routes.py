from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import validate_required_fields
from backend.app.common.decorators import roles_required, admin_required
from backend.app.common.audit import log_audit_event

subjects_bp = Blueprint("subjects", __name__, url_prefix="/api/v1/subjects")

@subjects_bp.route("", methods=["GET"])
@roles_required("admin", "faculty", "student")
def get_subjects():
    """Returns all subjects, with optional filtering by department or semester."""
    db = Database.get_db()
    query = {}
    dept = request.args.get("department")
    sem = request.args.get("semester")
    if dept:
        query["department"] = dept
    if sem:
        query["semester"] = int(sem)

    subjects = list(db.subjects.find(query).sort("subject_code", 1))

    # Enrich with faculty names and class details
    enriched = []
    for s in subjects:
        s_ser = serialize_doc(s)
        # Fetch faculty names
        faculty_ids = s.get("faculty_ids", [])
        faculty_names = []
        for f_id in faculty_ids:
            f_doc = db.faculty.find_one({"_id": to_object_id(f_id)})
            if f_doc:
                u_doc = db.users.find_one({"_id": f_doc["user_id"]})
                if u_doc:
                    faculty_names.append({"id": str(f_id), "name": u_doc.get("full_name", "Unknown")})
        s_ser["faculty_list"] = faculty_names

        # Fetch class names
        class_ids = s.get("class_ids", [])
        class_names = []
        for c_id in class_ids:
            c_doc = db.classes.find_one({"_id": to_object_id(c_id)})
            if c_doc:
                class_names.append({"id": str(c_id), "name": f"{c_doc.get('name')} ({c_doc.get('section')})"})
        s_ser["class_list"] = class_names

        enriched.append(s_ser)

    return success_response(data=enriched)

@subjects_bp.route("/<id>", methods=["GET"])
@roles_required("admin", "faculty", "student")
def get_subject(id):
    """Returns single subject details."""
    db = Database.get_db()
    s_id = to_object_id(id)
    if not s_id:
        raise APIError("Invalid subject ID.", status_code=400)

    subject = db.subjects.find_one({"_id": s_id})
    if not subject:
        raise APIError("Subject not found.", status_code=404)

    return success_response(data=serialize_doc(subject))

@subjects_bp.route("", methods=["POST"])
@admin_required
def create_subject():
    """Creates a new subject."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["subject_code", "subject_name", "department", "semester"])

    db = Database.get_db()
    code = str(data["subject_code"]).strip().upper()
    name = str(data["subject_name"]).strip()
    department = str(data["department"]).strip()
    semester = int(data["semester"])
    credits_val = int(data.get("credits", 3))

    existing = db.subjects.find_one({"subject_code": code})
    if existing:
        raise APIError(f"Subject code '{code}' already exists.", status_code=400)

    now = datetime.now(timezone.utc)
    new_sub = {
        "subject_code": code,
        "subject_name": name,
        "department": department,
        "semester": semester,
        "credits": credits_val,
        "class_ids": [to_object_id(cid) for cid in data.get("class_ids", []) if to_object_id(cid)],
        "faculty_ids": [to_object_id(fid) for fid in data.get("faculty_ids", []) if to_object_id(fid)],
        "created_at": now,
        "updated_at": now
    }

    result = db.subjects.insert_one(new_sub)
    new_sub["_id"] = result.inserted_id

    log_audit_event(
        actor_user_id=None,
        action="CREATE_SUBJECT",
        entity_type="subject",
        entity_id=result.inserted_id,
        new_value=f"{code} - {name}"
    )

    return success_response(data=serialize_doc(new_sub), message="Subject created successfully.", status_code=201)

@subjects_bp.route("/<id>", methods=["PUT"])
@admin_required
def update_subject(id):
    """Updates subject metadata, class associations, and faculty assignments."""
    data = request.get_json(silent=True) or {}
    db = Database.get_db()
    s_id = to_object_id(id)
    if not s_id:
        raise APIError("Invalid subject ID.", status_code=400)

    existing = db.subjects.find_one({"_id": s_id})
    if not existing:
        raise APIError("Subject not found.", status_code=404)

    update_fields = {}
    if "subject_name" in data:
        update_fields["subject_name"] = str(data["subject_name"]).strip()
    if "department" in data:
        update_fields["department"] = str(data["department"]).strip()
    if "semester" in data:
        update_fields["semester"] = int(data["semester"])
    if "credits" in data:
        update_fields["credits"] = int(data["credits"])
    if "class_ids" in data:
        update_fields["class_ids"] = [to_object_id(cid) for cid in data["class_ids"] if to_object_id(cid)]
    if "faculty_ids" in data:
        new_f_ids = [to_object_id(fid) for fid in data["faculty_ids"] if to_object_id(fid)]
        update_fields["faculty_ids"] = new_f_ids
        # Sync faculty document assigned_subject_ids
        for f_id in new_f_ids:
            db.faculty.update_one(
                {"_id": f_id},
                {"$addToSet": {"assigned_subject_ids": s_id}}
            )

    update_fields["updated_at"] = datetime.now(timezone.utc)
    db.subjects.update_one({"_id": s_id}, {"$set": update_fields})
    updated = db.subjects.find_one({"_id": s_id})

    log_audit_event(
        actor_user_id=None,
        action="UPDATE_SUBJECT",
        entity_type="subject",
        entity_id=s_id,
        previous_value=serialize_doc(existing),
        new_value=serialize_doc(updated)
    )

    return success_response(data=serialize_doc(updated), message="Subject updated successfully.")
