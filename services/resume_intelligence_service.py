"""PDF text extraction and Gemini-backed resume intelligence."""

import json
import logging
from pathlib import Path
from typing import Any

import fitz
from google import genai
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config import Settings
from models.resume_intelligence import ResumeIntelligence, utcnow

logger = logging.getLogger(__name__)


class ContactInformation(BaseModel):
    """Contact information that may be present in a resume."""

    model_config = ConfigDict(extra="ignore")
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None


class ResumeIntelligenceResult(BaseModel):
    """Strict, JSON-safe schema requested from Gemini."""

    model_config = ConfigDict(extra="ignore")
    contact: ContactInformation = Field(default_factory=ContactInformation)
    skills: list[str] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    experience: list[dict[str, Any]] = Field(default_factory=list)
    projects: list[dict[str, Any]] = Field(default_factory=list)
    certifications: list[dict[str, Any]] = Field(default_factory=list)


def extract_pdf_text(pdf_path: Path) -> str:
    """Read all selectable text from a valid PDF."""
    try:
        with fitz.open(pdf_path) as document:
            text = "\n".join(page.get_text("text") for page in document)
    except (fitz.FileDataError, RuntimeError, OSError) as error:
        raise ValueError("The uploaded file could not be read as a PDF.") from error

    if not text.strip():
        raise ValueError("This PDF does not contain readable text. Upload a text-based resume PDF.")
    return text.strip()


def _extract_with_gemini(text: str) -> ResumeIntelligenceResult:
    """Ask Gemini for structured resume fields, keeping AI concerns out of routes."""
    if not Settings.GEMINI_API_KEY:
        raise RuntimeError("Gemini is not configured.")

    prompt = (
        "Extract the candidate information from this resume. Return only the requested JSON "
        "schema. Do not invent data; use empty strings, nulls, or empty lists for missing "
        "information. Keep each education, experience, project, and certification item as a "
        "concise object with useful labeled fields.\n\nRESUME TEXT:\n" + text
    )
    client = genai.Client(api_key=Settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=Settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=ResumeIntelligenceResult.model_json_schema(),
            temperature=0,
        ),
    )
    if not response.text:
        raise RuntimeError("Gemini returned no structured resume data.")
    try:
        return ResumeIntelligenceResult.model_validate(json.loads(response.text))
    except (json.JSONDecodeError, ValidationError) as error:
        raise RuntimeError("Gemini returned an invalid resume analysis.") from error


def analyze_resume(pdf_path: Path) -> ResumeIntelligenceResult:
    """Extract PDF text and convert it into validated structured information."""
    return _extract_with_gemini(extract_pdf_text(pdf_path))


def complete_intelligence(record: ResumeIntelligence, analysis: ResumeIntelligenceResult) -> None:
    """Copy validated analysis values into a persisted record."""
    record.status = "complete"
    record.error_message = None
    record.contact = analysis.contact.model_dump()
    record.skills = analysis.skills
    record.education = analysis.education
    record.experience = analysis.experience
    record.projects = analysis.projects
    record.certifications = analysis.certifications
    record.extracted_at = utcnow()


def fail_intelligence(record: ResumeIntelligence, error: Exception) -> None:
    """Record an analysis failure without discarding a successfully uploaded resume."""
    logger.warning("Resume intelligence failed for resume_id=%s: %s", record.resume_id, error)
    record.status = "failed"
    record.error_message = (
        "Gemini could not analyze this resume right now. Please try uploading it again later."
    )
