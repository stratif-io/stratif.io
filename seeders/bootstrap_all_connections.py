"""Bootstrap every enabled connection in connections.yaml into the product DB.

For each backend with `enabled: true`:
  1. Run its seeder to (re)create the events table and load sample data.
  2. Upsert a `Connection` row (credentials from YAML, encrypted).
  3. Open the backend and run schema detection.
  4. Persist detected field mappings as `ConnectionSchemaConfig`
     and proposed nested paths as `ConnectionCustomProperty` rows.
  5. Auto-select the first N string-typed proposed properties as
     global `ConnectionFilterField` rows.

Idempotent — existing connections (matched by name) are updated in place.

Usage:
    python -m seeders.bootstrap_all_connections
    python -m seeders.bootstrap_all_connections --yaml /path/to/connections.yaml
    python -m seeders.bootstrap_all_connections --backend duckdb
    python -m seeders.bootstrap_all_connections --skip-seed
"""

from __future__ import annotations

import argparse
import asyncio
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.connections.schema_detect import _suggest_fields, assign_categories
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

AUTO_FILTER_NAMES = ("country", "city")
AUTO_FILTER_ICONS = {"country": "globe", "city": "map-pin"}

# Backends excluded from bootstrap regardless of connections.yaml `enabled` flag.
SKIP_BACKENDS: frozenset[str] = frozenset({"snowflake"})

DISPLAY_NAMES = {
    "duckdb": "Sample DuckDB",
    "sqlite": "Sample SQLite",
    "postgresql": "Sample PostgreSQL",
    "clickhouse": "Sample ClickHouse",
    "databricks": "Sample Databricks",
}

SEEDER_MODULES = {
    "duckdb": "seeders.seeder_duckdb",
    "sqlite": "seeders.seeder_sqlite",
    "postgresql": "seeders.seeder_postgresql",
    "clickhouse": "seeders.seeder_clickhouse",
    "databricks": "seeders.seeder_databricks",
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
        info = backend.detect_schema(conn, None)
    finally:
        conn.close()

    # Augment with fuzzy identity-field detection, mirroring the API endpoint.
    # The backend only matches top-level columns; this also searches nested paths.
    all_cols = [{"name": c.name, "type": c.type} for c in info.columns] + [
        {"name": p["path"], "type": p["type"]} for p in info.proposed_custom_properties
    ]
    fuzzy_suggestions = _suggest_fields(all_cols)
    # Backend exact matches take priority; fill in any fields the backend missed.
    info.suggestions = {**fuzzy_suggestions, **info.suggestions}
    return info


def _select_filter_fields(proposed: list[dict]) -> list[dict]:
    by_name = {p["name"]: p for p in proposed if p.get("type") == "string"}
    picked: list[dict] = []
    for name in AUTO_FILTER_NAMES:
        if name not in by_name:
            continue
        picked.append(
            {
                "field": name,
                "label": name.replace("_", " ").title(),
                "icon": AUTO_FILTER_ICONS.get(name, "filter"),
            }
        )
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
            category=p.get("category"),
            sort_order=i,
        )
        for i, p in enumerate(assign_categories(info.proposed_custom_properties))
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


def _run_seeder(db_type: str) -> None:
    module_name = SEEDER_MODULES.get(db_type)
    if module_name is None:
        print(f"[stratifio] No seeder registered for '{db_type}' — skipping seed step")
        return
    import importlib

    module = importlib.import_module(module_name)
    print(f"[stratifio] Running seeder for '{db_type}'")
    module.main()


async def _bootstrap(
    yaml_path: Path | None,
    only: str | None = None,
    skip_seed: bool = False,
) -> None:
    cfg = load_connections_yaml(yaml_path)
    backends_cfg: dict = cfg.get("backends", {}) or {}

    if only is not None and only not in backends_cfg:
        raise SystemExit(
            f"Backend '{only}' not found in connections.yaml. "
            f"Available: {sorted(backends_cfg.keys())}"
        )

    await init_product_db()
    factory = get_session_factory()

    for db_type, entry in backends_cfg.items():
        if only is not None and db_type != only:
            continue
        if db_type in SKIP_BACKENDS:
            print(f"[stratifio] Skipping '{db_type}' (excluded from bootstrap)")
            continue
        if not entry or not entry.get("enabled"):
            if only is not None:
                print(f"[stratifio] '{db_type}' is not enabled in connections.yaml")
            continue
        try:
            get_backend(db_type)
        except ValueError:
            print(f"[stratifio] Skipping '{db_type}': no registered backend")
            continue

        creds = entry.get("credentials") or {}

        if not skip_seed:
            try:
                _run_seeder(db_type)
            except Exception as exc:
                print(f"[stratifio] Seeder failed for '{db_type}': {exc}")
                continue

        try:
            info = _detect(db_type, creds)
        except Exception as exc:
            print(f"[stratifio] Schema detection failed for '{db_type}': {exc}")
            continue

        async with factory() as session:
            await _upsert_one(session, db_type, creds, info)


def bootstrap(
    yaml_path: Path | None = None,
    only: str | None = None,
    skip_seed: bool = False,
) -> None:
    """Bootstrap enabled connections declared in connections.yaml.

    Args:
        yaml_path: Path to connections.yaml (default: project root).
        only: If set, only this backend is bootstrapped.
        skip_seed: If True, skip the seeder step and only run detection + persist.
    """
    asyncio.run(_bootstrap(yaml_path, only=only, skip_seed=skip_seed))


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
    parser.add_argument(
        "--backend",
        default=None,
        help="Bootstrap only this backend (e.g. duckdb, postgresql, snowflake)",
    )
    parser.add_argument(
        "--skip-seed",
        action="store_true",
        help="Skip running seeders; only detect schema and persist connection config",
    )
    args = parser.parse_args()
    bootstrap(args.yaml, only=args.backend, skip_seed=args.skip_seed)


if __name__ == "__main__":
    main()
