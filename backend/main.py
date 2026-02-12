# Backend application entry point
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config.settings import settings
from backend.database.connection import connect_db, close_db, health_check
from backend.database.cache import cache_service
from backend.services.mangadex.client import mangadex_client
from backend.services.anilist.client import anilist_client

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting Manhwa Discovery API...")

    try:
        # Connect to MongoDB
        await connect_db()
        logger.info("✓ MongoDB connected")

        # Connect to Redis cache
        await cache_service.connect()
        logger.info(
            "✓ Redis cache connected"
            if cache_service.is_connected()
            else "⚠ Redis unavailable, using MongoDB-only caching"
        )

        logger.info("✓ Application started successfully")

    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Manhwa Discovery API...")

    try:
        await close_db()
        await cache_service.close()
        await mangadex_client.close()
        await anilist_client.close()
        logger.info("✓ All connections closed")

    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="Manhwa Discovery API",
        description="Unified manga/manhwa discovery platform bridging AniList and MangaDex",
        version="1.0.0",
        lifespan=lifespan,
        debug=settings.DEBUG,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3009",
            "http://localhost:5173",  # Vite default port
            "http://127.0.0.1:3009",
            "http://127.0.0.1:5173",
            "https://manhwa.tahmidul612.com",  # Production domain
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check_endpoint():
        """Health check endpoint"""
        db_healthy = await health_check()
        cache_healthy = cache_service.is_connected()

        return JSONResponse(
            status_code=200 if db_healthy else 503,
            content={
                "status": "healthy" if db_healthy else "unhealthy",
                "database": "connected" if db_healthy else "disconnected",
                "cache": "connected" if cache_healthy else "disconnected (fallback to MongoDB)",
                "version": "1.0.0",
            },
        )

    @app.get("/", tags=["root"])
    async def root():
        """Root endpoint"""
        return {
            "message": "Manhwa Discovery API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health",
        }

    # Import and include routers
    # Note: We'll create these route files next
    try:
        from backend.api.routes import auth, user, manhwa

        app.include_router(auth.router, prefix="/auth", tags=["auth"])
        app.include_router(user.router, prefix="/users", tags=["users"])
        app.include_router(manhwa.router, prefix="/manhwa", tags=["manhwa"])

        logger.info("✓ All routes registered")

    except ImportError as e:
        logger.warning(f"Some routes not yet implemented: {e}")

    return app


# Create app instance
app = create_app()


def main():
    """Main entry point for development server"""
    import uvicorn

    logger.info(f"Starting development server on {settings.HOST}:{settings.PORT}")

    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )


if __name__ == "__main__":
    main()
