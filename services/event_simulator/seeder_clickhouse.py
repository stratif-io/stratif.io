"""ClickHouse seeder — writes analytics events to a ClickHouse database.

Usage:
    uv run seed-clickhouse

Install the optional clickhouse dep if needed:
    uv pip install ".[clickhouse]"

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from services.event_simulator.connections_config import (
    get_clickhouse_credentials,
    load_connections_yaml,
)
from services.event_simulator.seeder import BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class ClickHouseSeeder(BaseSeeder):
    """Writes seeded events to a ClickHouse database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._ch_creds = get_clickhouse_credentials(load_connections_yaml())
        self._client: Any = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._client is not None, "_client not initialized — call seed() first"
        self._client.command("DROP TABLE IF EXISTS events")
        self._client.command("""
            CREATE TABLE events (
                user_id     String,
                event_name  String,
                timestamp   DateTime64(6),
                properties  String,
                server      String,
                traits      String,
                context     String
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
                [
                    e[0],
                    e[1],
                    e[2],
                    json.dumps(e[3]),
                    e[4],
                    json.dumps(e[5]),
                    json.dumps(e[6]),
                ]
                for e in events
            ],
            column_names=[
                "user_id",
                "event_name",
                "timestamp",
                "properties",
                "server",
                "traits",
                "context",
            ],
        )

    def seed(self) -> dict[str, int]:
        import clickhouse_connect

        creds = self._ch_creds
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=creds.get("host"),
            database=creds.get("database"),
        )

        self._client = clickhouse_connect.get_client(
            host=creds["host"],
            port=creds.get("port", 8123),
            username=creds["user"],
            password=creds["password"],
            database=creds["database"],
        )
        try:
            self._create_events_table()
            stats = self._run_engine_loop()
        finally:
            self._client.close()

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
