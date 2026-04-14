"""Tests for seeders.bootstrap_all_connections."""

from __future__ import annotations

import asyncio
from contextlib import contextmanager
from unittest.mock import patch

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.product_db.base import Base
from backend.product_db.database import reset_engine
from backend.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)

ENC_KEY = "test-encryption-key-for-testing-only"


@contextmanager
def _patch_db(db_url: str):
    reset_engine()
    with (
        patch("backend.product_db.database.settings") as db_s,
        patch("backend.services.crypto.settings") as crypto_s,
    ):
        db_s.product_db_url = db_url
        db_s.log_sql = False
        crypto_s.encryption_key = ENC_KEY
        yield
    reset_engine()


def _setup_db(tmp_path) -> str:
    url = f"sqlite+aiosqlite:///{tmp_path}/test_product.sqlite"

    async def _create():
        engine = create_async_engine(url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    with _patch_db(url):
        asyncio.run(_create())
    return url


def _write_yaml(tmp_path, data: dict):
    path = tmp_path / "connections.yaml"
    path.write_text(yaml.safe_dump(data))
    return path


def _fake_schema_info() -> SchemaInfo:
    return SchemaInfo(
        tables=["events", "users"],
        events_table="events",
        columns=[
            ColumnInfo(name="user_id", type="VARCHAR"),
            ColumnInfo(name="timestamp", type="TIMESTAMP"),
            ColumnInfo(name="event_name", type="VARCHAR"),
        ],
        suggestions={
            "user_id_field": "user_id",
            "timestamp_field": "timestamp",
            "event_name_field": "event_name",
            "email_field": "user_email",
        },
        proposed_custom_properties=[
            {"name": "country", "path": "context.country", "type": "string"},
            {"name": "city", "path": "context.city", "type": "string"},
            {"name": "device_type", "path": "context.device_type", "type": "string"},
            {"name": "age", "path": "context.age", "type": "number"},
        ],
    )


class _FakeBackend:
    def parse_credentials(self, raw):
        return raw

    def open(self, credentials, read_only=True):
        class _Conn:
            def close(self_inner):  # noqa: N805
                pass

        return _Conn()

    def detect_schema(self, conn, hint):
        return _fake_schema_info()


@contextmanager
def _patch_backend():
    with patch(
        "seeders.bootstrap_all_connections.get_backend", return_value=_FakeBackend()
    ):
        yield


def _count(session, model):
    return len(session.execute(select(model)).scalars().all())


def test_bootstraps_only_enabled_backends(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
                "postgresql": {
                    "enabled": False,
                    "credentials": {"host": "localhost"},
                },
            }
        },
    )

    with _patch_db(url), _patch_backend():
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conns = (await session.execute(select(Connection))).scalars().all()
            assert [c.name for c in conns] == ["Sample DuckDB"]
            assert conns[0].db_type == "duckdb"
        await engine.dispose()

    asyncio.run(_check())


def test_persists_schema_suggestions_and_custom_properties(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
            }
        },
    )

    with _patch_db(url), _patch_backend():
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            sc = (await session.execute(select(ConnectionSchemaConfig))).scalar_one()
            assert sc.user_id_field == "user_id"
            assert sc.timestamp_field == "timestamp"
            assert sc.event_name_field == "event_name"
            assert sc.email_field == "user_email"
            assert sc.events_table == "events"

            props = (
                (await session.execute(select(ConnectionCustomProperty)))
                .scalars()
                .all()
            )
            names = {p.name for p in props}
            assert names == {"country", "city", "device_type", "age"}
        await engine.dispose()

    asyncio.run(_check())


def test_auto_selects_string_filter_fields(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
            }
        },
    )

    with _patch_db(url), _patch_backend():
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            fields = (
                (await session.execute(select(ConnectionFilterField))).scalars().all()
            )
            # Only country + city are auto-selected as global filters
            names = {f.field for f in fields}
            assert names == {"country", "city"}
        await engine.dispose()

    asyncio.run(_check())


def test_bootstrap_is_idempotent(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
            }
        },
    )

    with _patch_db(url), _patch_backend():
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, skip_seed=True)
        bootstrap(yaml_path, skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conns = (await session.execute(select(Connection))).scalars().all()
            assert len(conns) == 1
            scs = (
                (await session.execute(select(ConnectionSchemaConfig))).scalars().all()
            )
            assert len(scs) == 1
            props = (
                (await session.execute(select(ConnectionCustomProperty)))
                .scalars()
                .all()
            )
            assert len(props) == 4
            fields = (
                (await session.execute(select(ConnectionFilterField))).scalars().all()
            )
            assert len(fields) == 2
        await engine.dispose()

    asyncio.run(_check())


def test_detection_failure_skips_backend(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
            }
        },
    )

    class _BoomBackend(_FakeBackend):
        def detect_schema(self, conn, hint):
            raise RuntimeError("boom")

    with (
        _patch_db(url),
        patch(
            "seeders.bootstrap_all_connections.get_backend",
            return_value=_BoomBackend(),
        ),
    ):
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conns = (await session.execute(select(Connection))).scalars().all()
            assert conns == []
        await engine.dispose()

    asyncio.run(_check())


def test_backend_option_bootstraps_only_selected(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
                "sqlite": {"enabled": True, "credentials": {"file_path": "/y.db"}},
            }
        },
    )

    with _patch_db(url), _patch_backend():
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path, only="sqlite", skip_seed=True)

    async def _check():
        engine = create_async_engine(url)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            conns = (await session.execute(select(Connection))).scalars().all()
            assert [c.name for c in conns] == ["Sample SQLite"]
        await engine.dispose()

    asyncio.run(_check())


def test_runs_seeder_when_skip_seed_false(tmp_path):
    url = _setup_db(tmp_path)
    yaml_path = _write_yaml(
        tmp_path,
        {
            "backends": {
                "duckdb": {"enabled": True, "credentials": {"file_path": "/x.db"}},
            }
        },
    )

    called: list[str] = []

    def _fake_run_seeder(db_type: str) -> None:
        called.append(db_type)

    with (
        _patch_db(url),
        _patch_backend(),
        patch(
            "seeders.bootstrap_all_connections._run_seeder",
            side_effect=_fake_run_seeder,
        ),
    ):
        from seeders.bootstrap_all_connections import bootstrap

        bootstrap(yaml_path)

    assert called == ["duckdb"]
