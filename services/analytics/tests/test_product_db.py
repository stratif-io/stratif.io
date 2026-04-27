"""Tests for the ORM models and schema."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from services.analytics.product_db.base import Base
from services.analytics.product_db.database import close_product_db, reset_engine
from services.analytics.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterConfig,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    await engine.dispose()


def _conn(id="c1") -> Connection:
    now = datetime.now(UTC).replace(tzinfo=None)
    return Connection(
        id=id,
        name="Test",
        db_type="duckdb",
        credentials_encrypted="enc",
        created_at=now,
        updated_at=now,
    )


class TestConnectionModel:
    async def test_insert_and_retrieve(self, session):
        conn = _conn()
        session.add(conn)
        await session.commit()
        result = await session.get(Connection, "c1")
        assert result.name == "Test"
        assert result.db_type == "duckdb"

    async def test_schema_config_cascade_delete(self, session):
        from sqlalchemy import select

        conn = _conn()
        session.add(conn)
        await session.flush()
        config = ConnectionSchemaConfig(
            id=str(uuid.uuid4()),
            connection_id="c1",
            user_id_field="uid",
            timestamp_field="ts",
            event_name_field="event",
            events_table="events",
            session_timeout_minutes=30,
            resurrection_window_days=30,
            power_user_threshold_days=4,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
        )
        session.add(config)
        await session.commit()

        await session.delete(conn)
        await session.commit()

        result = await session.execute(select(ConnectionSchemaConfig))
        assert result.scalars().all() == []

    async def test_custom_properties_relationship(self, session):
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        conn = _conn()
        session.add(conn)
        await session.flush()
        config_id = str(uuid.uuid4())
        config = ConnectionSchemaConfig(
            id=config_id,
            connection_id="c1",
            user_id_field="user_id",
            timestamp_field="timestamp",
            event_name_field="event_name",
            events_table="events",
            session_timeout_minutes=30,
            resurrection_window_days=30,
            power_user_threshold_days=4,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
        )
        session.add(config)
        session.add(
            ConnectionCustomProperty(
                id=str(uuid.uuid4()),
                schema_config_id=config_id,
                name="plan",
                path="properties.plan",
                type="string",
                category=None,
                sort_order=0,
            )
        )
        await session.commit()

        result = await session.execute(
            select(ConnectionSchemaConfig)
            .options(selectinload(ConnectionSchemaConfig.custom_properties))
            .where(ConnectionSchemaConfig.id == config_id)
        )
        loaded = result.scalar_one()
        assert len(loaded.custom_properties) == 1
        assert loaded.custom_properties[0].name == "plan"

    async def test_filter_fields_relationship(self, session):
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        conn = _conn()
        session.add(conn)
        await session.flush()
        fc_id = str(uuid.uuid4())
        session.add(
            ConnectionFilterConfig(
                id=fc_id,
                connection_id="c1",
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            )
        )
        session.add(
            ConnectionFilterField(
                id=str(uuid.uuid4()),
                filter_config_id=fc_id,
                field="plan",
                label="Plan",
                icon="filter",
                sort_order=0,
            )
        )
        await session.commit()

        result = await session.execute(
            select(ConnectionFilterConfig)
            .options(selectinload(ConnectionFilterConfig.filter_fields))
            .where(ConnectionFilterConfig.id == fc_id)
        )
        loaded = result.scalar_one()
        assert len(loaded.filter_fields) == 1
        assert loaded.filter_fields[0].field == "plan"


@pytest.mark.asyncio
async def test_close_product_db_disposes_engine():
    """close_product_db should dispose the engine and reset cached state."""
    mock_engine = AsyncMock()
    with patch("services.analytics.product_db.database._engine", mock_engine):
        await close_product_db()
    mock_engine.dispose.assert_awaited_once()


@pytest.mark.asyncio
async def test_close_product_db_when_no_engine():
    """close_product_db should be a no-op when engine was never initialised."""
    reset_engine()
    # Should not raise
    await close_product_db()


@pytest.mark.asyncio
async def test_close_product_db_clears_globals_even_if_dispose_raises():
    """Globals must be reset even when dispose() raises."""
    from services.analytics.product_db import database as db_module

    mock_engine = AsyncMock()
    mock_engine.dispose.side_effect = RuntimeError("connection already closed")
    with (
        patch("services.analytics.product_db.database._engine", mock_engine),
        pytest.raises(RuntimeError),
    ):
        await close_product_db()
    assert db_module._engine is None
    assert db_module._session_factory is None


@pytest.mark.asyncio
async def test_init_product_db_backfills_new_schema_config_columns(
    tmp_path, monkeypatch
):
    """init_product_db must add new NOT NULL columns to an existing SQLite DB
    whose ``connection_schema_configs`` table predates them, and backfill
    existing rows with the model defaults (query_timeout_seconds=10,
    max_concurrent_queries=5)."""
    import sqlite3
    import uuid as _uuid

    from services.analytics.config import settings
    from services.analytics.product_db import database as db_module

    db_path = tmp_path / "product.db"

    # 1. Build an OLD-schema DB on disk: the connection_schema_configs table
    #    without the two new columns, plus a row referencing a real connection.
    old_conn_id = "c-old"
    config_id = str(_uuid.uuid4())
    with sqlite3.connect(db_path) as raw:
        raw.executescript(
            """
            CREATE TABLE connections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                db_type TEXT NOT NULL,
                credentials_encrypted TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );
            CREATE TABLE connection_schema_configs (
                id TEXT PRIMARY KEY,
                connection_id TEXT NOT NULL UNIQUE
                    REFERENCES connections(id) ON DELETE CASCADE,
                user_id_field TEXT NOT NULL,
                timestamp_field TEXT NOT NULL,
                event_name_field TEXT NOT NULL,
                events_table TEXT NOT NULL,
                session_timeout_minutes INTEGER NOT NULL,
                resurrection_window_days INTEGER NOT NULL,
                power_user_threshold_days INTEGER NOT NULL,
                email_field TEXT,
                first_name_field TEXT,
                last_name_field TEXT,
                date_of_birth_field TEXT,
                phone_field TEXT,
                updated_at DATETIME NOT NULL
            );
            """
        )
        raw.execute(
            "INSERT INTO connections (id,name,db_type,credentials_encrypted,"
            "created_at,updated_at) VALUES (?,?,?,?,?,?)",
            (old_conn_id, "Old", "duckdb", "enc", "2026-01-01", "2026-01-01"),
        )
        raw.execute(
            "INSERT INTO connection_schema_configs (id,connection_id,user_id_field,"
            "timestamp_field,event_name_field,events_table,session_timeout_minutes,"
            "resurrection_window_days,power_user_threshold_days,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                config_id,
                old_conn_id,
                "user_id",
                "timestamp",
                "event_name",
                "events",
                30,
                30,
                4,
                "2026-01-01",
            ),
        )

    # 2. Point the app at this file and run init_product_db.
    monkeypatch.setattr(settings, "product_db_url", f"sqlite+aiosqlite:///{db_path}")
    db_module.reset_engine()
    try:
        await db_module.init_product_db()
    finally:
        await db_module.close_product_db()

    # 3. Verify columns exist and existing row was backfilled with defaults.
    with sqlite3.connect(db_path) as raw:
        cols = {
            row[1]
            for row in raw.execute(
                'PRAGMA table_info("connection_schema_configs")'
            ).fetchall()
        }
        assert "query_timeout_seconds" in cols
        assert "max_concurrent_queries" in cols

        row = raw.execute(
            "SELECT query_timeout_seconds, max_concurrent_queries "
            "FROM connection_schema_configs WHERE id = ?",
            (config_id,),
        ).fetchone()
        assert row == (10, 5)

    # 4. Idempotent: running init again must not raise.
    db_module.reset_engine()
    try:
        await db_module.init_product_db()
    finally:
        await db_module.close_product_db()


@pytest.mark.asyncio
async def test_lifespan_calls_close_product_db():
    """Lifespan teardown must call close_product_db."""
    from services.analytics.main import app, lifespan

    with (
        patch(
            "services.analytics.main.init_product_db", new_callable=AsyncMock
        ) as mock_init,
        patch(
            "services.analytics.main.close_product_db", new_callable=AsyncMock
        ) as mock_close,
        patch("services.analytics.main.setup_logging"),
    ):
        async with lifespan(app):
            pass
        mock_init.assert_awaited_once()
        mock_close.assert_awaited_once()


# ---------------------------------------------------------------------------
# Custom property ID stability
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def async_client(tmp_path):
    """AsyncClient backed by a real async SQLite product DB (no pre-seeded connection)."""
    import httpx

    from services.analytics.main import app
    from services.analytics.product_db.deps import get_db

    db_url = f"sqlite+aiosqlite:///{tmp_path / 'product.db'}"
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_custom_property_id_preserved_across_upserts(async_client):
    """Upserting schema config preserves custom property IDs sent by the client."""
    conn_resp = await async_client.post(
        "/api/connections",
        json={
            "name": "id-stable-test",
            "db_type": "duckdb",
            "credentials": {"file_path": ":memory:"},
        },
    )
    conn_id = conn_resp.json()["id"]

    # First save — send a custom prop without an id; expect backend to assign one
    body = {
        "user_id_field": "user_id",
        "event_name_field": "event_name",
        "timestamp_field": "timestamp",
        "events_table": "events",
        "custom_properties": [
            {"name": "country", "path": "context.country", "type": "string"}
        ],
        "session_timeout_minutes": 30,
    }
    r1 = await async_client.put(f"/api/connections/{conn_id}/schema", json=body)
    assert r1.status_code == 200
    first_id = r1.json()["custom_properties"][0]["id"]
    assert first_id  # backend assigned a UUID

    # Second save — send the same prop back WITH its id; expect same id preserved
    body["custom_properties"][0]["id"] = first_id
    r2 = await async_client.put(f"/api/connections/{conn_id}/schema", json=body)
    assert r2.status_code == 200
    second_id = r2.json()["custom_properties"][0]["id"]
    assert second_id == first_id, "ID should be preserved when client sends it back"
