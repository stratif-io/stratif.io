"""Schema detection endpoint for the Connections API."""

from fastapi import APIRouter, HTTPException

from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials

router = APIRouter()

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
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
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
