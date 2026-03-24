"""PostgreSQL seeder — writes analytics events to a PostgreSQL database.

Usage:
    uv run seed-postgres

Required env vars (or set in seeders/.env.seed):
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE
"""

from __future__ import annotations

import json
from pathlib import Path

import psycopg2
import psycopg2.extras
import structlog
from pydantic_settings import BaseSettings

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class PostgresConfig(BaseSettings):
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_database: str = "postgres"

    class Config:
        env_file = str(Path(__file__).parent / ".env.seed")
        env_file_encoding = "utf-8"
        extra = "ignore"


class PostgreSQLSeeder(BaseSeeder):
    """Writes seeded events to a PostgreSQL database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._pg_config = PostgresConfig()
        self._conn: psycopg2.extensions.connection | None = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        with self._conn.cursor() as cur:
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
        self._conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        rows = [(e[0], e[1], e[2], json.dumps(e[3])) for e in events]
        with self._conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO events (user_id, event_name, timestamp, properties) "
                "VALUES (%s, %s, %s, %s)",
                rows,
                page_size=1000,
            )
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        cfg = self._pg_config
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=cfg.postgres_host,
            database=cfg.postgres_database,
        )

        users: list[dict] = []
        total_events = 0
        self._conn = psycopg2.connect(
            host=cfg.postgres_host,
            port=cfg.postgres_port,
            dbname=cfg.postgres_database,
            user=cfg.postgres_user,
            password=cfg.postgres_password,
        )
        try:
            self._generate_products()
            self._create_events_table()
            users = self._generate_users()

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
