"""Job-search API routes."""

from flask import Blueprint, jsonify, request

from services.job_service import search_available_jobs
from services.resume_match_service import match_resume_to_job
from services.validation import ResumeMatchRequest, validate_payload

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")


@jobs_bp.post("/search")
def search_jobs_route():
    """Search available jobs through configured providers."""
    jobs = search_available_jobs(request.get_json(silent=True))
    return jsonify(jobs=jobs, count=len(jobs))


@jobs_bp.post("/match")
def match_resume_route():
    """Generate an AI match between a stored resume and a selected search result."""
    payload = validate_payload(ResumeMatchRequest, request.get_json(silent=True))
    return jsonify(match=match_resume_to_job(payload.resume_id, payload.job_id))
