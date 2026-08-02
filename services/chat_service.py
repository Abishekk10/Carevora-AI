"""Gemini chat business logic."""

from llm import ask_gemini
from services.errors import APIError
from services.validation import ChatRequest, validate_payload


def send_chat_message(payload: object) -> str:
    """Validate and send a user message to the configured Gemini model."""
    data = validate_payload(ChatRequest, payload)
    try:
        return ask_gemini(data.message)
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error
