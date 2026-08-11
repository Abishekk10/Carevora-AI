"""Bearer API token model."""

from uuid import uuid4

from database import db
from models.user import utcnow


class ApiToken(db.Model):
    """An opaque bearer token granting API access to its owner."""

    __tablename__ = "api_tokens"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
