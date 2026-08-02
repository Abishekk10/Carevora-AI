from agent.query_parser import parse_job_query
from tools.job_search import search_jobs
from llm import ask_gemini


def handle_request(user_input):

    message = user_input.lower()

    if "job" in message or "jobs" in message or "hiring" in message:

        parsed = parse_job_query(user_input)

        return search_jobs(
            query=parsed.query,
            location=parsed.location or ""
        )

    return ask_gemini(user_input)