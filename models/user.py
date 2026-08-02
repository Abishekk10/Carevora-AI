"""SQLAlchemy user model."""

from datetime import datetime, timezone
from uuid import uuid4

from database import db


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class User(db.Model):
    """A JobPilot user and the owner of uploaded resumes."""

    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    resumes = db.relationship(
        "Resume", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )

    def to_dict(self) -> dict[str, str]:
        """Serialize public user fields."""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
