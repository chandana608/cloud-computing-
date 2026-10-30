import logging
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
import mongomock

logger = logging.getLogger(__name__)

class Database:
    """Central MongoDB database connector and manager."""
    client = None
    db = None
    is_mock = False

    @classmethod
    def init_app(cls, app):
        uri = app.config.get("MONGODB_URI", "").strip()
        db_name = app.config.get("MONGODB_DATABASE", "cloud_attendance")

        if app.config.get("TESTING") or not uri:
            logger.info("Initializing in-memory MongoMock database (offline/testing mode).")
            cls.client = mongomock.MongoClient()
            cls.db = cls.client[db_name]
            cls.is_mock = True
        else:
            try:
                logger.info("Connecting to MongoDB Atlas cluster at: %s...", uri.split("@")[-1] if "@" in uri else "direct")
                cls.client = MongoClient(
                    uri,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000,
                    retryWrites=True,
                    appname="CloudAttendanceSystem"
                )
                cls.client.admin.command('ping')
                cls.db = cls.client[db_name]
                cls.is_mock = False
                logger.info("Successfully connected to MongoDB Atlas database '%s'.", db_name)
            except Exception as e:
                logger.warning(
                    "Could not connect to MongoDB Atlas (%s). Falling back to mock database for resilient operation.",
                    str(e)
                )
                cls.client = mongomock.MongoClient()
                cls.db = cls.client[db_name]
                cls.is_mock = True

        cls.create_indexes()

    @classmethod
    def get_db(cls):
        if cls.db is None:
            raise RuntimeError("Database has not been initialized. Call Database.init_app(app) first.")
        return cls.db

    @classmethod
    def ping(cls):
        """Returns True if database is alive, else False with error message."""
        if cls.client is None:
            return False, "Database client is not initialized"
        if cls.is_mock:
            return True, "Mock in-memory database operational"
        try:
            cls.client.admin.command('ping')
            return True, "Connected to MongoDB Atlas"
        except Exception as e:
            return False, str(e)

    @classmethod
    def create_indexes(cls):
        """Ensures all required unique constraints and lookup indexes exist."""
        try:
            db = cls.db
            if db is None:
                return

            db.users.create_index([("email", ASCENDING)], unique=True)
            db.users.create_index([("institution_id", ASCENDING)], unique=True)
            db.users.create_index([("role", ASCENDING)])

            db.students.create_index([("roll_number", ASCENDING)], unique=True)
            db.students.create_index([("user_id", ASCENDING)])
            db.students.create_index([("class_id", ASCENDING)])

            db.faculty.create_index([("employee_id", ASCENDING)], unique=True)
            db.faculty.create_index([("user_id", ASCENDING)])

            db.classes.create_index(
                [("name", ASCENDING), ("section", ASCENDING), ("academic_year", ASCENDING)],
                unique=True
            )

            db.subjects.create_index([("subject_code", ASCENDING)], unique=True)

            db.enrollments.create_index(
                [("student_id", ASCENDING), ("subject_id", ASCENDING)],
                unique=True
            )
            db.enrollments.create_index([("class_id", ASCENDING)])

            db.attendance_sessions.create_index(
                [("class_id", ASCENDING), ("subject_id", ASCENDING), ("session_date", ASCENDING)]
            )
            db.attendance_sessions.create_index([("faculty_id", ASCENDING)])
            db.attendance_sessions.create_index([("status", ASCENDING)])

            db.attendance_records.create_index(
                [("session_id", ASCENDING), ("student_id", ASCENDING)],
                unique=True
            )
            db.attendance_records.create_index([("student_id", ASCENDING)])
            db.attendance_records.create_index([("status", ASCENDING)])

            db.correction_requests.create_index([("student_id", ASCENDING)])
            db.correction_requests.create_index([("attendance_record_id", ASCENDING)])
            db.correction_requests.create_index([("status", ASCENDING)])

            db.audit_logs.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING)])
            db.audit_logs.create_index([("timestamp", ASCENDING)])

            logger.info("Database indexes successfully ensured.")
        except Exception as e:
            logger.warning("Index creation notice: %s", str(e))

def serialize_doc(doc):
    """Recursively convert ObjectId and datetime instances to JSON serializable formats."""
    if doc is None:
        return doc
    if isinstance(doc, ObjectId):
        return str(doc)
    if hasattr(doc, "isoformat"):
        return doc.isoformat()
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if not isinstance(doc, dict):
        return doc

    res = {}
    for k, v in doc.items():
        res[k] = serialize_doc(v)
    if "_id" in res and "id" not in res:
        res["id"] = res["_id"]
    return res

def to_object_id(id_val):
    """Safely cast string to ObjectId, returning None if invalid."""
    if not id_val:
        return None
    if isinstance(id_val, ObjectId):
        return id_val
    try:
        return ObjectId(str(id_val))
    except Exception:
        return None
