"""Connections API — manage database connections and their schema/filter configs."""

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user
from openflow.product_db import get_product_db
from openflow.services.crypto import decrypt_credentials, encrypt_credentials

router = APIRouter(prefix="/api/connections", tags=["connections"])

DbType = Literal["duckdb", "databricks", "postgresql", "sqlite"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


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


class TableEntry(BaseModel):
    catalog: str | None
    table_schema: str | None
    name: str
    full_name: str  # catalog.schema.name or schema.name or just name


class TablesResponse(BaseModel):
    tables: list[TableEntry]


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
def list_connections(
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        db = get_product_db()
        rows = db.fetchall(
            "SELECT id, name, db_type, created_at, updated_at FROM connections WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        )
        return [dict(r) for r in rows]
    else:
        raise ValueError("current_user cannot be None")


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(
    body: ConnectionCreate,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
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
            id=conn_id,
            name=body.name,
            db_type=body.db_type,
            created_at=now,
            updated_at=now,
        )
    else:
        raise ValueError("current_user cannot be None")


@router.get("/{conn_id}", response_model=ConnectionResponse)
def get_connection(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        row = _get_connection_or_404(conn_id, user_id)
        return ConnectionResponse(
            id=row["id"],
            name=row["name"],
            db_type=row["db_type"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
    else:
        raise ValueError("current_user cannot be None")


@router.get("/{conn_id}/string")
def get_connection_string(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    """Return the (non-sensitive) connection string for DuckDB and SQLite connections."""
    if current_user:
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
    else:
        raise ValueError("current_user cannot be None")


_SENSITIVE_KEYS = {"password", "token"}
_MASKED = "••••••••"


@router.get("/{conn_id}/credentials")
def get_credentials(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
) -> dict:
    """Return credential field values for display. Sensitive fields are masked."""
    if current_user:
        user_id = current_user.id
        row = _get_connection_or_404(conn_id, user_id)
        try:
            creds = decrypt_credentials(row["credentials_encrypted"])
        except Exception:
            return {"fields": {}}

        fields: dict[str, str | None] = {}
        for key, value in creds.items():
            if key in _SENSITIVE_KEYS:
                fields[key] = _MASKED if value else None
            else:
                fields[key] = str(value) if value is not None else None
        return {"fields": fields}
    else:
        raise ValueError("current_user cannot be None")


@router.patch("/{conn_id}", response_model=ConnectionResponse)
def update_connection(
    conn_id: str,
    body: ConnectionUpdate,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
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
    else:
        raise ValueError("current_user cannot be None")


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        db = get_product_db()
        db.execute("DELETE FROM connections WHERE id = ?", (conn_id,))
    else:
        raise ValueError("current_user cannot be None")


@router.post("/{conn_id}/test")
def test_connection(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    """Test connectivity to the target database (read-only)."""
    if current_user:
        user_id = current_user.id
        row = _get_connection_or_404(conn_id, user_id)
        try:
            creds = decrypt_credentials(row["credentials_encrypted"])
        except ValueError as exc:
            raise HTTPException(
                status_code=500, detail="Failed to decrypt credentials"
            ) from exc

        db_type = row["db_type"]
        try:
            if db_type == "duckdb":
                import duckdb

                path = creds.get("file_path") or creds.get("s3_path", ":memory:")
                conn = duckdb.connect(path, read_only=True)
                conn.execute("SELECT 1").fetchone()
                conn.close()
            elif db_type == "sqlite":
                import sqlite3

                conn = sqlite3.connect(creds["file_path"])
                conn.execute("SELECT 1").fetchone()
                conn.close()
            elif db_type == "postgresql":
                import psycopg2

                conn = psycopg2.connect(
                    host=creds["host"],
                    port=creds.get("port", 5432),
                    dbname=creds["database"],
                    user=creds["user"],
                    password=creds["password"],
                )
                conn.close()
            elif db_type == "databricks":
                for key in ("host", "http_path", "token"):
                    if key not in creds:
                        raise ValueError(f"Missing required credential field: {key}")
                from databricks import sql as dbsql

                conn = dbsql.connect(
                    server_hostname=creds["host"],
                    http_path=creds["http_path"],
                    access_token=creds["token"],
                )
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                cursor.close()
                conn.close()
            return {"ok": True, "db_type": db_type}
        except ImportError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Driver for {db_type} not installed: {exc}",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Connection failed: {exc}"
            ) from exc
    else:
        raise ValueError("current_user cannot be None")


# ---------------------------------------------------------------------------
# Lazy browser — one level at a time (catalog → schema → table)
# ---------------------------------------------------------------------------


class BrowseItem(BaseModel):
    name: str
    full_name: str
    kind: str  # "catalog" | "schema" | "table"


class BrowseResponse(BaseModel):
    items: list[BrowseItem]


@router.get("/{conn_id}/browse", response_model=BrowseResponse)
def browse(
    conn_id: str,
    catalog: str | None = None,
    schema: str | None = None,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
) -> BrowseResponse:
    """Lazily browse the database hierarchy: no params → catalogs, catalog → schemas, catalog+schema → tables."""
    if not current_user:
        raise ValueError("current_user cannot be None")

    user_id = current_user.id
    row = _get_connection_or_404(conn_id, user_id)
    db_type: str = row["db_type"]

    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Failed to decrypt credentials"
        ) from exc

    try:
        if db_type == "duckdb":
            file_path = creds.get("file_path") or creds.get("s3_path")
            if not file_path:
                raise HTTPException(status_code=400, detail="No file path configured")
            return _browse_duckdb(file_path, catalog, schema)
        if db_type == "sqlite":
            file_path = creds.get("file_path")
            if not file_path:
                raise HTTPException(status_code=400, detail="No file path configured")
            return _browse_sqlite(file_path)
        if db_type == "postgresql":
            return _browse_postgresql(creds, catalog, schema)
        if db_type == "databricks":
            return _browse_databricks(creds, catalog, schema)
        raise HTTPException(status_code=400, detail=f"Unsupported db type: {db_type}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc


def _browse_duckdb(
    file_path: str, catalog: str | None, schema: str | None
) -> BrowseResponse:
    import duckdb as _duckdb

    duck = _duckdb.connect(file_path, read_only=True)
    try:
        if catalog is None:
            # List schemas (DuckDB has no real catalog hierarchy; surface schemas)
            rows = duck.execute(
                "SELECT DISTINCT table_schema FROM information_schema.tables "
                "WHERE table_type IN ('BASE TABLE','VIEW') ORDER BY table_schema"
            ).fetchall()
            items = [BrowseItem(name=r[0], full_name=r[0], kind="schema") for r in rows]
            # If only one schema, skip to tables
            if len(items) == 1:
                return _browse_duckdb(file_path, None, items[0].name)
            return BrowseResponse(items=items)
        # catalog param reused as schema for DuckDB
        effective_schema = catalog if schema is None else schema
        rows = duck.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = ? AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name",
            [effective_schema],
        ).fetchall()
        items = [
            BrowseItem(
                name=r[0],
                full_name=r[0]
                if effective_schema == "main"
                else f"{effective_schema}.{r[0]}",
                kind="table",
            )
            for r in rows
        ]
        return BrowseResponse(items=items)
    finally:
        duck.close()


def _browse_sqlite(file_path: str) -> BrowseResponse:
    import sqlite3 as _sqlite3

    conn = _sqlite3.connect(file_path, check_same_thread=False)
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        return BrowseResponse(
            items=[BrowseItem(name=r[0], full_name=r[0], kind="table") for r in rows]
        )
    finally:
        conn.close()


def _browse_postgresql(
    creds: dict, catalog: str | None, schema: str | None
) -> BrowseResponse:
    import psycopg2

    conn = psycopg2.connect(
        host=creds["host"],
        port=creds.get("port", 5432),
        dbname=creds["database"],
        user=creds["user"],
        password=creds["password"],
    )
    try:
        with conn.cursor() as cur:
            if catalog is None:
                # List schemas
                cur.execute(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name NOT IN ('information_schema','pg_catalog','pg_toast') "
                    "ORDER BY schema_name"
                )
                return BrowseResponse(
                    items=[
                        BrowseItem(name=r[0], full_name=r[0], kind="schema")
                        for r in cur.fetchall()
                    ]
                )
            # catalog reused as schema for PostgreSQL
            effective_schema = catalog if schema is None else schema
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = %s AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name",
                (effective_schema,),
            )
            return BrowseResponse(
                items=[
                    BrowseItem(
                        name=r[0], full_name=f"{effective_schema}.{r[0]}", kind="table"
                    )
                    for r in cur.fetchall()
                ]
            )
    finally:
        conn.close()


def _browse_databricks(
    creds: dict, catalog: str | None, schema: str | None
) -> BrowseResponse:
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
    try:
        cursor = conn.cursor()
        if catalog is None:
            cursor.execute("SHOW CATALOGS")
            items = [
                BrowseItem(name=r[0], full_name=r[0], kind="catalog")
                for r in cursor.fetchall()
            ]
        elif schema is None:
            cursor.execute(f"SHOW SCHEMAS IN `{catalog}`")
            items = [
                BrowseItem(name=r[0], full_name=f"{catalog}.{r[0]}", kind="schema")
                for r in cursor.fetchall()
                if r[0] != "information_schema"
            ]
        else:
            cursor.execute(f"SHOW TABLES IN `{catalog}`.`{schema}`")
            rows = cursor.fetchall()
            items = [
                BrowseItem(
                    name=r[1] if len(r) > 1 else r[0],
                    full_name=f"{catalog}.{schema}.{r[1] if len(r) > 1 else r[0]}",
                    kind="table",
                )
                for r in rows
            ]
        cursor.close()
        return BrowseResponse(items=items)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Table Browser — list catalogs / schemas / tables
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/tables", response_model=TablesResponse)
def list_tables(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
) -> TablesResponse:
    """Return all available tables (with catalog/schema) for the connection."""
    if current_user:
        user_id = current_user.id
        row = _get_connection_or_404(conn_id, user_id)
        db_type: str = row["db_type"]
        if db_type not in ("duckdb", "sqlite", "databricks"):
            raise HTTPException(
                status_code=400,
                detail=f"Table listing supports DuckDB, SQLite and Databricks (got {db_type})",
            )
        try:
            creds = decrypt_credentials(row["credentials_encrypted"])
        except ValueError as exc:
            raise HTTPException(
                status_code=500, detail="Failed to decrypt credentials"
            ) from exc

        try:
            if db_type == "sqlite":
                file_path = creds.get("file_path")
                if not file_path:
                    raise HTTPException(
                        status_code=400,
                        detail="No file path configured for this connection",
                    )
                return _list_tables_sqlite(file_path)
            if db_type == "databricks":
                return _list_tables_databricks(creds)
            file_path = creds.get("file_path") or creds.get("s3_path")
            if not file_path:
                raise HTTPException(
                    status_code=400,
                    detail="No file path configured for this connection",
                )
            return _list_tables_duckdb(file_path)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Failed to list tables: {exc}"
            ) from exc
    else:
        raise ValueError("current_user cannot be None")


def _list_tables_duckdb(file_path: str) -> TablesResponse:
    import duckdb as _duckdb

    duck = _duckdb.connect(file_path, read_only=True)
    try:
        rows = duck.execute(
            "SELECT table_catalog, table_schema, table_name "
            "FROM information_schema.tables "
            "WHERE table_type IN ('BASE TABLE', 'VIEW') "
            "ORDER BY table_catalog, table_schema, table_name"
        ).fetchall()
        entries: list[TableEntry] = []
        for catalog, schema, name in rows:
            if catalog and schema and catalog != schema:
                full = f"{catalog}.{schema}.{name}"
            elif schema and schema != "main":
                full = f"{schema}.{name}"
            else:
                full = name
            entries.append(
                TableEntry(
                    catalog=catalog, table_schema=schema, name=name, full_name=full
                )
            )
        return TablesResponse(tables=entries)
    finally:
        duck.close()


def _list_tables_sqlite(file_path: str) -> TablesResponse:
    import sqlite3 as _sqlite3

    conn = _sqlite3.connect(file_path, check_same_thread=False)
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        ).fetchall()
        entries = [
            TableEntry(catalog=None, table_schema=None, name=r[0], full_name=r[0])
            for r in rows
        ]
        return TablesResponse(tables=entries)
    finally:
        conn.close()


def _list_tables_databricks(creds: dict) -> TablesResponse:
    """List all tables across catalogs and schemas via Databricks SQL connector."""
    try:
        from databricks import sql as dbsql
    except ImportError as exc:
        raise RuntimeError(
            "databricks-sql-connector is not installed. "
            "Run: pip install databricks-sql-connector"
        ) from exc

    conn = dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
    entries: list[TableEntry] = []
    try:
        cursor = conn.cursor()

        # 1. Get all accessible catalogs
        cursor.execute("SHOW CATALOGS")
        catalogs = [row[0] for row in cursor.fetchall()]

        for catalog in catalogs:
            # 2. Get schemas in this catalog
            try:
                cursor.execute(f"SHOW SCHEMAS IN `{catalog}`")
                schemas = [row[0] for row in cursor.fetchall()]
            except Exception:
                continue

            for schema in schemas:
                if schema in ("information_schema",):
                    continue
                # 3. Get tables in this schema
                try:
                    cursor.execute(f"SHOW TABLES IN `{catalog}`.`{schema}`")
                    rows = cursor.fetchall()
                    # SHOW TABLES returns (database, tableName, isTemporary) or similar
                    for row in rows:
                        name = row[1] if len(row) > 1 else row[0]
                        full = f"{catalog}.{schema}.{name}"
                        entries.append(
                            TableEntry(
                                catalog=catalog,
                                table_schema=schema,
                                name=name,
                                full_name=full,
                            )
                        )
                except Exception:
                    continue

        cursor.close()
    finally:
        conn.close()

    entries.sort(key=lambda e: (e.catalog or "", e.table_schema or "", e.name))
    return TablesResponse(tables=entries)


# ---------------------------------------------------------------------------
# Schema Detection
# ---------------------------------------------------------------------------

_KNOWN_USER_ID_COLS = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP_COLS = (
    "timestamp",
    "ts",
    "created_at",
    "event_time",
    "time",
    "datetime",
    "date",
)
_KNOWN_EVENT_NAME_COLS = ("event_name", "event", "action", "event_type", "name", "type")


@router.get("/{conn_id}/schema/detect")
def detect_schema(
    conn_id: str,
    events_table: str | None = None,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
) -> dict:
    """Detect columns from the target database and suggest field mappings."""
    if current_user:
        user_id = current_user.id
        row = _get_connection_or_404(conn_id, user_id)
        db_type: str = row["db_type"]

        try:
            creds = decrypt_credentials(row["credentials_encrypted"])
        except ValueError as exc:
            raise HTTPException(
                status_code=500, detail="Failed to decrypt credentials"
            ) from exc

        try:
            if db_type == "sqlite":
                file_path = creds.get("file_path")
                if not file_path:
                    raise HTTPException(
                        status_code=400, detail="No file path configured"
                    )
                return _detect_schema_sqlite(file_path, events_table)
            if db_type == "duckdb":
                file_path = creds.get("file_path") or creds.get("s3_path")
                if not file_path:
                    raise HTTPException(
                        status_code=400, detail="No file path configured"
                    )
                return _detect_schema_duckdb(file_path, events_table)
            if db_type == "postgresql":
                return _detect_schema_postgresql(creds, events_table)
            if db_type == "databricks":
                return _detect_schema_databricks(creds, events_table)
            raise HTTPException(
                status_code=400, detail=f"Unsupported db type: {db_type}"
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Schema detection failed: {exc}"
            ) from exc
    else:
        raise ValueError("current_user cannot be None")


def _suggest_fields(columns: list[dict]) -> dict[str, str]:
    """Map known candidate names to actual column names for the three core fields."""
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
            return {
                "tables": tables,
                "columns": [],
                "suggestions": {},
                "proposed_custom_properties": [],
            }

        # DESCRIBE → (column_name, column_type, null, key, default, extra)
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
                            proposed.append(
                                {"name": key, "path": f"{name}.{key}", "type": "string"}
                            )
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append(
                    {"name": name, "path": name, "type": _infer_type(sql_type)}
                )

        return {
            "tables": tables,
            "events_table": events_table,
            "columns": columns,
            "suggestions": suggestions,
            "proposed_custom_properties": proposed,
        }
    finally:
        duck.close()


def _detect_schema_sqlite(file_path: str, hint: str | None = None) -> dict:
    import sqlite3 as _sqlite3

    conn = _sqlite3.connect(file_path, check_same_thread=False)
    try:
        # List all user tables (exclude sqlite_* internal tables)
        tables_result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = _pick_events_table(tables, hint)
        if not events_table:
            return {
                "tables": tables,
                "columns": [],
                "suggestions": {},
                "proposed_custom_properties": [],
            }

        # PRAGMA table_info → (cid, name, type, notnull, dflt_value, pk)
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

            # In SQLite, JSON is stored as TEXT/BLOB. Detect by sampling the column.
            is_json = "JSON" in sql_type or "BLOB" in sql_type
            if not is_json and sql_type in ("TEXT", ""):
                # Sample a non-null value to see if it looks like a JSON object
                sample = conn.execute(
                    f'SELECT "{name}" FROM "{events_table}" '
                    f'WHERE "{name}" IS NOT NULL AND "{name}" != \'\' LIMIT 1'
                ).fetchone()
                if (
                    sample
                    and isinstance(sample[0], str)
                    and sample[0].lstrip().startswith("{")
                ):
                    is_json = True

            if is_json:
                # SQLite's json_each() returns top-level keys of a JSON object
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT j.key FROM "{events_table}", '
                        f'json_each("{name}") AS j '
                        f'WHERE "{name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append(
                                {"name": key, "path": f"{name}.{key}", "type": "string"}
                            )
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append(
                    {"name": name, "path": name, "type": _infer_type(sql_type)}
                )

        return {
            "tables": tables,
            "events_table": events_table,
            "columns": columns,
            "suggestions": suggestions,
            "proposed_custom_properties": proposed,
        }
    finally:
        conn.close()


def _detect_schema_postgresql(creds: dict, hint: str | None = None) -> dict:
    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(
        host=creds["host"],
        port=creds.get("port", 5432),
        dbname=creds["database"],
        user=creds["user"],
        password=creds["password"],
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type IN ('BASE TABLE','VIEW') "
                "ORDER BY table_name"
            )
            tables = [r[0] for r in cur.fetchall()]

            events_table = _pick_events_table(tables, hint)
            if not events_table:
                return {
                    "tables": tables,
                    "columns": [],
                    "suggestions": {},
                    "proposed_custom_properties": [],
                }

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
            is_json = any(t in sql_type for t in ("JSON", "JSONB"))
            if is_json:
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            f'SELECT DISTINCT jsonb_object_keys("{name}"::jsonb) '
                            f'FROM "{events_table}" WHERE "{name}" IS NOT NULL LIMIT 2000'
                        )
                        for (key,) in cur.fetchall():
                            if key:
                                proposed.append(
                                    {
                                        "name": key,
                                        "path": f"{name}.{key}",
                                        "type": "string",
                                    }
                                )
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})
            else:
                proposed.append(
                    {"name": name, "path": name, "type": _infer_type(sql_type)}
                )

        return {
            "tables": tables,
            "events_table": events_table,
            "columns": columns,
            "suggestions": suggestions,
            "proposed_custom_properties": proposed,
        }
    finally:
        conn.close()


def _parse_struct_fields(sql_type: str, prefix: str = "") -> list[dict]:
    """Recursively extract leaf field paths from a STRUCT<…> type string.

    Returns a flat list of {"name": leaf, "path": "prefix.leaf", "type": ...}.
    E.g. STRUCT<a:STRING, b:STRUCT<c:INT>> → [{path:"prefix.a"}, {path:"prefix.b.c"}]
    """
    # Strip outer STRUCT< … >
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
    """Parse a single 'name:TYPE' field definition and append to results."""
    colon = field_def.find(":")
    if colon < 0:
        return
    name = field_def[:colon].strip().strip("`")
    type_str = field_def[colon + 1 :].strip()
    path = f"{prefix}.{name}" if prefix else name
    upper = type_str.upper()
    if upper.startswith("STRUCT<"):
        # Recurse into nested struct
        nested = _parse_struct_fields(type_str, path)
        if nested:
            results.extend(nested)
        else:
            results.append({"name": name, "path": path, "type": "string"})
    else:
        results.append({"name": name, "path": path, "type": _infer_type(upper)})


def _detect_schema_databricks(creds: dict, hint: str | None = None) -> dict:
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
    try:
        cursor = conn.cursor()

        # If a fully-qualified table was hinted (catalog.schema.table), use it directly
        if hint and hint.count(".") == 2:
            catalog, schema, tbl = hint.split(".", 2)
            events_table_full = hint
            events_table_name = tbl
            cursor.execute(f"DESCRIBE `{catalog}`.`{schema}`.`{tbl}`")
            columns = [
                {"name": r[0], "type": r[1]}
                for r in cursor.fetchall()
                if r[0] and not r[0].startswith("#")
            ]
            tables = [hint]
        else:
            # Fall back: list tables in default catalog/schema
            cursor.execute("SELECT current_catalog(), current_database()")
            row = cursor.fetchone()
            if row:
                default_catalog, default_schema = row[0], row[1]

            cursor.execute(f"SHOW TABLES IN `{default_catalog}`.`{default_schema}`")
            rows = cursor.fetchall()
            tables = [r[1] if len(r) > 1 else r[0] for r in rows]

            events_table_name = _pick_events_table(tables, hint)
            if not events_table_name:
                cursor.close()
                return {
                    "tables": tables,
                    "columns": [],
                    "suggestions": {},
                    "proposed_custom_properties": [],
                }

            events_table_full = (
                f"{default_catalog}.{default_schema}.{events_table_name}"
            )
            cursor.execute(
                f"DESCRIBE `{default_catalog}`.`{default_schema}`.`{events_table_name}`"
            )
            columns = [
                {"name": r[0], "type": r[1]}
                for r in cursor.fetchall()
                if r[0] and not r[0].startswith("#")
            ]

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
                # Parse nested fields recursively from the type definition
                nested = _parse_struct_fields(raw_type, name)
                if nested:
                    proposed.extend(nested)
                else:
                    proposed.append({"name": name, "path": name, "type": "string"})

            elif sql_type.startswith("VARIANT"):
                # Use schema_of_variant_agg to discover keys from sampled rows
                try:
                    cursor.execute(
                        f"SELECT schema_of_variant_agg(`{name}`) "
                        f"FROM (SELECT `{name}` FROM {events_table_full} "
                        f"WHERE `{name}` IS NOT NULL LIMIT 500)"
                    )
                    schema_str = cursor.fetchone()
                    if schema_str and schema_str[0]:
                        nested = _parse_struct_fields(schema_str[0], name)
                        proposed.extend(
                            nested
                            if nested
                            else [{"name": name, "path": name, "type": "string"}]
                        )
                    else:
                        proposed.append({"name": name, "path": name, "type": "string"})
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})

            elif "MAP<" in sql_type:
                # MAP keys can't be introspected statically; expose top-level only
                proposed.append({"name": name, "path": name, "type": "string"})

            elif sql_type == "STRING":
                # Sample to check if it contains JSON objects
                try:
                    cursor.execute(
                        f"SELECT `{name}` FROM {events_table_full} "
                        f"WHERE `{name}` IS NOT NULL LIMIT 1"
                    )
                    sample = cursor.fetchone()
                    if sample and sample[0] and str(sample[0]).lstrip().startswith("{"):
                        # Try to infer schema from JSON strings
                        cursor.execute(
                            f"SELECT schema_of_json_agg(`{name}`) "
                            f"FROM (SELECT `{name}` FROM {events_table_full} "
                            f"WHERE `{name}` IS NOT NULL LIMIT 500)"
                        )
                        schema_row = cursor.fetchone()
                        if schema_row and schema_row[0]:
                            nested = _parse_struct_fields(schema_row[0], name)
                            proposed.extend(
                                nested
                                if nested
                                else [{"name": name, "path": name, "type": "string"}]
                            )
                        else:
                            proposed.append(
                                {"name": name, "path": name, "type": "string"}
                            )
                    else:
                        proposed.append(
                            {"name": name, "path": name, "type": _infer_type(sql_type)}
                        )
                except Exception:
                    proposed.append({"name": name, "path": name, "type": "string"})

            else:
                proposed.append(
                    {"name": name, "path": name, "type": _infer_type(sql_type)}
                )

        cursor.close()
        return {
            "tables": tables,
            "events_table": events_table_full,
            "columns": columns,
            "suggestions": suggestions,
            "proposed_custom_properties": proposed,
        }
    finally:
        conn.close()


def _infer_type(sql_type: str) -> str:
    t = sql_type.upper()
    if any(
        x in t
        for x in (
            "INT",
            "FLOAT",
            "DOUBLE",
            "DECIMAL",
            "NUMERIC",
            "REAL",
            "HUGEINT",
            "BIGINT",
            "SMALLINT",
            "TINYINT",
        )
    ):
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
def get_schema(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        db = get_product_db()
        row = db.fetchone(
            "SELECT * FROM connection_schema_configs WHERE connection_id = ?",
            (conn_id,),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Schema config not found")
        return SchemaConfigResponse(
            id=row["id"],
            connection_id=row["connection_id"],
            user_id_field=row["user_id_field"],
            timestamp_field=row["timestamp_field"],
            event_name_field=row["event_name_field"],
            events_table=row["events_table"] if row["events_table"] else "events",
            custom_properties=json.loads(row["custom_properties"]),
            session_timeout_minutes=row["session_timeout_minutes"]
            if row["session_timeout_minutes"] is not None
            else 30,
            updated_at=row["updated_at"],
        )
    else:
        raise ValueError("current_user cannot be None")


@router.put("/{conn_id}/schema", response_model=SchemaConfigResponse)
def upsert_schema(
    conn_id: str,
    body: SchemaConfigBody,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        db = get_product_db()
        now = _now()
        existing = db.fetchone(
            "SELECT id FROM connection_schema_configs WHERE connection_id = ?",
            (conn_id,),
        )
        custom_json = json.dumps([p.model_dump() for p in body.custom_properties])
        if existing:
            db.execute(
                "UPDATE connection_schema_configs SET user_id_field=?, timestamp_field=?, event_name_field=?, events_table=?, custom_properties=?, session_timeout_minutes=?, updated_at=? WHERE connection_id=?",
                (
                    body.user_id_field,
                    body.timestamp_field,
                    body.event_name_field,
                    body.events_table,
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
                "INSERT INTO connection_schema_configs (id, connection_id, user_id_field, timestamp_field, event_name_field, events_table, custom_properties, session_timeout_minutes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    schema_id,
                    conn_id,
                    body.user_id_field,
                    body.timestamp_field,
                    body.event_name_field,
                    body.events_table,
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
            events_table=body.events_table,
            custom_properties=body.custom_properties,
            session_timeout_minutes=body.session_timeout_minutes,
            updated_at=now,
        )
    else:
        raise ValueError("current_user cannot be None")


# ---------------------------------------------------------------------------
# Filter Config
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filters", response_model=FilterConfigResponse)
def get_filters(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        db = get_product_db()
        row = db.fetchone(
            "SELECT * FROM connection_filter_configs WHERE connection_id = ?",
            (conn_id,),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Filter config not found")
        raw = json.loads(row["filter_fields"])
        # Normalize: support legacy flat-string list and new object list
        fields = [
            FilterField(**f)
            if isinstance(f, dict)
            else FilterField(field=f, label=f.capitalize(), icon="Tag")
            for f in raw
        ]
        return FilterConfigResponse(
            id=row["id"],
            connection_id=row["connection_id"],
            filter_fields=fields,
            updated_at=row["updated_at"],
        )
    else:
        raise ValueError("current_user cannot be None")


@router.put("/{conn_id}/filters", response_model=FilterConfigResponse)
def upsert_filters(
    conn_id: str,
    body: FilterConfigBody,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        db = get_product_db()
        now = _now()
        existing = db.fetchone(
            "SELECT id FROM connection_filter_configs WHERE connection_id = ?",
            (conn_id,),
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
    else:
        raise ValueError("current_user cannot be None")


# ---------------------------------------------------------------------------
# Filter options — distinct values per enabled filter field
# ---------------------------------------------------------------------------


@router.get("/{conn_id}/filter-options")
def get_filter_options(
    conn_id: str,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
) -> dict:
    """Return distinct non-null values per enabled filter field for the connection."""
    if current_user:
        user_id = current_user.id
        _get_connection_or_404(conn_id, user_id)
        from openflow.services.connection_executor import open_analytics_db

        db = open_analytics_db(conn_id, user_id)
        return db.get_filter_options()
    else:
        raise ValueError("current_user cannot be None")
