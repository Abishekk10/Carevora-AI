"""Authentication routes."""

from flask import Blueprint, jsonify, request

from services.auth_service import (
    get_current_user,
    login_user,
    logout_user,
    register_user,
)
from services.validation import CreateUserRequest, validate_payload

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = validate_payload(CreateUserRequest, request.get_json(silent=True))

    user, token = register_user(
        full_name=data.full_name,
        email=data.email,
        password=data.password,
    )

    return jsonify(user=user.to_dict(), token=token), 201


@auth_bp.post("/login")
def login():
    """Login."""

    payload = request.get_json(silent=True) or {}

    email = payload.get("email", "")
    password = payload.get("password", "")

    if not email or not password:
        return jsonify(error="Email and password are required."), 400

    user, token = login_user(email, password)

    return jsonify(user=user.to_dict(), token=token)


@auth_bp.post("/logout")
def logout():
    """Logout."""

    logout_user()

    return jsonify(message="Logged out successfully.")


@auth_bp.get("/me")
def current_user():
    """Return the logged in user."""

    user = get_current_user()

    if user is None:
        return jsonify(error="Not authenticated."), 401

    return jsonify(user=user.to_dict())