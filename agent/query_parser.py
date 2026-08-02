import json

from llm import ask_gemini
from models.job_search_query import JobSearchQuery


def parse_job_query(user_query: str) -> JobSearchQuery:
    """
    Uses Gemini to convert a natural language job search
    into a structured JobSearchQuery object.
    """

    prompt = f"""
You are an AI job search assistant.

Extract the following information from the user's request.

Return ONLY valid JSON.

Format:

{{
    "query": "",
    "location": "",
    "experience": "",
    "salary": null,
    "remote": false
}}

User Request:

{user_query}
"""

    response = ask_gemini(prompt)

    data = json.loads(response)

    return JobSearchQuery(**data)