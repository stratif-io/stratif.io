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

from seeders.connections_config import get_snowflake_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

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
        """Bulk-upload a batch into the staging table via Parquet."""
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        import pandas as pd
        from snowflake.connector.pandas_tools import write_pandas

        df = pd.DataFrame(
            {
                "USER_ID": [e[0] for e in events],
                "EVENT_NAME": [e[1] for e in events],
                "TIMESTAMP": [e[2] for e in events],
                "PROPERTIES": [json.dumps(e[3]) for e in events],
                "SERVER": [e[4] for e in events],
                "TRAITS": [json.dumps(e[5]) for e in events],
                "CONTEXT": [json.dumps(e[6]) for e in events],
            }
        )
        write_pandas(self._conn, df, self._STAGING_TABLE, quote_identifiers=False)

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

        self._generate_products()
        users = self._generate_users()

        total_events = 0
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

            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    log.info("seeding_progress", total_events=total_events)

            log.info("seeding_finalize", total_events=total_events)
            self._finalize_events()
        finally:
            self._conn.close()

        stats = {
            "total_events": total_events,
            "total_users": len(users),
            "new_users": sum(1 for u in users if not u["is_returning"]),
            "returning_users": sum(1 for u in users if u["is_returning"]),
            "power_users": sum(1 for u in users if u["is_power_user"]),
            "completed_purchases": sum(1 for u in users if u["completed_purchase"]),
        }
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
