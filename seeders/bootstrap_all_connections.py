"""Bootstrap every enabled connection in connections.yaml into the product DB.

For each backend with `enabled: true`:
  1. Upsert a `Connection` row (credentials from YAML, encrypted).
  2. Open the backend and run schema detection.
  3. Persist detected field mappings as `ConnectionSchemaConfig`
     and proposed nested paths as `ConnectionCustomProperty` rows.
  4. Auto-select the first N string-typed proposed properties as
     global `ConnectionFilterField` rows.

Idempotent — existing connections (matched by name) are updated in place.

Usage:
    python -m seeders.bootstrap_all_connections
    python -m seeders.bootstrap_all_connections --yaml /path/to/connections.yaml
"""

from __future__ import annotations

import argparse
import asyncio
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.backends import get_backend
from backend.backends.base import SchemaInfo
from backend.product_db.database import get_session_factory, init_product_db
from backend.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterConfig,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)
from backend.services.crypto import encrypt_credentials
from seeders.connections_config import load_connections_yaml

MAX_AUTO_FILTERS = 5

DISPLAY_NAMES = {
    "duckdb": "Sample DuckDB",
    "sqlite": "Sample SQLite",
    "postgresql": "Sample PostgreSQL",
    "clickhouse": "Sample ClickHouse",
    "snowflake": "Sample Snowflake",
    "databricks": "Sample Databricks",
}

SCHEMA_SUGGESTION_FIELDS = (
    "user_id_field",
    "timestamp_field",
    "event_name_field",
    "email_field",
    "first_name_field",
    "last_name_field",
    "date_of_birth_field",
    "phone_field",
)


def _display_name(db_type: str) -> str:
    return DISPLAY_NAMES.get(db_type, f"Sample {db_type}")


def _detect(db_type: str, creds: dict) -> SchemaInfo:
    backend = get_backend(db_type)
    credentials = backend.parse_credentials(creds)
    conn = backend.open(credentials, read_only=True)
    try:
        return backend.detect_schema(conn, None)
    finally:
        conn.close()


def _select_filter_fields(proposed: list[dict]) -> list[dict]:
    picked: list[dict] = []
    for p in proposed:
        if p.get("type") != "string":
            continue
        label = p["name"].replace("_", " ").title()
        picked.append({"field": p["name"], "label": label, "icon": "filter"})
        if len(picked) >= MAX_AUTO_FILTERS:
            break
    return picked


async def _upsert_one(
    session: AsyncSession, db_type: str, creds: dict, info: SchemaInfo
) -> None:
    name = _display_name(db_type)
    now = datetime.now(UTC).replace(tzinfo=None)
    encrypted = encrypt_credentials(creds)

    existing = (
        await session.execute(select(Connection).where(Connection.name == name))
    ).scalar_one_or_none()

    if existing is not None:
        existing.db_type = db_type
        existing.credentials_encrypted = encrypted
        existing.updated_at = now
        await _replace_schema_config(session, existing.id, info, now)
        await _replace_filter_config(session, existing.id, info, now)
        await session.commit()
        print(f"[stratifio] Updated '{name}'")
        return

    conn_id = str(uuid.uuid4())
    session.add(
        Connection(
            id=conn_id,
            name=name,
            db_type=db_type,
            credentials_encrypted=encrypted,
            created_at=now,
            updated_at=now,
        )
    )
    await _replace_schema_config(session, conn_id, info, now)
    await _replace_filter_config(session, conn_id, info, now)
    await session.commit()
    print(f"[stratifio] Bootstrapped '{name}'")


async def _replace_schema_config(
    session: AsyncSession, connection_id: str, info: SchemaInfo, now: datetime
) -> None:
    existing = (
        await session.execute(
            select(ConnectionSchemaConfig).where(
                ConnectionSchemaConfig.connection_id == connection_id
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        await session.delete(existing)
        await session.flush()

    schema_id = str(uuid.uuid4())
    schema_config = ConnectionSchemaConfig(
        id=schema_id,
        connection_id=connection_id,
        events_table=info.events_table or "events",
        updated_at=now,
    )
    for field in SCHEMA_SUGGESTION_FIELDS:
        value = info.suggestions.get(field)
        if value:
            setattr(schema_config, field, value)

    schema_config.custom_properties = [
        ConnectionCustomProperty(
            id=str(uuid.uuid4()),
            schema_config_id=schema_id,
            name=p["name"],
            path=p["path"],
            type=p.get("type", "string"),
            sort_order=i,
        )
        for i, p in enumerate(info.proposed_custom_properties)
    ]
    session.add(schema_config)


async def _replace_filter_config(
    session: AsyncSession, connection_id: str, info: SchemaInfo, now: datetime
) -> None:
    existing = (
        await session.execute(
            select(ConnectionFilterConfig).where(
                ConnectionFilterConfig.connection_id == connection_id
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        await session.delete(existing)
        await session.flush()

    filter_id = str(uuid.uuid4())
    filter_config = ConnectionFilterConfig(
        id=filter_id,
        connection_id=connection_id,
        updated_at=now,
        filter_fields=[
            ConnectionFilterField(
                id=str(uuid.uuid4()),
                filter_config_id=filter_id,
                field=f["field"],
                label=f["label"],
                icon=f["icon"],
                sort_order=i,
            )
            for i, f in enumerate(
                _select_filter_fields(info.proposed_custom_properties)
            )
        ],
    )
    session.add(filter_config)


async def _bootstrap(yaml_path: Path | None) -> None:
    cfg = load_connections_yaml(yaml_path)
    backends_cfg: dict = cfg.get("backends", {}) or {}

    await init_product_db()
    factory = get_session_factory()

    for db_type, entry in backends_cfg.items():
        if not entry or not entry.get("enabled"):
            continue
        try:
            get_backend(db_type)
        except ValueError:
            print(f"[stratifio] Skipping '{db_type}': no registered backend")
            continue

        creds = entry.get("credentials") or {}
        try:
            info = _detect(db_type, creds)
        except Exception as exc:
            print(f"[stratifio] Schema detection failed for '{db_type}': {exc}")
            continue

        async with factory() as session:
            await _upsert_one(session, db_type, creds, info)


def bootstrap(yaml_path: Path | None = None) -> None:
    """Bootstrap every enabled connection declared in connections.yaml."""
    asyncio.run(_bootstrap(yaml_path))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap all enabled connections from connections.yaml"
    )
    parser.add_argument(
        "--yaml",
        type=Path,
        default=None,
        help="Path to connections.yaml (default: <project_root>/connections.yaml)",
    )
    args = parser.parse_args()
    bootstrap(args.yaml)


if __name__ == "__main__":
    main()
