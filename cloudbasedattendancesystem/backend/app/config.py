import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base Configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-attendance-system-fallback-32bytes-super-secure!")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-attendance-system-fallback-32bytes-super-secure!")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "480"))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # Database
    MONGODB_URI = os.getenv("MONGODB_URI", "")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "cloud_attendance")

    # Rate Limiting
    RATELIMIT_DEFAULT = "300 per minute"
    RATELIMIT_STORAGE_URI = "memory://"

    # CORS
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
        if origin.strip()
    ]

    # Academic Rules
    MIN_ATTENDANCE_PERCENTAGE = float(os.getenv("MIN_ATTENDANCE_PERCENTAGE", "75.0"))
    WARNING_ATTENDANCE_PERCENTAGE = float(os.getenv("WARNING_ATTENDANCE_PERCENTAGE", "80.0"))
    INSTITUTION_NAME = os.getenv("INSTITUTION_NAME", "Cloud Attendance Institute")


class DevelopmentConfig(Config):
    """Development Configuration."""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing Configuration with in-memory / mock database."""
    DEBUG = True
    TESTING = True
    MONGODB_DATABASE = "cloud_attendance_test"
    MONGODB_URI = ""


class ProductionConfig(Config):
    """Production Configuration with strict security requirements."""
    DEBUG = False
    TESTING = False

    def __init__(self):
        super().__init__()
        unacceptable_secrets = [
            "",
            "dev-secret-key-attendance-system-fallback-32bytes-super-secure!",
            "replace_with_a_secure_random_secret",
        ]
        if self.SECRET_KEY in unacceptable_secrets:
            raise ValueError("Production SECRET_KEY must be a non-trivial random secret.")
        if self.JWT_SECRET_KEY in unacceptable_secrets:
            raise ValueError("Production JWT_SECRET_KEY must be a non-trivial random secret.")
        if not self.MONGODB_URI or "placeholder" in self.MONGODB_URI:
            raise ValueError("Production MONGODB_URI must be configured for MongoDB Atlas.")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
