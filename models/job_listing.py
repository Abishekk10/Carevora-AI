"""Cached job listings used by downstream matching features."""

from datetime import datetime, timezone

from database import db


def utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(timezone.utc)


class JobListing(db.Model):
    """A provider job result retained long enough for resume matching."""

    __tablename__ = "job_listings"

    id = db.Column(db.String(255), primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    company = db.Column(db.String(500), nullable=False)
    location = db.Column(db.String(500), nullable=False, default="")
    employment_type = db.Column(db.String(100), nullable=True)
    work_mode = db.Column(db.String(100), nullable=True)
    experience = db.Column(db.String(255), nullable=True)
    salary_min = db.Column(db.Float, nullable=True)
    salary_max = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(20), nullable=True)
    skills = db.Column(db.JSON, nullable=False, default=list)
    description = db.Column(db.Text, nullable=False)
    apply_url = db.Column(db.Text, nullable=False)
    posted_date = db.Column(db.String(100), nullable=True)
    category = db.Column(db.String(255), nullable=True)
    source = db.Column(db.String(100), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def update_from_dict(self, job: dict) -> None:
        """Update cached fields from the stable provider response shape."""
        for field in (
            "title", "company", "location", "employment_type", "work_mode", "experience",
            "salary_min", "salary_max", "currency", "skills", "description", "apply_url",
            "posted_date", "category", "source",
        ):
            setattr(self, field, job.get(field))

    def to_match_dict(self) -> dict:
        """Return only the job content required by the AI matching service."""
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "employment_type": self.employment_type,
            "experience": self.experience,
            "skills": self.skills or [],
            "description": self.description,
            "category": self.category,
        }
