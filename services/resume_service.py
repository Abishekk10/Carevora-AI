"""Secure local PDF resume storage business logic."""

import logging
from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from database import db
from models.resume import Resume
from models.resume_intelligence import ResumeIntelligence
from services.resume_intelligence_service import (
    analyze_resume,
    complete_intelligence,
    extract_pdf_text,
    fail_intelligence,
)
from services.errors import APIError, NotFoundError
from services.user_service import get_user

logger = logging.getLogger(__name__)
PDF_HEADER = b"%PDF-"


def _validate_pdf(upload: FileStorage) -> str:
    """Validate a supplied upload and return its safe original filename."""
    safe_name = secure_filename(upload.filename or "")
    if not safe_name:
        raise APIError("No file was selected.", 400)
    if Path(safe_name).suffix.lower() != ".pdf":
        raise APIError("Only PDF files are allowed.", 400)
    header = upload.stream.read(1024)
    upload.stream.seek(0)
    if PDF_HEADER not in header:
        raise APIError("The uploaded file is not a valid PDF.", 400)
    return safe_name


def _upload_folder() -> Path:
    """Resolve and create the configured local upload directory."""
    folder = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def upload_resume(user_id: str | None, upload: FileStorage | None) -> Resume:
    """Store a user's PDF and persist its Gemini-extracted intelligence."""
    if not user_id:
        raise APIError("Missing multipart field 'user_id'.", 400)
    get_user(user_id)
    if upload is None:
        raise APIError("Missing file field. Use multipart field 'file'.", 400)
    original_filename = _validate_pdf(upload)
    folder = _upload_folder()
    stored_filename = f"{uuid4().hex}.pdf"
    destination = folder / stored_filename
    upload.save(destination)

    try:
        # Header validation is insufficient for malformed or image-only PDFs.
        extract_pdf_text(destination)
        resume = Resume(
            user_id=user_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            content_type="application/pdf",
            size_bytes=destination.stat().st_size,
        )
        intelligence = ResumeIntelligence(resume=resume, status="processing")
        db.session.add(resume)
        db.session.add(intelligence)
        db.session.commit()
    except ValueError as error:
        db.session.rollback()
        try:
            destination.unlink(missing_ok=True)
        except OSError:
            logger.warning("Unable to remove rejected upload at %s", destination)
        raise APIError(str(error), 400) from error
    except Exception:
        db.session.rollback()
        try:
            destination.unlink(missing_ok=True)
        except OSError:
            logger.warning("Unable to remove failed upload at %s", destination)
        raise

    try:
        complete_intelligence(intelligence, analyze_resume(destination))
    except Exception as error:  # A valid upload remains available if Gemini is unavailable.
        fail_intelligence(intelligence, error)
    db.session.commit()
    return resume


def get_resume(resume_id: str) -> Resume:
    """Return resume metadata or raise a not-found error."""
    resume = db.session.get(Resume, resume_id)
    if resume is None:
        raise NotFoundError("Resume not found.")
    return resume


def serialize_resume(resume: Resume) -> dict:
    """Serialize a resume with its portable storage path."""
    data = resume.to_dict()
    data["file_path"] = f"{_upload_folder().name}/{resume.stored_filename}"
    data["intelligence"] = resume.intelligence.to_dict() if resume.intelligence else None
    return data


def resume_file(resume_id: str) -> tuple[Resume, Path]:
    """Return a resume and its verified local file path for downloading."""
    resume = get_resume(resume_id)
    path = _upload_folder() / resume.stored_filename
    if not path.is_file():
        logger.error("Resume file missing for resume_id=%s", resume.id)
        raise NotFoundError("Resume file not found.")
    return resume, path


def delete_resume(resume_id: str) -> None:
    """Delete resume metadata and its associated local file."""
    resume = get_resume(resume_id)
    path = _upload_folder() / resume.stored_filename
    try:
        path.unlink(missing_ok=True)
    except OSError as error:
        logger.exception("Failed to remove resume file for resume_id=%s", resume_id)
        raise APIError("Resume is currently in use and cannot be deleted.", 409) from error
    db.session.delete(resume)
    db.session.commit()
