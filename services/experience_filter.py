"""Deterministic experience-requirement parsing for provider job results."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re


_NUMBER = r"\d+(?:\.\d+)?"
_YEAR = r"(?:years?|yrs?)"


@dataclass(frozen=True)
class ExperienceRange:
    """An inclusive experience interval; ``maximum`` may be unbounded."""

    minimum: float
    maximum: float = math.inf

    def overlaps(self, other: "ExperienceRange") -> bool:
        return self.minimum <= other.maximum and other.minimum <= self.maximum


def parse_requested_experience(value: str | None) -> ExperienceRange | None:
    """Parse a UI/API experience selection, allowing future numeric ranges.

    ``None``, an empty value, and "Any experience" retain the existing,
    unfiltered search behavior.
    """
    normalized = _normalize(value)
    if not normalized or normalized in {"any", "any experience"}:
        return None

    match = re.fullmatch(
        rf"({_NUMBER})\s*(?:-|to)\s*({_NUMBER})\s*(?:{_YEAR})?",
        normalized,
    )
    if match:
        minimum, maximum = map(float, match.groups())
        if maximum < minimum:
            raise ValueError("experience range maximum must not be less than its minimum")
        return ExperienceRange(minimum, maximum)

    match = re.fullmatch(rf"({_NUMBER})\s*\+\s*(?:{_YEAR})?", normalized)
    if match:
        return ExperienceRange(float(match.group(1)))

    raise ValueError("experience must be 'Any experience', a range such as '2-5 years', or a minimum such as '8+ years'")


def extract_experience_ranges(text: str | None) -> list[ExperienceRange]:
    """Extract stated job-experience requirements from provider text.

    The patterns deliberately require experience context or a years/yrs unit, so
    unrelated numbers such as salary and company age are not treated as experience.
    An absent match remains unknown rather than being assumed to mean zero years.
    """
    normalized = _normalize(text)
    if not normalized:
        return []

    ranges: list[ExperienceRange] = []

    def add(minimum: str, maximum: str | None = None) -> None:
        candidate = ExperienceRange(float(minimum), float(maximum) if maximum else math.inf)
        if candidate not in ranges:
            ranges.append(candidate)

    # 0-2 years, 2 to 5 years of experience, and similar written ranges.
    for match in re.finditer(rf"\b({_NUMBER})\s*(?:-|to)\s*({_NUMBER})\s*{_YEAR}\b", normalized):
        add(match.group(1), match.group(2))

    # 2+ years, at least 3 years, minimum 3 years, and 5 or more years.
    for match in re.finditer(rf"\b({_NUMBER})\s*\+\s*{_YEAR}\b", normalized):
        add(match.group(1))
    for match in re.finditer(
        rf"\b(?:minimum|min\.?|at least|more than|over)\s+({_NUMBER})\s*{_YEAR}\b",
        normalized,
    ):
        add(match.group(1))
    for match in re.finditer(rf"\b({_NUMBER})\s*(?:or more|or above|and above)\s*{_YEAR}\b", normalized):
        add(match.group(1))

    # "3 years of experience" is an exact stated requirement when no range or
    # minimum language is supplied.
    for match in re.finditer(rf"\b({_NUMBER})\s*{_YEAR}\s*(?:of\s+)?experience\b", normalized):
        add(match.group(1), match.group(1))
    for match in re.finditer(rf"\bexperience\s+(?:of\s+)?({_NUMBER})\s*{_YEAR}\b", normalized):
        add(match.group(1), match.group(1))

    if re.search(r"\b(?:freshers?|entry[ -]?level|graduates?)\b", normalized):
        add("0", "1")

    return ranges


def job_matches_experience(job: dict, selected_range: ExperienceRange) -> bool:
    """Return whether a job has a stated experience requirement overlapping it."""
    searchable_text = " ".join(
        str(job.get(field) or "") for field in ("experience", "title", "description")
    )
    return any(candidate.overlaps(selected_range) for candidate in extract_experience_ranges(searchable_text))


def _normalize(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").lower().replace("–", "-").replace("—", "-")).strip()
