"""CRUD endpoints for the Connections API."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from backend.core.rate_limit import limiter
from backend.product_db.deps import DBSession
from backend.product_db.models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterConfig,
    ConnectionFilterField,
    ConnectionSchemaConfig,
)
from backend.services import query_cache
from backend.services.crypto import decrypt_credentials, encrypt_credentials

from .models import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionUpdate,
    FilterConfigBody,
    FilterConfigResponse,
    SchemaConfigBody,
    SchemaConfigResponse,
)

router = APIRouter()


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def _get_connection_or_404(conn_id: str, session) -> Connection:
    conn = await session.get(Connection, conn_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


# ---------------------------------------------------------------------------
# Connection CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[ConnectionResponse])
async def list_connections(session: DBSession):
    result = await session.execute(
        select(Connection).order_by(Connection.created_at.desc())
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "db_type": c.db_type,
            "created_at": _fmt(c.created_at),
            "updated_at": _fmt(c.updated_at),
        }
        for c in result.scalars().all()
    ]


@router.post(
    "/", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED
)
async def create_connection(body: ConnectionCreate, session: DBSession):
    now = _now()
    encrypted = encrypt_credentials(body.credentials)
    conn = Connection(
        id=str(uuid.uuid4()),
        name=body.name,
        db_type=body.db_type,
        credentials_encrypted=encrypted,
        created_at=now,
        updated_at=now,
    )
    session.add(conn)
    await session.commit()
    return {
        "id": conn.id,
        "name": conn.name,
        "db_type": conn.db_type,
        "created_at": _fmt(conn.created_at),
        "updated_at": _fmt(conn.updated_at),
    }


@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_connection(conn_id: str, session: DBSession):
    conn = await _get_connection_or_404(conn_id, session)
    return {
        "id": conn.id,
        "name": conn.name,
        "db_type": conn.db_type,
        "created_at": _fmt(conn.created_at),
        "updated_at": _fmt(conn.updated_at),
    }


@router.patch("/{conn_id}", response_model=ConnectionResponse)
async def update_connection(conn_id: str, body: ConnectionUpdate, session: DBSession):
    conn = await _get_connection_or_404(conn_id, session)
    if body.name is not None:
        conn.name = body.name
    if body.credentials is not None:
        existing = decrypt_credentials(conn.credentials_encrypted)
        merged = {**existing, **body.credentials}
        conn.credentials_encrypted = encrypt_credentials(merged)
    conn.updated_at = _now()
    await session.commit()
    return {
        "id": conn.id,
        "name": conn.name,
        "db_type": conn.db_type,
        "created_at": _fmt(conn.created_at),
        "updated_at": _fmt(conn.updated_at),
    }


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(conn_id: str, session: DBSession):
    conn = await _get_connection_or_404(conn_id, session)
    await session.delete(conn)
    await session.commit()


@router.post("/{conn_id}/test")
@limiter.limit("10/minute")
async def test_connection(
    request: Request, response: Response, conn_id: str, session: DBSession
):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    from backend.backends import get_backend

    conn = await _get_connection_or_404(conn_id, session)

    def _do_test():
        backend = get_backend(conn.db_type)
        creds = decrypt_credentials(conn.credentials_encrypted)
        credentials = backend.parse_credentials(creds)
        c = backend.open(credentials, read_only=True)
        backend.execute(c, "SELECT 1", None)
        c.close()

    # Databricks SQL warehouses can take 30-60s to start from a cold state.
    # Other engines connect near-instantly, so 10s is plenty for them.
    timeout_s = 90 if conn.db_type == "databricks" else 10
    try:
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as pool:
            await asyncio.wait_for(
                loop.run_in_executor(pool, _do_test), timeout=timeout_s
            )
        return {"ok": True, "db_type": conn.db_type}
    except TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail=f"Connection timed out after {timeout_s} seconds",
        ) from None
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


# ---------------------------------------------------------------------------
# Schema config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/schema", response_model=SchemaConfigResponse | None)
async def get_schema_config(conn_id: str, session: DBSession):
    await _get_connection_or_404(conn_id, session)
    result = await session.execute(
        select(ConnectionSchemaConfig)
        .options(selectinload(ConnectionSchemaConfig.custom_properties))
        .where(ConnectionSchemaConfig.connection_id == conn_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return None
    return _schema_config_response(config)


@router.put("/{conn_id}/schema", response_model=SchemaConfigResponse)
async def upsert_schema_config(
    conn_id: str, body: SchemaConfigBody, session: DBSession
):
    await _get_connection_or_404(conn_id, session)

    result = await session.execute(
        select(ConnectionSchemaConfig).where(
            ConnectionSchemaConfig.connection_id == conn_id
        )
    )
    config = result.scalar_one_or_none()
    now = _now()

    if config is None:
        config = ConnectionSchemaConfig(id=str(uuid.uuid4()), connection_id=conn_id)
        session.add(config)

    config.user_id_field = body.user_id_field
    config.timestamp_field = body.timestamp_field
    config.event_name_field = body.event_name_field
    config.events_table = body.events_table
    config.session_timeout_minutes = body.session_timeout_minutes
    config.resurrection_window_days = body.resurrection_window_days
    config.power_user_threshold_days = body.power_user_threshold_days
    config.query_timeout_seconds = body.query_timeout_seconds
    config.max_concurrent_queries = body.max_concurrent_queries
    config.email_field = body.email_field
    config.first_name_field = body.first_name_field
    config.last_name_field = body.last_name_field
    config.date_of_birth_field = body.date_of_birth_field
    config.phone_field = body.phone_field
    config.updated_at = now

    await session.flush()

    await session.execute(
        delete(ConnectionCustomProperty).where(
            ConnectionCustomProperty.schema_config_id == config.id
        )
    )
    saved_props = []
    for i, prop in enumerate(body.custom_properties):
        prop_id = prop.id if prop.id else str(uuid.uuid4())
        saved_props.append(prop_id)
        session.add(
            ConnectionCustomProperty(
                id=prop_id,
                schema_config_id=config.id,
                name=prop.name,
                path=prop.path,
                type=prop.type,
                category=prop.category,
                sort_order=i,
            )
        )

    await session.commit()
    query_cache.invalidate(conn_id)

    return {
        **body.model_dump(exclude={"custom_properties"}),
        "id": config.id,
        "connection_id": config.connection_id,
        "updated_at": _fmt(config.updated_at),
        "custom_properties": [
            {
                "id": prop_id,
                "name": prop.name,
                "path": prop.path,
                "type": prop.type,
                "category": prop.category,
            }
            for prop_id, prop in zip(saved_props, body.custom_properties, strict=True)
        ],
    }


# ---------------------------------------------------------------------------
# Filter config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filters", response_model=FilterConfigResponse | None)
async def get_filter_config(conn_id: str, session: DBSession):
    await _get_connection_or_404(conn_id, session)
    result = await session.execute(
        select(ConnectionFilterConfig)
        .options(selectinload(ConnectionFilterConfig.filter_fields))
        .where(ConnectionFilterConfig.connection_id == conn_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return None
    return {
        "id": config.id,
        "connection_id": config.connection_id,
        "filter_fields": [
            {"ref": f.ref, "field": f.field, "label": f.label, "icon": f.icon}
            for f in sorted(config.filter_fields, key=lambda x: x.sort_order)
        ],
        "updated_at": _fmt(config.updated_at),
    }


@router.put("/{conn_id}/filters", response_model=FilterConfigResponse)
async def upsert_filter_config(
    conn_id: str, body: FilterConfigBody, session: DBSession
):
    await _get_connection_or_404(conn_id, session)

    result = await session.execute(
        select(ConnectionFilterConfig).where(
            ConnectionFilterConfig.connection_id == conn_id
        )
    )
    config = result.scalar_one_or_none()
    now = _now()

    if config is None:
        config = ConnectionFilterConfig(id=str(uuid.uuid4()), connection_id=conn_id)
        session.add(config)

    config.updated_at = now

    await session.flush()

    await session.execute(
        delete(ConnectionFilterField).where(
            ConnectionFilterField.filter_config_id == config.id
        )
    )
    for i, field in enumerate(body.filter_fields):
        session.add(
            ConnectionFilterField(
                id=str(uuid.uuid4()),
                filter_config_id=config.id,
                field=field.field,
                ref=field.ref,
                label=field.label,
                icon=field.icon,
                sort_order=i,
            )
        )

    await session.commit()

    return {
        "id": config.id,
        "connection_id": config.connection_id,
        "filter_fields": [f.model_dump() for f in body.filter_fields],
        "updated_at": _fmt(config.updated_at),
    }


# ---------------------------------------------------------------------------
# Filter options (live from analytics DB)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filter-options")
async def get_filter_options(conn_id: str, session: DBSession):
    from backend.backends import _REGISTRY
    from backend.services.analytics_db import open_analytics_db

    await _get_connection_or_404(conn_id, session)
    db = await open_analytics_db(conn_id, session, _REGISTRY)
    try:
        return db.get_filter_options()
    finally:
        db.close()


@router.get("/{conn_id}/field-options")
async def get_field_options(conn_id: str, field: str, session: DBSession):
    from backend.backends import _REGISTRY
    from backend.services.analytics_db import open_analytics_db

    await _get_connection_or_404(conn_id, session)
    db = await open_analytics_db(conn_id, session, _REGISTRY)
    try:
        return {"field": field, "values": db.get_field_options(field)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Connection string (read-only, password redacted)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/string")
async def get_connection_string(conn_id: str, session: DBSession):
    from backend.backends import get_backend

    conn = await _get_connection_or_404(conn_id, session)
    try:
        creds = decrypt_credentials(conn.credentials_encrypted)
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials") from None
    backend = get_backend(conn.db_type)
    credentials = backend.parse_credentials(creds)
    return {"connection_string": backend.connection_string(credentials)}


# ---------------------------------------------------------------------------
# Credentials (masked)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/credentials")
async def get_connection_credentials(conn_id: str, session: DBSession):
    conn = await _get_connection_or_404(conn_id, session)
    try:
        creds = decrypt_credentials(conn.credentials_encrypted)
        return {
            "fields": {
                k: (
                    None
                    if "password" in k.lower()
                    or "token" in k.lower()
                    or "secret" in k.lower()
                    else v
                )
                for k, v in creds.items()
            }
        }
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials") from None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _schema_config_response(config: ConnectionSchemaConfig) -> dict:
    return {
        "id": config.id,
        "connection_id": config.connection_id,
        "user_id_field": config.user_id_field,
        "timestamp_field": config.timestamp_field,
        "event_name_field": config.event_name_field,
        "events_table": config.events_table,
        "session_timeout_minutes": config.session_timeout_minutes,
        "resurrection_window_days": config.resurrection_window_days,
        "power_user_threshold_days": config.power_user_threshold_days,
        "query_timeout_seconds": config.query_timeout_seconds,
        "max_concurrent_queries": config.max_concurrent_queries,
        "email_field": config.email_field,
        "first_name_field": config.first_name_field,
        "last_name_field": config.last_name_field,
        "date_of_birth_field": config.date_of_birth_field,
        "phone_field": config.phone_field,
        "custom_properties": [
            {
                "id": p.id,
                "name": p.name,
                "path": p.path,
                "type": p.type,
                "category": p.category,
            }
            for p in sorted(config.custom_properties, key=lambda x: x.sort_order)
        ],
        "updated_at": _fmt(config.updated_at),
    }
