"""PostgreSQL seeder — writes analytics events to a PostgreSQL database.

Usage:
    uv run seed-postgres

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

from __future__ import annotations

import json

import psycopg2
import psycopg2.extras
import structlog

from seeders.connections_config import get_postgresql_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class PostgreSQLSeeder(BaseSeeder):
    """Writes seeded events to a PostgreSQL database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._pg_creds = get_postgresql_credentials(load_connections_yaml())
        self._conn: psycopg2.extensions.connection | None = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        cur = self._conn.cursor()
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    user_id     TEXT        NOT NULL,
                    event_name  TEXT        NOT NULL,
                    timestamp   TIMESTAMPTZ NOT NULL,
                    properties  JSONB       NOT NULL
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_events_user_ts "
                "ON events (user_id, timestamp)"
            )
        finally:
            cur.close()
        self._conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        rows = [(e[0], e[1], e[2], json.dumps(e[3])) for e in events]
        cur = self._conn.cursor()
        try:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO events (user_id, event_name, timestamp, properties) "
                "VALUES (%s, %s, %s, %s)",
                rows,
                page_size=1000,
            )
        finally:
            cur.close()
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        creds = self._pg_creds
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=creds.get("host"),
            database=creds.get("database"),
        )

        self._generate_products()
        users = self._generate_users()

        total_events = 0
        self._conn = psycopg2.connect(
            host=creds["host"],
            port=creds.get("port", 5432),
            dbname=creds["database"],
            user=creds["user"],
            password=creds["password"],
        )
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
    seeder = PostgreSQLSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
