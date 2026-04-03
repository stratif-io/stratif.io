"""Tests for the reports API — POST /api/reports and GET /api/reports/{shortcode}."""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.testclient import TestClient

from backend.main import app
from backend.product_db.base import Base
from backend.product_db.deps import get_db


@pytest.fixture()
def reports_client(tmp_path):
    """TestClient backed by a real async SQLite product DB."""
    db_url = f"sqlite+aiosqlite:///{tmp_path / 'product.db'}"

    async def setup():
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(setup())

    test_engine = create_async_engine(db_url)
    test_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


class TestReportsAPI:
    def test_create_report_returns_201_with_shortcode(self, reports_client):
        resp = reports_client.post(
            "/api/reports",
            json={
                "name": "My Report",
                "page": "retention",
                "params": {"granularity": "week"},
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert "shortcode" in body
        assert "id" in body
        assert len(body["shortcode"]) > 0

    def test_get_report_returns_200_for_public(self, reports_client):
        # Create first
        create_resp = reports_client.post(
            "/api/reports",
            json={"name": "Public Report", "page": "events", "params": {}},
        )
        shortcode = create_resp.json()["shortcode"]

        resp = reports_client.get(f"/api/reports/{shortcode}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["shortcode"] == shortcode
        assert body["name"] == "Public Report"
        assert body["page"] == "events"
        assert body["access"] == "public"

    def test_get_report_returns_404_for_unknown_shortcode(self, reports_client):
        resp = reports_client.get("/api/reports/doesnotexist")
        assert resp.status_code == 404

    def test_get_authenticated_report_returns_403_without_api_key(self, reports_client):
        # Create an authenticated report
        create_resp = reports_client.post(
            "/api/reports",
            json={
                "name": "Private Report",
                "page": "retention",
                "params": {},
                "access": "authenticated",
            },
        )
        shortcode = create_resp.json()["shortcode"]

        # Fetch without X-API-Key
        resp = reports_client.get(f"/api/reports/{shortcode}")
        assert resp.status_code == 403
