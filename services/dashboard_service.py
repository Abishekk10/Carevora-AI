"""Dashboard data assembly for the Carevora AI workspace."""

from collections.abc import Sequence
from statistics import mean

from sqlalchemy import select

from database import db
from models.dashboard import (
    DashboardActivity,
    DashboardChatHistory,
    DashboardMatchHistory,
    DashboardRecommendedJob,
)
from models.job_listing import JobListing
from models.resume import Resume
from models.resume_intelligence import ResumeIntelligence
from models.interview import InterviewSession
from services.errors import APIError, NotFoundError
from services.user_service import get_user


def _safe_mean(values: Sequence[int]) -> int:
    """Return the arithmetic mean or zero if no values are available."""
    if not values:
        return 0
    return int(round(mean(values)))


def _build_resume_completeness_score(user_id: str) -> int | None:
    """Score the latest completed resume intelligence record by populated sections."""
    resume = db.session.execute(
        select(Resume)
        .join(ResumeIntelligence)
        .where(Resume.user_id == user_id)
        .where(ResumeIntelligence.status == "complete")
        .order_by(ResumeIntelligence.extracted_at.desc(), ResumeIntelligence.created_at.desc())
    ).scalar()
    if resume is None or resume.intelligence is None:
        return None

    intelligence = resume.intelligence
    sections = (
        any((intelligence.contact or {}).values()),
        intelligence.skills,
        intelligence.education,
        intelligence.experience,
        intelligence.projects,
        intelligence.certifications,
    )
    return round((sum(bool(section) for section in sections) / 6) * 100)


def _build_profile_completion(user_id: str) -> int:
    """Estimate profile completion from persisted user assets only."""
    user = get_user(user_id)
    user_fields = int(bool(user.full_name.strip()) + bool(user.email.strip())) * 20
    resume_count = db.session.execute(
        select(Resume).where(Resume.user_id == user_id)
    ).scalars().all()
    resume_score = 20 if resume_count else 0
    complete_intelligence = sum(
        1
        for resume in resume_count
        if resume.intelligence is not None and resume.intelligence.status == "complete"
    )
    intelligence_score = 20 if complete_intelligence else 0
    match_history = db.session.execute(
        select(DashboardMatchHistory).where(DashboardMatchHistory.user_id == user_id)
    ).scalars().all()
    match_count = len(match_history)
    match_score = 20 if match_count else 0
    completion = user_fields + resume_score + intelligence_score + match_score
    return min(100, completion)


def _build_dashboard_statistics(user_id: str) -> dict:
    """Compute live dashboard statistics from persisted user data."""
    resumes = db.session.execute(
        select(Resume).where(Resume.user_id == user_id)
    ).scalars().all()
    match_history = db.session.execute(
        select(DashboardMatchHistory).where(DashboardMatchHistory.user_id == user_id)
    ).scalars().all()
    completed_intelligence = [
        resume for resume in resumes
        if resume.intelligence is not None and resume.intelligence.status == "complete"
    ]
    scores = [entry.match_score for entry in match_history]

    latest_interview = db.session.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .where(InterviewSession.status == "completed")
        .order_by(InterviewSession.created_at.desc())
    ).scalar()

    return {
        "resume_count": len(resumes),
        "intelligence_count": len(completed_intelligence),
        "jobs_matched_count": len(match_history),
        "average_match_score": _safe_mean(scores),
        "resume_completeness_score": _build_resume_completeness_score(user_id),
        "profile_completion": _build_profile_completion(user_id),
        "career_readiness_score": _safe_mean(scores + [len(completed_intelligence) * 25]),
        "latest_interview_score": latest_interview.overall_score if latest_interview else None,
    }


def _serialize_recommendations(user_id: str) -> list[dict]:
    """Serialize saved recommendations and their referenced job details."""
    recommendations = db.session.execute(
        select(DashboardRecommendedJob)
        .where(DashboardRecommendedJob.user_id == user_id)
        .order_by(DashboardRecommendedJob.created_at.desc())
        .limit(5)
    ).scalars().all()

    payload: list[dict] = []
    for item in recommendations:
        job = db.session.get(JobListing, item.job_id)
        if job is None:
            continue
        payload.append({
            **item.to_dict(),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "employment_type": job.employment_type,
            "work_mode": job.work_mode,
            "skills": job.skills or [],
            "posted_date": job.posted_date,
            "apply_url": job.apply_url,
            "source": job.source,
        })
    return payload


def get_dashboard_payload(user_id: str | None = None) -> dict:
    """Return a single dashboard payload for the current authenticated user."""
    auth_user_id = user_id
    if not auth_user_id:
        raise APIError("Authentication required to view the dashboard.", 401)

    try:
        get_user(auth_user_id)
    except NotFoundError as error:
        raise APIError(str(error), 404) from error

    chat_history = db.session.execute(
        select(DashboardChatHistory)
        .where(DashboardChatHistory.user_id == auth_user_id)
        .order_by(DashboardChatHistory.created_at.desc())
        .limit(5)
    ).scalars().all()

    match_history = db.session.execute(
        select(DashboardMatchHistory)
        .where(DashboardMatchHistory.user_id == auth_user_id)
        .order_by(DashboardMatchHistory.created_at.desc())
        .limit(5)
    ).scalars().all()

    activity = db.session.execute(
        select(DashboardActivity)
        .where(DashboardActivity.user_id == auth_user_id)
        .order_by(DashboardActivity.created_at.desc())
        .limit(10)
    ).scalars().all()

    return {
        "dashboard_statistics": _build_dashboard_statistics(auth_user_id),
        "recent_ai_chat_history": [item.to_dict() for item in chat_history],
        "resume_match_history": [item.to_dict() for item in match_history],
        "user_activity_timeline": [item.to_dict() for item in activity],
        "recommended_jobs": _serialize_recommendations(auth_user_id),
    }
