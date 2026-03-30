"""Schema detection endpoint for the Connections API."""

from fastapi import APIRouter, HTTPException

from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials

router = APIRouter()


_KNOWN_USER_ID_COLS = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP_COLS = ("timestamp", "ts", "created_at", "event_time", "time", "datetime", "date")
_KNOWN_EVENT_NAME_COLS = ("event_name", "event", "action", "event_type", "name", "type")
_KNOWN_EMAIL_COLS = ("email", "user_email", "email_address", "e_mail")
_KNOWN_FIRST_NAME_COLS = ("first_name", "firstname", "fname", "given_name")
_KNOWN_LAST_NAME_COLS = ("last_name", "lastname", "lname", "surname", "family_name")
_KNOWN_DOB_COLS = ("date_of_birth", "dob", "birth_date", "birthdate", "birthday")
_KNOWN_PHONE_COLS = ("phone", "phone_number", "mobile", "mobile_number", "telephone")


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
    for candidate in _KNOWN_EMAIL_COLS:
        if candidate in col_lower:
            suggestions["email_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_FIRST_NAME_COLS:
        if candidate in col_lower:
            suggestions["first_name_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_LAST_NAME_COLS:
        if candidate in col_lower:
            suggestions["last_name_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_DOB_COLS:
        if candidate in col_lower:
            suggestions["date_of_birth_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_PHONE_COLS:
        if candidate in col_lower:
            suggestions["phone_field"] = col_lower[candidate]
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
    from backend.backends import get_backend

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
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db type: {db_type}")

    try:
        credentials = backend.parse_credentials(creds)
        conn = backend.open(credentials, read_only=True)
        try:
            info = backend.detect_schema(conn, events_table)
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Schema detection failed: {exc}") from exc

    return {
        "tables": info.tables,
        "events_table": info.events_table,
        "columns": [{"name": c.name, "type": c.type} for c in info.columns],
        "suggestions": info.suggestions,
        "proposed_custom_properties": info.proposed_custom_properties,
    }
