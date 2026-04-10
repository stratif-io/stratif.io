"""Tests for the ORM models and schema."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.product_db.base import Base
from backend.product_db.database import close_product_db, reset_engine
from backend.product_db.models import (
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
    with patch("backend.product_db.database._engine", mock_engine):
        await close_product_db()
    mock_engine.dispose.assert_awaited_once()


@pytest.mark.asyncio
async def test_close_product_db_when_no_engine():
    """close_product_db should be a no-op when engine was never initialised."""
    reset_engine()
    # Should not raise
    await close_product_db()
