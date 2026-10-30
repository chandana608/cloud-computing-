from functools import wraps
from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from backend.app.common.database import Database, to_object_id
from backend.app.common.errors import APIError

def get_current_user_doc():
    """Retrieves the full authenticated user record from the database."""
    if hasattr(g, "current_user") and g.current_user is not None:
        return g.current_user

    identity = get_jwt_identity()
    if not identity:
        raise APIError("Invalid or missing authentication token.", status_code=401)

    db = Database.get_db()
    user_id = to_object_id(identity)
    if not user_id:
        raise APIError("Malformed user identifier in token.", status_code=401)

    user = db.users.find_one({"_id": user_id})
    if not user:
        raise APIError("User account no longer exists.", status_code=401)

    if not user.get("is_active", True):
        raise APIError("Account has been deactivated. Please contact the administrator.", status_code=403)

    g.current_user = user
    return user

def roles_required(*allowed_roles):
    """Enforces JWT authentication and verifies user role."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user_doc()
            user_role = user.get("role")
            if user_role not in allowed_roles:
                raise APIError(
                    f"Forbidden: You need one of [{', '.join(allowed_roles)}] permissions to perform this action.",
                    status_code=403
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    """Shorthand for requiring admin role."""
    return roles_required("admin")(fn)

def faculty_required(fn):
    """Shorthand for requiring faculty role."""
    return roles_required("faculty")(fn)

def student_required(fn):
    """Shorthand for requiring student role."""
    return roles_required("student")(fn)
