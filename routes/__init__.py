"""Flask API blueprints."""

from routes.chat import chat_bp
from routes.jobs import jobs_bp
from routes.resumes import resumes_bp
from routes.users import users_bp

__all__ = ["chat_bp", "jobs_bp", "resumes_bp", "users_bp"]
