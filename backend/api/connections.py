"""Connections API — manage database connections and their schema/filter configs."""

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials, encrypt_credentials

router = APIRouter(prefix="/api/connections", tags=["connections"])

DbType = Literal["duckdb", "databricks", "postgresql", "sqlite"]

_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_connection_or_404(conn_id: str):
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    return row


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CustomProperty(BaseModel):
    name: str
    path: str
    type: Literal["string", "number", "boolean", "timestamp"]

    @field_validator("path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        if not _PATH_RE.match(v):
            raise ValueError("path must match ^[a-zA-Z_][a-zA-Z0-9_.]*$")
        return v

    model_config = {"extra": "ignore"}


class ConnectionCreate(BaseModel):
    name: str
    db_type: DbType
    credentials: dict[str, Any]


class ConnectionUpdate(BaseModel):
    name: str | None = None
    credentials: dict[str, Any] | None = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    db_type: str
    created_at: str
    updated_at: str


class SchemaConfigBody(BaseModel):
    user_id_field: str = "user_id"
    timestamp_field: str = "timestamp"
    event_name_field: str = "event_name"
    events_table: str = "events"
    custom_properties: list[CustomProperty] = []
    session_timeout_minutes: int = 30


class SchemaConfigResponse(SchemaConfigBody):
    id: str
    connection_id: str
    updated_at: str


class FilterField(BaseModel):
    field: str
    label: str
    icon: str = "filter"


class FilterConfigBody(BaseModel):
    filter_fields: list[FilterField] = []


class FilterConfigResponse(FilterConfigBody):
    id: str
    connection_id: str
    updated_at: str


# ---------------------------------------------------------------------------
# Connection CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ConnectionResponse])
async def list_connections():
    db = get_product_db()
    rows = db.fetchall(
        "SELECT id, name, db_type, created_at, updated_at FROM connections ORDER BY created_at DESC"
    )
    return [dict(r) for r in rows]


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
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
    encrypted = encrypt_credentials(body.credentials) if body.credentials is not None else row["credentials_encrypted"]
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
    from backend.services.connection_executor import open_analytics_db

    _get_connection_or_404(conn_id)
    try:
        db = open_analytics_db(conn_id)
        db.execute("SELECT 1")
        db.close()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


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
            events_table, custom_properties, session_timeout_minutes, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(connection_id) DO UPDATE SET
             user_id_field = excluded.user_id_field,
             timestamp_field = excluded.timestamp_field,
             event_name_field = excluded.event_name_field,
             events_table = excluded.events_table,
             custom_properties = excluded.custom_properties,
             session_timeout_minutes = excluded.session_timeout_minutes,
             updated_at = excluded.updated_at""",
        (config_id, conn_id, body.user_id_field, body.timestamp_field,
         body.event_name_field, body.events_table, custom_props_json,
         body.session_timeout_minutes, now),
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
    from backend.services.connection_executor import open_analytics_db

    _get_connection_or_404(conn_id)
    db = open_analytics_db(conn_id)
    try:
        return db.get_filter_options()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Browse (catalog → schema → table hierarchy)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/browse")
async def browse_connection(
    conn_id: str,
    catalog: str | None = None,
    schema: str | None = None,
):
    from backend.services.connection_executor import open_analytics_db

    row = _get_connection_or_404(conn_id)
    db_type: str = row["db_type"]
    db = open_analytics_db(conn_id)
    try:
        items: list[dict] = []

        if db_type == "databricks":
            if catalog is None:
                rows = db.execute("SHOW CATALOGS")
                items = [{"name": r[0], "full_name": r[0], "kind": "catalog"} for r in rows]
            elif schema is None:
                rows = db.execute(f"SHOW SCHEMAS IN `{catalog}`")
                items = [{"name": r[1], "full_name": f"{catalog}.{r[1]}", "kind": "schema"} for r in rows]
            else:
                rows = db.execute(f"SHOW TABLES IN `{catalog}`.`{schema}`")
                items = [{"name": r[1], "full_name": f"{catalog}.{schema}.{r[1]}", "kind": "table"} for r in rows]

        elif db_type == "postgresql":
            if schema is None:
                rows = db.execute(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1"
                )
                items = [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
            else:
                rows = db.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = %s ORDER BY 1",
                    [schema],
                )
                items = [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]

        elif db_type == "duckdb":
            if schema is None:
                rows = db.execute("SELECT schema_name FROM information_schema.schemata ORDER BY 1")
                items = [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
            else:
                rows = db.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY 1",
                    [schema],
                )
                items = [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]

        else:  # sqlite
            rows = db.execute("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
            items = [{"name": r[0], "full_name": r[0], "kind": "table"} for r in rows]

        return {"items": items}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Credentials (masked)
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/credentials")
async def get_connection_credentials(conn_id: str):
    row = _get_connection_or_404(conn_id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
        return {"fields": {k: ("*" * 8 if "password" in k.lower() or "token" in k.lower() or "secret" in k.lower() else v)
                           for k, v in creds.items()}}
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials")
