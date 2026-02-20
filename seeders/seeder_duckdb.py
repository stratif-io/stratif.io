"""DuckDB seeder — writes analytics events to a DuckDB file.

Usage:
    uv run seed-duckdb                        # uses seeders/.env.seed defaults
    uv run seed-duckdb --out db/custom.duckdb # custom path
    uv run seed-duckdb --users 5000           # fewer users
    uv run seed-duckdb --seed 42              # reproducible output
"""

import json
from pathlib import Path

import duckdb
import pandas as pd
import structlog

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DuckDBSeeder(BaseSeeder):
    """Writes seeded events to a DuckDB database file."""

    _db_path: str | None

    def __init__(self):
        config = SeedConfig()
        super().__init__(config=config)

        self._db_path = (
            f"{config.db_path_prefix}.duckdb"
            if config and config.db_path_prefix
            else None
        )
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
                properties  JSON
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
            }
        )

        self._conn.execute(
            "INSERT INTO events "
            "SELECT user_id, event_name, timestamp, properties::JSON FROM df"
        )

    def seed(self) -> dict[str, int]:
        if self._db_path:
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
        else:
            raise ValueError(
                "db_path must be provided or set via OPENFLOW_DB_PATH environment variable"
            )


def main() -> None:
    seeder = DuckDBSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
