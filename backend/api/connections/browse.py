"""Browse endpoint for the Connections API (catalog → schema → table hierarchy)."""

from fastapi import APIRouter, HTTPException

from backend.backends import get_backend
from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials
from backend.services.pool import _pool_get

router = APIRouter()


def _get_connection_or_404(conn_id: str):
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    return row


@router.get("/{conn_id}/browse")
async def browse_connection(
    conn_id: str,
    catalog: str | None = None,
    schema: str | None = None,
):
    row = _get_connection_or_404(conn_id)
    db_type: str = row["db_type"]

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    credentials = backend.parse_credentials(creds)

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
            items = backend.browse(conn, catalog=catalog, schema=schema)
        else:
            conn = backend.open(credentials, read_only=True)
            try:
                items = backend.browse(conn, catalog=catalog, schema=schema)
            finally:
                conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    return {"items": items}


@router.get("/{conn_id}/tables")
async def list_tables(conn_id: str):
    """Return a flat list of all tables for the Query Studio catalog."""
    row = _get_connection_or_404(conn_id)
    db_type: str = row["db_type"]

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    credentials = backend.parse_credentials(creds)

    def _browse(conn, catalog, schema):
        return backend.browse(conn, catalog=catalog, schema=schema)

    def _collect(conn) -> list[dict]:
        tables = []
        top = _browse(conn, None, None)
        for item in top:
            kind = item.get("kind")
            name = item.get("name", "")
            full_name = item.get("full_name") or name
            if kind == "table":
                tables.append({"catalog": None, "table_schema": None, "name": name, "full_name": full_name})
            elif kind == "schema":
                for child in _browse(conn, None, name):
                    if child.get("kind") == "table":
                        tables.append({"catalog": None, "table_schema": name, "name": child["name"], "full_name": child.get("full_name") or child["name"]})
            elif kind == "catalog":
                for schema_item in _browse(conn, name, None):
                    if schema_item.get("kind") == "schema":
                        schema_name = schema_item["name"]
                        for child in _browse(conn, name, schema_name):
                            if child.get("kind") == "table":
                                tables.append({"catalog": name, "table_schema": schema_name, "name": child["name"], "full_name": child.get("full_name") or child["name"]})
        return tables

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
            tables = _collect(conn)
        else:
            conn = backend.open(credentials, read_only=True)
            try:
                tables = _collect(conn)
            finally:
                conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    return {"tables": tables}
