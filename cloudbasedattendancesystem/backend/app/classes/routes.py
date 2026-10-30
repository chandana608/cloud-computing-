from datetime import datetime, timezone
from flask import Blueprint, request
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.validators import validate_required_fields
from backend.app.common.decorators import roles_required, admin_required
from backend.app.common.audit import log_audit_event

classes_bp = Blueprint("classes", __name__, url_prefix="/api/v1/classes")

@classes_bp.route("", methods=["GET"])
@roles_required("admin", "faculty")
def get_classes():
    """Returns all classes/sections with student count."""
    db = Database.get_db()
    classes = list(db.classes.find().sort("name", 1))

    # Enrich with student count
    enriched = []
    for c in classes:
        student_count = db.students.count_documents({"class_id": c["_id"]})
        c_ser = serialize_doc(c)
        c_ser["student_count"] = student_count
        enriched.append(c_ser)

    return success_response(data=enriched)

@classes_bp.route("/<id>", methods=["GET"])
@roles_required("admin", "faculty")
def get_class(id):
    """Returns single class details."""
    db = Database.get_db()
    c_id = to_object_id(id)
    if not c_id:
        raise APIError("Invalid class ID.", status_code=400)

    cls_doc = db.classes.find_one({"_id": c_id})
    if not cls_doc:
        raise APIError("Class not found.", status_code=404)

    res = serialize_doc(cls_doc)
    res["student_count"] = db.students.count_documents({"class_id": c_id})
    return success_response(data=res)

@classes_bp.route("", methods=["POST"])
@admin_required
def create_class():
    """Creates a new class/section."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["name", "section", "academic_year", "semester", "department"])

    db = Database.get_db()
    name = str(data["name"]).strip()
    section = str(data["section"]).strip().upper()
    academic_year = str(data["academic_year"]).strip()
    semester = int(data["semester"])
    department = str(data["department"]).strip()

    # Check for duplicate
    existing = db.classes.find_one({
        "name": name,
        "section": section,
        "academic_year": academic_year
    })
    if existing:
        raise APIError(f"Class '{name}' Section '{section}' already exists for year '{academic_year}'.", status_code=400)

    now = datetime.now(timezone.utc)
    new_class = {
        "name": name,
        "section": section,
        "academic_year": academic_year,
        "semester": semester,
        "department": department,
        "created_at": now,
        "updated_at": now
    }

    result = db.classes.insert_one(new_class)
    new_class["_id"] = result.inserted_id

    log_audit_event(
        actor_user_id=None,
        action="CREATE_CLASS",
        entity_type="class",
        entity_id=result.inserted_id,
        new_value=f"{name}-{section}"
    )

    return success_response(data=serialize_doc(new_class), message="Class created successfully.", status_code=201)

@classes_bp.route("/<id>", methods=["PUT"])
@admin_required
def update_class(id):
    """Updates an existing class."""
    data = request.get_json(silent=True) or {}
    db = Database.get_db()
    c_id = to_object_id(id)
    if not c_id:
        raise APIError("Invalid class ID.", status_code=400)

    existing = db.classes.find_one({"_id": c_id})
    if not existing:
        raise APIError("Class not found.", status_code=404)

    update_fields = {}
    for key in ["name", "section", "academic_year", "semester", "department"]:
        if key in data:
            if key == "semester":
                update_fields[key] = int(data[key])
            elif key == "section":
                update_fields[key] = str(data[key]).strip().upper()
            else:
                update_fields[key] = str(data[key]).strip()

    update_fields["updated_at"] = datetime.now(timezone.utc)

    db.classes.update_one({"_id": c_id}, {"$set": update_fields})
    updated = db.classes.find_one({"_id": c_id})

    log_audit_event(
        actor_user_id=None,
        action="UPDATE_CLASS",
        entity_type="class",
        entity_id=c_id,
        previous_value=serialize_doc(existing),
        new_value=serialize_doc(updated)
    )

    return success_response(data=serialize_doc(updated), message="Class updated successfully.")
