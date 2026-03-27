"""SQLite seeder — writes analytics events to a SQLite file.

Usage:
    uv run seed-sqlite                         # db/events.sqlite
    uv run seed-sqlite --out /tmp/demo.sqlite  # custom path
    uv run seed-sqlite --users 5000            # fewer users
    uv run seed-sqlite --seed 42               # reproducible output
"""

import json
import sqlite3
from pathlib import Path

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig


class SQLiteSeeder(BaseSeeder):
    """Writes seeded events to a SQLite database file."""

    _db_path: str | None

    def __init__(
        self,
    ):
        config = SeedConfig()
        super().__init__(config=config)
        self._db_path = (
            f"{config.db_path_prefix}.sqlite"
            if config and config.db_path_prefix
            else None
        )

        self._conn: sqlite3.Connection

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     TEXT     NOT NULL,
                event_name  TEXT     NOT NULL,
                timestamp   DATETIME NOT NULL,
                properties  TEXT     NOT NULL,
                server      TEXT     NOT NULL
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
            (e[0], e[1], e[2].strftime("%Y-%m-%d %H:%M:%S"), json.dumps(e[3]), e[4])
            for e in events
        ]
        self._conn.executemany(
            "INSERT INTO events (user_id, event_name, timestamp, properties, server) VALUES (?,?,?,?,?)",
            rows,
        )
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        if self._db_path:
            out = Path(self._db_path)
            out.parent.mkdir(parents=True, exist_ok=True)

            n = self.config.seed_users
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
        else:
            raise ValueError(
                "db_path must be provided or set via STRATIFIO_DB_PATH environment variable"
            )


def main() -> None:
    SQLiteSeeder().seed()


if __name__ == "__main__":
    main()
