"""Security tests for auth endpoints."""

from unittest.mock import patch

import pytest
from starlette.testclient import TestClient

from openflow.main import app

_FAKE_ROW = {
    "id": "user-123",
    "email": "test@example.com",
    "display_name": "Test User",
    "avatar_url": None,
    "created_at": "2024-01-01T00:00:00",
    "last_login_at": None,
}


# ---------------------------------------------------------------------------
# Task 1 — session cookie Secure flag
# ---------------------------------------------------------------------------


def test_session_cookie_has_secure_flag():
    """Session cookie MUST have Secure flag to prevent transmission over HTTP."""
    with (
        patch("openflow.api.auth.authenticate_user", return_value=_FAKE_ROW),
        TestClient(app, raise_server_exceptions=True) as client,
    ):
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
    assert response.status_code == 200
    set_cookie = response.headers.get("set-cookie", "")
    assert "secure" in set_cookie.lower(), f"Cookie missing Secure flag: {set_cookie}"


# ---------------------------------------------------------------------------
# Task 2 — open registration disabled by default
# ---------------------------------------------------------------------------


def test_register_disabled_by_default():
    """Registration must be gated behind allow_registration flag (default: False)."""
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={
                "email": "hacker@evil.com",
                "password": "password123",
                "display_name": "Hacker",
            },
        )
    assert response.status_code == 403, (
        f"Expected 403 (registration disabled), got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# Task 3 — rate limiting on login
# ---------------------------------------------------------------------------


def test_login_rate_limited_after_many_attempts():
    """Login must return 429 after exceeding the rate limit."""
    # Return None so authenticate_user reports invalid credentials (401),
    # letting the rate limiter accumulate counts and eventually return 429.
    with (
        patch("openflow.api.auth.authenticate_user", return_value=None),
        TestClient(app) as client,
    ):
        responses = [
            client.post(
                "/api/auth/login",
                json={"email": "x@x.com", "password": "wrong"},
            )
            for _ in range(15)
        ]
    status_codes = [r.status_code for r in responses]
    assert 429 in status_codes, (
        f"Expected a 429 after repeated attempts, got: {status_codes}"
    )


# ---------------------------------------------------------------------------
# Task 4 — API docs hidden in production
# ---------------------------------------------------------------------------


def test_api_docs_hidden_when_debug_false():
    """With debug=False, FastAPI must be created with docs disabled."""
    from unittest.mock import MagicMock

    from openflow.main import create_app

    mock_settings = MagicMock()
    mock_settings.debug = False

    import openflow.main as _main

    original = _main.settings
    _main.settings = mock_settings  # type: ignore[assignment]
    try:
        test_app = create_app()
    finally:
        _main.settings = original

    assert test_app.docs_url is None, "docs_url should be None when debug=False"
    assert test_app.redoc_url is None, "redoc_url should be None when debug=False"
    assert test_app.openapi_url is None, "openapi_url should be None when debug=False"


def test_api_docs_visible_when_debug_true():
    """With debug=True, FastAPI must be created with docs enabled."""
    from unittest.mock import MagicMock

    from openflow.main import create_app

    mock_settings = MagicMock()
    mock_settings.debug = True

    import openflow.main as _main

    original = _main.settings
    _main.settings = mock_settings  # type: ignore[assignment]
    try:
        test_app = create_app()
    finally:
        _main.settings = original

    assert test_app.docs_url == "/docs"
    assert test_app.openapi_url == "/openapi.json"


# ---------------------------------------------------------------------------
# Task 7 — encryption key minimum length validation
# ---------------------------------------------------------------------------


def test_short_encryption_key_rejected():
    """Encryption key shorter than 32 chars must be rejected at startup."""
    from pydantic import ValidationError

    from openflow.config import Settings

    with pytest.raises((ValidationError, ValueError)):
        Settings(
            api_url="http://localhost:8000",
            api_key="test-api-key",
            jwt_secret="test-secret-min-32-chars-long!!!!",
            jwt_algorithm="HS256",
            jwt_expire_days=7,
            cors_origins="http://localhost:5173",
            product_db_path=":memory:",
            encryption_key="short",
        )
