"""Custom exceptions for PRIA v7 services."""


class GeminiAPIError(Exception):
    """Raised when Gemini API call fails."""
    def __init__(self, message: str, status_code: int = None, original_error: Exception = None):
        self.message = message
        self.status_code = status_code
        self.original_error = original_error
        super().__init__(self.message)


class RateLimitError(GeminiAPIError):
    """Raised when Gemini API rate limit exceeded."""
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = None):
        self.retry_after = retry_after
        super().__init__(message, status_code=429)


class ContentValidationError(Exception):
    """Raised when content validation fails."""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class AdaptationError(Exception):
    """Raised when adaptation process fails."""
    pass
