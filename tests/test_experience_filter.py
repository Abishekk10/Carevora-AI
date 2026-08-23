import unittest

from services.experience_filter import (
    ExperienceRange,
    extract_experience_ranges,
    job_matches_experience,
    parse_requested_experience,
)


class ExperienceFilterTests(unittest.TestCase):
    def test_parses_common_provider_phrases(self):
        cases = {
            "Freshers and graduates are welcome.": ExperienceRange(0, 1),
            "0 years of experience is acceptable.": ExperienceRange(0, 0),
            "Entry-level role; 0-2 years of experience.": ExperienceRange(0, 2),
            "Candidates need 1-2 years of Python work.": ExperienceRange(1, 2),
            "Requires 1 to 3 years of experience.": ExperienceRange(1, 3),
            "Needs 2+ years of backend work.": ExperienceRange(2),
            "Minimum 3 years of experience required.": ExperienceRange(3),
            "Candidates need 5-8 yrs experience.": ExperienceRange(5, 8),
            "8+ years of experience in Python.": ExperienceRange(8),
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertIn(expected, extract_experience_ranges(text))

    def test_unknown_experience_does_not_match_selected_range(self):
        selected = parse_requested_experience("0-2 years")
        self.assertFalse(job_matches_experience({"title": "Python Developer", "description": "Build APIs."}, selected))

    def test_overlap_handles_future_ranges_and_minimums(self):
        self.assertTrue(job_matches_experience(
            {"description": "Minimum 3 years of experience."},
            parse_requested_experience("3-5 years"),
        ))
        self.assertTrue(job_matches_experience(
            {"description": "Requires 8+ years of experience."},
            parse_requested_experience("8+ years"),
        ))
        self.assertFalse(job_matches_experience(
            {"description": "0-1 years of experience."},
            parse_requested_experience("5-8 years"),
        ))

    def test_any_experience_preserves_no_filter(self):
        self.assertIsNone(parse_requested_experience("Any experience"))


if __name__ == "__main__":
    unittest.main()
