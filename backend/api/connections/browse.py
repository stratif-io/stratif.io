"""Browse endpoint for the Connections API (catalog → schema → table hierarchy)."""

from fastapi import APIRouter

from backend.product_db import get_product_db
from backend.services.connection_executor import open_analytics_db

router = APIRouter()


def _get_connection_or_404(conn_id: str):
    from fastapi import HTTPException

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
    db = open_analytics_db(conn_id)
    try:
        items: list[dict] = []

        if db_type == "databricks":
            if catalog is None:
                rows = db.execute("SHOW CATALOGS")
                items = [{"name": r[0], "full_name": r[0], "kind": "catalog"} for r in rows]
            elif schema is None:
                rows = db.execute(f"SHOW SCHEMAS IN `{catalog}`")
                items = [{"name": r[0], "full_name": f"{catalog}.{r[0]}", "kind": "schema"} for r in rows]
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
