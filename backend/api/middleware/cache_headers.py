# Middleware to add Cache-Control headers to API GET responses

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        if request.method != "GET":
            return response

        path = request.url.path

        if path.startswith("/images/"):
            response.headers["Cache-Control"] = "public, max-age=86400, immutable"
        elif path.startswith("/manhwa/"):
            if any(seg in path for seg in ("/search", "/browse", "/trending", "/popular")):
                response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
            elif "/chapters" not in path:
                response.headers["Cache-Control"] = (
                    "public, max-age=300, stale-while-revalidate=600"
                )

        return response
