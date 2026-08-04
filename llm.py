from google import genai
from config import Settings


def ask_gemini(prompt: str, *, model: str | None = None) -> str:
    """Send a prompt to Gemini using the configured API key."""
    if not Settings.GEMINI_API_KEY:
        raise ValueError("Gemini API is not configured.")

    client = genai.Client(api_key=Settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=model or Settings.GEMINI_MODEL,
        contents=prompt
    )
    if not response.text:
        raise ValueError("Gemini returned an empty response.")
    return response.text
