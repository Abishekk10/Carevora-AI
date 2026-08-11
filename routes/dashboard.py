"""Dashboard aggregation route for the Carevora AI experience."""

from flask import Blueprint, jsonify

from services.auth_service import get_current_user
from services.dashboard_service import get_dashboard_payload


dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


@dashboard_bp.get("/dashboard")
def dashboard_route():
    """Expose a single, user-scoped dashboard payload for the current user."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401
    return jsonify(get_dashboard_payload(current_user.id))
