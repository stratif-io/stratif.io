"""Custom Starlette middleware for stratif.io Analytics."""

from __future__ import annotations

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
