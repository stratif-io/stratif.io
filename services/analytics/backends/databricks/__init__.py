"""Databricks database backend."""

from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from services.analytics.backends._utils import (
    _to_named_params,
    infer_type,
    pick_events_table,
    suggest_fields,
)
from services.analytics.backends.base import ColumnInfo, SchemaInfo
from services.analytics.backends.databricks.credentials import DatabricksCredentials


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
    type_str = field_def[colon + 1 :].strip()
    path = f"{prefix}.{name}" if prefix else name
    upper = type_str.upper()
    if upper.startswith("STRUCT<"):
        nested = _parse_struct_fields(type_str, path)
        results.extend(
            nested if nested else [{"name": name, "path": path, "type": "string"}]
        )
    else:
        results.append({"name": name, "path": path, "type": infer_type(upper)})


class DatabricksBackend:
    @property
    def dialect_name(self) -> str:
        return "databricks"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> DatabricksCredentials:
        return DatabricksCredentials.model_validate(raw)

    def connection_string(self, credentials: BaseModel) -> str | None:
        creds = DatabricksCredentials.model_validate(credentials.model_dump())
        return f"databricks://token:****@{creds.host}?http_path={creds.http_path}"

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        from databricks import sql as dbsql

        creds = DatabricksCredentials.model_validate(credentials.model_dump())
        return dbsql.connect(
            server_hostname=creds.host,
            http_path=creds.http_path,
            access_token=creds.token,
        )

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "databricks")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from databricks.sql.exc import Error as _DatabricksError

            return isinstance(exc, _DatabricksError)
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        return frozenset(self.get_column_types(conn, table_expr).keys())

    def get_column_types(self, conn: Any, table_expr: str) -> dict[str, str]:
        """Return {col_name: sql_type_string} from cursor.description."""
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return {
                    d[0]: (d[1] if isinstance(d[1], str) else str(d[1]))
                    for d in (cursor.description or [])
                }
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return {}

    def resolve_prop_expr(self, path: str, col_types: dict[str, str]) -> str:
        """For Databricks: use struct dot-notation for STRUCT/MAP/ARRAY root columns,
        get_json_object for STRING root columns containing JSON.
        """
        parts = path.split(".")
        if len(parts) == 1:
            return f"`{parts[0]}`"
        root = parts[0]
        root_type = (col_types.get(root) or "").upper()
        if root_type.startswith(
            ("STRUCT<", "MAP<", "ARRAY<", "STRUCT", "MAP", "ARRAY")
        ):
            # Struct/map field access via dot notation
            return ".".join(f"`{p}`" for p in parts)
        # JSON string extraction
        nested_key = ".".join(parts[1:])
        return self.json_extract_string(f"`{root}`", nested_key)

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            self.execute(conn, f"SELECT 1 FROM {table_name} LIMIT 1", None)
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT current_catalog(), current_database()")
            row = cursor.fetchone()
            cat, sch = (row[0], row[1]) if row else ("hive_metastore", "default")
            cursor.execute(f"SHOW TABLES IN `{cat}`.`{sch}`")
            rows = cursor.fetchall()
            return [r[-2] if len(r) > 1 else r[0] for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table} LIMIT 0")
                return [d[0] for d in cursor.description or []]
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        cursor = conn.cursor()
        try:
            if catalog is None:
                cursor.execute("SHOW CATALOGS")
                rows = cursor.fetchall()
                return [
                    {"name": r[0], "full_name": r[0], "kind": "catalog"} for r in rows
                ]
            if schema is None:
                cursor.execute(f"SHOW SCHEMAS IN `{catalog}`")
                rows = cursor.fetchall()
                return [
                    {"name": r[0], "full_name": f"{catalog}.{r[0]}", "kind": "schema"}
                    for r in rows
                ]
            cursor.execute(f"SHOW TABLES IN `{catalog}`.`{schema}`")
            rows = cursor.fetchall()
            return [
                {
                    "name": r[-2],
                    "full_name": f"{catalog}.{schema}.{r[-2]}",
                    "kind": "table",
                }
                for r in rows
            ]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        cursor = conn.cursor()
        try:
            if events_table_hint and events_table_hint.count(".") == 2:
                cat, sch, tbl = events_table_hint.split(".", 2)
                cursor.execute(f"DESCRIBE `{cat}`.`{sch}`.`{tbl}`")
                columns = [
                    ColumnInfo(name=r[0], type=r[1])
                    for r in cursor.fetchall()
                    if r[0] and not r[0].startswith("#")
                ]
                tables = [events_table_hint]
                events_table = events_table_hint
            else:
                cursor.execute("SELECT current_catalog(), current_database()")
                row = cursor.fetchone()
                default_cat, default_sch = (
                    (row[0], row[1]) if row else ("hive_metastore", "default")
                )
                cursor.execute(f"SHOW TABLES IN `{default_cat}`.`{default_sch}`")
                rows = cursor.fetchall()
                tables = [r[-2] if len(r) > 1 else r[0] for r in rows]
                events_table_name = pick_events_table(tables, events_table_hint)
                if not events_table_name:
                    return SchemaInfo(
                        tables=tables,
                        events_table="",
                        columns=[],
                        suggestions={},
                        proposed_custom_properties=[],
                    )
                events_table = f"{default_cat}.{default_sch}.{events_table_name}"
                cursor.execute(
                    f"DESCRIBE `{default_cat}`.`{default_sch}`.`{events_table_name}`"
                )
                columns = [
                    ColumnInfo(name=r[0], type=r[1])
                    for r in cursor.fetchall()
                    if r[0] and not r[0].startswith("#")
                ]

            suggestions = suggest_fields(columns)
            core_values = set(suggestions.values())
            proposed: list[dict] = []
            for col in columns:
                if col.name in core_values:
                    continue
                sql_type = col.type.upper()
                if sql_type.startswith("STRUCT<"):
                    nested = _parse_struct_fields(col.type, col.name)
                    proposed.extend(
                        nested
                        if nested
                        else [{"name": col.name, "path": col.name, "type": "string"}]
                    )
                elif "MAP<" in sql_type:
                    proposed.append(
                        {"name": col.name, "path": col.name, "type": "string"}
                    )
                else:
                    proposed.append(
                        {
                            "name": col.name,
                            "path": col.name,
                            "type": infer_type(sql_type),
                        }
                    )

            return SchemaInfo(
                tables=tables,
                events_table=events_table,
                columns=columns,
                suggestions=suggestions,
                proposed_custom_properties=proposed,
            )
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        named_query, named_params = _to_named_params(query, params or [])
        cursor = conn.cursor()
        try:
            cursor.execute(named_query, named_params or None)
            return cursor.fetchall()
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def execute_with_columns(
        self, conn: Any, query: str, params: list | None
    ) -> tuple[list[str], list[tuple]]:
        named_query, named_params = _to_named_params(query, params or [])
        cursor = conn.cursor()
        try:
            cursor.execute(named_query, named_params or None)
            columns = (
                [desc[0] for desc in cursor.description] if cursor.description else []
            )
            rows = cursor.fetchall()
            return columns, rows
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def build_events_cte(
        self,
        source_table: str,
        uid_field: str,
        ts_field: str,
        en_field: str,
        custom_props: list[dict],
    ) -> str:
        q = "`"
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f"{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name"
        remapped_src = {uid_field, ts_field, en_field}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        return f"(SELECT {core}, * EXCEPT ({excl}) FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end() :]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"DATEDIFF({end}, {start})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"(unix_timestamp({end}) - unix_timestamp({start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"TIMESTAMPDIFF(MINUTE, {earlier}, {later}) > {minutes}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS STRING)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        return f"get_json_object({col}, '$.{'.'.join(parts)}')"

    def extract_hour(self, col: str) -> str:
        return f"CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)"
