from dotenv import load_dotenv
from google import genai
import os

# Load environment variables
load_dotenv()

# Create Gemini client
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def ask_gemini(prompt):
    response = client.models.generate_content(
        model="gemini-3.5-flash",   # or the working model you're using
        contents=prompt
    )

    return response.text