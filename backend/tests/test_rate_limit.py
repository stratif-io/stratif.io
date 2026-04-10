"""Tests for rate limiting 429 handler."""

import pytest
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address


def _make_limited_app() -> FastAPI:
    """Build a fresh app with a fresh limiter for each test."""
    _limiter = Limiter(key_func=get_remote_address, headers_enabled=True)
    app = FastAPI()
    app.state.limiter = _limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    @app.get("/limited")
    @_limiter.limit("2/minute")
    async def limited_endpoint(request: Request, response: Response):  # response param required by slowapi headers
        return {"ok": True}

    return app


def test_rate_limit_429_returns_json():
    """After exceeding the limit the handler must return structured JSON with status 429."""
    app = _make_limited_app()
    client = TestClient(app, raise_server_exceptions=False)

    # First two calls succeed
    assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 200

    # Third call is over the 2/minute limit
    response = client.get("/limited")
    assert response.status_code == 429
    body = response.json()
    assert "error" in body or "detail" in body  # slowapi default returns {"error": "..."}


def test_rate_limit_headers_present():
    """RateLimit-* headers must be present on successful responses."""
    app = _make_limited_app()
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/limited")
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
