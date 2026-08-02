"""Job search business logic using the existing provider integration."""

import logging

from tools.job_search import search_jobs
from services.errors import APIError
from services.validation import JobSearchRequest, validate_payload

logger = logging.getLogger(__name__)


def search_available_jobs(payload: object) -> list[dict]:
    """Validate search options and serialize provider results for the API."""
    data = validate_payload(JobSearchRequest, payload)
    try:
        jobs = search_jobs(
            query=data.query,
            location=data.location,
            page=data.page,
            results_per_page=data.results_per_page,
        )
    except Exception as error:
        logger.exception("Job provider request failed")
        raise APIError("Job search is temporarily unavailable.", 502) from error
    return [job.model_dump() for job in jobs]
