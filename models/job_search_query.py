from pydantic import BaseModel
from typing import Optional


class JobSearchQuery(BaseModel):
    query: str
    location: Optional[str] = None
    experience: Optional[str] = None
    salary: Optional[int] = None
    remote: bool = False