"""Single integration point for available job providers."""

from models.job import Job
from providers.adzuna_provider import search_jobs as search_adzuna_jobs


def search_all_jobs(
    query: str, location: str, page: int = 1, results_per_page: int = 20
) -> list[Job]:
    """Search all enabled providers, currently retaining the Adzuna integration."""
    return search_adzuna_jobs(query, location, page, results_per_page)
