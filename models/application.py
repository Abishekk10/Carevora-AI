"""SQLAlchemy model for job applications tracking."""

from datetime import datetime, timezone
from uuid import uuid4
from database import db


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class JobApplication(db.Model):
    """Represents a job application in the tracker."""

    __tablename__ = "job_applications"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    company_name = db.Column(db.String(255), nullable=False)
    job_title = db.Column(db.String(255), nullable=False)
    application_date = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    status = db.Column(db.String(30), nullable=False, default="Saved")  # "Saved", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"
    notes = db.Column(db.Text, nullable=True)
    interview_date = db.Column(db.DateTime(timezone=True), nullable=True)
    job_link = db.Column(db.String(1024), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        """Serialize job application data."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_name": self.company_name,
            "job_title": self.job_title,
            "application_date": self.application_date.isoformat() if self.application_date else None,
            "status": self.status,
            "notes": self.notes,
            "interview_date": self.interview_date.isoformat() if self.interview_date else None,
            "job_link": self.job_link,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
