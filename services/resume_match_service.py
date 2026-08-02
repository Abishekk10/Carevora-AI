"""Gemini-powered comparison of stored resume intelligence and job listings."""

import json
import logging

import httpx
from google import genai
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config import Settings
from database import db
from models.job_listing import JobListing
from models.resume import Resume
from services.errors import APIError, NotFoundError

logger = logging.getLogger(__name__)


class ResumeMatchResult(BaseModel):
    """The validated, presentation-ready result returned by Gemini."""

    model_config = ConfigDict(extra="ignore")
    match_score: int = Field(ge=0, le=100)
    strengths: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    learning_roadmap: list[str] = Field(default_factory=list)


def _get_resume_intelligence(resume_id: str):
    resume = db.session.get(Resume, resume_id)
    if resume is None:
        raise NotFoundError("Resume not found. Upload a resume before matching.")
    if resume.intelligence is None or resume.intelligence.status != "complete":
        raise APIError("This resume does not have a completed AI analysis yet.", 409)
    return resume.intelligence


def _get_job(job_id: str) -> JobListing:
    job = db.session.get(JobListing, job_id)
    if job is None:
        raise NotFoundError("Job not found. Search for the job again before matching.")
    return job


def _generate_match(resume_data: dict, job_data: dict) -> ResumeMatchResult:
    """Call Gemini with only structured data already present in JobPilot."""
    if not Settings.GEMINI_API_KEY:
        raise RuntimeError("Gemini is not configured.")
    prompt = (
        "Compare the candidate resume data with the job data and return the requested JSON. "
        "Score actual fit from 0 to 100. Be specific, concise, and do not invent qualifications. "
        "Strengths should cite matching evidence. Missing skills should name only meaningful gaps. "
        "Recommendations and learning roadmap must be practical, prioritized actions.\n\n"
        f"RESUME DATA:\n{json.dumps(resume_data, ensure_ascii=False)}\n\n"
        f"JOB DATA:\n{json.dumps(job_data, ensure_ascii=False)}"
    )
    client = genai.Client(api_key=Settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=Settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=ResumeMatchResult.model_json_schema(),
            temperature=0.2,
        ),
    )
    if not response.text:
        raise RuntimeError("Gemini returned no match analysis.")
    try:
        return ResumeMatchResult.model_validate(json.loads(response.text))
    except (json.JSONDecodeError, ValidationError) as error:
        raise RuntimeError("Gemini returned an invalid match analysis.") from error


def match_resume_to_job(resume_id: str, job_id: str) -> dict:
    """Build a validated match result for an existing resume and selected job."""
    intelligence = _get_resume_intelligence(resume_id)
    job = _get_job(job_id)
    resume_data = intelligence.to_dict()
    resume_data.pop("status", None)
    resume_data.pop("error_message", None)
    resume_data.pop("extracted_at", None)
    try:
        return _generate_match(resume_data, job.to_match_dict()).model_dump()
    except (httpx.TimeoutException, TimeoutError) as error:
        logger.warning("Gemini timed out while matching resume_id=%s job_id=%s", resume_id, job_id)
        raise APIError("Resume matching timed out. Please try again.", 504) from error
    except RuntimeError as error:
        logger.warning("Invalid Gemini match response for resume_id=%s job_id=%s: %s", resume_id, job_id, error)
        raise APIError("AI matching returned an invalid response. Please try again.", 502) from error
    except Exception as error:
        logger.exception("Gemini match request failed for resume_id=%s job_id=%s", resume_id, job_id)
        raise APIError("AI matching is temporarily unavailable. Please try again.", 502) from error
