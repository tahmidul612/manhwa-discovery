# Application settings and configuration
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    MANGADEX_API_URL: str = "https://api.mangadex.org"
    ANILIST_API_URL: str = "https://graphql.anilist.co"
    MANGADEX_API_KEY: Optional[str] = None
    ANILIST_CLIENT_ID: Optional[str] = None
    ANILIST_CLIENT_SECRET: Optional[str] = None
    ANILIST_REDIRECT_URI: str = "http://localhost:8000/auth/anilist/callback"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Database Configuration
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "manhwa_discovery"

    # Cache Configuration
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600

    # Security
    SESSION_SECRET: str = "change-me-in-production"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    MAX_REQUESTS_PER_MINUTE: int = 60
    MANGADEX_RATE_LIMIT: int = 5  # requests per second

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
