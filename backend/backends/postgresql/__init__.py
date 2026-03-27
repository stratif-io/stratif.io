"""PostgreSQL database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, suggest_fields, sample_property_types
from backend.backends.postgresql.credentials import PostgreSQLCredentials

_PG_NUMERIC_CAST = r"(CASE WHEN {expr} ~ '^-?[0-9]+(\.[0-9]+)?$' THEN 1.0 ELSE NULL END)"


class PostgreSQLBackend:

    @property
    def dialect_name(self) -> str:
        return "postgres"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> PostgreSQLCredentials:
        return PostgreSQLCredentials.model_validate(raw)

    def connection_string(self, credentials: BaseModel) -> str | None:
        creds = PostgreSQLCredentials.model_validate(credentials.model_dump())
        ssl = f"?sslmode={creds.sslmode}" if creds.sslmode else ""
        return f"postgresql://{creds.user}:****@{creds.host}:{creds.port}/{creds.database}{ssl}"

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import psycopg2
        creds = PostgreSQLCredentials.model_validate(credentials.model_dump())
        kwargs: dict = dict(host=creds.host, port=creds.port, dbname=creds.database,
                            user=creds.user, password=creds.password)
        if creds.sslmode:
            kwargs["sslmode"] = creds.sslmode
        conn = psycopg2.connect(**kwargs)
        conn.autocommit = True
        return conn

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "postgres")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            import psycopg2
            return isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError))
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0] for d in cursor.description or [])
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
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY 1"
            )
            return [r[0] for r in cursor.fetchall()]
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
                cursor.execute(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1"
                )
                rows = cursor.fetchall()
                return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
            cursor.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s ORDER BY 1",
                [schema],
            )
            rows = cursor.fetchall()
            return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        cur1 = conn.cursor()
        try:
            cur1.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name"
            )
            tables = [r[0] for r in cur1.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cur1.close()

        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])

        cur2 = conn.cursor()
        try:
            cur2.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position",
                (events_table,),
            )
            columns = [ColumnInfo(name=r[0], type=r[1]) for r in cur2.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cur2.close()

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if any(t in sql_type for t in ("JSON", "JSONB")):
                try:
                    cur_keys = conn.cursor()
                    try:
                        cur_keys.execute(
                            f'SELECT DISTINCT jsonb_object_keys("{col.name}"::jsonb) '
                            f'FROM "{events_table}" WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                        )
                        for (key,) in cur_keys.fetchall():
                            if key:
                                proposed.append({"name": key, "path": f"{col.name}.{key}", "type": "string"})
                    finally:
                        with contextlib.suppress(Exception):
                            cur_keys.close()
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

            def _pg_execute(sql: str):
                try:
                    cur = conn.cursor()
                    cur.execute(sql)
                    return cur.fetchall()
                except Exception:
                    return None
                finally:
                    with contextlib.suppress(Exception):
                        cur.close()

            upgrades = sample_property_types(_pg_execute, events_table, prop_exprs, _PG_NUMERIC_CAST)
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]

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
        return f"CAST(EXTRACT(DAY FROM ({end}::timestamp - {start}::timestamp)) AS INTEGER)"

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
        if len(parts) == 1:
            return f"{col}->>'{key}'"
        return f"json_extract_path_text({col}, {', '.join(repr(p) for p in parts)})"

    def extract_hour(self, col: str) -> str:
        return f"CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(EXTRACT(DOW FROM {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)"
