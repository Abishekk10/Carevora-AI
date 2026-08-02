"""Application exceptions translated by global Flask handlers."""


class APIError(Exception):
    """An expected API error with an HTTP status code."""

    def __init__(self, message: str, status_code: int, details: object | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class NotFoundError(APIError):
    """Requested resource does not exist."""

    def __init__(self, message: str) -> None:
        super().__init__(message, 404)
