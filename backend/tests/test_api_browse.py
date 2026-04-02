"""Tests for GET /connections/{id}/tables and /connections/{id}/columns endpoints."""

from __future__ import annotations

import os
import tempfile

import duckdb
import pytest
from starlette.testclient import TestClient

from backend.main import app


@pytest.fixture()
def duckdb_file():
    """Create a temporary DuckDB file with an events table."""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "test.duckdb")
        conn = duckdb.connect(path)
        conn.execute(
            "CREATE TABLE events (user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR)"
        )
        conn.execute(
            "CREATE TABLE sessions (session_id VARCHAR, user_id VARCHAR, started_at TIMESTAMP)"
        )
        conn.close()
        yield path


def _make_encrypted_creds(file_path: str) -> str:
    """Create an encrypted credentials blob for a DuckDB file path."""
    from backend.services.crypto import encrypt_credentials

    return encrypt_credentials({"file_path": file_path})


@pytest.fixture()
def browse_client(duckdb_file):
    """TestClient with a product DB seeded with a DuckDB file connection."""
    import asyncio
    import tempfile
    import os
    from datetime import UTC, datetime
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from backend.product_db.base import Base
    from backend.product_db.deps import get_db
    from backend.product_db.models import Connection

    encrypted = _make_encrypted_creds(duckdb_file)
    tmp = tempfile.mktemp(suffix=".db")

    async def setup():
        engine = create_async_engine(f"sqlite+aiosqlite:///{tmp}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            session.add(Connection(
                id="conn-1",
                name="Test DuckDB",
                db_type="duckdb",
                credentials_encrypted=encrypted,
                created_at=now,
                updated_at=now,
            ))
            await session.commit()
        await engine.dispose()

    asyncio.run(setup())

    test_engine = create_async_engine(f"sqlite+aiosqlite:///{tmp}")
    test_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    try:
        os.unlink(tmp)
    except FileNotFoundError:
        pass


class TestListTables:
    def test_tables_endpoint_returns_flat_list(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        assert resp.status_code == 200
        body = resp.json()
        assert "tables" in body
        names = [t["name"] for t in body["tables"]]
        assert "events" in names
        assert "sessions" in names

    def test_tables_include_required_fields(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        body = resp.json()
        for table in body["tables"]:
            assert "name" in table
            assert "full_name" in table
            assert "table_schema" in table
            assert "catalog" in table

    def test_tables_full_name_is_schema_qualified(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        body = resp.json()
        events = next(t for t in body["tables"] if t["name"] == "events")
        assert events["full_name"] == "main.events"
        assert events["table_schema"] == "main"

    def test_tables_returns_404_for_unknown_connection(self, browse_client):
        resp = browse_client.get("/api/connections/unknown-id/tables")
        assert resp.status_code == 404


class TestListColumns:
    def test_columns_endpoint_returns_column_names(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/columns?table=main.events")
        assert resp.status_code == 200
        body = resp.json()
        assert "columns" in body
        assert "user_id" in body["columns"]
        assert "timestamp" in body["columns"]
        assert "event_name" in body["columns"]

    def test_columns_returns_404_for_unknown_connection(self, browse_client):
        resp = browse_client.get("/api/connections/nope/columns?table=main.events")
        assert resp.status_code == 404
