import re
from datetime import datetime
from backend.app.common.errors import APIError

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
VALID_ROLES = {"admin", "faculty", "student"}
VALID_ATTENDANCE_STATUSES = {"Present", "Absent", "Late", "Excused"}
VALID_SESSION_STATUSES = {"Scheduled", "Open", "Closed", "Finalized"}
VALID_SESSION_TYPES = {"Lecture", "Lab", "Practical", "Tutorial", "Seminar"}

def validate_email(email):
    """Validates email format."""
    if not email or not isinstance(email, str) or not EMAIL_REGEX.match(email.strip()):
        raise APIError("Invalid email address format.", status_code=400)
    return email.strip().lower()

def validate_required_fields(data, required_fields):
    """Checks that all required fields are present and non-empty."""
    if not isinstance(data, dict):
        raise APIError("Request body must be a JSON object.", status_code=400)
    missing = [field for field in required_fields if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip())]
    if missing:
        raise APIError(f"Missing or empty required fields: {', '.join(missing)}", status_code=400)

def validate_date(date_str, field_name="date"):
    """Validates YYYY-MM-DD date string."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise APIError(f"Invalid format for '{field_name}'. Expected YYYY-MM-DD.", status_code=400)

def validate_time(time_str, field_name="time"):
    """Validates HH:MM time string."""
    try:
        datetime.strptime(time_str, "%H:%M")
        return time_str
    except Exception:
        raise APIError(f"Invalid format for '{field_name}'. Expected HH:MM (24-hour).", status_code=400)

def validate_role(role):
    """Validates user role."""
    if role not in VALID_ROLES:
        raise APIError(f"Invalid role '{role}'. Allowed roles: {', '.join(VALID_ROLES)}", status_code=400)
    return role

def validate_attendance_status(status):
    """Validates attendance status value."""
    if status not in VALID_ATTENDANCE_STATUSES:
        raise APIError(
            f"Invalid attendance status '{status}'. Must be one of {', '.join(VALID_ATTENDANCE_STATUSES)}",
            status_code=400
        )
    return status
