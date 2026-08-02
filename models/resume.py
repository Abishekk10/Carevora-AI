"""SQLAlchemy resume model."""

from datetime import datetime, timezone
from uuid import uuid4

from database import db
# Imported so SQLAlchemy registers the related table when this model is loaded.
from models.resume_intelligence import ResumeIntelligence  # noqa: F401


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class Resume(db.Model):
    """Metadata for a PDF resume stored on the local filesystem."""

    __tablename__ = "resumes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    content_type = db.Column(db.String(100), nullable=False, default="application/pdf")
    size_bytes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="resumes")
    intelligence = db.relationship(
        "ResumeIntelligence", back_populates="resume", uselist=False,
        cascade="all, delete-orphan", lazy="joined"
    )

    def to_dict(self) -> dict[str, str | int]:
        """Serialize stored resume metadata."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "content_type": self.content_type,
            "size_bytes": self.size_bytes,
            "created_at": self.created_at.isoformat(),
        }
