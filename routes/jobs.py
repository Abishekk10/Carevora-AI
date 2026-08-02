"""Job-search API routes."""

from flask import Blueprint, jsonify, request

from services.job_service import search_available_jobs

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")


@jobs_bp.post("/search")
def search_jobs_route():
    """Search available jobs through configured providers."""
    jobs = search_available_jobs(request.get_json(silent=True))
    return jsonify(jobs=jobs, count=len(jobs))
