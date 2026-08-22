"""Deterministic career-gap analysis from cached jobs and resume intelligence."""

from __future__ import annotations

import json
import re
from collections import Counter

from database import db
from models.job_listing import JobListing
from models.resume import Resume
from models.resume_intelligence import ResumeIntelligence
from services.errors import APIError
from services.validation import CareerGapRequest, validate_payload

MIN_JOBS_FOR_PERCENTAGES = 5
MAX_JOBS_ANALYZED = 100

# Canonical skill -> search aliases. Matching uses word boundaries; Java does not match JavaScript.
SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "Python": ("python", "python3"),
    "Java": ("java",),
    "JavaScript": ("javascript", "js"),
    "TypeScript": ("typescript", "ts"),
    "C++": ("c++", "cpp", "c plus plus"),
    "C#": ("c#", "csharp", "c sharp"),
    ".NET": (".net", "dotnet", "asp.net"),
    "SQL": ("sql",),
    "MySQL": ("mysql",),
    "PostgreSQL": ("postgresql", "postgres"),
    "MongoDB": ("mongodb", "mongo"),
    "React": ("react", "react.js", "reactjs"),
    "Angular": ("angular",),
    "Vue": ("vue", "vue.js", "vuejs"),
    "Node.js": ("node.js", "nodejs", "node js"),
    "Express": ("express", "express.js", "expressjs"),
    "Django": ("django",),
    "Flask": ("flask",),
    "Spring Boot": ("spring boot", "springboot", "spring"),
    "REST APIs": ("rest api", "rest apis", "restful", "rest api's"),
    "Git": ("git", "github", "gitlab"),
    "Docker": ("docker",),
    "Kubernetes": ("kubernetes", "k8s"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure", "microsoft azure"),
    "GCP": ("gcp", "google cloud"),
    "Linux": ("linux",),
    "DSA": ("dsa", "data structures", "data structure", "algorithms", "leetcode"),
    "Machine Learning": ("machine learning", "ml"),
    "Deep Learning": ("deep learning",),
    "TensorFlow": ("tensorflow",),
    "PyTorch": ("pytorch",),
    "Pandas": ("pandas",),
    "NumPy": ("numpy",),
    "Tableau": ("tableau",),
    "Power BI": ("power bi", "powerbi"),
    "Excel": ("excel", "microsoft excel"),
    "Spark": ("spark", "pyspark", "apache spark"),
    "Hadoop": ("hadoop",),
    "HTML": ("html", "html5"),
    "CSS": ("css", "css3"),
    "Redux": ("redux",),
    "GraphQL": ("graphql",),
    "Redis": ("redis",),
    "Kafka": ("kafka",),
    "Terraform": ("terraform",),
    "CI/CD": ("ci/cd", "cicd", "continuous integration"),
    "DevOps": ("devops",),
    "Cybersecurity": ("cybersecurity", "cyber security", "information security"),
    "SDET": ("sdet",),
    "QA": ("qa", "quality assurance", "test automation"),
    "Swift": ("swift",),
    "Kotlin": ("kotlin",),
    "Flutter": ("flutter",),
    "React Native": ("react native",),
    "Go": ("golang", "go lang"),
    "Rust": ("rust",),
    "Scala": ("scala",),
    "R": (" r ",),
    "NLP": ("nlp", "natural language processing"),
    "Computer Vision": ("computer vision",),
    "Airflow": ("airflow",),
    "dbt": ("dbt",),
    "Snowflake": ("snowflake",),
    "BigQuery": ("bigquery", "big query"),
}

_ROLE_STOPWORDS = frozenset({"a", "an", "the", "of", "and", "for", "in"})
_ROLE_FAMILY = frozenset({
    "engineer", "developer", "programmer", "analyst", "scientist", "designer",
    "manager", "architect", "consultant", "specialist", "tester", "administrator",
})
_ROLE_FAMILY_GROUPS = (
    frozenset({"engineer", "developer", "programmer"}),
    frozenset({"tester", "qa", "sdet"}),
)
_ROLE_MODIFIERS = frozenset({
    "senior", "junior", "lead", "principal", "staff", "intern", "associate",
    "head", "chief", "sr", "jr", "ii", "iii", "iv", "applied", "assistant",
    "graduate", "entry", "mid", "level",
})
# Small concept aliases only — not a job-title whitelist.
_ROLE_PHRASES: tuple[tuple[tuple[str, ...], str], ...] = (
    (("artificial", "intelligence"), "ai"),
    (("machine", "learning"), "ml"),
    (("generative", "ai"), "ai"),
    (("node", "js"), "node"),
    (("cyber", "security"), "cybersecurity"),
    (("quality", "assurance"), "qa"),
)
_ROLE_TOKEN_CONCEPT = {
    "ai": "ai",
    "genai": "ai",
    "ml": "ml",
    "mlops": "ml",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "node": "node",
    "nodejs": "node",
    "ui": "uiux",
    "ux": "uiux",
    "cybersecurity": "cybersecurity",
    "cyber": "cybersecurity",
    "qa": "qa",
}
_RELATED_CONCEPTS = {
    "ai": frozenset({"ai", "ml"}),
    "ml": frozenset({"ai", "ml"}),
}

CURRICULUM: dict[str, list[str]] = {
    "DSA": ["Arrays", "Strings", "Hashing", "Trees"],
    "Python": ["Syntax & data types", "OOP", "Standard library", "Packaging"],
    "Java": ["Core Java", "Collections", "Concurrency", "Spring basics"],
    "JavaScript": ["Language fundamentals", "DOM & events", "Async / Promises", "ES modules"],
    "TypeScript": ["Types & interfaces", "Generics", "Tooling", "React + TS"],
    "SQL": ["SELECT & joins", "Aggregation", "Indexes", "Query planning"],
    "REST APIs": ["HTTP & resources", "Authentication", "Error handling", "Versioning"],
    "Docker": ["Images & containers", "Docker Compose", "Networking", "Registries"],
    "Kubernetes": ["Pods & deployments", "Services", "ConfigMaps/Secrets", "Helm basics"],
    "AWS": ["AWS fundamentals", "EC2", "S3", "IAM"],
    "Azure": ["Azure fundamentals", "App Service", "Blob Storage", "Azure AD"],
    "GCP": ["GCP fundamentals", "Compute Engine", "Cloud Storage", "IAM"],
    "React": ["Components & props", "Hooks", "Routing", "State management"],
    "Node.js": ["Runtime basics", "npm", "Express", "Async I/O"],
    "Django": ["Models & ORM", "Views", "Auth", "REST with DRF"],
    "Flask": ["Routing", "Blueprints", "Auth", "Extensions"],
    "Spring Boot": ["REST controllers", "Spring Data", "Security", "Actuator"],
    "Machine Learning": ["Supervised learning", "Model evaluation", "Feature engineering", "Pipelines"],
    "Deep Learning": ["Neural nets", "CNNs", "Transfer learning", "Training loops"],
    "Git": ["Commits", "Branching", "Pull requests", "Rebasing"],
    "CI/CD": ["Pipelines", "Automated tests", "Build artifacts", "Deploy stages"],
    "DevOps": ["Linux basics", "Containers", "CI/CD", "Observability"],
    "Pandas": ["DataFrames", "Cleaning", "Groupby", "Joins"],
    "Spark": ["RDDs vs DataFrames", "Transformations", "Joins", "Tuning"],
    "Tableau": ["Connect data", "Charts", "Dashboards", "Calculated fields"],
    "Power BI": ["Power Query", "Model", "DAX basics", "Reports"],
    "Terraform": ["HCL", "Providers", "State", "Modules"],
    "Kafka": ["Topics & partitions", "Producers", "Consumers", "Offsets"],
    "Cybersecurity": ["Threat basics", "AuthN/AuthZ", "Secure coding", "Logging"],
}

_NOTICE_CACHED = (
    "Percentages are based on Carevora's cached job descriptions for this role, "
    "not live market-wide statistics."
)
_NOTICE_ZERO = (
    "No cached jobs matched this role. Search for this role in Job Search first "
    "so Carevora can analyze listings."
)


def _compile_alias_patterns() -> dict[str, tuple[re.Pattern[str], ...]]:
    compiled: dict[str, tuple[re.Pattern[str], ...]] = {}
    for skill, aliases in SKILL_ALIASES.items():
        patterns = []
        for alias in aliases:
            escaped = re.escape(alias)
            if alias.startswith(".") or alias.endswith("."):
                patterns.append(re.compile(escaped, re.IGNORECASE))
            elif skill == "Java":
                patterns.append(re.compile(r"(?<![a-z])java(?!script)", re.IGNORECASE))
            elif skill == "R":
                patterns.append(re.compile(r"(?<![a-z])r(?![a-z])", re.IGNORECASE))
            elif skill == "Go":
                patterns.append(re.compile(r"\bgolang\b|\bgo lang\b", re.IGNORECASE))
            else:
                patterns.append(re.compile(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", re.IGNORECASE))
        compiled[skill] = tuple(patterns)
    return compiled


_ALIAS_PATTERNS = _compile_alias_patterns()


def _skills_in_text(text: str) -> set[str]:
    if not text:
        return set()
    found: set[str] = set()
    for skill, patterns in _ALIAS_PATTERNS.items():
        if any(pattern.search(text) for pattern in patterns):
            found.add(skill)
    return found


def _flatten_value(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return " ".join(_flatten_value(item) for item in value)
    if isinstance(value, dict):
        return " ".join(_flatten_value(item) for item in value.values())
    try:
        return json.dumps(value, ensure_ascii=False)
    except TypeError:
        return str(value)


def _user_skill_sets(intelligence: ResumeIntelligence) -> tuple[set[str], set[str]]:
    skills_text = " ".join(str(item) for item in (intelligence.skills or []) if item)
    listed = _skills_in_text(skills_text)
    extra_text = " ".join(
        (
            _flatten_value(intelligence.experience),
            _flatten_value(intelligence.projects),
            _flatten_value(intelligence.certifications),
        )
    )
    mentioned = _skills_in_text(extra_text)
    return listed, mentioned


def _normalize_role_text(text: str) -> str:
    """Lowercase; treat slash/hyphen/underscore/ampersand as spaces; strip punctuation."""
    normalized = (text or "").lower()
    normalized = re.sub(r"[/_\\&-]", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s]+", " ", normalized)
    return " ".join(normalized.split())


def _role_tokens(text: str) -> list[str]:
    return [
        token
        for token in _normalize_role_text(text).split()
        if token and token not in _ROLE_STOPWORDS
    ]


def _expand_role_concepts(tokens: list[str]) -> list[str]:
    concepts: list[str] = []
    index = 0
    while index < len(tokens):
        matched = False
        for phrase, concept in _ROLE_PHRASES:
            length = len(phrase)
            if tokens[index:index + length] == list(phrase):
                concepts.append(concept)
                index += length
                matched = True
                break
        if matched:
            continue
        token = tokens[index]
        concepts.append(_ROLE_TOKEN_CONCEPT.get(token, token))
        index += 1
    return concepts


def _split_role_concepts(concepts: list[str]) -> tuple[set[str], set[str]]:
    family: set[str] = set()
    specialty: set[str] = set()
    for concept in concepts:
        if concept in _ROLE_MODIFIERS:
            continue
        if concept in _ROLE_FAMILY:
            family.add(concept)
        else:
            specialty.add(concept)
    return family, specialty


def _related_concepts(concept: str) -> frozenset[str]:
    return _RELATED_CONCEPTS.get(concept, frozenset({concept}))


def _families_compatible(query_family: set[str], job_family: set[str]) -> bool:
    if not query_family:
        return True
    if not job_family:
        return True
    for query in query_family:
        for job in job_family:
            if query == job:
                return True
            if any(query in group and job in group for group in _ROLE_FAMILY_GROUPS):
                return True
    return False


def _specialties_match(query_specialty: set[str], job_specialty: set[str]) -> bool:
    if not query_specialty:
        return False
    for concept in query_specialty:
        related = _related_concepts(concept)
        if not any(related & _related_concepts(job_concept) for job_concept in job_specialty):
            return False
    return True


def _has_consecutive_phrase(title_tokens: list[str], query_tokens: list[str]) -> bool:
    if not query_tokens or len(query_tokens) > len(title_tokens):
        return False
    length = len(query_tokens)
    for start in range(len(title_tokens) - length + 1):
        if title_tokens[start:start + length] == query_tokens:
            return True
    return False


def score_role_match(target_role: str, title: str) -> int:
    """Return 0–100 relevance. Generic family-only overlap is not enough to match."""
    query_tokens = _role_tokens(target_role)
    title_tokens = _role_tokens(title)
    if not query_tokens or not title_tokens:
        return 0
    if _has_consecutive_phrase(title_tokens, query_tokens):
        return 100
    query_family, query_specialty = _split_role_concepts(_expand_role_concepts(query_tokens))
    job_family, job_specialty = _split_role_concepts(_expand_role_concepts(title_tokens))
    if query_specialty and _specialties_match(query_specialty, job_specialty) and _families_compatible(query_family, job_family):
        return 80
    return 0


def _find_relevant_jobs(target_role: str) -> list[JobListing]:
    if not _role_tokens(target_role):
        return []
    cached = db.session.execute(
        db.select(JobListing).order_by(JobListing.updated_at.desc())
    ).scalars().all()
    scored: list[tuple[int, JobListing]] = []
    for job in cached:
        score = score_role_match(target_role, job.title or "")
        if score:
            scored.append((score, job))
    if len(scored) < MIN_JOBS_FOR_PERCENTAGES:
        seen = {job.id for _, job in scored}
        for job in cached:
            if job.id in seen:
                continue
            score = score_role_match(target_role, job.category or "")
            if score:
                scored.append((score, job))
    scored.sort(key=lambda item: (-item[0], -(item[1].updated_at.timestamp() if item[1].updated_at else 0)))
    return [job for _, job in scored[:MAX_JOBS_ANALYZED]]


def _job_text(job: JobListing) -> str:
    skills = " ".join(str(item) for item in (job.skills or []) if item)
    return " ".join(part for part in (job.title or "", job.description or "", skills, job.category or "") if part)


def _get_complete_resume(user_id: str) -> Resume:
    resume = db.session.execute(
        db.select(Resume)
        .join(ResumeIntelligence)
        .where(Resume.user_id == user_id)
        .where(ResumeIntelligence.status == "complete")
        .order_by(Resume.created_at.desc())
    ).scalar()
    if not resume or not resume.intelligence:
        raise APIError(
            "A parsed resume is required. Upload and analyze a resume on the Resume Intelligence page first.",
            400,
        )
    return resume


def _empty_result(target_role: str, jobs_analyzed: int, notice: str) -> dict:
    return {
        "target_role": target_role,
        "jobs_analyzed": jobs_analyzed,
        "strengths": [],
        "gaps": [],
        "learning_path": [],
        "notice": notice,
    }


def analyze_career_gap(user_id: str, payload: object) -> dict:
    """Compare resume intelligence to cached jobs for a target role."""
    data = validate_payload(CareerGapRequest, payload)
    target_role = data.target_role
    resume = _get_complete_resume(user_id)
    intelligence = resume.intelligence
    jobs = _find_relevant_jobs(target_role)
    jobs_analyzed = len(jobs)

    if jobs_analyzed == 0:
        return _empty_result(target_role, 0, f"{_NOTICE_ZERO} {_NOTICE_CACHED}")

    listed, mentioned = _user_skill_sets(intelligence)
    counts: Counter[str] = Counter()
    for job in jobs:
        for skill in _skills_in_text(_job_text(job)):
            counts[skill] += 1

    demand_reliable = jobs_analyzed >= MIN_JOBS_FOR_PERCENTAGES
    rows: list[dict] = []
    for skill, count in counts.items():
        demand_percent = round((count / jobs_analyzed) * 100) if demand_reliable else None
        if skill in listed:
            status = "Strong"
            bucket = "strengths"
        elif skill in mentioned:
            status = "Weak"
            bucket = "gaps"
        else:
            status = "Missing"
            bucket = "gaps"
        rows.append(
            {
                "skill": skill,
                "user": status,
                "demand_percent": demand_percent,
                "jobs_with_skill": count,
                "bucket": bucket,
            }
        )

    rows.sort(key=lambda item: (-(item["jobs_with_skill"]), item["skill"]))
    strengths = [
        {key: item[key] for key in ("skill", "user", "demand_percent", "jobs_with_skill")}
        for item in rows
        if item["bucket"] == "strengths"
    ]
    gaps = [
        {key: item[key] for key in ("skill", "user", "demand_percent", "jobs_with_skill")}
        for item in rows
        if item["bucket"] == "gaps"
    ]

    learning_path = []
    for item in gaps[:5]:
        entry = {"skill": item["skill"], "steps": CURRICULUM.get(item["skill"], [])}
        learning_path.append(entry)

    notice = _NOTICE_CACHED
    if not demand_reliable:
        job_word = "job" if jobs_analyzed == 1 else "jobs"
        notice = (
            f"This analysis is based on only {jobs_analyzed} cached {job_word}, "
            "so demand percentages are unavailable. Search this role in Job Search "
            f"to cache more listings. {_NOTICE_CACHED}"
        )
    return {
        "target_role": target_role,
        "jobs_analyzed": jobs_analyzed,
        "strengths": strengths,
        "gaps": gaps,
        "learning_path": learning_path,
        "notice": notice,
    }
