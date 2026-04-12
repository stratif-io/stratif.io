"""Databricks seeder — writes analytics events to a Databricks SQL warehouse.

Usage:
    uv run seed-databricks

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from databricks import sql

from seeders.connections_config import get_databricks_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DatabricksSeeder(BaseSeeder):
    """Writes seeded events to a Databricks SQL warehouse."""

    def __init__(self, config: SeedConfig | None = None) -> None:
        super().__init__(config=config or SeedConfig())
        self._db_creds = get_databricks_credentials(load_connections_yaml())
        self._conn: Any = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        with self._conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS events")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    user_id     STRING    NOT NULL,
                    event_name  STRING    NOT NULL,
                    timestamp   TIMESTAMP NOT NULL,
                    properties  STRING    NOT NULL,
                    server      STRING    NOT NULL,
                    traits      STRING    NOT NULL,
                    context     STRING    NOT NULL
                )
                USING DELTA
            """)

    @staticmethod
    def _sql_str(value: object) -> str:
        """Escape a value for safe inline insertion into a SQL literal."""
        return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"

    def _insert_events(self, events: list[tuple]) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        sub_batch_size = 1000
        with self._conn.cursor() as cur:
            for i in range(0, len(events), sub_batch_size):
                sub = events[i : i + sub_batch_size]
                value_clauses = []
                for e in sub:
                    user_id = self._sql_str(e[0])
                    event_name = self._sql_str(e[1])
                    ts = self._sql_str(e[2])
                    props = self._sql_str(json.dumps(e[3]))
                    server = self._sql_str(e[4])
                    traits = self._sql_str(json.dumps(e[5]))
                    ctx = self._sql_str(json.dumps(e[6]))
                    value_clauses.append(
                        f"({user_id}, {event_name}, CAST({ts} AS TIMESTAMP),"
                        f" {props}, {server}, {traits}, {ctx})"
                    )
                cur.execute(
                    "INSERT INTO events"
                    " (user_id, event_name, timestamp, properties, server, traits, context)"
                    f" VALUES {', '.join(value_clauses)}"
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

        batch_size = 10_000
        total_events = 0
        connect_kwargs: dict = {
            "server_hostname": creds["server_hostname"],
            "http_path": creds["http_path"],
            "access_token": creds["access_token"],
            "enable_telemetry": False,
        }
        if tls_ca := creds.get("tls_trusted_ca_file"):
            connect_kwargs["_tls_trusted_ca_file"] = tls_ca
        with sql.connect(**connect_kwargs) as self._conn:
            self._create_events_table()

            pending: list[tuple] = []
            for chunk in self._generate_events_batched(users):
                pending.extend(chunk)
                while len(pending) >= batch_size:
                    batch, pending = pending[:batch_size], pending[batch_size:]
                    self._insert_events(batch)
                    total_events += len(batch)
                    log.info("seeding_progress", total_events=total_events, batch_size=len(batch))
            if pending:
                self._insert_events(pending)
                total_events += len(pending)
                log.info("seeding_progress", total_events=total_events, batch_size=len(pending))

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
