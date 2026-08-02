from llm import ask_gemini


def extract_resume_details(resume_text: str):
    """
    Extract structured information from a resume using Gemini.
    """

    prompt = f"""
You are an expert resume parser.

Extract the following information from the resume.

Return ONLY valid JSON.

Required format:

{{
    "skills": [],
    "education": [],
    "experience": [],
    "projects": [],
    "certifications": []
}}

Resume:

{resume_text}
"""

    response = ask_gemini(prompt)

    return response