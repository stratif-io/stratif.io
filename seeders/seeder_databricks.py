"""Databricks seeder — writes analytics events to a Databricks SQL warehouse.

Usage:
    uv run seed-databricks

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

from __future__ import annotations

from typing import Any

import structlog
from databricks import sql

from seeders.connections_config import get_databricks_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DatabricksSeeder(BaseSeeder):
    """Writes seeded events to a Databricks SQL warehouse."""

    def __init__(self, config: SeedConfig | None = None, *, overwrite_schema: bool = True) -> None:
        super().__init__(config=config or SeedConfig())
        self._db_creds = get_databricks_credentials(load_connections_yaml())
        self._conn: Any = None
        self._overwrite_schema = overwrite_schema

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        with self._conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS events")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    user_id     STRING      NOT NULL,
                    event_name  STRING      NOT NULL,
                    timestamp   TIMESTAMP   NOT NULL,
                    properties  MAP<STRING, STRING> NOT NULL,
                    server      STRING      NOT NULL,
                    traits      STRUCT<
                                    first_name:     STRING,
                                    last_name:      STRING,
                                    phone:          STRING,
                                    email:          STRING,
                                    date_of_birth:  STRING
                                > NOT NULL,
                    context     STRUCT<
                                    country:            STRING,
                                    city:               STRING,
                                    timezone:           STRING,
                                    device_type:        STRING,
                                    browser:            STRING,
                                    os:                 STRING,
                                    screen_resolution:  STRING,
                                    referrer:           STRING
                                > NOT NULL
                )
                USING DELTA
            """)

    def _insert_events(self, events: list[tuple]) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        params: list = []
        for e in events:
            params += [
                e[0],
                e[1],
                e[2],
                {str(k): str(v) for k, v in e[3].items()},
                e[4],
                e[5],
                e[6],
            ]
        placeholders = ", ".join("(?, ?, ?, ?, ?, ?, ?)" for _ in events)
        with self._conn.cursor() as cur:
            cur.execute(
                "INSERT INTO events "
                "(user_id, event_name, timestamp, properties, server, traits, context) "
                f"VALUES {placeholders}",
                params,
            )

    def seed(self) -> dict[str, int]:
        creds = self._db_creds
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            server_hostname=creds.get("server_hostname"),
        )

        self._generate_products()
        users = self._generate_users()

        total_events = 0
        with sql.connect(
            server_hostname=creds["server_hostname"],
            http_path=creds["http_path"],
            access_token=creds["access_token"],
        ) as self._conn:
            if self._overwrite_schema:
                self._create_events_table()

            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    log.info("seeding_progress", total_events=total_events)

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
    seeder = DatabricksSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
