import logging
from datetime import datetime, timezone
from flask import request
from backend.app.common.database import Database

logger = logging.getLogger(__name__)

def log_audit_event(
    actor_user_id,
    action,
    entity_type,
    entity_id=None,
    previous_value=None,
    new_value=None,
    reason=None
):
    """Inserts a structured entry into the audit_logs collection."""
    try:
        db = Database.get_db()
        ip_addr = request.remote_addr if request else None

        audit_entry = {
            "actor_user_id": str(actor_user_id) if actor_user_id else "SYSTEM",
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "previous_value": previous_value,
            "new_value": new_value,
            "reason": reason,
            "ip_address": ip_addr,
            "timestamp": datetime.now(timezone.utc)
        }
        db.audit_logs.insert_one(audit_entry)
        logger.info("AUDIT: User %s performed %s on %s:%s", actor_user_id, action, entity_type, entity_id)
    except Exception as e:
        logger.error("Failed to write audit log: %s", str(e))
