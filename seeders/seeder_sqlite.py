"""SQLite seeder — writes analytics events to a SQLite file.

Usage:
    uv run seed-sqlite

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

import json
import sqlite3
from pathlib import Path

from seeders.connections_config import get_sqlite_credentials, load_connections_yaml
from seeders.seeder import BaseSeeder, SeedConfig


class SQLiteSeeder(BaseSeeder):
    """Writes seeded events to a SQLite database file."""

    _db_path: str | None

    def __init__(self):
        config = SeedConfig()
        super().__init__(config=config)
        creds = get_sqlite_credentials(load_connections_yaml())
        self._db_path: str = creds["file_path"]
        self._table_name: str = creds.get("table_name", "events")
        self._conn: sqlite3.Connection

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._conn.execute(f"DROP TABLE IF EXISTS {self._table_name}")
        self._conn.execute(f"""
            CREATE TABLE {self._table_name} (
                user_id     TEXT     NOT NULL,
                event_name  TEXT     NOT NULL,
                timestamp   DATETIME NOT NULL,
                properties  TEXT     NOT NULL,
                server      TEXT     NOT NULL,
                traits      TEXT     NOT NULL,
                context     TEXT     NOT NULL
            )
        """)
        self._conn.execute(
            f"CREATE INDEX IF NOT EXISTS idx_{self._table_name}_user_id "
            f"ON {self._table_name} (user_id)"
        )
        self._conn.execute(
            f"CREATE INDEX IF NOT EXISTS idx_{self._table_name}_timestamp "
            f"ON {self._table_name} (timestamp)"
        )
        self._conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        rows = [
            (
                e[0],
                e[1],
                e[2].strftime("%Y-%m-%d %H:%M:%S"),
                json.dumps(e[3]),
                e[4],
                json.dumps(e[5]),
                json.dumps(e[6]),
            )
            for e in events
        ]
        self._conn.executemany(
            f"INSERT INTO {self._table_name} "
            "(user_id, event_name, timestamp, properties, server, traits, context) "
            "VALUES (?,?,?,?,?,?,?)",
            rows,
        )
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        if not self._db_path:
            raise ValueError("db_path must be provided via connections.yaml")

        out = Path(self._db_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        print(f"Seeding → {out} (table {self._table_name})")

        self._conn = sqlite3.connect(str(out))
        try:
            self._create_events_table()
            stats = self._run_engine_loop()
        finally:
            self._conn.close()

        size_mb = out.stat().st_size / 1_048_576
        print(
            f"\nDone — {stats['total_events']:,} events, "
            f"{stats['total_users']:,} users, "
            f"{size_mb:.1f} MB"
        )
        return stats


def main() -> None:
    SQLiteSeeder().seed()


if __name__ == "__main__":
    main()
