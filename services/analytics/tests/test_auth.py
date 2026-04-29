from fastapi import Depends, FastAPI
from starlette.testclient import TestClient

from services.analytics.core.auth import get_current_user
from services.analytics.product_db.deps import get_db


def _make_app_with_auth():
    app = FastAPI()

    @app.get("/protected")
    async def protected(user=Depends(get_current_user)):  # noqa: B008
        return {"ok": True}

    return app


async def _noop_db():
    yield None


def test_auth_disabled_allows_all_requests(monkeypatch):
    from services.analytics import config

    monkeypatch.setattr(config.settings, "auth_enabled", False)
    app = _make_app_with_auth()
    app.dependency_overrides[get_db] = _noop_db
    client = TestClient(app)
    resp = client.get("/protected")
    assert resp.status_code == 200


def test_auth_enabled_rejects_missing_key(monkeypatch):
    from services.analytics import config

    monkeypatch.setattr(config.settings, "auth_enabled", True)
    monkeypatch.setattr(config.settings, "api_key", "secret")
    app = _make_app_with_auth()
    app.dependency_overrides[get_db] = _noop_db
    client = TestClient(app)
    resp = client.get("/protected")
    assert resp.status_code == 401


def test_auth_enabled_accepts_correct_key(monkeypatch):
    from services.analytics import config

    monkeypatch.setattr(config.settings, "auth_enabled", True)
    monkeypatch.setattr(config.settings, "api_key", "secret")
    app = _make_app_with_auth()
    app.dependency_overrides[get_db] = _noop_db
    client = TestClient(app)
    resp = client.get("/protected", headers={"X-API-Key": "secret"})
    assert resp.status_code == 200


def test_request_id_header_present_in_response():
    from services.analytics.main import app

    client = TestClient(app)
    resp = client.get("/api/health")
    assert "X-Request-ID" in resp.headers
    # Verify it looks like a UUID
    import uuid

    uuid.UUID(resp.headers["X-Request-ID"])  # raises if invalid
