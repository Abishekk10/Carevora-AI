"""Job-search API routes."""

from flask import Blueprint, jsonify, request

from database import db
from models.resume import Resume
from services.auth_service import get_current_user
from services.job_service import search_available_jobs
from services.resume_match_service import match_resume_to_job
from services.validation import ResumeMatchRequest, validate_payload

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")


@jobs_bp.post("/search")
def search_jobs_route():
    """Search available jobs through configured providers."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401
    jobs = search_available_jobs(request.get_json(silent=True))
    return jsonify(jobs=jobs, count=len(jobs))


@jobs_bp.post("/match")
def match_resume_route():
    """Generate an AI match between a stored resume and a selected search result."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401

    payload = validate_payload(ResumeMatchRequest, request.get_json(silent=True))

    resume = db.session.get(Resume, payload.resume_id)
    if not resume:
        return jsonify(error="Resume not found."), 404
    if resume.user_id != current_user.id:
        return jsonify(error="Forbidden."), 403

    return jsonify(match=match_resume_to_job(payload.resume_id, payload.job_id))
