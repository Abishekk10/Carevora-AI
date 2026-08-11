from collections.abc import Iterator

from google import genai
from config import Settings

_client = None


def _get_client():
    """Return a process-local, lazily created Gemini client."""
    global _client
    if _client is None:
        _client = genai.Client(
            api_key=Settings.GEMINI_API_KEY,
            http_options={"timeout": Settings.GEMINI_TIMEOUT_SECONDS * 1000},
        )
    return _client


def ask_gemini(prompt: str, *, model: str | None = None) -> str:
    """Send a prompt to Gemini using the configured API key."""
    if not Settings.GEMINI_API_KEY:
        raise ValueError("Gemini API is not configured.")

    response = _get_client().models.generate_content(
        model=model or Settings.GEMINI_MODEL,
        contents=prompt
    )
    if not response.text:
        raise ValueError("Gemini returned an empty response.")
    return response.text


def stream_gemini(prompt: str, *, model: str | None = None) -> Iterator[str]:
    """Yield Gemini response text deltas as they arrive."""
    if not Settings.GEMINI_API_KEY:
        raise ValueError("Gemini API is not configured.")

    stream = _get_client().models.generate_content_stream(
        model=model or Settings.GEMINI_MODEL,
        contents=prompt
    )
    for chunk in stream:
        if chunk.text:
            yield chunk.text
