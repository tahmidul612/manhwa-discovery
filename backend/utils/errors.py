# Custom error classes
# TODO: Define custom exceptions


class ManhwaDiscoveryError(Exception):
    """Base exception for application"""

    pass


class APIError(ManhwaDiscoveryError):
    """External API error"""

    pass


class ValidationError(ManhwaDiscoveryError):
    """Input validation error"""

    pass


class NotFoundError(ManhwaDiscoveryError):
    """Resource not found error"""

    pass
