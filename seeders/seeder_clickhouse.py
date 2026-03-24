"""ClickHouse seeder — writes analytics events to a ClickHouse database.

Usage:
    uv run seed-clickhouse

Install the optional clickhouse dep if needed:
    uv pip install ".[clickhouse]"

Required env vars (or set in seeders/.env):
    CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DATABASE
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog
from pydantic_settings import BaseSettings

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class ClickHouseConfig(BaseSettings):
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "default"

    class Config:
        env_file = str(Path(__file__).parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


class ClickHouseSeeder(BaseSeeder):
    """Writes seeded events to a ClickHouse database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._ch_config = ClickHouseConfig()
        self._client: Any = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._client is not None, "_client not initialized — call seed() first"
        self._client.command("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     String,
                event_name  String,
                timestamp   DateTime64(6),
                properties  String
            )
            ENGINE = MergeTree()
            PARTITION BY toYYYYMM(timestamp)
            ORDER BY (user_id, timestamp)
        """)

    def _insert_events(self, events: list[tuple]) -> None:
        assert self._client is not None, "_client not initialized — call seed() first"
        if not events:
            return
        self._client.insert(
            "events",
            data=[
                [e[0], e[1], e[2], json.dumps(e[3])]
                for e in events
            ],
            column_names=["user_id", "event_name", "timestamp", "properties"],
        )

    def seed(self) -> dict[str, int]:
        import clickhouse_connect

        cfg = self._ch_config
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=cfg.clickhouse_host,
            database=cfg.clickhouse_database,
        )

        self._generate_products()
        users = self._generate_users()

        total_events = 0
        self._client = clickhouse_connect.get_client(
            host=cfg.clickhouse_host,
            port=cfg.clickhouse_port,
            username=cfg.clickhouse_user,
            password=cfg.clickhouse_password,
            database=cfg.clickhouse_database,
        )
        try:
            self._create_events_table()

            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    log.info("seeding_progress", total_events=total_events)
        finally:
            self._client.close()

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
    seeder = ClickHouseSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
