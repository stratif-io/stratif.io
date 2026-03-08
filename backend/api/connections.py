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
# Schema detection
# ---------------------------------------------------------------------------

_KNOWN_USER_ID_COLS = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP_COLS = ("timestamp", "ts", "created_at", "event_time", "time", "datetime", "date")
_KNOWN_EVENT_NAME_COLS = ("event_name", "event", "action", "event_type", "name", "type")


def _suggest_fields(columns: list[dict]) -> dict[str, str]:
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
    return suggestions


def _pick_events_table(tables: list[str], hint: str | None) -> str | None:
    if hint and hint in tables:
        return hint
    return next(
        (t for t in tables if t.lower() in ("events", "event", "analytics")),
        tables[0] if tables else None,
    )


def _infer_type(sql_type: str) -> str:
    t = sql_type.upper()
    if any(x in t for x in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL",
                              "HUGEINT", "BIGINT", "SMALLINT", "TINYINT")):
        return "number"
    if "BOOL" in t:
        return "boolean"
    if any(x in t for x in ("TIMESTAMP", "DATE", "TIME")):
        return "timestamp"
    return "string"


def _parse_struct_fields(sql_type: str, prefix: str = "") -> list[dict]:
    inner = sql_type.strip()
    if inner.upper().startswith("STRUCT<") and inner.endswith(">"):
        inner = inner[7:-1]
    else:
        return []
    results: list[dict] = []
    depth = 0
    current = ""
    for ch in inner:
        if ch in ("<", "("):
            depth += 1
            current += ch
        elif ch in (">", ")"):
            depth -= 1
            current += ch
        elif ch == "," and depth == 0:
            _parse_struct_field(current.strip(), prefix, results)
            current = ""
        else:
            current += ch
    if current.strip():
        _parse_struct_field(current.strip(), prefix, results)
    return results


def _parse_struct_field(field_def: str, prefix: str, results: list) -> None:
    colon = field_def.find(":")
    if colon < 0:
        return
    name = field_def[:colon].strip().strip("`")
    type_str = field_def[colon + 1:].strip()
    path = f"{prefix}.{name}" if prefix else name
    upper = type_str.upper()
    if upper.startswith("STRUCT<"):
        nested = _parse_struct_fields(type_str, path)
        results.extend(nested if nested else [{"name": name, "path": path, "type": "string"}])
    else:
        results.append({"name": name, "path": path, "type": _infer_type(upper)})


@router.get("/{conn_id}/schema/detect")
def detect_schema(conn_id: str, events_table: str | None = None):
    """Detect columns from the target database and suggest field mappings."""
    row = _get_connection_or_404(conn_id)
    db_type: str = row["db_type"]
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    try:
        if db_type == "sqlite":
            file_path = creds.get("file_path")
            if not file_path:
                raise HTTPException(status_code=400, detail="No file path configured")
            return _detect_schema_sqlite(file_path, events_table)
        if db_type == "duckdb":
            file_path = creds.get("file_path") or creds.get("s3_path")
            if not file_path:
                raise HTTPException(status_code=400, detail="No file path configured")
            return _detect_schema_duckdb(file_path, events_table)
        if db_type == "postgresql":
            return _detect_schema_postgresql(creds, events_table)
        if db_type == "databricks":
            return _detect_schema_databricks(creds, events_table)
        raise HTTPException(status_code=400, detail=f"Unsupported db type: {db_type}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Schema detection failed: {exc}") from exc


def _detect_schema_duckdb(file_path: str, hint: str | None = None) -> dict:
    import duckdb as _duckdb

    duck = _duckdb.connect(file_path, read_only=True)
    try:
        tables_result = duck.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = _pick_events_table(tables, hint)
        if not events_table:
            return {"tables": tables, "columns": [], "suggestions": {}, "proposed_custom_properties": []}

        columns_result = duck.execute(f'DESCRIBE "{events_table}"').fetchall()
        columns = [{"name": r[0], "type": r[1]} for r in columns_result]

        suggestions = _suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []

        for col in columns:
            name = col["name"]
            sql_type = col["type"].upper()
            if name in core_values:
                continue
            is_json = any(t in sql_type for t in ("JSON", "BLOB", "STRUCT", "MAP"))
            if is_json:
                try:
                    keys_result = duck.execute(
                        f'SELECT DISTINCT unnest(json_keys("{events_table}"."{name}")) '
                        f'FROM "{events_table}" WHERE "{name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append({"name": key, "path": f"{name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})

        return {"tables": tables, "events_table": events_table, "columns": columns,
                "suggestions": suggestions, "proposed_custom_properties": proposed}
    finally:
        duck.close()


def _detect_schema_sqlite(file_path: str, hint: str | None = None) -> dict:
    import sqlite3 as _sqlite3

    conn = _sqlite3.connect(file_path, check_same_thread=False)
    try:
        tables_result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = _pick_events_table(tables, hint)
        if not events_table:
            return {"tables": tables, "columns": [], "suggestions": {}, "proposed_custom_properties": []}

        columns_result = conn.execute(f'PRAGMA table_info("{events_table}")').fetchall()
        columns = [{"name": r[1], "type": r[2] or "TEXT"} for r in columns_result]

        suggestions = _suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []

        for col in columns:
            name = col["name"]
            sql_type = col["type"].upper()
            if name in core_values:
                continue
            is_json = "JSON" in sql_type or "BLOB" in sql_type
            if not is_json and sql_type in ("TEXT", ""):
                sample = conn.execute(
                    f'SELECT "{name}" FROM "{events_table}" WHERE "{name}" IS NOT NULL AND "{name}" != \'\' LIMIT 1'
                ).fetchone()
                if sample and isinstance(sample[0], str) and sample[0].lstrip().startswith("{"):
                    is_json = True
            if is_json:
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT j.key FROM "{events_table}", json_each("{name}") AS j '
                        f'WHERE "{name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append({"name": key, "path": f"{name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})

        return {"tables": tables, "events_table": events_table, "columns": columns,
                "suggestions": suggestions, "proposed_custom_properties": proposed}
    finally:
        conn.close()


def _detect_schema_postgresql(creds: dict, hint: str | None = None) -> dict:
    import psycopg2

    conn = psycopg2.connect(
        host=creds["host"], port=creds.get("port", 5432),
        dbname=creds["database"], user=creds["user"], password=creds["password"],
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name"
            )
            tables = [r[0] for r in cur.fetchall()]

            events_table = _pick_events_table(tables, hint)
            if not events_table:
                return {"tables": tables, "columns": [], "suggestions": {}, "proposed_custom_properties": []}

            cur.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position",
                (events_table,),
            )
            columns = [{"name": r[0], "type": r[1]} for r in cur.fetchall()]

        suggestions = _suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            name = col["name"]
            sql_type = col["type"].upper()
            if name in core_values:
                continue
            if any(t in sql_type for t in ("JSON", "JSONB")):
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            f'SELECT DISTINCT jsonb_object_keys("{name}"::jsonb) '
                            f'FROM "{events_table}" WHERE "{name}" IS NOT NULL LIMIT 2000'
                        )
                        for (key,) in cur.fetchall():
                            if key:
                                proposed.append({"name": key, "path": f"{name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})

        return {"tables": tables, "events_table": events_table, "columns": columns,
                "suggestions": suggestions, "proposed_custom_properties": proposed}
    finally:
        conn.close()


def _detect_schema_databricks(creds: dict, hint: str | None = None) -> dict:
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
    try:
        cursor = conn.cursor()
        if hint and hint.count(".") == 2:
            catalog, schema, tbl = hint.split(".", 2)
            events_table_full = hint
            cursor.execute(f"DESCRIBE `{catalog}`.`{schema}`.`{tbl}`")
            columns = [{"name": r[0], "type": r[1]} for r in cursor.fetchall()
                       if r[0] and not r[0].startswith("#")]
            tables = [hint]
        else:
            cursor.execute("SELECT current_catalog(), current_database()")
            row = cursor.fetchone()
            default_catalog, default_schema = (row[0], row[1]) if row else ("hive_metastore", "default")
            cursor.execute(f"SHOW TABLES IN `{default_catalog}`.`{default_schema}`")
            rows = cursor.fetchall()
            tables = [r[1] if len(r) > 1 else r[0] for r in rows]
            events_table_name = _pick_events_table(tables, hint)
            if not events_table_name:
                cursor.close()
                return {"tables": tables, "columns": [], "suggestions": {}, "proposed_custom_properties": []}
            events_table_full = f"{default_catalog}.{default_schema}.{events_table_name}"
            cursor.execute(f"DESCRIBE `{default_catalog}`.`{default_schema}`.`{events_table_name}`")
            columns = [{"name": r[0], "type": r[1]} for r in cursor.fetchall()
                       if r[0] and not r[0].startswith("#")]

        suggestions = _suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            name = col["name"]
            raw_type = col["type"]
            sql_type = raw_type.upper()
            if name in core_values:
                continue
            if sql_type.startswith("STRUCT<"):
                nested = _parse_struct_fields(raw_type, name)
                proposed.extend(nested if nested else [{"name": name, "path": name, "type": "string"}])
            elif sql_type.startswith("VARIANT"):
                try:
                    cursor.execute(
                        f"SELECT schema_of_variant_agg(`{name}`) "
                        f"FROM (SELECT `{name}` FROM {events_table_full} WHERE `{name}` IS NOT NULL LIMIT 500)"
                    )
                    schema_str = cursor.fetchone()
                    if schema_str and schema_str[0]:
                        nested = _parse_struct_fields(schema_str[0], name)
                        proposed.extend(nested if nested else [{"name": name, "path": name, "type": "string"}])
                    else:
                        proposed.append({"name": name, "path": name, "type": "string"})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            elif "MAP<" in sql_type:
                proposed.append({"name": name, "path": name, "type": "string"})
            elif sql_type == "STRING":
                try:
                    cursor.execute(f"SELECT `{name}` FROM {events_table_full} WHERE `{name}` IS NOT NULL LIMIT 1")
                    sample = cursor.fetchone()
                    if sample and sample[0] and str(sample[0]).lstrip().startswith("{"):
                        cursor.execute(
                            f"SELECT schema_of_json_agg(`{name}`) "
                            f"FROM (SELECT `{name}` FROM {events_table_full} WHERE `{name}` IS NOT NULL LIMIT 500)"
                        )
                        schema_row = cursor.fetchone()
                        if schema_row and schema_row[0]:
                            nested = _parse_struct_fields(schema_row[0], name)
                            proposed.extend(nested if nested else [{"name": name, "path": name, "type": "string"}])
                        else:
                            proposed.append({"name": name, "path": name, "type": "string"})
                    else:
                        proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append({"name": name, "path": name, "type": _infer_type(sql_type)})

        cursor.close()
        return {"tables": tables, "events_table": events_table_full, "columns": columns,
                "suggestions": suggestions, "proposed_custom_properties": proposed}
    finally:
        conn.close()


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
