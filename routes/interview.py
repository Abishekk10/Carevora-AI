"""Interview simulation routes."""

from flask import Blueprint, jsonify, request, session
from database import db
from models.interview import InterviewSession, InterviewQuestion
from services.auth_service import get_current_user
from services.interview_service import (
    start_interview_session,
    submit_answer,
)
from services.errors import APIError

interview_bp = Blueprint("interview", __name__, url_prefix="/api/interview")


@interview_bp.get("/history")
def get_interview_history():
    """Fetch past completed interview sessions for the logged-in user."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    sessions = db.session.execute(
        db.select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .where(InterviewSession.status == "completed")
        .order_by(InterviewSession.created_at.desc())
    ).scalars().all()

    return jsonify(sessions=[s.to_dict() for s in sessions])


@interview_bp.post("/start")
def start_interview():
    """Start a mock interview session and return the first question."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    payload = request.get_json(silent=True) or {}
    interview_type = payload.get("interview_type", "Mixed")
    difficulty = payload.get("difficulty", "Medium")

    if interview_type not in ["HR", "Technical", "Mixed"]:
        return jsonify(error="Invalid interview type. Choose HR, Technical, or Mixed."), 400
    if difficulty not in ["Easy", "Medium", "Hard"]:
        return jsonify(error="Invalid difficulty. Choose Easy, Medium, or Hard."), 400

    try:
        session = start_interview_session(user.id, interview_type, difficulty)
    except APIError as error:
        return jsonify(error=error.message), error.status_code

    # Return the first question (which will be order=0)
    first_question = db.session.execute(
        db.select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session.id)
        .where(InterviewQuestion.question_order == 0)
    ).scalar()

    if not first_question:
        return jsonify(error="Failed to retrieve the first question."), 500

    return jsonify(
        session=session.to_dict(),
        question=first_question.to_dict(),
        total_questions=5
    ), 201


@interview_bp.post("/answer")
def answer_interview_question():
    """Submit an answer to a question and get feedback + next question or final report."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    question_id = payload.get("question_id")
    answer = payload.get("answer", "")

    if not session_id or not question_id:
        return jsonify(error="Missing session_id or question_id."), 400
    if not answer.strip():
        return jsonify(error="Answer cannot be empty."), 400

    # Verify session ownership
    session_obj = db.session.get(InterviewSession, session_id)
    if not session_obj or session_obj.user_id != user.id:
        return jsonify(error="Session not found."), 404

    try:
        question, next_question, completed_session = submit_answer(
            session_id=session_id,
            question_id=question_id,
            answer=answer.strip()
        )
    except APIError as error:
        return jsonify(error=error.message), error.status_code

    response = {
        "evaluation": {
            "score": question.score,
            "feedback": question.evaluation_feedback
        }
    }

    if next_question:
        response["next_question"] = next_question.to_dict()
        response["status"] = "active"
    else:
        response["status"] = "completed"
        if completed_session:
            response["session"] = completed_session.to_dict()

    return jsonify(response)


@interview_bp.get("/session/<string:session_id>")
def get_session_details(session_id: str):
    """Retrieve full details of a specific interview session (transcript & final report)."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    session = db.session.get(InterviewSession, session_id)
    if not session or session.user_id != user.id:
        return jsonify(error="Session not found."), 404

    # Fetch all questions ordered
    questions = db.session.execute(
        db.select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.question_order.asc())
    ).scalars().all()

    return jsonify(
        session=session.to_dict(),
        questions=[q.to_dict() for q in questions]
    )


@interview_bp.get("/latest")
def get_latest_interview_score():
    """Retrieve the score of the latest completed interview session."""
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    latest_session = db.session.execute(
        db.select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .where(InterviewSession.status == "completed")
        .order_by(InterviewSession.created_at.desc())
    ).scalar()

    if not latest_session:
        return jsonify(latest_score=None, interview_type=None, difficulty=None, date=None)

    return jsonify(
        latest_score=latest_session.overall_score,
        interview_type=latest_session.interview_type,
        difficulty=latest_session.difficulty,
        date=latest_session.created_at.isoformat(),
        session_id=latest_session.id
    )


@interview_bp.get("/check-resume")
def check_user_resume():
    """Check if the user has a processed resume available for interviews."""
    from services.interview_service import get_latest_resume
    
    user = get_current_user()
    if not user:
        return jsonify(error="Authentication required."), 401

    try:
        resume = get_latest_resume(user.id)
        return jsonify(
            has_resume=True,
            resume_id=resume.id,
            resume_filename=resume.original_filename,
            intelligence_status=resume.intelligence.status if resume.intelligence else None
        )
    except APIError as error:
        return jsonify(
            has_resume=False,
            message=error.message
        )
