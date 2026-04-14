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
        finally:
            cur.close()

    def _insert_events(self, events: list[tuple]) -> None:
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
        cur = self._conn.cursor()
        try:
            cur.executemany(
                "INSERT INTO events "
                "(user_id, event_name, timestamp, properties, server, traits, context) "
                "SELECT %s, %s, %s, PARSE_JSON(%s), %s, PARSE_JSON(%s), PARSE_JSON(%s)",
                rows,
            )
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
