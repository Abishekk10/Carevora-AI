"""Resume upload, download, and deletion routes."""

from flask import Blueprint, jsonify, request, send_file, url_for

from database import db
from models.resume import Resume
from services.auth_service import get_current_user
from services.resume_service import (
    delete_resume,
    resume_file,
    serialize_resume,
    upload_resume,
)

resumes_bp = Blueprint("resumes", __name__)


@resumes_bp.post("/api/users/<string:user_id>/resumes")
def upload_resume_route(user_id: str):
    """Upload a PDF resume for a user."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401
    if current_user.id != user_id:
        return jsonify(error="Forbidden."), 403

    resume = upload_resume(user_id, request.files.get("file"))
    data = serialize_resume(resume)
    data["download_url"] = url_for("resumes.download_resume_route", resume_id=resume.id)
    return jsonify(resume=data, file_path=data["file_path"]), 201


@resumes_bp.post("/upload_resume")
def legacy_upload_resume_route():
    """Upload a PDF using the original endpoint with an explicit owner."""
    user_id = request.form.get("user_id")
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401
    if current_user.id != user_id:
        return jsonify(error="Forbidden."), 403

    resume = upload_resume(user_id, request.files.get("file"))
    data = serialize_resume(resume)
    data["download_url"] = url_for("resumes.download_resume_route", resume_id=resume.id)
    return jsonify(resume=data, file_path=data["file_path"]), 201


@resumes_bp.get("/api/resumes/<string:resume_id>/download")
def download_resume_route(resume_id: str):
    """Download a stored PDF resume."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401

    resume = db.session.get(Resume, resume_id)
    if not resume:
        return jsonify(error="Resume not found."), 404
    if resume.user_id != current_user.id:
        return jsonify(error="Forbidden."), 403

    resume, path = resume_file(resume_id)
    return send_file(path, mimetype=resume.content_type, as_attachment=True,
                     download_name=resume.original_filename)


@resumes_bp.delete("/api/resumes/<string:resume_id>")
def delete_resume_route(resume_id: str):
    """Delete a stored resume."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401

    resume = db.session.get(Resume, resume_id)
    if not resume:
        return jsonify(error="Resume not found."), 404
    if resume.user_id != current_user.id:
        return jsonify(error="Forbidden."), 403

    delete_resume(resume_id)
    return "", 204
