"""Tests for AccessLogMiddleware."""

from unittest.mock import patch

from fastapi import FastAPI
from starlette.testclient import TestClient

from backend.core.middleware import AccessLogMiddleware, RequestIdMiddleware


def _make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(AccessLogMiddleware)  # type: ignore[arg-type]
    app.add_middleware(RequestIdMiddleware)  # type: ignore[arg-type]

    @app.get("/ping")
    async def ping():
        return {"ok": True}

    return app


def test_access_log_emits_expected_keys(caplog):
    """AccessLogMiddleware must log method, path, status_code, and duration_ms."""
    app = _make_app()

    with patch("backend.core.middleware.log") as mock_log:
        client = TestClient(app)
        client.get("/ping")
        assert mock_log.info.called
        call_kwargs = mock_log.info.call_args
        # First positional arg is the event name
        assert call_kwargs[0][0] == "request"
        kw = call_kwargs[1]
        assert "method" in kw
        assert "path" in kw
        assert "status_code" in kw
        assert "duration_ms" in kw
        assert kw["method"] == "GET"
        assert kw["path"] == "/ping"
        assert kw["status_code"] == 200
        assert isinstance(kw["duration_ms"], float)


def test_access_log_records_non_200(caplog):
    """AccessLogMiddleware must log 404 responses correctly."""
    app = _make_app()

    with patch("backend.core.middleware.log") as mock_log:
        client = TestClient(app, raise_server_exceptions=False)
        client.get("/does-not-exist")
        kw = mock_log.info.call_args[1]
        assert kw["status_code"] == 404


def test_access_log_emits_on_exception():
    """AccessLogMiddleware must log even when the handler raises."""
    app = FastAPI()
    app.add_middleware(AccessLogMiddleware)  # type: ignore[arg-type]

    @app.get("/boom")
    async def boom():
        raise RuntimeError("kaboom")

    with patch("backend.core.middleware.log") as mock_log:
        client = TestClient(app, raise_server_exceptions=False)
        client.get("/boom")
        assert mock_log.info.called
        kw = mock_log.info.call_args[1]
        assert kw["status_code"] == 500
        assert "duration_ms" in kw
