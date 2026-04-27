"""Snowflake seeder — writes analytics events to a Snowflake database.

Usage:
    uv run seed-snowflake

Install the optional snowflake dep if needed:
    uv pip install ".[snowflake]"

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from services.event_simulator.connections_config import (
    get_snowflake_credentials,
    load_connections_yaml,
)
from services.event_simulator.seeder import BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class SnowflakeSeeder(BaseSeeder):
    """Writes seeded events to a Snowflake database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._sf_creds = get_snowflake_credentials(load_connections_yaml())
        self._conn: Any = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    _STAGING_TABLE = "EVENTS_STAGING"

    def _create_events_table(self) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        cur = self._conn.cursor()
        try:
            cur.execute("DROP TABLE IF EXISTS events")
            cur.execute("""
                CREATE TABLE events (
                    user_id     STRING       NOT NULL,
                    event_name  STRING       NOT NULL,
                    timestamp   TIMESTAMP_NTZ NOT NULL,
                    properties  VARIANT,
                    server      STRING       NOT NULL,
                    traits      VARIANT,
                    context     VARIANT
                )
            """)
            # Staging table has VARCHAR for JSON columns so write_pandas can bulk
            # upload via Parquet. PARSE_JSON happens in the final INSERT..SELECT.
            cur.execute(f"DROP TABLE IF EXISTS {self._STAGING_TABLE}")
            cur.execute(f"""
                CREATE TEMPORARY TABLE {self._STAGING_TABLE} (
                    USER_ID     STRING       NOT NULL,
                    EVENT_NAME  STRING       NOT NULL,
                    TIMESTAMP   TIMESTAMP_NTZ NOT NULL,
                    PROPERTIES  STRING,
                    SERVER      STRING       NOT NULL,
                    TRAITS      STRING,
                    CONTEXT     STRING
                )
            """)
        finally:
            cur.close()

    def _insert_events(self, events: list[tuple]) -> None:
        """Bulk insert a batch into the VARCHAR staging table.

        Using executemany with a pure VALUES clause (no function calls) lets
        snowflake-connector-python rewrite the batch into a multi-row insert.
        PARSE_JSON would break that rewrite (error 252001), hence the staging
        detour.

        fakesnow fast path: fakesnow's SQL translation layer makes INSERTs
        ~20× slower than the DuckDB engine underneath. When running under
        fakesnow we grab the raw DuckDB connection and bulk-insert directly.
        """
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        rows = [
            (
                e[0],
                e[1],
                e[2],
                json.dumps(e[3]),
                e[4],
                json.dumps(e[5]),
                json.dumps(e[6]),
            )
            for e in events
        ]

        duck = getattr(self._conn, "_duck_conn", None)
        if duck is not None:
            duck.executemany(
                f"INSERT INTO {self._STAGING_TABLE} "
                "(USER_ID, EVENT_NAME, TIMESTAMP, PROPERTIES, SERVER, TRAITS, CONTEXT) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
            return

        # Real Snowflake: single multi-row INSERT per batch.
        placeholders = ",".join(["(%s,%s,%s,%s,%s,%s,%s)"] * len(rows))
        flat: list = []
        for row in rows:
            flat.extend(row)
        cur = self._conn.cursor()
        try:
            cur.execute(
                f"INSERT INTO {self._STAGING_TABLE} "
                "(USER_ID, EVENT_NAME, TIMESTAMP, PROPERTIES, SERVER, TRAITS, CONTEXT) "
                f"VALUES {placeholders}",
                flat,
            )
        finally:
            cur.close()

    def _finalize_events(self) -> None:
        """Promote staged rows into the VARIANT-typed events table."""
        assert self._conn is not None, "_conn not initialized — call seed() first"
        cur = self._conn.cursor()
        try:
            cur.execute(f"""
                INSERT INTO events
                    (user_id, event_name, timestamp, properties, server, traits, context)
                SELECT
                    USER_ID, EVENT_NAME, TIMESTAMP,
                    PARSE_JSON(PROPERTIES), SERVER,
                    PARSE_JSON(TRAITS), PARSE_JSON(CONTEXT)
                FROM {self._STAGING_TABLE}
            """)
        finally:
            cur.close()

    def seed(self) -> dict[str, int]:
        import snowflake.connector

        creds = self._sf_creds
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            account=creds.get("account"),
            database=creds.get("database"),
        )

        connect_kwargs = {
            "account": creds["account"],
            "user": creds["user"],
            "password": creds["password"],
            "warehouse": creds.get("warehouse"),
            "database": creds["database"],
            "schema": creds.get("schema"),
        }
        for opt in ("role", "host", "port", "protocol"):
            if creds.get(opt):
                connect_kwargs[opt] = creds[opt]

        self._conn = snowflake.connector.connect(**connect_kwargs)
        try:
            self._create_events_table()
            stats = self._run_engine_loop()
            log.info("seeding_finalize", total_events=stats["total_events"])
            self._finalize_events()
        finally:
            self._conn.close()

        log.info("seeding_complete", **stats)
        return stats


def main() -> None:
    seeder = SnowflakeSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
