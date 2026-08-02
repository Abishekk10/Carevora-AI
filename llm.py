from google import genai
from config import GEMINI_API_KEY


def ask_gemini(prompt: str) -> str:
    """Send a prompt to Gemini using the configured API key."""
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API is not configured.")

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt
    )
    if not response.text:
        raise ValueError("Gemini returned an empty response.")
    return response.text
