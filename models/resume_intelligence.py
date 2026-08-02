"""Persisted AI-extracted information for an uploaded resume."""

from datetime import datetime, timezone
from uuid import uuid4

from database import db


def utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(timezone.utc)


class ResumeIntelligence(db.Model):
    """Structured resume data generated from the source PDF."""

    __tablename__ = "resume_intelligence"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    resume_id = db.Column(
        db.String(36), db.ForeignKey("resumes.id"), nullable=False, unique=True, index=True
    )
    status = db.Column(db.String(20), nullable=False, default="processing")
    error_message = db.Column(db.String(500), nullable=True)
    contact = db.Column(db.JSON, nullable=False, default=dict)
    skills = db.Column(db.JSON, nullable=False, default=list)
    education = db.Column(db.JSON, nullable=False, default=list)
    experience = db.Column(db.JSON, nullable=False, default=list)
    projects = db.Column(db.JSON, nullable=False, default=list)
    certifications = db.Column(db.JSON, nullable=False, default=list)
    extracted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    resume = db.relationship("Resume", back_populates="intelligence")

    def to_dict(self) -> dict:
        """Serialize extracted information for the API."""
        return {
            "status": self.status,
            "error_message": self.error_message,
            "contact": self.contact or {},
            "skills": self.skills or [],
            "education": self.education or [],
            "experience": self.experience or [],
            "projects": self.projects or [],
            "certifications": self.certifications or [],
            "extracted_at": self.extracted_at.isoformat() if self.extracted_at else None,
        }
