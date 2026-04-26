"""Bootstrap a sample DuckDB connection into the product DB.

Run after seed-duckdb on first Docker startup. Idempotent — safe to call
multiple times; skips insertion if "Sample DuckDB" already exists.

Usage:
    python -m seeders.bootstrap_connection
    python -m seeders.bootstrap_connection --path /data/sample.duckdb
"""

import argparse
import asyncio
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.analytics.product_db.database import get_session_factory, init_product_db
from services.analytics.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterConfig,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)
from services.analytics.services.crypto import decrypt_credentials, encrypt_credentials

CONNECTION_NAME = "Sample DuckDB"
DEFAULT_PATH = "/data/sample.duckdb"

# Custom properties extracted from the seeded events' properties JSON column
CUSTOM_PROPERTIES = [
    {"name": "country", "path": "context.country", "type": "string"},
    {"name": "city", "path": "context.city", "type": "string"},
    {"name": "device_type", "path": "context.device_type", "type": "string"},
    {"name": "browser", "path": "context.browser", "type": "string"},
    {"name": "os", "path": "context.os", "type": "string"},
    {"name": "referrer", "path": "context.referrer", "type": "string"},
]

# Filter dimensions shown in the global filter bar
FILTER_FIELDS = [
    {"field": "country", "label": "Country", "icon": "globe"},
    {"field": "city", "label": "City", "icon": "map-pin"},
]


async def _bootstrap(db_path: str) -> None:
    await init_product_db()
    factory = get_session_factory()
    async with factory() as session:
        await _upsert_connection(session, db_path)


async def _upsert_connection(session: AsyncSession, db_path: str) -> None:
    result = await session.execute(
        select(Connection).where(Connection.name == CONNECTION_NAME)
    )
    existing = result.scalar_one_or_none()

    if existing:
        try:
            creds = decrypt_credentials(existing.credentials_encrypted)
        except Exception:
            creds = {}
        if creds.get("file_path") == db_path:
            print(
                f"[stratifio] Connection '{CONNECTION_NAME}' already exists — skipping."
            )
            return
        existing.credentials_encrypted = encrypt_credentials({"file_path": db_path})
        await session.commit()
        print(f"[stratifio] Updated credentials for '{CONNECTION_NAME}' → {db_path}")
        return

    conn_id = str(uuid.uuid4())
    schema_id = str(uuid.uuid4())
    filter_id = str(uuid.uuid4())
    now = datetime.now(UTC).replace(tzinfo=None)

    connection = Connection(
        id=conn_id,
        name=CONNECTION_NAME,
        db_type="duckdb",
        credentials_encrypted=encrypt_credentials({"file_path": db_path}),
        created_at=now,
        updated_at=now,
    )
    schema_config = ConnectionSchemaConfig(
        id=schema_id,
        connection_id=conn_id,
        updated_at=now,
        custom_properties=[
            ConnectionCustomProperty(
                id=str(uuid.uuid4()),
                schema_config_id=schema_id,
                name=p["name"],
                path=p["path"],
                type=p["type"],
                sort_order=i,
            )
            for i, p in enumerate(CUSTOM_PROPERTIES)
        ],
    )
    filter_config = ConnectionFilterConfig(
        id=filter_id,
        connection_id=conn_id,
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
            for i, f in enumerate(FILTER_FIELDS)
        ],
    )
    # Add pinned metrics (empty by default)
    schema_config.pinned_metrics = []

    session.add(connection)
    session.add(schema_config)
    session.add(filter_config)
    await session.commit()
    print(f"[stratifio] Bootstrapped connection '{CONNECTION_NAME}' → {db_path}")


def bootstrap(db_path: str = DEFAULT_PATH) -> None:
    """Insert the sample DuckDB connection if it doesn't already exist."""
    asyncio.run(_bootstrap(db_path))


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap sample DuckDB connection")
    parser.add_argument(
        "--path",
        default=DEFAULT_PATH,
        help=f"Path to the DuckDB file (default: {DEFAULT_PATH})",
    )
    args = parser.parse_args()
    bootstrap(args.path)


if __name__ == "__main__":
    main()
