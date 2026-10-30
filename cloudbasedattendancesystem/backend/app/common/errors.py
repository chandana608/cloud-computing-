import logging
from flask import jsonify

logger = logging.getLogger(__name__)

class APIError(Exception):
    """Custom application exception with structured HTTP status and message."""
    def __init__(self, message, status_code=400, errors=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors or []

def error_response(message, status_code=400, errors=None):
    """Returns a standardized JSON error response."""
    payload = {
        "success": False,
        "message": message,
        "status_code": status_code
    }
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status_code

def success_response(data=None, message="Operation successful", status_code=200, **kwargs):
    """Returns a standardized JSON success response."""
    payload = {
        "success": True,
        "message": message
    }
    if data is not None:
        payload["data"] = data
    payload.update(kwargs)
    return jsonify(payload), status_code

def register_error_handlers(app):
    """Registers global error handlers on the Flask app."""

    @app.errorhandler(APIError)
    def handle_api_error(error):
        return error_response(error.message, error.status_code, error.errors)

    @app.errorhandler(400)
    def handle_bad_request(e):
        return error_response("Bad request", 400, [str(e.description) if hasattr(e, "description") else str(e)])

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return error_response("Authentication required or token expired", 401)

    @app.errorhandler(403)
    def handle_forbidden(e):
        return error_response("You do not have permission to access this resource", 403)

    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response("Requested resource not found", 404)

    @app.errorhandler(429)
    def handle_ratelimit_exceeded(e):
        return error_response("Too many requests. Please slow down and try again later.", 429)

    @app.errorhandler(500)
    def handle_server_error(e):
        logger.error("Internal Server Error: %s", str(e), exc_info=True)
        # Never leak stack traces to client in production
        return error_response("An internal server error occurred. Please contact the administrator.", 500)
