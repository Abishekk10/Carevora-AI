"""Resume-upload HTTP handlers and validation helpers."""

from pathlib import Path
from uuid import uuid4

from flask import Flask, current_app, jsonify, request
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

PDF_HEADER = b"%PDF-"
ALLOWED_EXTENSION = ".pdf"


def _is_pdf(upload: FileStorage) -> bool:
    """Check both the filename extension and the PDF file signature."""
    filename = secure_filename(upload.filename or "")
    if Path(filename).suffix.lower() != ALLOWED_EXTENSION:
        return False

    # A PDF header is permitted within the first 1,024 bytes of a file.
    header = upload.stream.read(1024)
    upload.stream.seek(0)
    return PDF_HEADER in header


def _destination_for(upload: FileStorage, upload_folder: Path) -> Path:
    """Create a collision-resistant, filesystem-safe destination filename."""
    safe_name = secure_filename(upload.filename or "resume.pdf")
    suffix = Path(safe_name).suffix.lower()
    return upload_folder / f"{uuid4().hex}{suffix}"


def register_resume_upload_routes(app: Flask) -> None:
    """Register resume upload endpoints on ``app``."""

    @app.post("/upload_resume")
    def upload_resume():
        upload = request.files.get("file")
        if upload is None:
            return jsonify(error="Missing file field. Use multipart field 'file'."), 400
        if not upload.filename:
            return jsonify(error="No file was selected."), 400
        if not _is_pdf(upload):
            return jsonify(error="Only valid PDF files are allowed."), 400

        upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
        upload_folder.mkdir(parents=True, exist_ok=True)
        destination = _destination_for(upload, upload_folder)
        upload.save(destination)

        # Return a portable, application-relative path rather than a host path.
        relative_path = destination.relative_to(Path(current_app.root_path)).as_posix()
        return jsonify(file_path=relative_path), 201
