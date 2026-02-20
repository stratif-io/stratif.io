"""SQLite seeder — writes analytics events to a SQLite file.

Usage:
    uv run seed-sqlite                         # db/events.sqlite
    uv run seed-sqlite --out /tmp/demo.sqlite  # custom path
    uv run seed-sqlite --users 5000            # fewer users
    uv run seed-sqlite --seed 42               # reproducible output
"""

import argparse
import json
import sqlite3
from pathlib import Path

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig


class SQLiteSeeder(BaseSeeder):
    """Writes seeded events to a SQLite database file."""

    def __init__(
        self,
        db_path: str | None = None,
        num_users: int | None = None,
        seed: int | None = None,
    ):
        config = SeedConfig()
        super().__init__(config=config, seed=seed, num_users=num_users)
        self._db_path = db_path or (config.db_path_prefix + ".sqlite")
        self._conn: sqlite3.Connection | None = None

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     TEXT     NOT NULL,
                event_name  TEXT     NOT NULL,
                timestamp   DATETIME NOT NULL,
                properties  TEXT     NOT NULL
            )
        """)
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_user_id   ON events (user_id)"
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp)"
        )
        self._conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        rows = [
            (e[0], e[1], e[2].strftime("%Y-%m-%d %H:%M:%S"), json.dumps(e[3]))
            for e in events
        ]
        self._conn.executemany(
            "INSERT INTO events (user_id, event_name, timestamp, properties) VALUES (?,?,?,?)",
            rows,
        )
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        out = Path(self._db_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        n = self._num_users or self.config.seed_users
        print(f"Seeding {n:,} users → {out}")

        self._conn = sqlite3.connect(str(out))
        try:
            self._generate_products()
            self._create_events_table()
            users = self._generate_users()

            total_events = 0
            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    print(f"  {total_events:,} events written…")
        finally:
            self._conn.close()
            self._conn = None

        stats = {
            "total_events": total_events,
            "total_users": len(users),
            "new_users": sum(1 for u in users if not u["is_returning"]),
            "returning_users": sum(1 for u in users if u["is_returning"]),
            "power_users": sum(1 for u in users if u["is_power_user"]),
            "completed_purchases": sum(1 for u in users if u["completed_purchase"]),
        }

        size_mb = out.stat().st_size / 1_048_576
        print(
            f"\nDone — {stats['total_events']:,} events, "
            f"{stats['total_users']:,} users, "
            f"{size_mb:.1f} MB"
        )
        return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a SQLite analytics database")
    parser.add_argument(
        "--out",
        default=None,
        help="Output SQLite file path (default: db/events.sqlite)",
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

    SQLiteSeeder(db_path=args.out, num_users=args.users, seed=args.seed).seed()


if __name__ == "__main__":
    main()
