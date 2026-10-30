from datetime import datetime, timezone
from flask import Blueprint, request, current_app
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.decorators import admin_required, roles_required
from backend.app.common.audit import log_audit_event

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")

@admin_bp.route("/audit-logs", methods=["GET"])
@admin_required
def get_audit_logs():
    """Returns chronologically sorted system audit logs."""
    db = Database.get_db()
    limit = int(request.args.get("limit", 100))
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")

    query = {}
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type

    logs = list(db.audit_logs.find(query).sort("timestamp", -1).limit(limit))

    enriched = []
    for l in logs:
        l_ser = serialize_doc(l)
        if l.get("actor_user_id") and l["actor_user_id"] != "SYSTEM":
            u_doc = db.users.find_one({"_id": to_object_id(l["actor_user_id"])})
            if u_doc:
                l_ser["actor_name"] = u_doc.get("full_name")
                l_ser["actor_role"] = u_doc.get("role")
        enriched.append(l_ser)

    return success_response(data=enriched)

@admin_bp.route("/settings", methods=["GET"])
@admin_required
def get_settings():
    """Returns current academic and institutional settings."""
    db = Database.get_db()
    settings_doc = db.system_settings.find_one({"key": "global_settings"})

    if not settings_doc:
        settings_doc = {
            "key": "global_settings",
            "institution_name": current_app.config.get("INSTITUTION_NAME", "Apex Institute of Engineering"),
            "min_attendance_threshold": current_app.config.get("MIN_ATTENDANCE_PERCENTAGE", 75.0),
            "warning_attendance_threshold": current_app.config.get("WARNING_ATTENDANCE_PERCENTAGE", 80.0),
            "academic_year": "2026-2027",
            "current_semester": "Odd (Fall 2026)"
        }
        db.system_settings.insert_one(settings_doc)

    return success_response(data=serialize_doc(settings_doc))

@admin_bp.route("/settings", methods=["POST"])
@admin_required
def update_settings():
    """Updates global attendance thresholds and institution settings."""
    data = request.get_json(silent=True) or {}
    db = Database.get_db()

    updates = {"updated_at": datetime.now(timezone.utc)}
    if "institution_name" in data:
        updates["institution_name"] = str(data["institution_name"]).strip()
    if "min_attendance_threshold" in data:
        updates["min_attendance_threshold"] = float(data["min_attendance_threshold"])
    if "warning_attendance_threshold" in data:
        updates["warning_attendance_threshold"] = float(data["warning_attendance_threshold"])
    if "academic_year" in data:
        updates["academic_year"] = str(data["academic_year"]).strip()
    if "current_semester" in data:
        updates["current_semester"] = str(data["current_semester"]).strip()

    db.system_settings.update_one(
        {"key": "global_settings"},
        {"$set": updates},
        upsert=True
    )

    log_audit_event(
        actor_user_id=None,
        action="UPDATE_SETTINGS",
        entity_type="system_settings",
        new_value=data
    )

    updated = db.system_settings.find_one({"key": "global_settings"})
    return success_response(data=serialize_doc(updated), message="System settings updated successfully.")
