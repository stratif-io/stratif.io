"""Databricks seeder — writes analytics events to a Databricks SQL warehouse.

Usage:
    uv run seed-databricks

Connection config is read from connections.yaml at the project root.
Seeding parameters (users, days) are read from seeders/.env or environment variables.

Fast path (recommended): set staging_volume in connections.yaml under the databricks
credentials block. The seeder will write a Parquet file locally, PUT it to the UC
volume, and load it with COPY INTO — orders of magnitude faster than parameterized INSERTs.

Fallback: without staging_volume the seeder falls back to chunked parameterized INSERTs
(≤555 rows per batch to respect Databricks' 10,000-parameter limit).
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import structlog
from databricks import sql

from seeders.connections_config import get_databricks_credentials, load_connections_yaml
from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class DatabricksSeeder(BaseSeeder):
    """Writes seeded events to a Databricks SQL warehouse."""

    def __init__(
        self, config: SeedConfig | None = None, *, overwrite_schema: bool = True
    ) -> None:
        super().__init__(config=config or SeedConfig())
        self._db_creds = get_databricks_credentials(load_connections_yaml())
        self._conn: Any = None
        self._overwrite_schema = overwrite_schema

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        with self._conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS events")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    user_id     STRING      NOT NULL,
                    event_name  STRING      NOT NULL,
                    timestamp   TIMESTAMP   NOT NULL,
                    properties  MAP<STRING, STRING> NOT NULL,
                    server      STRING      NOT NULL,
                    traits      STRUCT<
                                    first_name:     STRING,
                                    last_name:      STRING,
                                    phone:          STRING,
                                    email:          STRING,
                                    date_of_birth:  STRING
                                > NOT NULL,
                    context     STRUCT<
                                    country:            STRING,
                                    city:               STRING,
                                    timezone:           STRING,
                                    device_type:        STRING,
                                    browser:            STRING,
                                    os:                 STRING,
                                    screen_resolution:  STRING,
                                    referrer:           STRING
                                > NOT NULL
                )
                USING DELTA
            """)

    # ------------------------------------------------------------------
    # Fast path: Parquet + PUT + COPY INTO (requires staging_volume)
    # ------------------------------------------------------------------

    def _bulk_load_parquet(self, events: list[tuple]) -> None:
        """Write events to a local Parquet file, stage it to a UC Volume, and
        load it into the events table with COPY INTO."""
        import pandas as pd

        creds = self._db_creds
        catalog = creds["catalog"]
        schema = creds["schema"]
        volume = creds["staging_volume"]
        volume_path = f"/Volumes/{catalog}/{schema}/{volume}"
        remote_file = f"{volume_path}/seed_events.parquet"

        rows = []
        for e in events:
            traits: dict = e[5]
            ctx: dict = e[6]
            rows.append(
                {
                    "user_id": e[0],
                    "event_name": e[1],
                    "timestamp": pd.Timestamp(e[2]),
                    "properties_json": json.dumps(
                        {str(k): str(v) for k, v in e[3].items()}
                    ),
                    "server": e[4],
                    "first_name": traits.get("first_name", ""),
                    "last_name": traits.get("last_name", ""),
                    "phone": traits.get("phone", ""),
                    "email": traits.get("email", ""),
                    "date_of_birth": traits.get("date_of_birth", ""),
                    "country": ctx.get("country", ""),
                    "city": ctx.get("city", ""),
                    "timezone": ctx.get("timezone", ""),
                    "device_type": ctx.get("device_type", ""),
                    "browser": ctx.get("browser", ""),
                    "os": ctx.get("os", ""),
                    "screen_resolution": ctx.get("screen_resolution", ""),
                    "referrer": ctx.get("referrer", ""),
                }
            )

        df = pd.DataFrame(rows)
        # Databricks COPY INTO rejects nanosecond timestamps (Parquet INT64 NANOS).
        # Cast to microseconds, which maps to INT64 MICROS and is always accepted.
        df["timestamp"] = df["timestamp"].astype("datetime64[us]")

        with tempfile.NamedTemporaryFile(suffix=".parquet", delete=False) as tmp:
            local_file = tmp.name

        try:
            df.to_parquet(local_file, index=False)
            log.info("parquet_written", path=local_file, rows=len(rows))

            with self._conn.cursor() as cur:
                cur.execute(f"PUT '{local_file}' INTO '{remote_file}' OVERWRITE")
                log.info("parquet_staged", remote=remote_file)
                cur.execute(f"""
                    COPY INTO events
                    FROM (
                        SELECT
                            user_id,
                            event_name,
                            timestamp::TIMESTAMP AS timestamp,
                            from_json(properties_json, 'map<string,string>') AS properties,
                            server,
                            named_struct(
                                'first_name', first_name,
                                'last_name',  last_name,
                                'phone',      phone,
                                'email',      email,
                                'date_of_birth', date_of_birth
                            ) AS traits,
                            named_struct(
                                'country',           country,
                                'city',              city,
                                'timezone',          timezone,
                                'device_type',       device_type,
                                'browser',           browser,
                                'os',                os,
                                'screen_resolution', screen_resolution,
                                'referrer',          referrer
                            ) AS context
                        FROM '{remote_file}'
                    )
                    FILEFORMAT = PARQUET
                """)
                log.info("copy_into_complete", rows=len(rows))
                cur.execute(f"REMOVE '{remote_file}'")
        finally:
            Path(local_file).unlink(missing_ok=True)

    # ------------------------------------------------------------------
    # Fallback path: chunked parameterized INSERT
    # ------------------------------------------------------------------

    # One placeholder group per row — properties via from_json(), structs via named_struct()
    _ROW_PLACEHOLDER = (
        "("
        "?, ?, ?, "
        "from_json(?, 'map<string,string>'), "
        "?, "
        "named_struct('first_name', ?, 'last_name', ?, 'phone', ?, 'email', ?, 'date_of_birth', ?), "
        "named_struct('country', ?, 'city', ?, 'timezone', ?, 'device_type', ?, 'browser', ?, 'os', ?, 'screen_resolution', ?, 'referrer', ?)"
        ")"
    )

    # Databricks limits parameterized queries to 10,000 parameters.
    # With 18 params per row, the max safe batch size is 10_000 // 18 = 555.
    _PARAMS_PER_ROW = 18
    _MAX_PARAMS = 10_000
    _MAX_ROWS_PER_INSERT = _MAX_PARAMS // _PARAMS_PER_ROW  # 555

    def _insert_events(self, events: list[tuple]) -> None:
        assert self._conn is not None, "_conn not initialized — call seed() first"
        if not events:
            return
        for i in range(0, len(events), self._MAX_ROWS_PER_INSERT):
            self._insert_batch(events[i : i + self._MAX_ROWS_PER_INSERT])

    def _insert_batch(self, events: list[tuple]) -> None:
        params: list = []
        for e in events:
            traits: dict = e[5]
            ctx: dict = e[6]
            params += [
                e[0],
                e[1],
                e[2],
                json.dumps({str(k): str(v) for k, v in e[3].items()}),
                e[4],
                traits.get("first_name", ""),
                traits.get("last_name", ""),
                traits.get("phone", ""),
                traits.get("email", ""),
                traits.get("date_of_birth", ""),
                ctx.get("country", ""),
                ctx.get("city", ""),
                ctx.get("timezone", ""),
                ctx.get("device_type", ""),
                ctx.get("browser", ""),
                ctx.get("os", ""),
                ctx.get("screen_resolution", ""),
                ctx.get("referrer", ""),
            ]
        placeholders = ", ".join(self._ROW_PLACEHOLDER for _ in events)
        with self._conn.cursor() as cur:
            cur.execute(
                "INSERT INTO events "
                "(user_id, event_name, timestamp, properties, server, traits, context) "
                f"VALUES {placeholders}",
                params,
            )

    # ------------------------------------------------------------------
    # Seed orchestration
    # ------------------------------------------------------------------

    def seed(self) -> dict[str, int]:
        creds = self._db_creds
        staging_volume = creds.get("staging_volume")
        # Accept both the YAML-standard keys (host/token — matches the backend's
        # Pydantic model) and the legacy seeder keys (server_hostname/access_token).
        host = creds.get("host") or creds.get("server_hostname")
        token = creds.get("token") or creds.get("access_token")
        if not host or not token:
            raise KeyError(
                "Databricks credentials must include 'host' and 'token' "
                "(or legacy 'server_hostname' / 'access_token')."
            )
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=host,
            mode="parquet" if staging_volume else "insert",
        )

        self._generate_products()
        users = self._generate_users()

        connect_kwargs: dict[str, Any] = {
            "server_hostname": host,
            "http_path": creds["http_path"],
            "access_token": token,
        }
        if staging_volume:
            connect_kwargs["staging_allowed_local_path"] = tempfile.gettempdir()

        total_events = 0
        with sql.connect(**connect_kwargs) as self._conn:
            if self._overwrite_schema:
                self._create_events_table()

            if staging_volume:
                all_events: list[tuple] = []
                for batch in self._generate_events_batched(users):
                    all_events.extend(batch)
                    total_events += len(batch)
                    if total_events % PROGRESS_INTERVAL < len(batch):
                        log.info("seeding_progress", total_events=total_events)
                self._bulk_load_parquet(all_events)
            else:
                for batch in self._generate_events_batched(users):
                    self._insert_events(batch)
                    total_events += len(batch)
                    if total_events % PROGRESS_INTERVAL < len(batch):
                        log.info("seeding_progress", total_events=total_events)

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
