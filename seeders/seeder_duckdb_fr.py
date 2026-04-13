"""DuckDB seeder (alternate) — writes analytics events to a DuckDB file with French column names.

Table: evenement
Columns:
    tampon_de_temps     — timestamp
    identifiant_utilisateur — user_id
    nom_de_l_evenement  — event_name

Usage:
    uv run seed-duckdb-fr

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.
"""

import json
from pathlib import Path

import duckdb
import pandas as pd
import structlog

from seeders.connections_config import get_duckdb_fr_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DuckDBFrSeeder(BaseSeeder):
    """Writes seeded events to a DuckDB database file using French column names."""

    _db_path: str

    def __init__(self):
        config = SeedConfig()
        super().__init__(config=config)

        creds = get_duckdb_fr_credentials(load_connections_yaml())
        self._db_path: str = creds["file_path"]
        self._table_name: str = creds.get("table_name", "evenement")
        self._conn: duckdb.DuckDBPyConnection

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._conn.execute(f"DROP TABLE IF EXISTS {self._table_name}")
        self._conn.execute(f"""
            CREATE TABLE {self._table_name} (
                identifiant_utilisateur VARCHAR,
                "nom_de_l'evenement"    VARCHAR,
                tampon_de_temps         TIMESTAMP,
                properties              JSON,
                server                  VARCHAR,
                traits                  JSON,
                context                 JSON
            )
        """)

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return

        df = pd.DataFrame(  # noqa: F841
            {
                "identifiant_utilisateur": [e[0] for e in events],
                "nom_de_l_evenement": [e[1] for e in events],
                "tampon_de_temps": [e[2] for e in events],
                "properties": [json.dumps(e[3]) for e in events],
                "server": [e[4] for e in events],
                "traits": [json.dumps(e[5]) for e in events],
                "context": [json.dumps(e[6]) for e in events],
            }
        )

        self._conn.execute(
            f"INSERT INTO {self._table_name} "
            "SELECT identifiant_utilisateur, nom_de_l_evenement, tampon_de_temps, "
            "properties::JSON, server, traits::JSON, context::JSON FROM df"
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
    seeder = DuckDBFrSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
