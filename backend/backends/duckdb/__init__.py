"""DuckDB database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

import duckdb
from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, sample_property_types, suggest_fields
from backend.backends.duckdb.credentials import DuckDBCredentials

_DUCKDB_NUMERIC_CAST = "TRY_CAST({expr} AS DOUBLE)"


class DuckDBBackend:
    """Implements DatabaseBackend for DuckDB (file or S3 paths)."""

    @property
    def dialect_name(self) -> str:
        return "duckdb"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return False

    def parse_credentials(self, raw: dict) -> DuckDBCredentials:
        return DuckDBCredentials.model_validate(raw)

    def connection_string(self, credentials: BaseModel) -> str | None:
        creds = DuckDBCredentials.model_validate(credentials.model_dump())
        return f"duckdb:///{creds.resolved_path}"

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        creds = DuckDBCredentials.model_validate(credentials.model_dump())
        return duckdb.connect(creds.resolved_path, read_only=read_only)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "duckdb")

    def is_connection_error(self, exc: Exception) -> bool:
        return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            rel = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(d[0] for d in rel.description)
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            conn.execute(f'SELECT 1 FROM "{table_name}" LIMIT 1')
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        rows = conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY 1"
        ).fetchall()
        return [r[0] for r in rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            rows = conn.execute(f"DESCRIBE {table}").fetchall()
            return [r[0] for r in rows]
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        if schema is None:
            rows = conn.execute(
                "SELECT DISTINCT schema_name FROM information_schema.schemata "
                "WHERE schema_name NOT IN ('information_schema', 'pg_catalog') ORDER BY 1"
            ).fetchall()
            return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
        rows = conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY 1",
            [schema],
        ).fetchall()
        return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables_result = conn.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])

        columns_result = conn.execute(f'DESCRIBE "{events_table}"').fetchall()
        columns = [ColumnInfo(name=r[0], type=r[1]) for r in columns_result]

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if any(t in sql_type for t in ("JSON", "BLOB", "STRUCT", "MAP")):
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT unnest(json_keys("{events_table}"."{col.name}")) '
                        f'FROM "{events_table}" WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if not key:
                            continue
                        try:
                            sub_result = conn.execute(
                                f"SELECT DISTINCT unnest(json_keys(json_extract(\"{col.name}\", '$.{key}'))) "
                                f'FROM "{events_table}" '
                                f"WHERE json_type(\"{col.name}\", '$.{key}') = 'OBJECT' LIMIT 2000"
                            ).fetchall()
                            sub_keys = [r[0] for r in sub_result if r[0]]
                        except Exception:
                            sub_keys = []
                        if sub_keys:
                            for sub_key in sub_keys:
                                proposed.append({"name": sub_key, "path": f"{col.name}.{key}.{sub_key}", "type": "string"})
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
                _DUCKDB_NUMERIC_CAST,
            )
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            return conn.execute(query, params).fetchall()
        return conn.execute(query).fetchall()

    def execute_with_columns(
        self, conn: Any, query: str, params: list | None
    ) -> tuple[list[str], list[tuple]]:
        rel = conn.execute(query, params) if params else conn.execute(query)
        columns = [desc[0] for desc in rel.description] if rel.description else []
        rows = rel.fetchall()
        return columns, rows

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        return f"(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end():]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"DATE_DIFF('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"EXTRACT(EPOCH FROM ({end} - {start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"{later} - {earlier} > INTERVAL '{minutes} minutes'"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS TEXT)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        json_path = "$." + ".".join(parts)
        return f"json_extract_string({col}, '{json_path}')"

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
