"""DuckDB seeder — writes analytics events to a DuckDB file.

Usage:
    uv run seed-duckdb

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

import json
from pathlib import Path

import duckdb
import pandas as pd
import structlog

from seeders.connections_config import get_duckdb_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DuckDBSeeder(BaseSeeder):
    """Writes seeded events to a DuckDB database file."""

    _db_path: str

    def __init__(self):
        config = SeedConfig()
        super().__init__(config=config)

        creds = get_duckdb_credentials(load_connections_yaml())
        self._db_path: str = creds["file_path"]
        self._conn: duckdb.DuckDBPyConnection

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     VARCHAR,
                event_name  VARCHAR,
                timestamp   TIMESTAMP,
                properties  JSON,
                server      VARCHAR
            )
        """)

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return

        df = pd.DataFrame(  # noqa: F841
            {
                "user_id": [e[0] for e in events],
                "event_name": [e[1] for e in events],
                "timestamp": [e[2] for e in events],
                "properties": [json.dumps(e[3]) for e in events],
                "server": [e[4] for e in events],
            }
        )

        self._conn.execute(
            "INSERT INTO events "
            "SELECT user_id, event_name, timestamp, properties::JSON, server FROM df"
        )

    def seed(self) -> dict[str, int]:
        out = Path(self._db_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        n = self.config.seed_users
        log.info("seeding_start", users=n, days=self.config.seed_days, db=str(out))

        self._conn = duckdb.connect(str(out))
        try:
            self._generate_products()
            self._create_events_table()
            users = self._generate_users()

            total_events = 0
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
            "browser_only": sum(1 for u in users if u["browser_only"]),
            "completed_purchases": sum(1 for u in users if u["completed_purchase"]),
        }
        log.info("seeding_complete", **stats)
        return stats


def main() -> None:
    seeder = DuckDBSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
