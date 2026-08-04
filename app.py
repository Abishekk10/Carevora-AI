"""JobPilot Flask application factory."""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import PROJECT_ROOT, Settings
from database import db
from routes import auth_bp, chat_bp, dashboard_bp, jobs_bp, resumes_bp, users_bp, interview_bp, application_bp
from services.errors import APIError


def configure_logging(app: Flask) -> None:
    """Configure structured application logging once per application instance."""
    app.logger.setLevel(app.config["LOG_LEVEL"])

    if any(isinstance(handler, RotatingFileHandler) for handler in app.logger.handlers):
        return

    logs_dir = PROJECT_ROOT / "logs"
    logs_dir.mkdir(exist_ok=True)

    handler = RotatingFileHandler(
        logs_dir / "jobpilot.log",
        maxBytes=1_000_000,
        backupCount=3,
    )

    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s"
        )
    )

    app.logger.addHandler(handler)


def register_error_handlers(app: Flask) -> None:
    """Register consistent JSON error responses for API clients."""

    @app.errorhandler(APIError)
    def handle_api_error(error: APIError):
        payload = {"error": error.message}

        if error.details is not None:
            payload["details"] = error.details

        return jsonify(payload), error.status_code

    @app.errorhandler(413)
    def handle_request_too_large(_error):
        return jsonify(error="File is too large."), 413

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception(
            "Unhandled application error",
            exc_info=error,
        )
        return jsonify(error="An unexpected server error occurred."), 500


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure the JobPilot API application."""

    app = Flask(__name__)

    # ✅ Enable CORS for React frontend
    CORS(
    app,
    resources={r"/api/*": {"origins": [
        "https://carevora-app.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ]}},
    supports_credentials=True,
)
    app.config.from_mapping(
        SECRET_KEY=Settings.SECRET_KEY,
        SQLALCHEMY_DATABASE_URI=Settings.DATABASE_URL,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        UPLOAD_FOLDER=Settings.UPLOAD_FOLDER,
        MAX_CONTENT_LENGTH=Settings.MAX_CONTENT_LENGTH,
        LOG_LEVEL=Settings.LOG_LEVEL,
        # The React app calls this API cross-origin, so the session cookie must
        # be sent on cross-site requests. "None" + Secure (HTTPS) allows that.
        SESSION_COOKIE_SAMESITE="None",
        SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )

    if test_config:
        app.config.update(test_config)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(
        parents=True,
        exist_ok=True,
    )

    configure_logging(app)

    db.init_app(app)
    app.register_blueprint(auth_bp)

    app.register_blueprint(users_bp)
    app.register_blueprint(resumes_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(application_bp)

    register_error_handlers(app)

    with app.app_context():
        db.create_all()

    @app.get("/")
    def home():
        return jsonify(
            project="JobPilot",
            status="running",
            version="1.0"
        )

    @app.get("/health")
    def health_check():
        """Expose a lightweight health endpoint."""
        return jsonify(status="ok")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False,
    )
