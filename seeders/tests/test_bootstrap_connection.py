"""Tests for seeders.bootstrap_connection."""

import asyncio
from contextlib import contextmanager
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.product_db.base import Base
from backend.product_db.database import reset_engine
from backend.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)
from backend.services.crypto import encrypt_credentials


@contextmanager
def _patch_db_url(db_url: str, enc_key: str):
    """Redirect product_db to a temp SQLite file and reset cached engine."""
    reset_engine()
    with (
        patch("backend.product_db.database.settings") as db_s,
        patch("backend.services.crypto.settings") as crypto_s,
    ):
        db_s.product_db_url = db_url
        db_s.log_sql = False
        crypto_s.encryption_key = enc_key
        yield
    reset_engine()


def _make_url(tmp_path) -> str:
    return f"sqlite+aiosqlite:///{tmp_path}/test_product.sqlite"


def _setup_db(tmp_path, enc_key="test-encryption-key-for-testing-only"):
    """Initialise a temp product DB and return its URL."""
    url = _make_url(tmp_path)
    with _patch_db_url(url, enc_key):
        asyncio.run(_create_schema(url))
    return url


async def _create_schema(url: str) -> None:
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def test_bootstrap_inserts_all_rows(tmp_path):
    """First call inserts connection, schema config, filter config, and custom properties."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        bootstrap("/data/sample.duckdb")

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            connections = (await session.execute(select(Connection))).scalars().all()
            assert len(connections) == 1
            assert connections[0].name == "Sample DuckDB"
            assert connections[0].db_type == "duckdb"

            schema_configs = (
                (
                    await session.execute(
                        select(ConnectionSchemaConfig).where(
                            ConnectionSchemaConfig.connection_id == connections[0].id
                        )
                    )
                )
                .scalars()
                .all()
            )
            assert len(schema_configs) == 1

            props = (
                (
                    await session.execute(
                        select(ConnectionCustomProperty).where(
                            ConnectionCustomProperty.schema_config_id
                            == schema_configs[0].id
                        )
                    )
                )
                .scalars()
                .all()
            )
            prop_names = [p.name for p in props]
            assert "country" in prop_names
            assert "city" in prop_names
            assert all(p.path.startswith("properties.") for p in props)

            filter_fields = (
                (await session.execute(select(ConnectionFilterField))).scalars().all()
            )
            field_names = [f.field for f in filter_fields]
            assert "country" in field_names
            assert "city" in field_names
        await engine.dispose()

    asyncio.run(_check())


def test_bootstrap_credentials_decrypt_correctly(tmp_path):
    """Stored credentials decrypt to the correct path."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        bootstrap("/data/sample.duckdb")

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conn = (await session.execute(select(Connection))).scalar_one()
            return conn.credentials_encrypted
        await engine.dispose()

    creds_enc = asyncio.run(_check())

    with patch("backend.services.crypto.settings") as s:
        s.encryption_key = enc_key
        from backend.services.crypto import decrypt_credentials

        creds = decrypt_credentials(creds_enc)

    assert creds == {"file_path": "/data/sample.duckdb"}


def test_bootstrap_is_idempotent(tmp_path):
    """Calling bootstrap twice does not create duplicate connections."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        bootstrap("/data/sample.duckdb")
        bootstrap("/data/sample.duckdb")

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            count = len((await session.execute(select(Connection))).scalars().all())
        await engine.dispose()
        return count

    assert asyncio.run(_check()) == 1


def test_bootstrap_custom_path(tmp_path):
    """Custom path is stored in encrypted credentials."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)
    custom_path = "/custom/analytics.duckdb"

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        bootstrap(custom_path)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conn = (await session.execute(select(Connection))).scalar_one()
            return conn.credentials_encrypted
        await engine.dispose()

    creds_enc = asyncio.run(_check())

    with patch("backend.services.crypto.settings") as s:
        s.encryption_key = enc_key
        from backend.services.crypto import decrypt_credentials

        creds = decrypt_credentials(creds_enc)

    assert creds == {"file_path": custom_path}


def test_bootstrap_fixes_stale_credentials(tmp_path):
    """If an existing connection has wrong credential key, bootstrap updates it."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)

    # Insert a connection with stale credentials (wrong key name)
    async def _seed_stale():
        import uuid
        from datetime import UTC, datetime

        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            with patch("backend.services.crypto.settings") as s:
                s.encryption_key = enc_key
                stale_creds = encrypt_credentials({"path": "/data/sample.duckdb"})
            now = datetime.now(UTC).replace(tzinfo=None)
            session.add(
                Connection(
                    id=str(uuid.uuid4()),
                    name="Sample DuckDB",
                    db_type="duckdb",
                    credentials_encrypted=stale_creds,
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(_seed_stale())

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        bootstrap("/data/sample.duckdb")

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            connections = (await session.execute(select(Connection))).scalars().all()
            assert len(connections) == 1
            return connections[0].credentials_encrypted
        await engine.dispose()

    creds_enc = asyncio.run(_check())

    with patch("backend.services.crypto.settings") as s:
        s.encryption_key = enc_key
        from backend.services.crypto import decrypt_credentials

        creds = decrypt_credentials(creds_enc)

    assert creds == {"file_path": "/data/sample.duckdb"}


@pytest.mark.parametrize("call_count", [1, 2, 3])
def test_bootstrap_multiple_calls_remain_idempotent(tmp_path, call_count):
    """N calls to bootstrap always result in exactly one connection row."""
    enc_key = "test-encryption-key-for-testing-only"
    url = _setup_db(tmp_path, enc_key)

    with _patch_db_url(url, enc_key):
        from seeders.bootstrap_connection import bootstrap

        for _ in range(call_count):
            bootstrap("/data/sample.duckdb")

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            count = len((await session.execute(select(Connection))).scalars().all())
        await engine.dispose()
        return count

    assert asyncio.run(_check()) == 1
