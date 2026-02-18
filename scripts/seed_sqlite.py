"""Seed a SQLite database with realistic analytics data.

Usage:
    uv run seed-sqlite --out data/events.sqlite --users 10000 --seed 42
"""

import argparse
import json
import sqlite3
from typing import Optional

import structlog

from openflow.db.connection import Database
from openflow.db.seeder import Seeder

log = structlog.get_logger(__name__)


class SqliteSeeder(Seeder):
    """Seeder subclass that writes events to a SQLite file instead of DuckDB."""

    def __init__(self, db_path: str, num_users: int = 10_000, seed: Optional[int] = None):
        # Pass a dummy in-memory DuckDB to satisfy the base class (never written to).
        super().__init__(db=Database(":memory:"), seed=seed, num_users=num_users)
        self._db_path = db_path
        self._sqlite_conn = sqlite3.connect(db_path)

    # ------------------------------------------------------------------
    # Overridden DB-specific methods
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._sqlite_conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                user_id    TEXT,
                event_name TEXT,
                timestamp  TEXT,
                properties TEXT
            )
        """)
        self._sqlite_conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        rows = [
            (e[0], e[1], e[2].isoformat(), json.dumps(e[3]))
            for e in events
        ]
        self._sqlite_conn.executemany(
            "INSERT INTO events (user_id, event_name, timestamp, properties) VALUES (?, ?, ?, ?)",
            rows,
        )
        self._sqlite_conn.commit()

    def seed(self) -> dict[str, int]:
        # Run the base seeder (calls _create_events_table + _insert_events via dispatch).
        stats = super().seed()

        # Add indexes for query performance.
        self._sqlite_conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_user_id ON events (user_id)"
        )
        self._sqlite_conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp)"
        )
        self._sqlite_conn.commit()
        self._sqlite_conn.close()

        log.info("sqlite_seeded", path=self._db_path, **stats)
        return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a SQLite events database")
    parser.add_argument(
        "--out",
        default="data/events.sqlite",
        help="Output SQLite file path (default: data/events.sqlite)",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=10_000,
        help="Number of users to generate (default: 10000)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility",
    )
    args = parser.parse_args()

    seeder = SqliteSeeder(db_path=args.out, num_users=args.users, seed=args.seed)
    stats = seeder.seed()
    print(
        f"Seeded {stats['total_events']:,} events for {stats['total_users']:,} users → {args.out}"
    )


if __name__ == "__main__":
    main()
