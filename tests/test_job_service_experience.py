import unittest
from unittest.mock import patch

from models.job import Job
from services.job_service import search_available_jobs


def provider_job(identifier: str, description: str) -> Job:
    return Job(
        id=identifier,
        title="Python Developer",
        company="Example",
        location="Chennai",
        description=description,
        apply_url="https://example.test/job",
        source="Adzuna",
    )


class JobServiceExperienceTests(unittest.TestCase):
    def setUp(self):
        self.jobs = [
            provider_job("entry", "Freshers welcome for this entry-level position."),
            provider_job("mid", "Requires 3-5 years of experience with Python."),
            provider_job("senior", "Minimum 5 years of experience in backend development."),
            provider_job("principal", "Requires 8+ years of experience building platforms."),
            provider_job("unknown", "Build reliable Python APIs for customers."),
        ]
        self.search = patch("services.job_service.search_jobs", return_value=self.jobs)
        self.cache = patch("services.job_service._cache_jobs")
        self.search.start()
        self.cache.start()

    def tearDown(self):
        self.cache.stop()
        self.search.stop()

    def search_ids(self, experience: str):
        results = search_available_jobs({
            "query": "Python Developer",
            "location": "Chennai",
            "experience": experience,
        })
        return {job["id"] for job in results}

    def test_any_experience_preserves_provider_results(self):
        self.assertEqual(self.search_ids("Any experience"), {job.id for job in self.jobs})

    def test_selected_ranges_filter_provider_results(self):
        self.assertEqual(self.search_ids("0-2 years"), {"entry"})
        self.assertEqual(self.search_ids("3-5 years"), {"mid", "senior"})
        self.assertEqual(self.search_ids("5-8 years"), {"mid", "senior", "principal"})
        self.assertEqual(self.search_ids("8+ years"), {"senior", "principal"})


if __name__ == "__main__":
    unittest.main()
