"""Gemini chat business logic."""

import re
from collections.abc import Iterator

from google.genai import errors as genai_errors

from llm import ask_gemini, stream_gemini
from database import db
from models.dashboard import DashboardActivity, DashboardChatHistory
from services.auth_service import get_current_user
from services.errors import APIError
from services.rag_service import ensure_user_indexed, retrieve_context
from services.user_service import get_user
from services.validation import ChatRequest, RAGChatRequest, validate_payload

_CAREER_ANCHORS = (
    r"\bresume\b",
    r"\bcv\b",
    r"curriculum vitae",
    r"\bats\b",
    r"\bjob\b",
    r"\bjobs\b",
    r"\brole\b",
    r"\bopening\b",
    r"\bposition\b",
    r"\bapply\b",
    r"\bapplication\b",
    r"\binterview\b",
    r"\bcareer\b",
    r"\bsalary\b",
    r"\boffer\b",
    r"\bhiring\b",
    r"my match",
    r"match score",
    r"jobpilot",
    r"carevora",
    r"skill gap",
    r"learning path",
    r"cover letter",
)
_GENERAL_PATTERNS = (
    r"\bwho('s| is) .{0,60}\b(ceo|chief executive|president|founder|chairman)\b",
    r"\bwhat('s| is) the (capital|population|currency) of\b",
    r"\bwhen (was|were|did) .{0,40} (born|founded|invented|discovered)\b",
    r"\bhow old is\b",
    r"\bwhere is .{0,30} located\b",
    r"\bdefine \b",
    r"\bmeaning of \b",
)
_RESUME_PATTERNS = (
    r"\bmy resume\b",
    r"\bimprove (my )?resume\b",
    r"\boptimize (my )?resume\b",
    r"\brewrite (my )?resume\b",
    r"\bresume tips\b",
    r"\bresume advice\b",
    r"\bresume format\b",
    r"\bresume section\b",
    r"\bbullet point",
    r"\bskills section\b",
    r"\bwork experience section\b",
    r"\b(i|my|me)\b.+\bresume\b",
    r"\bresume\b.+\b(i|my|me)\b",
)
_JOB_PATTERNS = (
    r"\bjob description\b",
    r"\bjob listing\b",
    r"\bjob opening\b",
    r"\bthis role\b",
    r"\bthat role\b",
    r"\bapply (to|for)\b",
    r"\bapplication status\b",
    r"\bshould i apply\b",
    r"\bmatch (score|analysis)\b",
    r"\bjob search\b",
    r"\bsalary\b",
    r"\brequirements for\b",
    r"\bcompany .{0,30} (require|looking for|hiring)\b",
    r"\b(jobs|openings|vacancies|positions)\b",
)

def _persist_chat_history(question: str, answer: str, sources: list[dict] | None = None, kind: str = "chat") -> None:
    """Persist a chat interaction for the live dashboard history widget."""
    current_user = get_current_user()
    user_id = current_user.id if current_user else None
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


def _provider_error_to_api_error(error: Exception) -> APIError:
    """Map a Gemini provider error to a user-friendly API error."""
    if isinstance(error, genai_errors.ClientError) and getattr(error, "code", None) == 429:
        return APIError("Gemini API quota exceeded. Please try again later.", 429)
    return APIError("The AI service is temporarily unavailable.", 502)


def send_chat_message(payload: object) -> str:
    """Validate and send a user message to the configured Gemini model."""
    data = validate_payload(ChatRequest, payload)
    try:
        answer = ask_gemini(data.message)
        _persist_chat_history(data.message, answer)
        return answer
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except genai_errors.ClientError as error:
        raise _provider_error_to_api_error(error) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error


def send_rag_chat_message(payload: object) -> dict:
    """Answer a question with relevant, user-scoped JobPilot knowledge."""
    data = validate_payload(RAGChatRequest, payload)
    route = _classify_chat_route(data.question)
    if route == "GENERAL":
        prompt = _build_direct_prompt(data.question)
        sources: list[dict] = []
        history_kind = "chat"
    else:
        prompt, sources = _prepare_rag_prompt(data, route)
        history_kind = "rag"
    try:
        answer = ask_gemini(prompt)
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except genai_errors.ClientError as error:
        raise _provider_error_to_api_error(error) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error
    _persist_chat_history(data.question, answer, sources=sources, kind=history_kind)
    return {"answer": answer, "sources": sources}


def _has_pattern(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pattern, text) for pattern in patterns)


def _classify_chat_route(question: str) -> str:
    """Deterministically route chat questions to direct LLM or scoped RAG retrieval."""
    normalized = " ".join(question.lower().split())
    if _has_pattern(normalized, _GENERAL_PATTERNS) and not _has_pattern(normalized, _CAREER_ANCHORS):
        return "GENERAL"
    if (
        re.match(r"^what (is|are) ", normalized)
        and not _has_pattern(normalized, _CAREER_ANCHORS)
        and not _has_pattern(normalized, _RESUME_PATTERNS)
        and not _has_pattern(normalized, _JOB_PATTERNS)
    ):
        return "GENERAL"
    if _has_pattern(normalized, _RESUME_PATTERNS):
        return "RESUME"
    if _has_pattern(normalized, _JOB_PATTERNS):
        return "JOB"
    return "CAREER"


def _build_direct_prompt(question: str) -> str:
    return (
        "You are Carevora AI, a helpful career copilot.\n"
        "Answer the user's question directly using your general knowledge.\n"
        "Do not mention JobPilot databases or retrieved context unless the user asked about their stored data.\n\n"
        f"QUESTION:\n{question}"
    )


def _prepare_rag_prompt(data: RAGChatRequest, route: str) -> tuple[str, list[dict]]:
    """Validate access, retrieve knowledge, and build the RAG prompt with sources."""
    get_user(data.user_id)
    mode = "jobs_and_user" if route == "JOB" else "user_only"
    try:
        ensure_user_indexed(data.user_id)
        context = retrieve_context(data.question, data.user_id, mode=mode)
    except RuntimeError as error:
        raise APIError(str(error), 503) from error
    except Exception as error:
        raise APIError("Knowledge retrieval is temporarily unavailable.", 503) from error

    context_text = "\n\n".join(
        f"[{item.source_name} | {item.source_type}]\n{item.content}"
        for item in context
    ) or "No relevant stored user data was retrieved. Answer helpfully from general career knowledge."
    prompt = (
        "You are Carevora AI. Use the supplied knowledge when it directly helps answer the question.\n"
        "If the knowledge is incomplete or unrelated, answer using general career expertise.\n"
        "Do not refuse a question merely because the answer is not in the knowledge block.\n"
        "Do not say \"based on the provided JobPilot knowledge\" unless citing specific stored data.\n"
        "Give a helpful, concise answer.\n\n"
    )
    if route == "RESUME":
        prompt += (
            "Use the user's resume knowledge below when available.\n"
            "Also provide practical general resume-improvement advice.\n"
            "Do not answer primarily from unrelated job listings.\n"
            "If resume data is missing, give general resume guidance without claiming you analyzed their file.\n\n"
        )
    prompt += f"KNOWLEDGE:\n{context_text}\n\nQUESTION:\n{data.question}"
    sources = [item.to_source() for item in context]
    return prompt, sources


def stream_rag_chat_message(payload: object) -> Iterator[str]:
    """Yield RAG-grounded answer deltas, persisting the finished interaction."""
    data = validate_payload(RAGChatRequest, payload)
    route = _classify_chat_route(data.question)
    if route == "GENERAL":
        prompt = _build_direct_prompt(data.question)
        sources: list[dict] = []
        history_kind = "chat"
    else:
        prompt, sources = _prepare_rag_prompt(data, route)
        history_kind = "rag"
    answer_parts: list[str] = []
    try:
        for delta in stream_gemini(prompt):
            answer_parts.append(delta)
            yield delta
    except ValueError as error:
        raise APIError(str(error), 503) from error
    except genai_errors.ClientError as error:
        raise _provider_error_to_api_error(error) from error
    except Exception as error:
        raise APIError("The AI service is temporarily unavailable.", 502) from error
    answer = "".join(answer_parts)
    if answer:
        _persist_chat_history(data.question, answer, sources=sources, kind=history_kind)
