"""Pydantic request schemas and JSON validation helpers."""

import re
from typing import TypeVar

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from services.errors import APIError

Schema = TypeVar("Schema", bound=BaseModel)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RequestSchema(BaseModel):
    """Base schema that rejects undeclared client fields."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CreateUserRequest(RequestSchema):
    email: str = Field(max_length=255)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.lower()
        if not EMAIL_PATTERN.fullmatch(value):
            raise ValueError("must be a valid email address")
        return value


class UpdateUserRequest(RequestSchema):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)


class JobSearchRequest(RequestSchema):
    query: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)
    page: int = Field(default=1, ge=1, le=100)
    results_per_page: int = Field(default=20, ge=1, le=50)


class ChatRequest(RequestSchema):
    message: str = Field(min_length=1, max_length=10_000)


class ResumeMatchRequest(RequestSchema):
    resume_id: str = Field(min_length=1, max_length=36)
    job_id: str = Field(min_length=1, max_length=255)


def validate_payload(schema: type[Schema], payload: object) -> Schema:
    """Validate a JSON-compatible payload and expose consistent API errors."""
    try:
        return schema.model_validate(payload)
    except ValidationError as error:
        raise APIError("Request validation failed.", 422, error.errors()) from error
