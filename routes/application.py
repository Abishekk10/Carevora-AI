"""Job applications tracker routes."""

from datetime import datetime
from flask import Blueprint, jsonify, request
from database import db
from models.application import JobApplication
from services.auth_service import get_current_user
from services.errors import APIError

application_bp = Blueprint("application", __name__, url_prefix="/api/applications")


def parse_date(date_str: str | None) -> datetime | None:
    """Parse an ISO date string safely into a datetime object."""
    if not date_str:
        return None
    try:
        clean_str = date_str.replace("Z", "+00:00")
        if len(clean_str) == 10:
            clean_str += "T00:00:00+00:00"
        return datetime.fromisoformat(clean_str)
    except Exception:
        return None


@application_bp.get("")
def get_applications():
    """Fetch all applications for the logged-in user."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    apps = db.session.execute(
        db.select(JobApplication)
        .where(JobApplication.user_id == user.id)
        .order_by(JobApplication.created_at.desc())
    ).scalars().all()

    return jsonify(applications=[a.to_dict() for a in apps])


@application_bp.post("")
def create_application():
    """Create a new job application tracking log."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    payload = request.get_json(silent=True) or {}
    company_name = payload.get("company_name", "").strip()
    job_title = payload.get("job_title", "").strip()
    status = payload.get("status", "Saved").strip()
    notes = payload.get("notes", "").strip() or None
    job_link = payload.get("job_link", "").strip() or None

    if not company_name or not job_title:
        return jsonify(error="Company name and job title are required."), 400

    valid_statuses = ["Saved", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"]
    if status not in valid_statuses:
        return jsonify(error=f"Invalid status. Choose from: {', '.join(valid_statuses)}"), 400

    app_date = parse_date(payload.get("application_date")) or datetime.now()
    int_date = parse_date(payload.get("interview_date"))

    app = JobApplication(
        user_id=user.id,
        company_name=company_name,
        job_title=job_title,
        status=status,
        application_date=app_date,
        notes=notes,
        interview_date=int_date,
        job_link=job_link
    )

    db.session.add(app)
    db.session.commit()

    return jsonify(application=app.to_dict()), 201


@application_bp.patch("/<string:app_id>")
def update_application(app_id: str):
    """Update details or status of a job application."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    app = db.session.get(JobApplication, app_id)
    if not app or app.user_id != user.id:
        return jsonify(error="Application not found."), 404

    payload = request.get_json(silent=True) or {}

    if "company_name" in payload:
        name = payload.get("company_name", "").strip()
        if not name:
            return jsonify(error="Company name cannot be empty."), 400
        app.company_name = name

    if "job_title" in payload:
        title = payload.get("job_title", "").strip()
        if not title:
            return jsonify(error="Job title cannot be empty."), 400
        app.job_title = title

    if "status" in payload:
        status = payload.get("status", "").strip()
        valid_statuses = ["Saved", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"]
        if status not in valid_statuses:
            return jsonify(error="Invalid status."), 400
        app.status = status

    if "notes" in payload:
        app.notes = payload.get("notes", "").strip() or None

    if "job_link" in payload:
        app.job_link = payload.get("job_link", "").strip() or None

    if "application_date" in payload:
        parsed = parse_date(payload.get("application_date"))
        if parsed:
            app.application_date = parsed

    if "interview_date" in payload:
        app.interview_date = parse_date(payload.get("interview_date"))

    app.updated_at = datetime.now()
    db.session.commit()

    return jsonify(application=app.to_dict())


@application_bp.delete("/<string:app_id>")
def delete_application(app_id: str):
    """Remove a job application log from tracker."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    app = db.session.get(JobApplication, app_id)
    if not app or app.user_id != user.id:
        return jsonify(error="Application not found."), 404

    db.session.delete(app)
    db.session.commit()

    return "", 204


@application_bp.get("/stats")
def get_application_stats():
    """Fetch status aggregate statistics for applications."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    apps = db.session.execute(
        db.select(JobApplication)
        .where(JobApplication.user_id == user.id)
    ).scalars().all()

    stats = {
        "Total": len(apps),
        "Saved": 0,
        "Applied": 0,
        "Online Assessment": 0,
        "Interview": 0,
        "Offer": 0,
        "Rejected": 0
    }

    for a in apps:
        if a.status in stats:
            stats[a.status] += 1

    return jsonify(stats)
