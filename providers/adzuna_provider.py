import logging

import requests

from config import ADZUNA_APP_ID, ADZUNA_APP_KEY
from models.job import Job

logger = logging.getLogger(__name__)


def search_jobs(
    query: str,
    location: str,
    page: int = 1,
    results_per_page: int = 20
) -> list[Job]:

    base_url = f"https://api.adzuna.com/v1/api/jobs/in/search/{page}"

    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": query,
        "where": location,
        "results_per_page": results_per_page
    }

    response = requests.get(
        base_url,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()
    logger.info("Adzuna returned %d jobs", len(data.get("results", [])))

    jobs = []

    for item in data.get("results", []):

        job = Job(
            id=str(item.get("id", "")),
            title=item.get("title", ""),
            company=item.get("company", {}).get("display_name", "Unknown"),
            location=item.get("location", {}).get("display_name", "Unknown"),

            employment_type=item.get("contract_time"),
            work_mode=None,
            experience=None,

            salary_min=item.get("salary_min"),
            salary_max=item.get("salary_max"),
            currency="INR",

            skills=[],

            description=item.get("description", ""),

            apply_url=item.get("redirect_url", ""),

            posted_date=item.get("created"),

            category=item.get("category", {}).get("label"),

            source="Adzuna"
        )

        jobs.append(job)

    return jobs
