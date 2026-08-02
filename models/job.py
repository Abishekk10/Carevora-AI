from pydantic import BaseModel, Field
from typing import List, Optional


class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str

    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    experience: Optional[str] = None

    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None

    skills: List[str] = Field(default_factory=list)

    description: str

    apply_url: str

    posted_date: Optional[str] = None

    category: Optional[str] = None

    source: str