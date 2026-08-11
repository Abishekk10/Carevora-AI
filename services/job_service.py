"""Job search business logic using the existing provider integration."""

import logging
import threading

from flask import current_app

from tools.job_search import search_jobs
from database import db
from models.job_listing import JobListing
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
    serialized_jobs = [job.model_dump() for job in jobs]
    _cache_jobs(serialized_jobs)
    return serialized_jobs


def _cache_jobs(jobs: list[dict]) -> None:
    """Persist provider results so a later match request can resolve its job ID.

    RAG indexing is dispatched to a background thread: the embedding model is
    loaded lazily on its first use, which can take tens of seconds, and every
    search re-encodes the returned job descriptions. Running that work off the
    request path keeps search responses fast while the model is loaded once and
    reused across searches.
    """
    try:
        cached_jobs: list[JobListing] = []
        for job_data in jobs:
            job = db.session.get(JobListing, job_data["id"])
            if job is None:
                job = JobListing(id=job_data["id"])
                db.session.add(job)
            job.update_from_dict(job_data)
            cached_jobs.append(job)
        db.session.commit()
        _index_jobs_in_background(jobs)
    except Exception:
        db.session.rollback()
        logger.exception("Unable to cache job search results")


def _index_jobs_in_background(serialized_jobs: list[dict]) -> None:
    """Dispatch RAG indexing of newly cached jobs to a background thread."""
    try:
        app = current_app._get_current_object()
    except RuntimeError:
        logger.warning("No Flask app context; skipping RAG indexing for job search")
        return

    def work() -> None:
        try:
            with app.app_context():
                from services.rag_service import index_jobs
                listings: list[JobListing] = []
                for job_data in serialized_jobs:
                    listing = db.session.get(JobListing, job_data["id"])
                    if listing is not None:
                        listings.append(listing)
                if listings:
                    index_jobs(listings)
        except Exception:
            logger.warning("Unable to index cached jobs for RAG", exc_info=True)

    threading.Thread(target=work, name="job-rag-index", daemon=True).start()
