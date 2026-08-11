"""AI chat API routes."""

import json

from flask import Blueprint, Response, jsonify, request, stream_with_context

from services.auth_service import get_current_user
from services.chat_service import send_chat_message, send_rag_chat_message, stream_rag_chat_message
from services.errors import APIError

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


@chat_bp.post("")
def chat_route():
    """Send a prompt to Gemini."""
    return jsonify(response=send_chat_message(request.get_json(silent=True)))


@chat_bp.post("/rag")
def rag_chat_route():
    """Answer a chat question using retrieved JobPilot knowledge."""
    payload = request.get_json(silent=True) or {}
    _, unauthorized = _authorize_user(payload)
    if unauthorized:
        return unauthorized

    return jsonify(send_rag_chat_message(payload))


def _authorize_user(payload: dict) -> tuple[str | None, tuple | None]:
    """Enforce authentication for knowledge-scoped chat routes."""
    current_user = get_current_user()
    if not current_user:
        return None, (jsonify(error="Authentication required."), 401)
    if payload.get("user_id") != current_user.id:
        return None, (jsonify(error="Forbidden."), 403)
    return current_user.id, None


@chat_bp.post("/stream")
def stream_chat_route():
    """Stream a RAG-grounded answer to a chat question over Server-Sent Events."""
    payload = request.get_json(silent=True) or {}
    _, unauthorized = _authorize_user(payload)
    if unauthorized:
        return unauthorized

    def generate():
        try:
            for delta in stream_rag_chat_message(payload):
                yield f"data: {json.dumps({'text': delta})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except APIError as error:
            yield f"data: {json.dumps({'error': error.message})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'The AI service is temporarily unavailable.'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
