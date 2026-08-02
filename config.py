"""Environment-backed application configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    """Configuration values required by the Flask application."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
    DATABASE_URL = os.getenv(
        "DATABASE_URL", f"sqlite:///{(PROJECT_ROOT / 'jobpilot.db').as_posix()}"
    )
    UPLOAD_FOLDER = Path(os.getenv("UPLOAD_FOLDER", PROJECT_ROOT / "uploads")).resolve()
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
    ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")


# Compatibility exports for the existing provider modules.
GEMINI_API_KEY = Settings.GEMINI_API_KEY
ADZUNA_APP_ID = Settings.ADZUNA_APP_ID
ADZUNA_APP_KEY = Settings.ADZUNA_APP_KEY
