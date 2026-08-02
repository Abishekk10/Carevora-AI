"""AI chat API routes."""

from flask import Blueprint, jsonify, request

from services.chat_service import send_chat_message

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


@chat_bp.post("")
def chat_route():
    """Send a prompt to Gemini."""
    return jsonify(response=send_chat_message(request.get_json(silent=True)))
