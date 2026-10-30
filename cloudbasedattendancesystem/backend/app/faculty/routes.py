from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import validate_required_fields, validate_email
from backend.app.common.decorators import roles_required, admin_required, faculty_required, get_current_user_doc
from backend.app.common.audit import log_audit_event
from backend.app.extensions import bcrypt

faculty_bp = Blueprint("faculty", __name__, url_prefix="/api/v1/faculty")

@faculty_bp.route("", methods=["GET"])
@roles_required("admin", "faculty")
def get_all_faculty():
    """Returns list of faculty members with user information and assignments."""
    db = Database.get_db()
    faculty_list = list(db.faculty.find().sort("employee_id", 1))

    enriched = []
    for f in faculty_list:
        f_ser = serialize_doc(f)
        user_doc = db.users.find_one({"_id": f["user_id"]})
        if user_doc:
            f_ser["full_name"] = user_doc.get("full_name", "")
            f_ser["email"] = user_doc.get("email", "")
            f_ser["institution_id"] = user_doc.get("institution_id", "")
            f_ser["is_active"] = user_doc.get("is_active", True)

        # Enrich assigned subjects
        sub_ids = [to_object_id(sid) for sid in f.get("assigned_subject_ids", []) if to_object_id(sid)]
        subs = list(db.subjects.find({"_id": {"$in": sub_ids}}))
        f_ser["assigned_subjects"] = [
            {"id": str(s["_id"]), "code": s["subject_code"], "name": s["subject_name"]}
            for s in subs
        ]

        # Enrich assigned classes
        cls_ids = [to_object_id(cid) for cid in f.get("assigned_class_ids", []) if to_object_id(cid)]
        classes = list(db.classes.find({"_id": {"$in": cls_ids}}))
        f_ser["assigned_classes"] = [
            {"id": str(c["_id"]), "name": f"{c['name']} ({c['section']})"}
            for c in classes
        ]

        enriched.append(f_ser)

    return success_response(data=enriched)

@faculty_bp.route("/<id>", methods=["GET"])
@roles_required("admin", "faculty")
def get_faculty_by_id(id):
    """Returns details for a single faculty member."""
    db = Database.get_db()
    f_oid = to_object_id(id)
    if not f_oid:
        raise APIError("Invalid faculty ID.", status_code=400)

    faculty = db.faculty.find_one({"_id": f_oid})
    if not faculty:
        raise APIError("Faculty not found.", status_code=404)

    res = serialize_doc(faculty)
    user_doc = db.users.find_one({"_id": faculty["user_id"]})
    if user_doc:
        res["full_name"] = user_doc.get("full_name")
        res["email"] = user_doc.get("email")
        res["institution_id"] = user_doc.get("institution_id")
        res["is_active"] = user_doc.get("is_active", True)

    return success_response(data=res)

@faculty_bp.route("/me/classes", methods=["GET"])
@faculty_required
def get_my_assignments():
    """Returns classes and subjects assigned to the currently authenticated faculty member."""
    current_user = get_current_user_doc()
    db = Database.get_db()

    faculty_doc = db.faculty.find_one({"user_id": current_user["_id"]})
    if not faculty_doc:
        raise APIError("Faculty profile not found for this user.", status_code=404)

    # Fetch subjects assigned to this faculty (via assigned_subject_ids or subjects collection faculty_ids)
    subjects = list(db.subjects.find({
        "$or": [
            {"_id": {"$in": [to_object_id(sid) for sid in faculty_doc.get("assigned_subject_ids", [])]}},
            {"faculty_ids": faculty_doc["_id"]}
        ]
    }))

    # Gather class IDs from subjects and faculty profile
    class_ids = set(faculty_doc.get("assigned_class_ids", []))
    for s in subjects:
        for cid in s.get("class_ids", []):
            class_ids.add(cid)

    classes = list(db.classes.find({"_id": {"$in": list(class_ids)}}))

    # Enrich each class with its student count
    enriched_classes = []
    for c in classes:
        c_ser = serialize_doc(c)
        c_ser["student_count"] = db.students.count_documents({"class_id": c["_id"]})
        enriched_classes.append(c_ser)

    return success_response(data={
        "faculty_id": str(faculty_doc["_id"]),
        "department": faculty_doc.get("department", "Engineering"),
        "employee_id": faculty_doc.get("employee_id"),
        "classes": enriched_classes,
        "subjects": serialize_doc(subjects)
    })

@faculty_bp.route("", methods=["POST"])
@admin_required
def create_faculty():
    """Creates a faculty user account and faculty record."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["full_name", "email", "employee_id", "department"])

    db = Database.get_db()
    email = validate_email(data["email"])
    employee_id = str(data["employee_id"]).strip().upper()
    full_name = str(data["full_name"]).strip()
    institution_id = str(data.get("institution_id", employee_id)).strip().upper()
    password = str(data.get("password", "Faculty@123"))

    if db.users.find_one({"email": email}):
        raise APIError(f"Email '{email}' is already registered.", status_code=400)
    if db.faculty.find_one({"employee_id": employee_id}):
        raise APIError(f"Employee ID '{employee_id}' already exists.", status_code=400)

    now = datetime.now(timezone.utc)
    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    user_doc = {
        "full_name": full_name,
        "email": email,
        "institution_id": institution_id,
        "password_hash": password_hash,
        "role": "faculty",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    user_res = db.users.insert_one(user_doc)

    assigned_subjects = [to_object_id(sid) for sid in data.get("assigned_subject_ids", []) if to_object_id(sid)]
    assigned_classes = [to_object_id(cid) for cid in data.get("assigned_class_ids", []) if to_object_id(cid)]

    faculty_doc = {
        "user_id": user_res.inserted_id,
        "employee_id": employee_id,
        "department": str(data["department"]).strip(),
        "designation": str(data.get("designation", "Assistant Professor")).strip(),
        "assigned_subject_ids": assigned_subjects,
        "assigned_class_ids": assigned_classes,
        "created_at": now,
        "updated_at": now
    }
    faculty_res = db.faculty.insert_one(faculty_doc)

    # Sync subjects' faculty_ids
    if assigned_subjects:
        db.subjects.update_many(
            {"_id": {"$in": assigned_subjects}},
            {"$addToSet": {"faculty_ids": faculty_res.inserted_id}}
        )

    log_audit_event(
        actor_user_id=None,
        action="CREATE_FACULTY",
        entity_type="faculty",
        entity_id=faculty_res.inserted_id,
        new_value=f"{employee_id} - {full_name}"
    )

    faculty_doc["_id"] = faculty_res.inserted_id
    res = serialize_doc(faculty_doc)
    res["full_name"] = full_name
    res["email"] = email
    return success_response(data=res, message="Faculty account created successfully.", status_code=201)

@faculty_bp.route("/<id>", methods=["PUT"])
@admin_required
def update_faculty(id):
    """Updates faculty details and subject/class assignments."""
    data = request.get_json(silent=True) or {}
    db = Database.get_db()
    f_oid = to_object_id(id)
    if not f_oid:
        raise APIError("Invalid faculty ID.", status_code=400)

    faculty = db.faculty.find_one({"_id": f_oid})
    if not faculty:
        raise APIError("Faculty not found.", status_code=404)

    now = datetime.now(timezone.utc)
    user_updates = {"updated_at": now}
    faculty_updates = {"updated_at": now}

    if "full_name" in data:
        user_updates["full_name"] = str(data["full_name"]).strip()
    if "email" in data:
        user_updates["email"] = validate_email(data["email"])
    if "is_active" in data:
        user_updates["is_active"] = bool(data["is_active"])

    if "department" in data:
        faculty_updates["department"] = str(data["department"]).strip()
    if "designation" in data:
        faculty_updates["designation"] = str(data["designation"]).strip()
    if "assigned_subject_ids" in data:
        sub_oids = [to_object_id(sid) for sid in data["assigned_subject_ids"] if to_object_id(sid)]
        faculty_updates["assigned_subject_ids"] = sub_oids
        # Sync with subjects
        db.subjects.update_many({"_id": {"$in": sub_oids}}, {"$addToSet": {"faculty_ids": f_oid}})
    if "assigned_class_ids" in data:
        faculty_updates["assigned_class_ids"] = [
            to_object_id(cid) for cid in data["assigned_class_ids"] if to_object_id(cid)
        ]

    db.users.update_one({"_id": faculty["user_id"]}, {"$set": user_updates})
    db.faculty.update_one({"_id": f_oid}, {"$set": faculty_updates})

    log_audit_event(
        actor_user_id=None,
        action="UPDATE_FACULTY",
        entity_type="faculty",
        entity_id=f_oid,
        new_value=data
    )

    updated_faculty = db.faculty.find_one({"_id": f_oid})
    return success_response(data=serialize_doc(updated_faculty), message="Faculty updated successfully.")
