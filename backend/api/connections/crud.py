"""CRUD endpoints for the Connections API."""

import json
import uuid

from fastapi import APIRouter, HTTPException, status

from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials, encrypt_credentials
from backend.utils import utcnow_str as _now

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


def _get_connection_or_404(conn_id: str):
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    return row


# ---------------------------------------------------------------------------
# Connection CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[ConnectionResponse])
async def list_connections():
    db = get_product_db()
    rows = db.fetchall(
        "SELECT id, name, db_type, created_at, updated_at FROM connections ORDER BY created_at DESC"
    )
    return [dict(r) for r in rows]


@router.post("/", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(body: ConnectionCreate):
    db = get_product_db()
    conn_id = str(uuid.uuid4())
    now = _now()
    encrypted = encrypt_credentials(body.credentials)
    db.execute(
        "INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conn_id, body.name, body.db_type, encrypted, now, now),
    )
    return {"id": conn_id, "name": body.name, "db_type": body.db_type, "created_at": now, "updated_at": now}


@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_connection(conn_id: str):
    row = _get_connection_or_404(conn_id)
    return {"id": row["id"], "name": row["name"], "db_type": row["db_type"],
            "created_at": row["created_at"], "updated_at": row["updated_at"]}


@router.patch("/{conn_id}", response_model=ConnectionResponse)
async def update_connection(conn_id: str, body: ConnectionUpdate):
    row = _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    name = body.name if body.name is not None else row["name"]
    if body.credentials is not None:
        # Merge partial credentials with existing ones so omitted fields (e.g. passwords) are preserved.
        existing = decrypt_credentials(row["credentials_encrypted"])
        merged = {**existing, **body.credentials}
        encrypted = encrypt_credentials(merged)
    else:
        encrypted = row["credentials_encrypted"]
    db.execute(
        "UPDATE connections SET name = ?, credentials_encrypted = ?, updated_at = ? WHERE id = ?",
        (name, encrypted, now, conn_id),
    )
    return {"id": conn_id, "name": name, "db_type": row["db_type"], "created_at": row["created_at"], "updated_at": now}


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(conn_id: str):
    _get_connection_or_404(conn_id)
    get_product_db().execute("DELETE FROM connections WHERE id = ?", (conn_id,))


@router.post("/{conn_id}/test")
async def test_connection(conn_id: str):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from backend.backends import get_backend
    from backend.services.crypto import decrypt_credentials

    row = _get_connection_or_404(conn_id)

    def _do_test():
        backend = get_backend(row["db_type"])
        creds = decrypt_credentials(row["credentials_encrypted"])
        credentials = backend.parse_credentials(creds)
        conn = backend.open(credentials, read_only=True)
        backend.execute(conn, "SELECT 1", None)
        conn.close()

    try:
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as pool:
            await asyncio.wait_for(loop.run_in_executor(pool, _do_test), timeout=10)
        return {"ok": True, "db_type": row["db_type"]}
    except TimeoutError:
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="Connection timed out after 10 seconds")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# ---------------------------------------------------------------------------
# Schema config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/schema", response_model=SchemaConfigResponse | None)
async def get_schema_config(conn_id: str):
    _get_connection_or_404(conn_id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["custom_properties"] = json.loads(result["custom_properties"])
    return result


@router.put("/{conn_id}/schema", response_model=SchemaConfigResponse)
async def upsert_schema_config(conn_id: str, body: SchemaConfigBody):
    _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    config_id = str(uuid.uuid4())
    custom_props_json = json.dumps([p.model_dump() for p in body.custom_properties])
    db.execute(
        """INSERT INTO connection_schema_configs
           (id, connection_id, user_id_field, timestamp_field, event_name_field,
            events_table, custom_properties, session_timeout_minutes,
            resurrection_window_days, power_user_threshold_days, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(connection_id) DO UPDATE SET
             user_id_field = excluded.user_id_field,
             timestamp_field = excluded.timestamp_field,
             event_name_field = excluded.event_name_field,
             events_table = excluded.events_table,
             custom_properties = excluded.custom_properties,
             session_timeout_minutes = excluded.session_timeout_minutes,
             resurrection_window_days = excluded.resurrection_window_days,
             power_user_threshold_days = excluded.power_user_threshold_days,
             updated_at = excluded.updated_at""",
        (config_id, conn_id, body.user_id_field, body.timestamp_field,
         body.event_name_field, body.events_table, custom_props_json,
         body.session_timeout_minutes, body.resurrection_window_days,
         body.power_user_threshold_days, now),
    )
    return {**body.model_dump(), "id": config_id, "connection_id": conn_id,
            "updated_at": now, "custom_properties": [p.model_dump() for p in body.custom_properties]}


# ---------------------------------------------------------------------------
# Filter config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filters", response_model=FilterConfigResponse | None)
async def get_filter_config(conn_id: str):
    _get_connection_or_404(conn_id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["filter_fields"] = json.loads(result["filter_fields"])
    return result


@router.put("/{conn_id}/filters", response_model=FilterConfigResponse)
async def upsert_filter_config(conn_id: str, body: FilterConfigBody):
    _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    config_id = str(uuid.uuid4())
    fields_json = json.dumps([f.model_dump() for f in body.filter_fields])
    db.execute(
        """INSERT INTO connection_filter_configs (id, connection_id, filter_fields, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(connection_id) DO UPDATE SET
             filter_fields = excluded.filter_fields,
             updated_at = excluded.updated_at""",
        (config_id, conn_id, fields_json, now),
    )
    return {"id": config_id, "connection_id": conn_id,
            "filter_fields": [f.model_dump() for f in body.filter_fields], "updated_at": now}


# ---------------------------------------------------------------------------
# Filter options (live from analytics DB)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filter-options")
async def get_filter_options(conn_id: str):
    from backend.backends import _REGISTRY
    from backend.services.analytics_db import open_analytics_db

    _get_connection_or_404(conn_id)
    db = open_analytics_db(conn_id, get_product_db(), _REGISTRY)
    try:
        return db.get_filter_options()
    finally:
        db.close()


@router.get("/{conn_id}/field-options")
async def get_field_options(conn_id: str, field: str):
    from backend.backends import _REGISTRY
    from backend.services.analytics_db import open_analytics_db

    _get_connection_or_404(conn_id)
    db = open_analytics_db(conn_id, get_product_db(), _REGISTRY)
    try:
        return {"field": field, "values": db.get_field_options(field)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Connection string (read-only, password redacted)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/string")
async def get_connection_string(conn_id: str):
    from backend.backends import get_backend
    row = _get_connection_or_404(conn_id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials")
    backend = get_backend(row["db_type"])
    credentials = backend.parse_credentials(creds)
    return {"connection_string": backend.connection_string(credentials)}


# ---------------------------------------------------------------------------
# Credentials (masked)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/credentials")
async def get_connection_credentials(conn_id: str):
    row = _get_connection_or_404(conn_id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
        return {"fields": {k: (None if "password" in k.lower() or "token" in k.lower() or "secret" in k.lower() else v)
                           for k, v in creds.items()}}
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials")
