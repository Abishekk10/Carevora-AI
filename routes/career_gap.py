"""Career Gap Analyzer routes."""

from flask import Blueprint, jsonify, request

from services.auth_service import get_current_user
from services.career_gap_service import analyze_career_gap
from services.errors import APIError

career_gap_bp = Blueprint("career_gap", __name__, url_prefix="/api/career-gap")


@career_gap_bp.post("/analyze")
def analyze_career_gap_route():
    """Analyze skill demand for a target role against the user's parsed resume."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    try:
        result = analyze_career_gap(user.id, request.get_json(silent=True))
    except APIError as error:
        return jsonify(error=error.message), error.status_code

    return jsonify(result)
