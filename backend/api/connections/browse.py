"""Browse endpoint for the Connections API (catalog → schema → table hierarchy)."""

from fastapi import APIRouter, HTTPException

from backend.backends import get_backend
from backend.product_db import ProductDB, SQLiteProductDB
from backend.config import settings
from backend.services.crypto import decrypt_credentials
from backend.services.pool import _pool_get

router = APIRouter()


def _get_product_db() -> ProductDB:
    return SQLiteProductDB(settings.product_db_path)


def _get_connection_or_404(conn_id: str):
    db = _get_product_db()
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
