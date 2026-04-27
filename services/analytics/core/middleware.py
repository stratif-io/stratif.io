"""Custom Starlette middleware for stratif.io Analytics."""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

log = structlog.get_logger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Bind a unique request_id to the structlog context for every request.

    Adds X-Request-ID to the response headers for client-side tracing.

    Note: user_id is NOT bound here — auth has not run yet at middleware time.
    It should be bound inside get_current_user() after authentication succeeds.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Log method, path, status code, and duration for every request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            log.info(
                "request",
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
        return response
