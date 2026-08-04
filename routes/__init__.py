"""Flask API blueprints."""
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.dashboard import dashboard_bp
from routes.jobs import jobs_bp
from routes.resumes import resumes_bp
from routes.users import users_bp
from routes.interview import interview_bp
from routes.application import application_bp

__all__ = [
    "auth_bp",
    "chat_bp",
    "dashboard_bp",
    "jobs_bp",
    "resumes_bp",
    "users_bp",
    "interview_bp",
    "application_bp",
]
