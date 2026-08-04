"""Dashboard persistence models for Carevora AI."""

from datetime import datetime, timezone
from uuid import uuid4

from database import db


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class DashboardChatHistory(db.Model):
    """Persist the latest AI chat interactions for the dashboard."""

    __tablename__ = "dashboard_chat_history"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False, default="chat")
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    sources = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        """Serialize this chat interaction for the dashboard payload."""
        return {
            "id": self.id,
            "kind": self.kind,
            "question": self.question,
            "answer": self.answer,
            "sources": self.sources or [],
            "created_at": self.created_at.isoformat(),
        }


class DashboardMatchHistory(db.Model):
    """Persist AI resume-match insights generated for the current user."""

    __tablename__ = "dashboard_match_history"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    resume_id = db.Column(db.String(36), db.ForeignKey("resumes.id"), nullable=False, index=True)
    job_id = db.Column(db.String(255), db.ForeignKey("job_listings.id"), nullable=False, index=True)
    match_score = db.Column(db.Integer, nullable=False, default=0)
    strengths = db.Column(db.JSON, nullable=False, default=list)
    missing_skills = db.Column(db.JSON, nullable=False, default=list)
    recommendations = db.Column(db.JSON, nullable=False, default=list)
    learning_roadmap = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User")
    resume = db.relationship("Resume")
    job = db.relationship("JobListing")

    def to_dict(self) -> dict:
        """Serialize this match-history record."""
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "job_id": self.job_id,
            "match_score": self.match_score,
            "strengths": self.strengths or [],
            "missing_skills": self.missing_skills or [],
            "recommendations": self.recommendations or [],
            "learning_roadmap": self.learning_roadmap or [],
            "created_at": self.created_at.isoformat(),
        }


class DashboardActivity(db.Model):
    """Persist user-facing activity events for the timeline widget."""

    __tablename__ = "dashboard_activity"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        """Serialize a timeline record for the dashboard payload."""
        return {
            "id": self.id,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "payload": self.payload or {},
            "created_at": self.created_at.isoformat(),
        }


class DashboardRecommendedJob(db.Model):
    """Persist job recommendations surfaced for a user from their latest activity."""

    __tablename__ = "dashboard_recommended_jobs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    job_id = db.Column(db.String(255), db.ForeignKey("job_listings.id"), nullable=False, index=True)
    recommendation_score = db.Column(db.Integer, nullable=False, default=0)
    reason = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User")
    job = db.relationship("JobListing")

    def to_dict(self) -> dict:
        """Serialize a recommendation for the dashboard payload."""
        return {
            "id": self.id,
            "job_id": self.job_id,
            "recommendation_score": self.recommendation_score,
            "reason": self.reason,
            "created_at": self.created_at.isoformat(),
        }
