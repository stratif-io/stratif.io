"""SQLite database backend."""
from __future__ import annotations

import re
import sqlite3 as _sqlite3
from typing import Any

from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, sample_property_types, suggest_fields
from backend.backends.sqlite.credentials import SQLiteCredentials

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)

_SQLITE_NUMERIC_CAST = (
    "CASE WHEN {expr} GLOB '[0-9]*'"
    " OR {expr} GLOB '-[0-9]*'"
    " OR {expr} GLOB '[0-9]*.[0-9]*'"
    " OR {expr} GLOB '-[0-9]*.[0-9]*'"
    " THEN 1.0 ELSE NULL END"
)


class SQLiteBackend:

    @property
    def dialect_name(self) -> str:
        return "sqlite"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return False

    def parse_credentials(self, raw: dict) -> SQLiteCredentials:
        return SQLiteCredentials.model_validate(raw)

    def connection_string(self, credentials: BaseModel) -> str | None:
        creds = SQLiteCredentials.model_validate(credentials.model_dump())
        return f"sqlite:///{creds.file_path}"

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        creds = SQLiteCredentials.model_validate(credentials.model_dump())
        return _sqlite3.connect(creds.file_path, check_same_thread=False)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "sqlite")

    def is_connection_error(self, exc: Exception) -> bool:
        return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(d[0] for d in cursor.description or [])
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        rows = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
            (table_name,),
        ).fetchall()
        return len(rows) > 0

    def get_tables(self, conn: Any) -> list[str]:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
        ).fetchall()
        return [r[0] for r in rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            quoted = '.'.join(f'"{p}"' for p in table.split('.'))
            cursor = conn.execute(f'SELECT * FROM {quoted} LIMIT 0')
            return [d[0] for d in cursor.description or []]
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
        ).fetchall()
        return [{"name": r[0], "full_name": r[0], "kind": "table"} for r in rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables_result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        tables = [r[0] for r in tables_result]
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])

        columns_result = conn.execute(f'PRAGMA table_info("{events_table}")').fetchall()
        columns = [ColumnInfo(name=r[1], type=r[2] or "TEXT") for r in columns_result]

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            is_json = "JSON" in sql_type or "BLOB" in sql_type
            if not is_json and sql_type in ("TEXT", ""):
                sample = conn.execute(
                    f'SELECT "{col.name}" FROM "{events_table}" '
                    f'WHERE "{col.name}" IS NOT NULL AND "{col.name}" != \'\' LIMIT 1'
                ).fetchone()
                if sample and isinstance(sample[0], str) and sample[0].lstrip().startswith("{"):
                    is_json = True
            if is_json:
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT j.key FROM "{events_table}", json_each("{col.name}") AS j '
                        f'WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    top_keys = [r[0] for r in keys_result if r[0]]
                    for key in top_keys:
                        try:
                            sub_result = conn.execute(
                                f'SELECT DISTINCT j.key FROM "{events_table}", '
                                f'json_each(json_extract("{col.name}", \'$.{key}\')) AS j '
                                f'WHERE json_type("{col.name}", \'$.{key}\') = \'object\' LIMIT 2000'
                            ).fetchall()
                            sub_keys = [r[0] for r in sub_result if r[0]]
                        except Exception:
                            sub_keys = []
                        if sub_keys:
                            for sub_key in sub_keys:
                                proposed.append({"name": f"{key}.{sub_key}", "path": f"{col.name}.{key}.{sub_key}", "type": "string"})
                        else:
                            proposed.append({"name": key, "path": f"{col.name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

        # Upgrade string-typed JSON properties to number where sampling confirms it
        string_json_props = [p for p in proposed if p["type"] == "string" and "." in p["path"]]
        if string_json_props:
            col_name, _ = string_json_props[0]["path"].split(".", 1)
            prop_exprs = {
                p["name"]: self.json_extract_string(col_name, p["name"])
                for p in string_json_props
            }
            upgrades = sample_property_types(
                lambda sql: conn.execute(sql).fetchall(),
                events_table,
                prop_exprs,
                _SQLITE_NUMERIC_CAST,
            )
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        return list(conn.execute(query, params or []).fetchall())

    def execute_with_columns(
        self, conn: Any, query: str, params: list | None
    ) -> tuple[list[str], list[tuple]]:
        cursor = conn.execute(query, params or [])
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        return columns, rows

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        extra_cols = sorted({p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src)
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f'(SELECT {core}{extras} FROM "{source_table}")'

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        return _EVENTS_REF_RE.sub(lambda m: f"{m.group(1)} {cte_body}", query.strip())

    def date_trunc(self, unit: str, col: str) -> str:
        _map = {
            "hour": f"STRFTIME('%Y-%m-%d %H:00:00', {col})",
            "day": f"DATE({col})",
            "week": f"DATE({col}, 'weekday 1', '-6 days')",
            "month": f"STRFTIME('%Y-%m-01', {col})",
            "year": f"STRFTIME('%Y-01-01', {col})",
        }
        return _map.get(unit, f"DATE({col})")

    def date_diff_days(self, start: str, end: str) -> str:
        return f"CAST(julianday({end}) - julianday({start}) AS INTEGER)"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"(STRFTIME('%s', {end}) - STRFTIME('%s', {start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"(STRFTIME('%s', {later}) - STRFTIME('%s', {earlier})) > {minutes * 60}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS TEXT)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        return f"json_extract({col}, '$.{'.'.join(parts)}')"

    def extract_hour(self, col: str) -> str:
        return f"CAST(STRFTIME('%H', {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(STRFTIME('%w', {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(STRFTIME('%Y', {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(STRFTIME('%m', {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(STRFTIME('%W', {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST((CAST(STRFTIME('%m', {col}) AS INTEGER) + 2) / 3 AS INTEGER)"
