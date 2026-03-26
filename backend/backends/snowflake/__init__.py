"""Snowflake database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends.snowflake.credentials import SnowflakeCredentials


class SnowflakeBackend:

    @property
    def dialect_name(self) -> str:
        return "snowflake"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> SnowflakeCredentials:
        return SnowflakeCredentials.model_validate(raw)

    def connection_string(self, credentials: BaseModel) -> str | None:
        creds = SnowflakeCredentials.model_validate(credentials.model_dump(by_alias=True))
        role_part = f"&role={creds.role}" if creds.role else ""
        return (
            f"snowflake://{creds.user}:****@{creds.account}"
            f"/{creds.database}/{creds.schema_}"
            f"?warehouse={creds.warehouse}{role_part}"
        )

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import snowflake.connector
        creds = SnowflakeCredentials.model_validate(credentials.model_dump(by_alias=True))
        kwargs: dict = dict(
            account=creds.account,
            user=creds.user,
            password=creds.password,
            warehouse=creds.warehouse,
            database=creds.database,
            schema=creds.schema_,
        )
        if creds.role:
            kwargs["role"] = creds.role
        return snowflake.connector.connect(**kwargs)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "snowflake")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from snowflake.connector.errors import DatabaseError, OperationalError
            return isinstance(exc, (DatabaseError, OperationalError))
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0].lower() for d in cursor.description or [])
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f'SELECT 1 FROM "{table_name}" LIMIT 1')
                return True
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        cursor = conn.cursor()
        try:
            cursor.execute("SHOW TABLES")
            return [r[1] for r in cursor.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            cursor = conn.cursor()
            try:
                quoted = '.'.join(f'"{p}"' for p in table.split('.'))
                cursor.execute(f'SELECT * FROM {quoted} LIMIT 0')
                return [d[0] for d in cursor.description or []]
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        cursor = conn.cursor()
        try:
            if schema is None:
                cursor.execute("SHOW SCHEMAS")
                rows = cursor.fetchall()
                return [{"name": r[1], "full_name": r[1], "kind": "schema"} for r in rows]
            cursor.execute(f'SHOW TABLES IN SCHEMA "{schema}"')
            rows = cursor.fetchall()
            return [{"name": r[1], "full_name": f"{schema}.{r[1]}", "kind": "table"} for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables = self.get_tables(conn)
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = %s ORDER BY ordinal_position",
                (events_table.upper(),),
            )
            columns = [ColumnInfo(name=r[0].lower(), type=r[1]) for r in cursor.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if "VARIANT" in sql_type or "OBJECT" in sql_type:
                proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            query = query.replace("?", "%s")
        cursor = conn.cursor()
        try:
            cursor.execute(query, params or None)
            return cursor.fetchall()
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def execute_with_columns(
        self, conn: Any, query: str, params: list | None
    ) -> tuple[list[str], list[tuple]]:
        if params:
            query = query.replace("?", "%s")
        cursor = conn.cursor()
        try:
            cursor.execute(query, params or None)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            return columns, rows
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
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
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"DATEDIFF('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"DATEDIFF('second', {start}, {end})"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"DATEDIFF('minute', {earlier}, {later}) > {minutes}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"{expr}::string"

    def json_extract_string(self, col: str, key: str) -> str:
        return f"{col}:{key}::string"

    def extract_hour(self, col: str) -> str:
        return f"EXTRACT(HOUR FROM {col})"

    def extract_day_of_week(self, col: str) -> str:
        return f"DAYOFWEEK({col})"

    def extract_year(self, col: str) -> str:
        return f"EXTRACT(YEAR FROM {col})"

    def extract_month(self, col: str) -> str:
        return f"EXTRACT(MONTH FROM {col})"

    def extract_week(self, col: str) -> str:
        return f"EXTRACT(WEEK FROM {col})"

    def extract_quarter(self, col: str) -> str:
        return f"EXTRACT(QUARTER FROM {col})"
