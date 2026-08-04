"""Gemini chat business logic."""

from flask import session

from llm import ask_gemini
from database import db
from models.dashboard import DashboardActivity, DashboardChatHistory
from services.errors import APIError
from services.rag_service import ensure_user_indexed, retrieve_context
from services.user_service import get_user
from services.validation import ChatRequest, RAGChatRequest, validate_payload


def _persist_chat_history(question: str, answer: str, sources: list[dict] | None = None, kind: str = "chat") -> None:
    """Persist a chat interaction for the live dashboard history widget."""
    user_id = session.get("user_id")
    if not user_id:
        return
    entry = DashboardChatHistory(
        user_id=user_id,
        kind=kind,
        question=question,
        answer=answer,
        sources=sources or [],
    )
    db.session.add(entry)
    db.session.add(DashboardActivity(
        user_id=user_id,
        event_type=f"chat_{kind}",
        title="AI chat activity",
        description=f"Stored a new {kind} conversation in the dashboard history.",
        payload={"kind": kind, "question": question[:200]},
    ))
    db.session.commit()


def send_chat_message(payload: object) -> str:
    """Validate and send a user message to the configured Gemini model."""
    data = validate_payload(ChatRequest, payload)
    try:
        answer = ask_gemini(data.message)
        _persist_chat_history(data.message, answer)
        return answer
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error


def send_rag_chat_message(payload: object) -> dict:
    """Answer a question with relevant, user-scoped JobPilot knowledge."""
    data = validate_payload(RAGChatRequest, payload)
    get_user(data.user_id)
    try:
        ensure_user_indexed(data.user_id)
        context = retrieve_context(data.question, data.user_id)
    except RuntimeError as error:
        raise APIError(str(error), 503) from error
    except Exception as error:
        raise APIError("Knowledge retrieval is temporarily unavailable.", 503) from error

    context_text = "\n\n".join(
        f"[{item.source_name} | {item.source_type}]\n{item.content}"
        for item in context
    ) or "No relevant JobPilot knowledge was found. Be transparent about that."
    prompt = (
        "You are JobPilot AI. Answer the user's question using the supplied JobPilot knowledge "
        "when it is relevant. Do not claim details that are absent from the context. Give a "
        "helpful, concise answer.\n\n"
        f"KNOWLEDGE:\n{context_text}\n\nQUESTION:\n{data.question}"
    )
    try:
        answer = ask_gemini(prompt)
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error
    sources = [item.to_source() for item in context]
    _persist_chat_history(data.question, answer, sources=sources, kind="rag")
    return {"answer": answer, "sources": sources}
