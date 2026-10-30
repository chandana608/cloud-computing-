import secrets
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response, error_response
from backend.app.common.validators import validate_required_fields, validate_email
from backend.app.common.audit import log_audit_event
from backend.app.common.decorators import get_current_user_doc
from backend.app.extensions import bcrypt, limiter

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("15 per minute")
def login():
    """Authenticates a user via email or institution_id and password."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["identifier", "password"])

    identifier = str(data["identifier"]).strip().lower()
    password = str(data["password"])

    db = Database.get_db()

    # Find user by email or institution_id
    user = db.users.find_one({
        "$or": [
            {"email": identifier},
            {"institution_id": identifier.upper()}
        ]
    })

    if not user:
        # Generic error message to prevent enumeration
        return error_response("Invalid credentials.", status_code=401)

    if not user.get("is_active", True):
        return error_response("This account has been deactivated. Please contact your institution administrator.", status_code=403)

    if not bcrypt.check_password_hash(user.get("password_hash", ""), password):
        return error_response("Invalid credentials.", status_code=401)

    # Update last login
    now = datetime.now(timezone.utc)
    db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})

    # Fetch extra profile information
    profile_info = {}
    if user["role"] == "student":
        student_doc = db.students.find_one({"user_id": user["_id"]})
        if student_doc:
            profile_info = serialize_doc(student_doc)
            # Fetch class details if available
            if student_doc.get("class_id"):
                cls_doc = db.classes.find_one({"_id": student_doc["class_id"]})
                if cls_doc:
                    profile_info["class_details"] = serialize_doc(cls_doc)
    elif user["role"] == "faculty":
        faculty_doc = db.faculty.find_one({"user_id": user["_id"]})
        if faculty_doc:
            profile_info = serialize_doc(faculty_doc)

    # Build JWT token with identity as string _id
    token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={
            "role": user["role"],
            "email": user["email"],
            "full_name": user.get("full_name", "")
        }
    )

    log_audit_event(
        actor_user_id=user["_id"],
        action="LOGIN",
        entity_type="user",
        entity_id=user["_id"]
    )

    user_serialized = serialize_doc(user)
    user_serialized.pop("password_hash", None)
    user_serialized["profile"] = profile_info

    return success_response(
        data={
            "token": token,
            "user": user_serialized
        },
        message="Login successful"
    )

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Returns the currently logged-in user profile."""
    user = get_current_user_doc()
    db = Database.get_db()

    profile_info = {}
    if user["role"] == "student":
        student_doc = db.students.find_one({"user_id": user["_id"]})
        if student_doc:
            profile_info = serialize_doc(student_doc)
            if student_doc.get("class_id"):
                cls_doc = db.classes.find_one({"_id": student_doc["class_id"]})
                if cls_doc:
                    profile_info["class_details"] = serialize_doc(cls_doc)
    elif user["role"] == "faculty":
        faculty_doc = db.faculty.find_one({"user_id": user["_id"]})
        if faculty_doc:
            profile_info = serialize_doc(faculty_doc)

    user_serialized = serialize_doc(user)
    user_serialized.pop("password_hash", None)
    user_serialized["profile"] = profile_info

    return success_response(data=user_serialized)

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Allows authenticated user to change their password."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["current_password", "new_password"])

    current_password = str(data["current_password"])
    new_password = str(data["new_password"])

    if len(new_password) < 6:
        raise APIError("New password must be at least 6 characters long.", status_code=400)

    user = get_current_user_doc()
    db = Database.get_db()

    if not bcrypt.check_password_hash(user.get("password_hash", ""), current_password):
        raise APIError("Current password entered is incorrect.", status_code=400)

    new_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )

    log_audit_event(
        actor_user_id=user["_id"],
        action="CHANGE_PASSWORD",
        entity_type="user",
        entity_id=user["_id"]
    )

    return success_response(message="Password changed successfully.")

@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per minute")
def forgot_password():
    """Generates a secure password reset token."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["email"])
    email = validate_email(data["email"])

    db = Database.get_db()
    user = db.users.find_one({"email": email})

    # Return success regardless of existence to prevent enumeration
    if not user:
        return success_response(
            message="If this email is registered, a password reset token has been generated."
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    db.password_resets.update_one(
        {"user_id": user["_id"]},
        {"$set": {"token": token, "expires_at": expires_at, "used": False}},
        upsert=True
    )

    return success_response(
        data={"reset_token_dev": token},  # returned for testing/development display
        message="If this email is registered, a password reset token has been generated."
    )

@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password():
    """Resets password using valid token."""
    data = request.get_json(silent=True) or {}
    validate_required_fields(data, ["token", "new_password"])

    token = str(data["token"]).strip()
    new_password = str(data["new_password"])

    if len(new_password) < 6:
        raise APIError("New password must be at least 6 characters long.", status_code=400)

    db = Database.get_db()
    reset_entry = db.password_resets.find_one({"token": token, "used": False})

    if not reset_entry:
        raise APIError("Invalid or expired password reset token.", status_code=400)

    # Check expiry
    expiry = reset_entry.get("expires_at")
    if expiry and expiry.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise APIError("Password reset token has expired.", status_code=400)

    new_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.users.update_one(
        {"_id": reset_entry["user_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    db.password_resets.update_one({"_id": reset_entry["_id"]}, {"$set": {"used": True}})

    log_audit_event(
        actor_user_id=reset_entry["user_id"],
        action="RESET_PASSWORD",
        entity_type="user",
        entity_id=reset_entry["user_id"]
    )

    return success_response(message="Password reset successfully. You can now log in.")
