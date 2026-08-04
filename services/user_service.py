"""User profile business logic."""

from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from database import db
from models.user import User
from services.errors import APIError, NotFoundError
from services.validation import CreateUserRequest, UpdateUserRequest, validate_payload


def create_user(payload: object) -> User:
    """Validate and persist a new user profile."""
    data = validate_payload(CreateUserRequest, payload)
    user = User(
    email=data.email,
    full_name=data.full_name,
    password_hash=generate_password_hash(data.password),
)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError as error:
        db.session.rollback()
        raise APIError("A user with this email already exists.", 409) from error
    return user


def get_user(user_id: str) -> User:
    """Return a user or raise a resource-not-found error."""
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.")
    return user


def update_user(user_id: str, payload: object) -> User:
    """Apply a validated profile update."""
    data = validate_payload(UpdateUserRequest, payload)
    if data.full_name is None:
        raise APIError("At least one updatable field is required.", 422)
    user = get_user(user_id)
    user.full_name = data.full_name
    db.session.commit()
    return user
