"""User profile routes."""

from flask import Blueprint, jsonify, request

from services.user_service import create_user, get_user, update_user

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.post("")
def create_user_route():
    """Create a user profile."""
    user = create_user(request.get_json(silent=True))
    return jsonify(user=user.to_dict()), 201


@users_bp.get("/<string:user_id>")
def get_user_route(user_id: str):
    """Fetch a user profile."""
    return jsonify(user=get_user(user_id).to_dict())


@users_bp.patch("/<string:user_id>")
def update_user_route(user_id: str):
    """Update a user profile."""
    return jsonify(user=update_user(user_id, request.get_json(silent=True)).to_dict())
