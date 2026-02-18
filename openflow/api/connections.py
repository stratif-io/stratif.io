"""Connections API — manage database connections and their schema/filter configs."""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user
from openflow.product_db import get_product_db
from openflow.services.crypto import decrypt_credentials, encrypt_credentials
from openflow.services.connection_executor import get_analytics_db
from openflow.config import get_settings
from openflow.db import get_db

router = APIRouter(prefix="/api/connections", tags=["connections"])

DbType = Literal["duckdb", "databricks", "postgresql", "sqlite"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_connection_or_404(conn_id: str, user_id: str):
    db = get_product_db()
    row = db.fetchone(
        "SELECT * FROM connections WHERE id = ? AND user_id = ?",
        (conn_id, user_id),
    )
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
            raise ValueError(
                "path must match ^[a-zA-Z_][a-zA-Z0-9_.]*$ to prevent injection"
            )
        return v

    model_config = {"extra": "ignore"}


class ConnectionCreate(BaseModel):
    name: str
    db_type: DbType
    credentials: dict[str, Any]


class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    credentials: Optional[dict[str, Any]] = None


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
    custom_properties: list[CustomProperty] = []
    session_timeout_minutes: int = 30


class SchemaConfigResponse(SchemaConfigBody):
    id: str
    connection_id: str
    updated_at: str


class FilterField(BaseModel):
    field: str
    label: str
    icon: str = "Tag"


class FilterConfigBody(BaseModel):
    filter_fields: list[FilterField]


class FilterConfigResponse(FilterConfigBody):
    id: str
    connection_id: str
    updated_at: str


# ---------------------------------------------------------------------------
# Connections CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ConnectionResponse])
def list_connections(current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    db = get_product_db()
    rows = db.fetchall(
        "SELECT id, name, db_type, created_at, updated_at FROM connections WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    return [dict(r) for r in rows]


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(body: ConnectionCreate, current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    conn_id = str(uuid.uuid4())
    now = _now()
    encrypted = encrypt_credentials(body.credentials)
    db = get_product_db()
    db.execute(
        "INSERT INTO connections (id, user_id, name, db_type, credentials_encrypted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (conn_id, user_id, body.name, body.db_type, encrypted, now, now),
    )
    return ConnectionResponse(
        id=conn_id, name=body.name, db_type=body.db_type, created_at=now, updated_at=now
    )


@router.get("/{conn_id}", response_model=ConnectionResponse)
def get_connection(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)
    return ConnectionResponse(
        id=row["id"],
        name=row["name"],
        db_type=row["db_type"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/{conn_id}/string")
def get_connection_string(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    """Return the (non-sensitive) connection string for DuckDB and SQLite connections."""
    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)
    db_type = row["db_type"]
    if db_type not in ("duckdb", "sqlite"):
        return {"connection_string": None}
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except Exception:
        return {"connection_string": None}
    file_path = creds.get("file_path") or creds.get("s3_path")
    return {"connection_string": file_path or None}


@router.patch("/{conn_id}", response_model=ConnectionResponse)
def update_connection(
    conn_id: str, body: ConnectionUpdate, current_user: AuthUserRow = Depends(get_current_auth_user)
):
    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)
    now = _now()
    new_name = body.name if body.name is not None else row["name"]
    new_creds = (
        encrypt_credentials(body.credentials)
        if body.credentials is not None
        else row["credentials_encrypted"]
    )
    db = get_product_db()
    db.execute(
        "UPDATE connections SET name = ?, credentials_encrypted = ?, updated_at = ? WHERE id = ?",
        (new_name, new_creds, now, conn_id),
    )
    return ConnectionResponse(
        id=conn_id,
        name=new_name,
        db_type=row["db_type"],
        created_at=row["created_at"],
        updated_at=now,
    )


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    db = get_product_db()
    db.execute("DELETE FROM connections WHERE id = ?", (conn_id,))


@router.post("/{conn_id}/test")
def test_connection(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    """Test connectivity to the target database (read-only)."""
    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    db_type = row["db_type"]
    try:
        if db_type == "duckdb":
            import duckdb

            path = creds.get("file_path") or creds.get("s3_path", ":memory:")
            settings = get_settings()
            if path != ":memory:" and os.path.abspath(path) == os.path.abspath(settings.db_path):
                # Already open as the default DB — just ping it
                get_db().execute("SELECT 1")
            else:
                conn = duckdb.connect(path, read_only=True)
                conn.execute("SELECT 1").fetchone()
                conn.close()
        elif db_type == "sqlite":
            import sqlite3

            conn = sqlite3.connect(creds["file_path"])
            conn.execute("SELECT 1").fetchone()
            conn.close()
        elif db_type == "postgresql":
            import psycopg2  # type: ignore

            conn = psycopg2.connect(
                host=creds["host"],
                port=creds.get("port", 5432),
                dbname=creds["database"],
                user=creds["user"],
                password=creds["password"],
            )
            conn.close()
        elif db_type == "databricks":
            # Minimal check — just validate required keys are present
            for key in ("host", "http_path", "token"):
                if key not in creds:
                    raise ValueError(f"Missing required credential field: {key}")
        return {"ok": True, "db_type": db_type}
    except ImportError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Driver for {db_type} not installed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Connection failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Schema Detection
# ---------------------------------------------------------------------------

_KNOWN_USER_ID_COLS = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP_COLS = ("timestamp", "ts", "created_at", "event_time", "time", "datetime", "date")
_KNOWN_EVENT_NAME_COLS = ("event_name", "event", "action", "event_type", "name", "type")


@router.get("/{conn_id}/schema/detect")
def detect_schema(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)) -> dict:
    """Detect columns from the target database and suggest field mappings."""
    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)

    if row["db_type"] != "duckdb":
        raise HTTPException(
            status_code=400,
            detail=f"Schema detection supports DuckDB only (got {row['db_type']})",
        )

    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    file_path = creds.get("file_path") or creds.get("s3_path")
    if not file_path:
        raise HTTPException(status_code=400, detail="No file path configured for this connection")

    try:
        import duckdb as _duckdb

        settings = get_settings()
        same_file = file_path != ":memory:"

        if same_file:
            duck = get_db()._get_connection()
            tbl_schema = "main"
            col_prefix = ""   # e.g. DESCRIBE "events"
            mem = None
        else:
            mem = _duckdb.connect(":memory:")
            mem.execute(f"ATTACH '{file_path}' AS src (READ_ONLY)")
            duck = mem
            tbl_schema = "src"
            col_prefix = "src."

        tables_result = duck.execute(
            "SELECT table_name FROM information_schema.tables "
            f"WHERE table_schema = '{tbl_schema}' ORDER BY table_name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = next(
            (t for t in tables if t.lower() in ("events", "event", "analytics")),
            tables[0] if tables else None,
        )
        if not events_table:
            if mem:
                mem.close()
            return {"tables": tables, "columns": [], "suggestions": {}, "proposed_custom_properties": []}

        # DESCRIBE → column_name, column_type, null, key, default, extra
        columns_result = duck.execute(f'DESCRIBE {col_prefix}"{events_table}"').fetchall()
        columns = [{"name": r[0], "type": r[1]} for r in columns_result]

        # Determine core field suggestions
        col_lower: dict[str, str] = {c["name"].lower(): c["name"] for c in columns}
        suggestions: dict[str, str] = {}
        for candidate in _KNOWN_USER_ID_COLS:
            if candidate in col_lower:
                suggestions["user_id_field"] = col_lower[candidate]
                break
        for candidate in _KNOWN_TIMESTAMP_COLS:
            if candidate in col_lower:
                suggestions["timestamp_field"] = col_lower[candidate]
                break
        for candidate in _KNOWN_EVENT_NAME_COLS:
            if candidate in col_lower:
                suggestions["event_name_field"] = col_lower[candidate]
                break

        core_values = set(suggestions.values())

        # Build proposed custom properties:
        # - flat columns (not core fields, not JSON-like) → direct path
        # - JSON/BLOB/VARCHAR columns → sample json_keys() and propose col.key paths
        _JSON_TYPES = {"json", "blob"}
        proposed: list[dict] = []

        for col in columns:
            name = col["name"]
            sql_type = col["type"].upper()
            if name in core_values:
                continue

            is_json = any(t in sql_type for t in ("JSON", "BLOB", "STRUCT", "MAP"))

            if is_json:
                # Sample distinct top-level keys from this JSON column
                try:
                    keys_result = duck.execute(
                        f"SELECT DISTINCT unnest(json_keys({col_prefix}\"{events_table}\".\"{name}\")) "
                        f"FROM {col_prefix}\"{events_table}\" "
                        f"WHERE \"{name}\" IS NOT NULL LIMIT 2000"
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append({
                                "name": key,
                                "path": f"{name}.{key}",
                                "type": "string",
                            })
                except Exception:
                    # Fall back to proposing the column itself
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})

        if mem:
            mem.close()

        return {
            "tables": tables,
            "events_table": events_table,
            "columns": columns,
            "suggestions": suggestions,
            "proposed_custom_properties": proposed,
        }

    except ImportError as exc:
        raise HTTPException(status_code=400, detail=f"DuckDB driver not installed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Schema detection failed: {exc}") from exc


def _infer_type(sql_type: str) -> str:
    t = sql_type.upper()
    if any(x in t for x in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL", "HUGEINT", "BIGINT", "SMALLINT", "TINYINT")):
        return "number"
    if "BOOL" in t:
        return "boolean"
    if any(x in t for x in ("TIMESTAMP", "DATE", "TIME")):
        return "timestamp"
    return "string"


# ---------------------------------------------------------------------------
# Schema Config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/schema", response_model=SchemaConfigResponse)
def get_schema(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    db = get_product_db()
    row = db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Schema config not found")
    return SchemaConfigResponse(
        id=row["id"],
        connection_id=row["connection_id"],
        user_id_field=row["user_id_field"],
        timestamp_field=row["timestamp_field"],
        event_name_field=row["event_name_field"],
        custom_properties=json.loads(row["custom_properties"]),
        session_timeout_minutes=row["session_timeout_minutes"] if row["session_timeout_minutes"] is not None else 30,
        updated_at=row["updated_at"],
    )


@router.put("/{conn_id}/schema", response_model=SchemaConfigResponse)
def upsert_schema(
    conn_id: str, body: SchemaConfigBody, current_user: AuthUserRow = Depends(get_current_auth_user)
):
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    db = get_product_db()
    now = _now()
    existing = db.fetchone(
        "SELECT id FROM connection_schema_configs WHERE connection_id = ?", (conn_id,)
    )
    custom_json = json.dumps([p.model_dump() for p in body.custom_properties])
    if existing:
        db.execute(
            "UPDATE connection_schema_configs SET user_id_field=?, timestamp_field=?, event_name_field=?, custom_properties=?, session_timeout_minutes=?, updated_at=? WHERE connection_id=?",
            (
                body.user_id_field,
                body.timestamp_field,
                body.event_name_field,
                custom_json,
                body.session_timeout_minutes,
                now,
                conn_id,
            ),
        )
        schema_id = existing["id"]
    else:
        schema_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO connection_schema_configs (id, connection_id, user_id_field, timestamp_field, event_name_field, custom_properties, session_timeout_minutes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                schema_id,
                conn_id,
                body.user_id_field,
                body.timestamp_field,
                body.event_name_field,
                custom_json,
                body.session_timeout_minutes,
                now,
            ),
        )
    return SchemaConfigResponse(
        id=schema_id,
        connection_id=conn_id,
        user_id_field=body.user_id_field,
        timestamp_field=body.timestamp_field,
        event_name_field=body.event_name_field,
        custom_properties=body.custom_properties,
        session_timeout_minutes=body.session_timeout_minutes,
        updated_at=now,
    )


# ---------------------------------------------------------------------------
# Filter Config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filters", response_model=FilterConfigResponse)
def get_filters(conn_id: str, current_user: AuthUserRow = Depends(get_current_auth_user)):
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    db = get_product_db()
    row = db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Filter config not found")
    raw = json.loads(row["filter_fields"])
    # Normalize: support legacy flat-string list and new object list
    fields = [
        FilterField(**f) if isinstance(f, dict) else FilterField(field=f, label=f.capitalize(), icon="Tag")
        for f in raw
    ]
    return FilterConfigResponse(
        id=row["id"],
        connection_id=row["connection_id"],
        filter_fields=fields,
        updated_at=row["updated_at"],
    )


@router.put("/{conn_id}/filters", response_model=FilterConfigResponse)
def upsert_filters(
    conn_id: str, body: FilterConfigBody, current_user: AuthUserRow = Depends(get_current_auth_user)
):
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    db = get_product_db()
    now = _now()
    existing = db.fetchone(
        "SELECT id FROM connection_filter_configs WHERE connection_id = ?", (conn_id,)
    )
    fields_json = json.dumps([f.model_dump() for f in body.filter_fields])
    if existing:
        db.execute(
            "UPDATE connection_filter_configs SET filter_fields=?, updated_at=? WHERE connection_id=?",
            (fields_json, now, conn_id),
        )
        filter_id = existing["id"]
    else:
        filter_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO connection_filter_configs (id, connection_id, user_id, filter_fields, updated_at) VALUES (?, ?, ?, ?, ?)",
            (filter_id, conn_id, user_id, fields_json, now),
        )
    return FilterConfigResponse(
        id=filter_id,
        connection_id=conn_id,
        filter_fields=body.filter_fields,
        updated_at=now,
    )


# ---------------------------------------------------------------------------
# Filter options — distinct values per enabled filter field
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filter-options")
def get_filter_options(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
) -> dict:
    """Return distinct non-null values per enabled filter field for the connection."""
    user_id = current_user.id
    _get_connection_or_404(conn_id, user_id)
    from openflow.services.connection_executor import open_analytics_db
    db = open_analytics_db(conn_id, user_id)
    return db.get_filter_options()
