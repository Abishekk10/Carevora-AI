import unittest
from types import SimpleNamespace
from unittest.mock import patch

from services.career_gap_service import analyze_career_gap
from services.errors import APIError


class CareerGapFetchTests(unittest.TestCase):
    def setUp(self):
        intelligence = SimpleNamespace(skills=[], experience=[], projects=[], certifications=[])
        self.resume = SimpleNamespace(intelligence=intelligence)
        self.job = SimpleNamespace(
            title="Prompt Engineer",
            description="Build Python prompt evaluation systems.",
            skills=[],
            category="Engineering",
        )

    @patch("services.career_gap_service._get_complete_resume")
    @patch("services.career_gap_service.search_available_jobs")
    @patch("services.career_gap_service._find_relevant_jobs")
    def test_fetches_exact_role_when_cached_results_are_insufficient(self, find_jobs, search_jobs, get_resume):
        get_resume.return_value = self.resume
        find_jobs.side_effect = [[], [self.job]]

        result = analyze_career_gap("user-1", {"target_role": "Prompt Engineer"})

        search_jobs.assert_called_once_with({
            "query": "Prompt Engineer", "location": "", "results_per_page": 50,
        })
        self.assertEqual(find_jobs.call_count, 2)
        self.assertEqual(result["jobs_analyzed"], 1)
        self.assertTrue(all(item["demand_percent"] is None for item in result["gaps"]))

    @patch("services.career_gap_service._get_complete_resume")
    @patch("services.career_gap_service.search_available_jobs")
    @patch("services.career_gap_service._find_relevant_jobs")
    def test_does_not_fetch_when_cached_results_are_sufficient(self, find_jobs, search_jobs, get_resume):
        get_resume.return_value = self.resume
        find_jobs.return_value = [self.job] * 5

        result = analyze_career_gap("user-1", {"target_role": "AI Engineer"})

        search_jobs.assert_not_called()
        self.assertEqual(result["jobs_analyzed"], 5)
        self.assertTrue(all(item["demand_percent"] is not None for item in result["gaps"]))

    @patch("services.career_gap_service._get_complete_resume")
    @patch("services.career_gap_service.search_available_jobs")
    @patch("services.career_gap_service._find_relevant_jobs")
    def test_returns_zero_when_provider_finds_no_results(self, find_jobs, search_jobs, get_resume):
        get_resume.return_value = self.resume
        find_jobs.return_value = []

        result = analyze_career_gap("user-1", {"target_role": "Cybersecurity Analyst"})

        search_jobs.assert_called_once()
        self.assertEqual(result["jobs_analyzed"], 0)
        self.assertFalse(result["provider_unavailable"])

    @patch("services.career_gap_service._get_complete_resume")
    @patch("services.career_gap_service.search_available_jobs")
    @patch("services.career_gap_service._find_relevant_jobs")
    def test_returns_provider_unavailable_state_when_fetch_fails(self, find_jobs, search_jobs, get_resume):
        get_resume.return_value = self.resume
        find_jobs.return_value = []
        search_jobs.side_effect = APIError("Job search is temporarily unavailable.", 502)

        result = analyze_career_gap("user-1", {"target_role": "Cybersecurity Analyst"})

        self.assertEqual(result["jobs_analyzed"], 0)
        self.assertTrue(result["provider_unavailable"])
        self.assertIn("provider is currently unavailable", result["notice"])


if __name__ == "__main__":
    unittest.main()
