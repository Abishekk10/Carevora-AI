"""Single integration point for available job providers."""

import logging

from models.job import Job
from providers.adzuna_provider import search_jobs as search_adzuna_jobs

logger = logging.getLogger(__name__)


def search_all_jobs(
    query: str, location: str, page: int = 1, results_per_page: int = 20
) -> list[Job]:
    """Search all enabled providers, keeping provider failures isolated.

    A slow or failing provider (timeout, network error, HTTP error) is logged and
    skipped so the remaining providers can still return results. If every provider
    fails, a clear error is raised for the API layer to translate into a
    user-friendly response instead of crashing the request.
    """
    providers = [
        ("adzuna", search_adzuna_jobs),
    ]

    results: list[Job] = []
    failures: list[str] = []

    for name, search in providers:
        try:
            results.extend(search(query, location, page, results_per_page))
        except Exception as error:
            logger.warning("Job provider '%s' failed: %s", name, error)
            failures.append(name)

    if not results and failures:
        raise RuntimeError(
            f"Job providers unavailable: {', '.join(failures)}"
        )

    return results
