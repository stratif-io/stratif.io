"""ClickHouse database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends.clickhouse.credentials import ClickHouseCredentials

_DATE_TRUNC_MAP = {
    "hour": "toStartOfHour",
    "day": "toStartOfDay",
    "week": "toStartOfWeek",
    "month": "toStartOfMonth",
    "quarter": "toStartOfQuarter",
    "year": "toStartOfYear",
}

_FROM_TABLE_RE = re.compile(r"\bFROM\s+(`[^`]+`|\S+)", re.IGNORECASE)


class ClickHouseBackend:

    @property
    def dialect_name(self) -> str:
        return "clickhouse"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> ClickHouseCredentials:
        return ClickHouseCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import clickhouse_connect
        creds = ClickHouseCredentials.model_validate(credentials.model_dump())
        client = clickhouse_connect.get_client(
            host=creds.host,
            port=creds.port,
            database=creds.database,
            username=creds.user,
            password=creds.password,
            secure=creds.secure,
        )
        client._creds = creds  # carry credentials so execute() can read always_final
        return client

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "clickhouse")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from clickhouse_connect.driver.exceptions import DatabaseError, OperationalError
            return isinstance(exc, (DatabaseError, OperationalError))
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            result = conn.query(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(result.column_names) if result.column_names else frozenset()
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            conn.query(f"SELECT 1 FROM `{table_name}` LIMIT 1")
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        result = conn.query("SHOW TABLES")
        return [row[0] for row in result.result_rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            result = conn.query(f"SELECT * FROM `{table}` LIMIT 0")
            return list(result.column_names) if result.column_names else []
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        if schema is None:
            result = conn.query("SHOW DATABASES")
            return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in result.result_rows]
        result = conn.query(f"SHOW TABLES FROM `{schema}`")
        return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in result.result_rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables = self.get_tables(conn)
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])
        result = conn.query(f"DESCRIBE TABLE `{events_table}`")
        columns = [ColumnInfo(name=r[0], type=r[1]) for r in result.result_rows]
        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if "JSON" in sql_type or "STRING" in sql_type:
                proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})
        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            query = query.replace("?", "%s")
        creds = getattr(conn, "_creds", None)
        always_final = getattr(creds, "always_final", False)
        if always_final:
            query = _FROM_TABLE_RE.sub(lambda m: m.group(0) + " FINAL", query, count=1)
        if params:
            result = conn.query(query, parameters=params)
        else:
            result = conn.query(query)
        return [tuple(row) for row in result.result_rows]

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = "`"
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f"{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name"
        remapped_src = {uid_field, ts_field, en_field}
        extra_cols = sorted({p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src)
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f"(SELECT {core}{extras} FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end():]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        fn = _DATE_TRUNC_MAP.get(unit)
        if fn is None:
            raise ValueError(f"Unsupported date_trunc unit: {unit!r}")
        return f"{fn}({col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"dateDiff('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"dateDiff('second', {start}, {end})"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"dateDiff('minute', {earlier}, {later}) > {minutes}"

    def string_concat(self, *parts: str) -> str:
        return f"concat({', '.join(parts)})"

    def cast_to_text(self, expr: str) -> str:
        return f"toString({expr})"

    def json_extract_string(self, col: str, key: str) -> str:
        return f"JSONExtractString({col}, '{key}')"

    def extract_hour(self, col: str) -> str:
        return f"toHour({col})"

    def extract_day_of_week(self, col: str) -> str:
        return f"toDayOfWeek({col})"

    def extract_year(self, col: str) -> str:
        return f"toYear({col})"

    def extract_month(self, col: str) -> str:
        return f"toMonth({col})"

    def extract_week(self, col: str) -> str:
        return f"toWeek({col})"

    def extract_quarter(self, col: str) -> str:
        return f"toQuarter({col})"
