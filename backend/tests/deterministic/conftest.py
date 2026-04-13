"""Conftest for deterministic E2E tests."""

from __future__ import annotations

import asyncio
import contextlib
import os
import pathlib

import pytest
import yaml
from starlette.testclient import TestClient

from backend.config import settings
from backend.main import app
from backend.product_db.database import init_product_db, reset_engine
from backend.product_db.deps import get_db

# ---------------------------------------------------------------------------
# Module-level config — parsed at import time so setup_class can access it
# without needing pytest fixture injection.
# ---------------------------------------------------------------------------

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]

_env_override = os.environ.get("STRATIFIO_CONNECTIONS_FILE")
if _env_override:
    _CONFIG_PATH = pathlib.Path(_env_override)
    if not _CONFIG_PATH.is_absolute():
        _CONFIG_PATH = pathlib.Path.cwd() / _CONFIG_PATH
else:
    _CONFIG_PATH = _REPO_ROOT / "connections.yaml"

if not _CONFIG_PATH.exists():
    DET_CONFIG: dict | None = None
else:
    DET_CONFIG = yaml.safe_load(_CONFIG_PATH.read_text())["backends"]

    # Resolve relative file_path credentials to absolute paths based on the repo root.
    for _cfg in DET_CONFIG.values():
        creds = _cfg.get("credentials") or {}
        if "file_path" in creds:
            fp = pathlib.Path(creds["file_path"])
            if not fp.is_absolute():
                creds["file_path"] = str(_REPO_ROOT / fp)

# ---------------------------------------------------------------------------
# Encryption key used for all deterministic test credential storage.
# ---------------------------------------------------------------------------

_DET_ENCRYPTION_KEY = "det-test-encryption-key-32chars!!"

_GOLDEN_DIR = pathlib.Path(__file__).parent / "golden"


# ---------------------------------------------------------------------------
# Session-scoped TestClient with temp-file SQLite product DB
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    """Return a TestClient backed by a temp-file SQLite product DB."""
    db_path = tmp_path_factory.mktemp("det_product_db") / "product.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"

    settings.product_db_url = db_url
    settings.encryption_key = _DET_ENCRYPTION_KEY
    reset_engine()
    asyncio.run(init_product_db())

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    test_engine = create_async_engine(db_url)
    test_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.pop(get_db, None)
    asyncio.run(test_engine.dispose())
    reset_engine()


# ---------------------------------------------------------------------------
# Class-scoped deterministic setup fixture
# ---------------------------------------------------------------------------


@pytest.fixture(scope="class")
def deterministic_setup(client, request):
    """Create the deterministic_events table, insert rows, register the
    connection via the API, and configure the schema.  Tears everything down
    after the test class finishes."""
    from backend.tests.deterministic.dataset import TABLE_NAME
    from backend.tests.deterministic.loader import (
        close_connection,
        create_table,
        drop_table,
        insert_rows,
        open_write_connection,
    )

    cls = request.cls
    db_type = cls.db_type

    if DET_CONFIG is None:
        pytest.skip("connections.yaml not found — integration tests require it")

    cfg = DET_CONFIG.get(db_type, {})

    if not cfg.get("enabled", False):
        pytest.skip(f"backend '{db_type}' not enabled in connections.yaml")

    # --- CREATE TABLE + INSERT ---
    backend_obj, conn = open_write_connection(db_type, cfg["credentials"])
    try:
        create_table(backend_obj, conn)
        insert_rows(backend_obj, conn)
    except Exception:
        with contextlib.suppress(Exception):
            close_connection(backend_obj, conn)
        raise
    # Close the write connection immediately so the API can open a read connection
    # to the same file (DuckDB forbids mixed read/write configs on the same file).
    close_connection(backend_obj, conn)
    conn = None

    # --- Register connection via API ---
    r = client.post(
        "/api/connections/",
        json={
            "name": f"det-{db_type}",
            "db_type": db_type,
            "credentials": cfg["credentials"],
        },
    )
    assert r.status_code == 201, f"Failed to create connection: {r.text}"
    connection_id = r.json()["id"]
    cls.connection_id = connection_id

    # --- Configure schema ---
    # custom_properties use dot-path notation: "properties.key"
    # _resolve_path_to_sql in analytics_db.py converts this to the correct
    # dialect-specific JSON extraction expression at query time.
    r = client.put(
        f"/api/connections/{connection_id}/schema",
        json={
            "events_table": TABLE_NAME,
            "user_id_field": "user_id",
            "timestamp_field": "timestamp",
            "event_name_field": "event_name",
            "custom_properties": [
                {"name": "country", "path": "properties.country", "type": "string"},
                {"name": "city", "path": "properties.city", "type": "string"},
                {
                    "name": "device_type",
                    "path": "properties.device_type",
                    "type": "string",
                },
            ],
        },
    )
    assert r.status_code == 200, f"Schema config failed: {r.text}"

    yield  # tests run here

    # --- Teardown ---
    # Reopen a write connection to drop the table.
    with contextlib.suppress(Exception):
        teardown_backend, teardown_conn = open_write_connection(
            db_type, cfg["credentials"]
        )
        drop_table(teardown_backend, teardown_conn)
        close_connection(teardown_backend, teardown_conn)
    client.delete(f"/api/connections/{connection_id}")
    cls.connection_id = None


# ---------------------------------------------------------------------------
# Dialect mapping + JSON expression helper
# ---------------------------------------------------------------------------

_DB_TYPE_TO_DIALECT: dict[str, str] = {
    "duckdb": "duckdb",
    "sqlite": "sqlite",
    "postgresql": "postgres",
    "clickhouse": "clickhouse",
    "snowflake": "snowflake",
    "databricks": "databricks",
}


def _json_expr(db_type: str, key: str) -> str:
    """Return a SQL expression that extracts *key* from the ``properties``
    JSON column, using the correct syntax for *db_type*."""
    from backend.services.sql_builder import json_extract_string

    dialect = _DB_TYPE_TO_DIALECT[db_type]
    return json_extract_string("properties", key, dialect)
