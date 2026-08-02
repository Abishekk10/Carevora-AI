"""Backward-compatible registration helper for the resume API blueprint."""

from flask import Flask

from routes.resumes import resumes_bp


def register_resume_upload_routes(app: Flask) -> None:
    """Register resume routes for integrations using the legacy helper."""
    app.register_blueprint(resumes_bp)
