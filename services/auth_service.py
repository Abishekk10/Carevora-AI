"""Authentication service for Carevora AI."""

import hashlib
import secrets
from datetime import timedelta, timezone

from flask import request

from config import Settings
from database import db
from models.api_token import ApiToken
from models.user import User, utcnow
from services.errors import APIError


def _bearer_token() -> str | None:
    """Extract the raw bearer token from the Authorization header."""
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def _hash_token(token: str) -> str:
    """Return the SHA-256 digest of a raw bearer token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _revoke_user_tokens(user_id: str) -> None:
    """Revoke every outstanding bearer token issued to the user."""
    ApiToken.query.filter_by(user_id=user_id).delete()
    db.session.commit()


def _issue_token(user: User) -> str:
    """Create and persist a new bearer token for the given user."""
    raw_token = secrets.token_urlsafe(32)
    db.session.add(ApiToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=utcnow() + timedelta(days=Settings.TOKEN_TTL_DAYS),
    ))
    db.session.commit()
    return raw_token


def register_user(full_name: str, email: str, password: str) -> tuple[User, str]:
    """Register a new user and return the user with a bearer token."""

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

    token = _issue_token(user)

    return user, token


def login_user(email: str, password: str) -> tuple[User, str]:
    """Authenticate a user and return the user with a bearer token."""

    email = email.strip().lower()

    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        raise APIError("Invalid email or password.", 401)

    _revoke_user_tokens(user.id)
    token = _issue_token(user)

    return user, token


def logout_user() -> None:
    """Revoke the bearer token attached to the current request."""

    token = _bearer_token()

    if not token:
        return

    ApiToken.query.filter_by(token_hash=_hash_token(token)).delete()
    db.session.commit()


def get_current_user() -> User | None:
    """Return the user that owns the bearer token on the current request."""

    token = _bearer_token()

    if not token:
        return None

    record = ApiToken.query.filter_by(token_hash=_hash_token(token)).first()

    if record is None:
        return None

    if record.expires_at is not None:
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < utcnow():
            return None

    return db.session.get(User, record.user_id)
