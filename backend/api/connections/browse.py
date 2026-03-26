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

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
            top_items = backend.browse(conn, catalog=None, schema=None)
        else:
            conn = backend.open(credentials, read_only=True)
            try:
                top_items = backend.browse(conn, catalog=None, schema=None)
            finally:
                conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    tables = []
    for item in top_items:
        if item.get("type") == "table":
            tables.append({
                "catalog": item.get("catalog"),
                "table_schema": item.get("schema"),
                "name": item.get("name", ""),
                "full_name": item.get("full_name") or item.get("name", ""),
            })
        elif item.get("type") in ("catalog", "schema"):
            # Drill one level deeper
            try:
                if backend.use_pool:
                    children = backend.browse(
                        conn,
                        catalog=item.get("catalog"),
                        schema=item.get("name") if item.get("type") == "schema" else None,
                    )
                else:
                    conn2 = backend.open(credentials, read_only=True)
                    try:
                        children = backend.browse(
                            conn2,
                            catalog=item.get("catalog"),
                            schema=item.get("name") if item.get("type") == "schema" else None,
                        )
                    finally:
                        conn2.close()
                for child in children:
                    if child.get("type") == "table":
                        tables.append({
                            "catalog": child.get("catalog"),
                            "table_schema": child.get("schema"),
                            "name": child.get("name", ""),
                            "full_name": child.get("full_name") or child.get("name", ""),
                        })
            except Exception:
                pass

    return {"tables": tables}
