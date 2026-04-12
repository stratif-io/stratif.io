"""Databricks seeder — writes analytics events to a Databricks SQL warehouse.

Usage:
    uv run seed-databricks

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.

Strategy: events are written directly as Parquet files (via pyarrow) to a
host directory that is bind-mounted into the Spark container.  Spark then
registers an external table pointing at that directory — no SQL INSERTs, so
the JVM never accumulates in-memory write state and never OOMs.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq
import structlog
from databricks import sql

from seeders.connections_config import get_databricks_credentials, load_connections_yaml
from seeders.seeder import BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)

# Host path that is bind-mounted into the Spark container at the same path.
# Must match the volume mapping in docker-compose.yml.
EVENTS_HOST_DIR = Path("/tmp/databricks-events")
EVENTS_CONTAINER_DIR = "/tmp/databricks-events"

_SCHEMA = pa.schema([
    pa.field("user_id",    pa.string(),              nullable=False),
    pa.field("event_name", pa.string(),              nullable=False),
    pa.field("timestamp",  pa.timestamp("us", tz="UTC"), nullable=False),
    pa.field("properties", pa.string(),              nullable=False),
    pa.field("server",     pa.string(),              nullable=False),
    pa.field("traits",     pa.string(),              nullable=False),
    pa.field("context",    pa.string(),              nullable=False),
])


class DatabricksSeeder(BaseSeeder):
    """Writes seeded events to a Databricks SQL warehouse."""

    def __init__(self, config: SeedConfig | None = None) -> None:
        super().__init__(config=config or SeedConfig())
        self._db_creds = get_databricks_credentials(load_connections_yaml())
        self._conn: Any = None

    # BaseSeeder abstract method stubs (unused — we bypass SQL INSERTs entirely)
    def _create_events_table(self) -> None:
        pass

    def _insert_events(self, events: list[tuple]) -> None:
        pass

    # ------------------------------------------------------------------
    # Parquet writing (no Spark involvement)
    # ------------------------------------------------------------------

    def _write_events_parquet(self, users: list[dict]) -> int:
        """Write all events as Parquet files to EVENTS_HOST_DIR.

        Returns the total number of events written.
        """
        if EVENTS_HOST_DIR.exists():
            shutil.rmtree(EVENTS_HOST_DIR)
        EVENTS_HOST_DIR.mkdir(parents=True)

        import json

        writer: pq.ParquetWriter | None = None
        file_idx = 0
        total_events = 0
        batch_size = 50_000
        rows: dict[str, list] = {f.name: [] for f in _SCHEMA}

        def flush() -> None:
            nonlocal writer, file_idx
            table = pa.table(rows, schema=_SCHEMA)
            path = EVENTS_HOST_DIR / f"part-{file_idx:05d}.parquet"
            pq.write_table(table, path, compression="snappy")
            file_idx += 1
            for lst in rows.values():
                lst.clear()

        for chunk in self._generate_events_batched(users):
            for e in chunk:
                ts_raw = e[2]
                if isinstance(ts_raw, str):
                    ts = datetime.fromisoformat(ts_raw).replace(tzinfo=timezone.utc)
                elif isinstance(ts_raw, datetime):
                    ts = ts_raw if ts_raw.tzinfo else ts_raw.replace(tzinfo=timezone.utc)
                else:
                    ts = datetime.fromtimestamp(float(ts_raw), tz=timezone.utc)

                rows["user_id"].append(str(e[0]))
                rows["event_name"].append(str(e[1]))
                rows["timestamp"].append(ts)
                rows["properties"].append(json.dumps(e[3]))
                rows["server"].append(str(e[4]))
                rows["traits"].append(json.dumps(e[5]))
                rows["context"].append(json.dumps(e[6]))
                total_events += 1

                if len(rows["user_id"]) >= batch_size:
                    flush()
                    log.info("seeding_progress", total_events=total_events,
                             batch_size=batch_size)

        if rows["user_id"]:
            flush()
            log.info("seeding_progress", total_events=total_events,
                     batch_size=len(rows["user_id"]))

        if writer:
            writer.close()

        return total_events

    # ------------------------------------------------------------------
    # Spark table registration
    # ------------------------------------------------------------------

    def _register_table(self) -> None:
        assert self._conn is not None
        with self._conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS events")
            cur.execute(f"""
                CREATE TABLE events (
                    user_id     STRING    NOT NULL,
                    event_name  STRING    NOT NULL,
                    timestamp   TIMESTAMP NOT NULL,
                    properties  STRING    NOT NULL,
                    server      STRING    NOT NULL,
                    traits      STRING    NOT NULL,
                    context     STRING    NOT NULL
                )
                USING PARQUET
                LOCATION '{EVENTS_CONTAINER_DIR}'
            """)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

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

        # Phase 1: write all events as Parquet — no Spark involved
        total_events = self._write_events_parquet(users)

        # Phase 2: register external table in Spark — single DDL, no data movement
        connect_kwargs: dict = {
            "server_hostname": creds["server_hostname"],
            "http_path": creds["http_path"],
            "access_token": creds["access_token"],
            "enable_telemetry": False,
        }
        if tls_ca := creds.get("tls_trusted_ca_file"):
            connect_kwargs["_tls_trusted_ca_file"] = tls_ca
        with sql.connect(**connect_kwargs) as self._conn:
            self._register_table()

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
