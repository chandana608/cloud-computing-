"""
CLI utility to safely create or reset an administrator account.
Usage:
  python backend/scripts/create_admin.py [email] [password] [full_name]
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.common.database import Database
from backend.app.extensions import bcrypt

def create_admin(email="admin@college.edu", password="AdminSecure@2026", full_name="System Administrator"):
    app = create_app(os.getenv("FLASK_ENV", "development"))
    with app.app_context():
        db = Database.get_db()
        email = email.strip().lower()
        now = datetime.now(timezone.utc)
        pwd_hash = bcrypt.generate_password_hash(password).decode("utf-8")

        existing = db.users.find_one({"email": email})
        if existing:
            db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password_hash": pwd_hash, "role": "admin", "is_active": True, "updated_at": now}}
            )
            print(f"[+] Existing user '{email}' updated to Administrator with new password.")
        else:
            db.users.insert_one({
                "full_name": full_name,
                "email": email,
                "institution_id": "ADMIN-ROOT",
                "password_hash": pwd_hash,
                "role": "admin",
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
            print(f"[+] Administrator account '{email}' created successfully.")

if __name__ == "__main__":
    email_arg = sys.argv[1] if len(sys.argv) > 1 else "admin@college.edu"
    pwd_arg = sys.argv[2] if len(sys.argv) > 2 else "AdminSecure@2026"
    name_arg = sys.argv[3] if len(sys.argv) > 3 else "System Administrator"
    create_admin(email_arg, pwd_arg, name_arg)
