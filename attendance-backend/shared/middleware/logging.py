import time
import logging
from fastapi import Request

logger = logging.getLogger("emprod.requests")


async def log_requests(request: Request, call_next):
    """Middleware: logs method, path, status code, and response time for every request."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({duration_ms:.1f}ms)"
    )
    return response
