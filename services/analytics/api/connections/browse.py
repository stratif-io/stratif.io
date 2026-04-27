"""Browse endpoint for the Connections API (catalog → schema → table hierarchy)."""

from fastapi import APIRouter, HTTPException

from services.analytics.backends import get_backend
from services.analytics.backends._utils import validate_identifier
from services.analytics.product_db.deps import DBSession
from services.analytics.product_db.models import Connection
from services.analytics.services.crypto import decrypt_credentials
from services.analytics.services.pool import _pool_get

router = APIRouter()


async def _get_connection_or_404(conn_id: str, session) -> Connection:
    conn = await session.get(Connection, conn_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


@router.get("/{conn_id}/browse")
async def browse_connection(
    conn_id: str,
    session: DBSession,
    catalog: str | None = None,
    schema: str | None = None,
):
    try:
        validate_identifier(catalog, label="catalog")
        validate_identifier(schema, label="schema")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    conn = await _get_connection_or_404(conn_id, session)
    db_type: str = conn.db_type

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Unsupported db_type: {db_type!r}"
        ) from None

    try:
        creds = decrypt_credentials(conn.credentials_encrypted)
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Failed to decrypt credentials"
        ) from exc

    credentials = backend.parse_credentials(creds)

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            db_conn, _meta = _pool_get(
                pool_key, lambda: backend.open(credentials, read_only=False)
            )
            items = backend.browse(db_conn, catalog=catalog, schema=schema)
        else:
            db_conn = backend.open(credentials, read_only=True)
            try:
                items = backend.browse(db_conn, catalog=catalog, schema=schema)
            finally:
                db_conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    return {"items": items}


@router.get("/{conn_id}/tables")
async def list_tables(conn_id: str, session: DBSession):
    """Return a flat list of all tables for the Query Studio catalog."""
    conn = await _get_connection_or_404(conn_id, session)
    db_type: str = conn.db_type

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Unsupported db_type: {db_type!r}"
        ) from None

    try:
        creds = decrypt_credentials(conn.credentials_encrypted)
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Failed to decrypt credentials"
        ) from exc

    credentials = backend.parse_credentials(creds)

    def _browse(db_conn, catalog, schema):
        return backend.browse(db_conn, catalog=catalog, schema=schema)

    def _collect(db_conn) -> list[dict]:
        tables = []
        top = _browse(db_conn, None, None)
        for item in top:
            kind = item.get("kind")
            name = item.get("name", "")
            full_name = item.get("full_name") or name
            if kind == "table":
                tables.append(
                    {
                        "catalog": None,
                        "table_schema": None,
                        "name": name,
                        "full_name": full_name,
                    }
                )
            elif kind == "schema":
                for child in _browse(db_conn, None, name):
                    if child.get("kind") == "table":
                        tables.append(
                            {
                                "catalog": None,
                                "table_schema": name,
                                "name": child["name"],
                                "full_name": child.get("full_name") or child["name"],
                            }
                        )
            elif kind == "catalog":
                for schema_item in _browse(db_conn, name, None):
                    if schema_item.get("kind") == "schema":
                        schema_name = schema_item["name"]
                        for child in _browse(db_conn, name, schema_name):
                            if child.get("kind") == "table":
                                tables.append(
                                    {
                                        "catalog": name,
                                        "table_schema": schema_name,
                                        "name": child["name"],
                                        "full_name": child.get("full_name")
                                        or child["name"],
                                    }
                                )
        return tables

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            db_conn, _meta = _pool_get(
                pool_key, lambda: backend.open(credentials, read_only=False)
            )
            tables = _collect(db_conn)
        else:
            db_conn = backend.open(credentials, read_only=True)
            try:
                tables = _collect(db_conn)
            finally:
                db_conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    return {"tables": tables}


@router.get("/{conn_id}/columns")
async def list_columns(conn_id: str, session: DBSession, table: str):
    """Return column names for a given table (full_name), for the Query Studio catalog."""
    try:
        validate_identifier(table, label="table")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    conn = await _get_connection_or_404(conn_id, session)
    db_type: str = conn.db_type

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Unsupported db_type: {db_type!r}"
        ) from None

    try:
        creds = decrypt_credentials(conn.credentials_encrypted)
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Failed to decrypt credentials"
        ) from exc

    credentials = backend.parse_credentials(creds)

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            db_conn = _pool_get(
                pool_key, lambda: backend.open(credentials, read_only=False)
            )
            columns = backend.get_columns_for_browse(db_conn, table)
        else:
            db_conn = backend.open(credentials, read_only=True)
            try:
                columns = backend.get_columns_for_browse(db_conn, table)
            finally:
                db_conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Column fetch failed: {exc}"
        ) from exc

    return {"columns": columns}
