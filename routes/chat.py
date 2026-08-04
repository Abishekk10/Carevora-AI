"""AI chat API routes."""

from flask import Blueprint, jsonify, request

from services.auth_service import get_current_user
from services.chat_service import send_chat_message, send_rag_chat_message

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


@chat_bp.post("")
def chat_route():
    """Send a prompt to Gemini."""
    return jsonify(response=send_chat_message(request.get_json(silent=True)))


@chat_bp.post("/rag")
def rag_chat_route():
    """Answer a chat question using retrieved JobPilot knowledge."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(error="Authentication required."), 401

    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    if user_id != current_user.id:
        return jsonify(error="Forbidden."), 403

    return jsonify(send_rag_chat_message(payload))
