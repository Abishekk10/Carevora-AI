"""Service for generating questions, evaluating answers, and creating mock interview reports."""

import json
import logging
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from config import Settings
from database import db
from models.dashboard import DashboardActivity
from models.resume import Resume
from models.resume_intelligence import ResumeIntelligence
from models.interview import InterviewSession, InterviewQuestion
from services.errors import APIError, NotFoundError

logger = logging.getLogger(__name__)


# Structured models for Gemini response parsing
class InterviewQuestionsResponse(BaseModel):
    questions: list[str] = Field(description="List of exactly 5 interview questions")


class AnswerEvaluationResponse(BaseModel):
    score: int = Field(description="An integer score between 0 and 100")
    feedback: str = Field(description="Constructive and professional feedback on the answer")


class FinalReportResponse(BaseModel):
    overall_score: int = Field(description="An overall performance score between 0 and 100")
    strengths: list[str] = Field(description="List of candidate's key strengths demonstrated in the interview")
    weaknesses: list[str] = Field(description="List of candidate's areas of weakness or missing depth")
    suggestions: list[str] = Field(description="List of specific, actionable suggestions for improvement")
    summary: str = Field(description="A concise executive summary of the candidate's performance")


def _get_genai_client() -> genai.Client:
    """Return a configured Gemini client."""
    if not Settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured.")
    return genai.Client(api_key=Settings.GEMINI_API_KEY)


def get_latest_resume(user_id: str) -> Resume:
    """Get the latest uploaded and successfully parsed resume for a user."""
    resume = db.session.execute(
        db.select(Resume)
        .join(ResumeIntelligence)
        .where(Resume.user_id == user_id)
        .where(ResumeIntelligence.status == "complete")
        .order_by(Resume.created_at.desc())
    ).scalar()

    if resume:
        return resume

    latest_resume = db.session.execute(
        db.select(Resume)
        .where(Resume.user_id == user_id)
        .order_by(Resume.created_at.desc())
    ).scalar()

    if not latest_resume:
        raise APIError(
            "No resume found. Please upload a resume on the Resume Intelligence page first.",
            400,
        )

    if not latest_resume.intelligence or latest_resume.intelligence.status == "processing":
        raise APIError(
            "Your resume is still being processed. Please wait for the AI analysis to complete before starting an interview.",
            400,
        )

    raise APIError(
        "Your resume could not be parsed successfully. Please upload a new resume on the Resume Intelligence page.",
        400,
    )


def _parsed_resume_context(resume: Resume) -> str:
    """Return serialized parsed resume intelligence for Gemini prompts."""
    parsed = resume.intelligence.to_dict()
    has_content = any(
        parsed.get(field)
        for field in ("skills", "experience", "projects", "education", "certifications")
    )
    if not has_content:
        raise APIError(
            "Your parsed resume does not contain enough information to generate interview questions. "
            "Please upload a more detailed resume on the Resume Intelligence page.",
            400,
        )
    return json.dumps(parsed, ensure_ascii=False, indent=2)


def start_interview_session(user_id: str, interview_type: str, difficulty: str) -> InterviewSession:
    """Start a new interview session and pre-generate 5 tailored questions."""
    resume = get_latest_resume(user_id)
    resume_context = _parsed_resume_context(resume)

    # Prepare Prompt
    prompt = (
        "You are an expert corporate interviewer. Generate exactly 5 relevant, challenging, "
        f"and specific interview questions for a '{interview_type}' interview at '{difficulty}' difficulty.\n"
        "The questions must be highly customized to the candidate's parsed resume background and skills provided below.\n"
        "Use only the resume data provided. Do not invent experience, skills, or projects that are not present.\n\n"
        f"CANDIDATE PARSED RESUME DATA:\n---\n{resume_context}\n---\n\n"
        "Guidelines:\n"
        "- Technical interviews should focus heavily on programming languages, frameworks, system design, "
        "and specific technical skills mentioned on their resume.\n"
        "- HR interviews should focus on culture fit, leadership, problem solving, behavioral scenarios, "
        "and resume milestones.\n"
        "- Mixed interviews should provide a balanced split (e.g. 3 technical questions and 2 behavioral questions).\n"
        "- The difficulty setting should dictate question depth: 'Easy' (foundational questions), "
        "'Medium' (scenario-based implementation or problem solving), 'Hard' (advanced architecture, deep dive "
        "into edge cases, or complex leadership and technical failures).\n"
        "Return the output as JSON with a list under the key 'questions'."
    )

    try:
        client = _get_genai_client()
        response = client.models.generate_content(
            model=Settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=InterviewQuestionsResponse.model_json_schema(),
                temperature=0.7,
            )
        )

        if not response.text:
            raise ValueError("Gemini returned empty response text.")

        parsed = InterviewQuestionsResponse.model_validate(json.loads(response.text))
        questions_list = parsed.questions
        if len(questions_list) < 5:
            raise ValueError(f"Generated {len(questions_list)} questions, expected 5.")

    except APIError:
        raise
    except Exception as error:
        logger.exception("Failed to generate interview questions using Gemini: %s", error)
        raise APIError(
            "We couldn't generate interview questions right now. Please try again in a moment.",
            502,
        ) from error

    # Save Session
    session = InterviewSession(
        user_id=user_id,
        interview_type=interview_type,
        difficulty=difficulty,
        status="active",
        resume_id=resume.id
    )
    db.session.add(session)
    db.session.flush()  # populate session.id

    # Save Questions
    for index, q_text in enumerate(questions_list[:5]):
        question = InterviewQuestion(
            session_id=session.id,
            question_text=q_text,
            question_order=index
        )
        db.session.add(question)
        
    db.session.add(DashboardActivity(
        user_id=user_id,
        event_type="interview_start",
        title="Mock Interview Started",
        description=f"Started a new {difficulty} {interview_type} mock interview simulator session.",
        payload={"session_id": session.id, "interview_type": interview_type, "difficulty": difficulty},
    ))
    db.session.commit()
    
    return session


def submit_answer(session_id: str, question_id: str, answer: str) -> tuple[InterviewQuestion, InterviewQuestion | None, InterviewSession | None]:
    """Submit an answer to a question. Returns (current_question, next_question, completed_session)."""
    session = db.session.get(InterviewSession, session_id)
    if not session:
        raise NotFoundError("Interview session not found.")
    if session.status == "completed":
        raise APIError("This interview session is already completed.", 400)

    question = db.session.get(InterviewQuestion, question_id)
    if not question or question.session_id != session_id:
        raise NotFoundError("Question not found in this session.")

    # Get user's parsed resume for evaluation context
    resume = db.session.get(Resume, session.resume_id)
    resume_context = ""
    if resume and resume.intelligence and resume.intelligence.status == "complete":
        resume_context = json.dumps(resume.intelligence.to_dict(), ensure_ascii=False, indent=2)

    # Prompt for evaluation
    eval_prompt = (
        "You are an expert interviewer. Evaluate the candidate's answer to the interview question below.\n"
        f"Question (Type: {session.interview_type}, Difficulty: {session.difficulty}):\n{question.question_text}\n\n"
        f"Candidate's Answer:\n{answer}\n\n"
        f"Candidate's Resume context (if helpful):\n{resume_context}\n\n"
        "Provide a score between 0 and 100 based on accuracy, clarity, and depth.\n"
        "Provide constructive feedback pointing out strengths, missing key details, and how to make the answer better."
    )

    try:
        client = _get_genai_client()
        eval_response = client.models.generate_content(
            model=Settings.GEMINI_MODEL,
            contents=eval_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=AnswerEvaluationResponse.model_json_schema(),
                temperature=0.3,
            )
        )
        eval_data = AnswerEvaluationResponse.model_validate(json.loads(eval_response.text))
        question.user_answer = answer
        question.score = eval_data.score
        question.evaluation_feedback = eval_data.feedback
    except Exception as error:
        logger.exception("Failed to evaluate answer using Gemini.")
        # Fallback evaluation so the user can continue
        question.user_answer = answer
        question.score = 70
        question.evaluation_feedback = "Answer received. Immediate AI feedback was temporarily unavailable."

    db.session.flush()

    # Find the next question
    next_order = question.question_order + 1
    next_question = db.session.execute(
        db.select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session_id)
        .where(InterviewQuestion.question_order == next_order)
    ).scalar()

    # If no next question, synthesize the final report
    completed_session = None
    if not next_question:
        completed_session = _complete_and_synthesize_interview(session)
        
    db.session.commit()
    return question, next_question, completed_session


def _complete_and_synthesize_interview(session: InterviewSession) -> InterviewSession:
    """Evaluate all answers and compile the final report."""
    questions = session.questions
    transcript = []
    scores = []
    
    for q in questions:
        transcript.append(
            f"Question: {q.question_text}\n"
            f"Answer: {q.user_answer or 'No answer provided.'}\n"
            f"Feedback: {q.evaluation_feedback or ''}\n"
            f"Score: {q.score or 0}/100"
        )
        if q.score is not None:
            scores.append(q.score)

    transcript_text = "\n\n---\n\n".join(transcript)

    report_prompt = (
        "You are an expert recruitment coordinator. Review the full interview transcript below and synthesize "
        "a comprehensive final evaluation report.\n\n"
        f"INTERVIEW PARAMETERS:\nType: {session.interview_type}, Difficulty: {session.difficulty}\n\n"
        f"FULL TRANSCRIPT:\n{transcript_text}\n\n"
        "Tasks:\n"
        "1. Calculate an overall performance score between 0 and 100 (which should be reflective of the scores of individual answers).\n"
        "2. Identify key strengths shown by the candidate's answers.\n"
        "3. Identify key weaknesses or areas lacking in depth/practicality.\n"
        "4. Provide actionable improvement suggestions for their next interview.\n"
        "5. Write a concise executive summary summarizing their overall performance.\n"
        "Format the output strictly as a JSON object."
    )

    try:
        client = _get_genai_client()
        report_response = client.models.generate_content(
            model=Settings.GEMINI_MODEL,
            contents=report_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=FinalReportResponse.model_json_schema(),
                temperature=0.3,
            )
        )
        report_data = FinalReportResponse.model_validate(json.loads(report_response.text))

        session.overall_score = report_data.overall_score
        session.feedback_report = {
            "strengths": report_data.strengths,
            "weaknesses": report_data.weaknesses,
            "suggestions": report_data.suggestions,
            "summary": report_data.summary,
        }
    except Exception as error:
        logger.exception("Failed to compile final report using Gemini.")
        avg_score = int(sum(scores) / len(scores)) if scores else 70
        session.overall_score = avg_score
        session.feedback_report = {
            "strengths": ["Completed the interview simulator session."],
            "weaknesses": ["No dynamic weaknesses report generated."],
            "suggestions": ["Review your transcript to evaluate improvement areas."],
            "summary": f"Interview completed. Average answer score: {avg_score}."
        }

    session.status = "completed"
    
    db.session.add(DashboardActivity(
        user_id=session.user_id,
        event_type="interview_complete",
        title="Mock Interview Completed",
        description=f"Completed a {session.difficulty} {session.interview_type} mock interview with an overall score of {session.overall_score}/100.",
        payload={"session_id": session.id, "overall_score": session.overall_score},
    ))
    return session
