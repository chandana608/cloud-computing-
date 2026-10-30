import logging
import os
from flask import Flask, jsonify
from backend.app.config import config_by_name
from backend.app.extensions import bcrypt, jwt, cors, limiter
from backend.app.common.database import Database
from backend.app.common.errors import register_error_handlers

def create_app(config_name=None):
    """Application factory for Cloud-Based Attendance Management System."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development").lower()

    app = Flask(__name__)
    config_class = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(config_class)

    # Logging setup
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
    )

    # Extensions initialization
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True
    )
    limiter.init_app(app)

    # Database initialization
    Database.init_app(app)

    # Automatically populate seed data if database is empty and not testing
    if not app.config.get("TESTING"):
        try:
            with app.app_context():
                db = Database.get_db()
                if db.users.count_documents({}) == 0:
                    logging.info("Database is empty. Populating demo seed data...")
                    from backend.scripts.seed_demo_data import seed_data_internal
                    seed_data_internal(db)
        except Exception as e:
            logging.warning("Auto-seed notice: %s", str(e))

    # Global Error Handlers
    register_error_handlers(app)

    # Health & Readiness Endpoints (Cloud Monitoring)
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        """Liveness probe: verifies process is alive."""
        return jsonify({
            "status": "UP",
            "service": "attendance-management-backend",
            "environment": config_name
        }), 200

    @app.route("/api/v1/ready", methods=["GET"])
    def readiness_check():
        """Readiness probe: verifies database connectivity and dependencies."""
        db_alive, message = Database.ping()
        status_code = 200 if db_alive else 503
        return jsonify({
            "ready": db_alive,
            "database_status": message,
            "database_mode": "mock_in_memory" if Database.is_mock else "mongodb_atlas",
            "service": "attendance-management-backend"
        }), status_code

    # Register Blueprints
    from backend.app.auth.routes import auth_bp
    from backend.app.classes.routes import classes_bp
    from backend.app.subjects.routes import subjects_bp
    from backend.app.students.routes import students_bp
    from backend.app.faculty.routes import faculty_bp
    from backend.app.attendance.routes import attendance_bp
    from backend.app.corrections.routes import corrections_bp
    from backend.app.reports.routes import reports_bp
    from backend.app.admin.routes import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(classes_bp)
    app.register_blueprint(subjects_bp)
    app.register_blueprint(students_bp)
    app.register_blueprint(faculty_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(corrections_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(admin_bp)

    return app
