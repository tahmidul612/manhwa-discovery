# Application settings and configuration
# TODO: Load from environment variables


class Settings:
    """Application settings"""

    # API Configuration
    MANGADEX_API_URL = "https://api.mangadex.org"
    ANILIST_API_URL = "https://graphql.anilist.co"

    # Server Configuration
    HOST = "0.0.0.0"
    PORT = 8000
    DEBUG = False

    # Database Configuration
    DATABASE_URL = None

    # Cache Configuration
    CACHE_ENABLED = True
    CACHE_TTL = 3600

    # Rate Limiting
    RATE_LIMIT_ENABLED = True
    MAX_REQUESTS_PER_MINUTE = 60


def load_settings():
    """Load settings from environment"""
    pass
