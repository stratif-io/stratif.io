"""DuckDB seeder — writes analytics events to a DuckDB file.

Usage:
    uv run seed-duckdb                        # uses seeders/.env.seed defaults
    uv run seed-duckdb --out db/custom.duckdb # custom path
    uv run seed-duckdb --users 5000           # fewer users
    uv run seed-duckdb --seed 42              # reproducible output
"""

import argparse
from pathlib import Path

import duckdb
import structlog

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DuckDBSeeder(BaseSeeder):
    """Writes seeded events to a DuckDB database file."""

    def __init__(
        self,
        db_path: str | None = None,
        num_users: int | None = None,
        seed: int | None = None,
    ):
        config = SeedConfig()
        super().__init__(config=config, seed=seed, num_users=num_users)
        self._db_path = db_path or (config.db_path_prefix + ".duckdb")
        self._conn: duckdb.DuckDBPyConnection | None = None

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

        self._conn.execute(
            "INSERT INTO events "
            "SELECT user_id, event_name, timestamp, properties::JSON FROM df"
        )

    def seed(self) -> dict[str, int]:
        out = Path(self._db_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        n = self._num_users or self.config.seed_users
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
            self._conn = None

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
    parser = argparse.ArgumentParser(description="Seed the DuckDB analytics database")
    parser.add_argument(
        "--out",
        default=None,
        help="Output DuckDB file path (default: DB_PATH from seeders/.env.seed)",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=None,
        help="Number of users to generate (default: SEED_USERS from seeders/.env.seed)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility",
    )
    args = parser.parse_args()

    seeder = DuckDBSeeder(db_path=args.out, num_users=args.users, seed=args.seed)
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
