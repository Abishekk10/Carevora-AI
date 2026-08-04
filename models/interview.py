"""SQLAlchemy models for AI Interview Simulator."""

from datetime import datetime, timezone
from uuid import uuid4
from database import db


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class InterviewSession(db.Model):
    """Represents a mock interview simulation session."""

    __tablename__ = "interview_sessions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    interview_type = db.Column(db.String(20), nullable=False)  # "HR", "Technical", "Mixed"
    difficulty = db.Column(db.String(20), nullable=False)  # "Easy", "Medium", "Hard"
    status = db.Column(db.String(20), nullable=False, default="active")  # "active", "completed"
    resume_id = db.Column(db.String(36), db.ForeignKey("resumes.id"), nullable=True)
    overall_score = db.Column(db.Integer, nullable=True)
    feedback_report = db.Column(db.JSON, nullable=True)  # {strengths: [], weaknesses: [], suggestions: [], summary: ""}
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User")
    resume = db.relationship("Resume")
    questions = db.relationship(
        "InterviewQuestion",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_order",
    )

    def to_dict(self) -> dict:
        """Serialize interview session data."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "interview_type": self.interview_type,
            "difficulty": self.difficulty,
            "status": self.status,
            "resume_id": self.resume_id,
            "overall_score": self.overall_score,
            "feedback_report": self.feedback_report,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class InterviewQuestion(db.Model):
    """Represents an individual question, user answer, and its AI evaluation."""

    __tablename__ = "interview_questions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_text = db.Column(db.Text, nullable=False)
    question_order = db.Column(db.Integer, nullable=False)  # 0-indexed order (0 to 4)
    user_answer = db.Column(db.Text, nullable=True)
    evaluation_feedback = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, nullable=True)  # score for this answer (0 to 100)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    session = db.relationship("InterviewSession", back_populates="questions")

    def to_dict(self) -> dict:
        """Serialize interview question data."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "question_text": self.question_text,
            "question_order": self.question_order,
            "user_answer": self.user_answer,
            "evaluation_feedback": self.evaluation_feedback,
            "score": self.score,
            "created_at": self.created_at.isoformat(),
        }
