"""Authentication service for Carevora AI."""

from flask import session

from database import db
from models.user import User
from services.errors import APIError


def register_user(full_name: str, email: str, password: str) -> User:
    """Register a new user."""

    email = email.strip().lower()

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        raise APIError("A user with this email already exists.", 409)

    user = User(
        full_name=full_name.strip(),
        email=email,
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id

    return user


def login_user(email: str, password: str) -> User:
    """Authenticate a user."""

    email = email.strip().lower()

    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        raise APIError("Invalid email or password.", 401)

    session["user_id"] = user.id

    return user


def logout_user() -> None:
    """Logout current user."""

    session.pop("user_id", None)


def get_current_user() -> User | None:
    """Return the currently authenticated user."""

    user_id = session.get("user_id")

    if not user_id:
        return None

    return db.session.get(User, user_id)